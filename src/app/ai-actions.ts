"use server";

import { getEntries } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { checkUsageLimit, recordUsage } from "@/lib/usage";

const localPreviewEnabled = () =>
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

const localPreviewError = {
  success: false,
  error:
    "ローカルプレビュー中は保存できません。Supabase接続後に再度実行してください。",
} as const;

// 1. Define Output Schema (for Prompt Engineering)
const ANALYSIS_SCHEMA = `
{
  "current_status": "状況を一言で（例: 安定期, 転換点, 停滞期, 試行錯誤期）",
  "turning_point_score": 0-100 (Integer),
  "reason": "そのステータスの理由。親しい知的な友人のような、自然な日本語（です・ます調）で記述してください。過度に硬い表現は避けてください。",
  "next_question": "ユーザー自身の内省を深めるための問い",
  "trends": [
     { "period": "YYYY-MM-DD ~ YYYY-MM-DD", "label": "期間のラベル" },
     ...
  ]
}
`;

/**
 * Generate a prompt for the user to copy-paste into an external AI.
 */
export async function generatePromptAction(topicId: string, topicName: string) {
  try {
    // Check usage limit first
    const usage = await checkUsageLimit("topic_analysis");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    // A. Fetch Data
    const allEntries = await getEntries();
    const topicEntries = allEntries
      .filter((e) => e.topic_ids.includes(topicId))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (topicEntries.length === 0) {
      return { success: false, error: "データが足りません" };
    }

    // A'. Fetch User Preferences for Custom Prompt
    let customInstructions = "";
    try {
      if (localPreviewEnabled()) throw new Error("Skip profile in preview");

      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("preferences")
          .eq("user_id", user.id)
          .single();
        const prefs = profile?.preferences as Record<string, string> | null;
        if (prefs?.topicAnalysisPrompt) {
          customInstructions = `\n\nCustom Instructions from User: ${prefs.topicAnalysisPrompt}`;
        }
      }
    } catch {
      // Ignore error
    }

    // B. Construct Prompt
    const logText = topicEntries
      .map((e) => {
        const date = new Date(e.created_at).toISOString().split("T")[0];
        // Include AI View if it has meaningful data
        const aiData =
          e.ai_view && Object.keys(e.ai_view).length > 1
            ? JSON.stringify(e.ai_view)
            : "";
        return `[${date}] Human: ${e.human_view}\n${
          aiData ? `      AI Data: ${aiData}` : ""
        }`;
      })
      .join("\n");

    const prompt = `
あなたは専属のコーチ兼分析AIです。
以下のジャーナリングログ（時系列）を分析し、ユーザーの「変化」と「次のステップ」を抽出してください。
ログには「本人の言葉(Human)」と「セッションごとのAI分析データ(AI Data)」が含まれています。これらを統合して深く解釈してください。

# ログデータ (Topic: ${topicName})
${logText}

# 分析要件
1. **行間の意図を読む**: 単なる事実の要約ではなく、感情の変化・価値観の葛藤・行動パターンの変容を読み取ってください。
2. **自然な対話調で**: 分析結果は、親しい知的な友人が語りかけるような、自然な日本語（です・ます調）で出力してください。「OSのアップデート」のような機械的な比喩は避け、血の通った言葉を選んでください。
3. **転換点を見つける**: 今が「安定している」のか「変化の渦中」なのか「停滞している」のかを判断してください。
4. **深い問い**: ユーザーが見逃している視点や、避けている核心に迫る問いを投げかけてください。
${customInstructions}

# 出力形式 (JSON)
以下のJSON形式のみを出力してください。Markdownのコードブロックは不要です。
${ANALYSIS_SCHEMA}
    `;

    // Record usage on success
    await recordUsage("topic_analysis", { topicId, topicName });

    return { success: true, prompt, usage };
  } catch (e: unknown) {
    console.error("Generate Prompt Error:", e);
    return { success: false, error: "プロンプト生成に失敗しました" };
  }
}

/**
 * Save the manually pasted JSON result.
 */
export async function saveAnalysisResultAction(
  topicId: string,
  jsonString: string
) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    // A. Validate JSON
    // Clean up potential Markdown code blocks if user copied them
    const cleanedJson = jsonString
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiKnowledge;
    try {
      aiKnowledge = JSON.parse(cleanedJson);
    } catch {
      return {
        success: false,
        error:
          "JSONの形式が正しくありません。AIの回答のJSON部分のみを貼り付けてください。",
      };
    }

    // B. Save to Database
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    // Use fixed "all-time" range logic for now
    const periodEnd = now.toISOString();

    const { error } = await supabase.from("periodic_summaries").insert({
      topic_id: topicId,
      user_id: user.id, // Explicitly set user_id
      period_start: now.toISOString(), // Placeholder
      period_end: periodEnd,
      human_summary: aiKnowledge.reason || "手動分析完了",
      ai_knowledge: aiKnowledge,
    });

    if (error) throw error;

    revalidatePath(`/topics/${topicId}`);
    return { success: true };
  } catch (e: unknown) {
    console.error("Save Analysis Error:", e);
    const errorMessage =
      e instanceof Error ? e.message : "データの保存に失敗しました";
    return { success: false, error: errorMessage };
  }
}

// --- WEEKLY INSIGHTS ---

const WEEKLY_ANALYSIS_SCHEMA = `
{
  "period_label": "YYYY/MM/DD - MM/DD",
  "theme": "今週のテーマ",
  "insight_text": "「深層からのメッセージ」の内容を要約したもの",
  "action_item": "Next Week's Focusの内容"
}
`;

/**
 * Generate a WEEKLY prompt for the user.
 */
export async function generateWeeklyPromptAction() {
  try {
    // Check usage limit first
    const usage = await checkUsageLimit("weekly_review");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    const allEntries = await getEntries();

    // Filter last 7 days
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check if we have logs within the last week
    const weeklyEntries = allEntries
      .filter((e) => new Date(e.created_at) >= oneWeekAgo)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (weeklyEntries.length === 0) {
      return { success: false, error: "直近1週間のデータがありません" };
    }

    const logText = weeklyEntries
      .map((e) => {
        const date = new Date(e.created_at).toISOString().split("T")[0];
        const aiData =
          e.ai_view && Object.keys(e.ai_view).length > 1
            ? JSON.stringify(e.ai_view)
            : "";
        return `[${date}] Human: ${e.human_view}\n${
          aiData ? `      AI Data: ${aiData}` : ""
        }`;
      })
      .join("\n");

    const prompt = `
あなたは、私の1週間を振り返り、深い洞察を提供する **「編集者兼ライフコーチ」** です。
以下の1週間分のログを分析し、**「週刊インサイト・レター」** を執筆するための情報を抽出してください。

# ログデータ (Last 7 Days)
${logText}

# 分析の視点
1. **Dots to Lines**: 個々の出来事（点）をつなぎ、一貫したテーマや傾向（線）を見出す。
2. **Hidden Emotions**: 表面的な言葉の裏に隠れている、本人が抑圧気味な感情や欲求を拾う。
3. **Celebrating Small Wins**: 本人が見逃している「小さな前進」を称賛する。

# 出力形式 (JSON)
以下のJSON形式のみを出力してください。手紙本文そのものは「insight_text」に要約して入れてください。
${WEEKLY_ANALYSIS_SCHEMA}
    `;

    // Record usage on success
    await recordUsage("weekly_review");

    return { success: true, prompt, usage };
  } catch (e: unknown) {
    console.error("Generate Weekly Prompt Error:", e);
    return { success: false, error: "プロンプト生成に失敗しました" };
  }
}

/**
 * Save the WEEKLY analysis result.
 * Automatically finds or creates a "Weekly Review" topic.
 */
export async function saveWeeklySummaryAction(jsonString: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    // Robust JSON extraction
    let cleanedJson = jsonString;
    const codeBlockMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      cleanedJson = codeBlockMatch[1];
    } else {
      const firstOpen = jsonString.indexOf("{");
      const lastClose = jsonString.lastIndexOf("}");
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        cleanedJson = jsonString.substring(firstOpen, lastClose + 1);
      }
    }

    let aiKnowledge;
    try {
      aiKnowledge = JSON.parse(cleanedJson);
    } catch {
      return {
        success: false,
        error:
          "JSONの形式が正しくありません。AIの回答にJSONが含まれているか確認してください。",
      };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Find or Create "Weekly Review" Topic
    // Note: RLS will only show user's topics
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .eq("name", "Weekly Review");
    let topicId;

    if (topics && topics.length > 0) {
      topicId = topics[0].id;
    } else {
      // Must include user_id if RLS requires it, assuming table structure
      if (!user) throw new Error("Unauthorized");

      const { data: newTopic, error } = await supabase
        .from("topics")
        .insert({ name: "Weekly Review", user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      topicId = newTopic.id;
    }

    // 2. Save
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Format dates as YYYY-MM-DD for DATE column
    const toDateString = (d: Date) => d.toISOString().split("T")[0];

    // Note: periodic_summaries might need user_id depending on RLS,
    // but schema didn't include it. Assuming it relies on topic ownership.
    const { error } = await supabase.from("periodic_summaries").insert({
      topic_id: topicId,
      period_start: toDateString(oneWeekAgo),
      period_end: toDateString(now),
      human_summary: aiKnowledge.theme || "週間振り返り",
      ai_knowledge: aiKnowledge,
    });

    if (error) throw error;

    revalidatePath(`/topics/${topicId}`);
    return { success: true, topicId };
  } catch (e: unknown) {
    console.error("Save Weekly Error:", e);
    // Return detailed error for debugging
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    return {
      success: false,
      error: `保存に失敗しました: ${errorMessage}`,
    };
  }
}

// --- AUTO ANALYSIS (Phase 2) ---

/**
 * 1クリックでトピック分析を実行し、結果を保存する
 * Gemini APIを直接呼び出す
 */
// ... (imports)

/**
 * 1クリックでトピック分析を実行し、結果を保存する
 * Groq API (Llama 3) を優先し、利用できない場合は Gemini API を使用する
 */
export async function autoAnalyzeTopicAction(
  topicId: string,
  topicName: string
) {
  try {
    if (localPreviewEnabled()) {
      return {
        success: false,
        error:
          "ローカルプレビュー中は自動分析を実行できません。プロンプト生成を使ってください。",
      };
    }

    // 1. Check usage limit
    const usage = await checkUsageLimit("topic_analysis");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    // 2. Fetch Data
    const allEntries = await getEntries();
    const topicEntries = allEntries
      .filter((e) => e.topic_ids.includes(topicId))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (topicEntries.length === 0) {
      return { success: false, error: "データが足りません" };
    }

    // A'. Fetch User Preferences for Custom Prompt
    let customInstructions = "";
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("preferences")
          .eq("user_id", user.id)
          .single();
        const prefs = profile?.preferences as Record<string, string> | null;
        if (prefs?.topicAnalysisPrompt) {
          customInstructions = `\n\nCustom Instructions from User: ${prefs.topicAnalysisPrompt}`;
        }
      }
    } catch {
      // Ignore error
    }

    // 3. Construct Prompt
    const logText = topicEntries
      .map((e) => {
        const date = new Date(e.created_at).toISOString().split("T")[0];
        const aiData =
          e.ai_view && Object.keys(e.ai_view).length > 1
            ? JSON.stringify(e.ai_view)
            : "";
        return `[${date}] Human: ${e.human_view}\n${
          aiData ? `      AI Data: ${aiData}` : ""
        }`;
      })
      .join("\n");

    const prompt = `
あなたは専属のコーチ兼分析AIです。
以下のジャーナリングログ（時系列）を分析し、ユーザーの「変化」と「次のステップ」を抽出してください。

# ログデータ (Topic: ${topicName})
${logText}

# 分析要件
1. 行間の意図を読む: 感情の変化・価値観の葛藤・行動パターンの変容を読み取ってください。
2. 自然な対話調で: 親しい知的な友人のような、自然な日本語（です・ます調）で。
3. 転換点を見つける: 今が「安定」「変化の渦中」「停滞」のどれかを判断。
4. 深い問い: 見逃している視点や核心に迫る問いを。
${customInstructions}

# 出力形式 (JSON)
以下のJSON形式のみを出力。Markdownコードブロック不要。
${ANALYSIS_SCHEMA}
    `;

    // 4. Call AI API (Groq -> Fallback to Gemini)
    let responseText = "";
    let usedProvider = "none";

    // Try Groq first
    if (process.env.GROQ_API_KEY) {
      try {
        const Groq = (await import("groq-sdk")).default;
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that returns structured JSON responses.",
            },
            { role: "user", content: prompt },
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        responseText = completion.choices[0]?.message?.content || "";
        usedProvider = "groq";
      } catch (e) {
        console.error("Groq API failed, trying Gemini...", e);
      }
    }

    // fallback to Gemini
    if (!responseText && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        usedProvider = "gemini";
      } catch (e) {
        console.error("Gemini API failed:", e);
      }
    }

    if (!responseText) {
      return {
        success: false,
        error: "利用可能なAIプロバイダーがありません (API Key Error)",
      };
    }

    // 5. Parse JSON
    let aiKnowledge;
    try {
      const cleanedJson = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const firstOpen = cleanedJson.indexOf("{");
      const lastClose = cleanedJson.lastIndexOf("}");
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        aiKnowledge = JSON.parse(
          cleanedJson.substring(firstOpen, lastClose + 1)
        );
      } else {
        aiKnowledge = JSON.parse(cleanedJson);
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, responseText);
      return {
        success: false,
        error: "AI応答の解析に失敗しました。再試行してください。",
      };
    }

    // 6. Save to Database
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const { error: dbError } = await supabase
      .from("periodic_summaries")
      .insert({
        topic_id: topicId,
        user_id: user.id, // Explicitly set user_id
        period_start: now.toISOString(),
        period_end: now.toISOString(),
        human_summary: aiKnowledge.reason || "AI自動分析",
        ai_knowledge: aiKnowledge,
      });

    if (dbError) throw dbError;

    // 7. Record usage
    await recordUsage("topic_analysis", { topicId, topicName, auto: true });

    revalidatePath(`/topics/${topicId}`);
    return { success: true, data: aiKnowledge, usage, provider: usedProvider };
  } catch (e: unknown) {
    console.error("Auto Analyze Error:", e);
    const errorMessage = e instanceof Error ? e.message : "分析に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 週次レビューを自動実行
 * Gemini APIを直接呼び出す
 */
export async function autoWeeklyAnalysisAction() {
  try {
    if (localPreviewEnabled()) {
      return {
        success: false,
        error:
          "ローカルプレビュー中は自動分析を実行できません。プロンプト生成を使ってください。",
      };
    }

    // 1. Check usage limit
    const usage = await checkUsageLimit("weekly_review");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    const allEntries = await getEntries();

    // Filter last 7 days
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weeklyEntries = allEntries
      .filter((e) => new Date(e.created_at) >= oneWeekAgo)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (weeklyEntries.length === 0) {
      return { success: false, error: "直近1週間のデータがありません" };
    }

    // 2. Construct Prompt
    const logText = weeklyEntries
      .map((e) => {
        const date = new Date(e.created_at).toISOString().split("T")[0];
        const aiData =
          e.ai_view && Object.keys(e.ai_view).length > 1
            ? JSON.stringify(e.ai_view)
            : "";
        return `[${date}] Human: ${e.human_view}\n${
          aiData ? `      AI Data: ${aiData}` : ""
        }`;
      })
      .join("\n");

    const prompt = `
あなたは「編集者兼ライフコーチ」です。
以下の1週間分のログを分析し、週刊インサイト・レターを作成してください。

# ログデータ (Last 7 Days)
${logText}

# 分析の視点
1. Dots to Lines: 個々の出来事をつなぎ、テーマや傾向を見出す
2. Hidden Emotions: 表面の言葉の裏にある感情や欲求を拾う
3. Celebrating Small Wins: 見逃している小さな前進を称賛

# 出力形式 (JSON)
${WEEKLY_ANALYSIS_SCHEMA}
    `;

    // 3. Call Groq API
    const Groq = (await import("groq-sdk")).default;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return { success: false, error: "API Key not configured" };
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that analyzes journal entries and returns structured JSON responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // 4. Parse JSON
    let aiKnowledge;
    try {
      const cleanedJson = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const firstOpen = cleanedJson.indexOf("{");
      const lastClose = cleanedJson.lastIndexOf("}");
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        aiKnowledge = JSON.parse(
          cleanedJson.substring(firstOpen, lastClose + 1)
        );
      } else {
        aiKnowledge = JSON.parse(cleanedJson);
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, responseText);
      return {
        success: false,
        error: "AI応答の解析に失敗しました。再試行してください。",
      };
    }

    // 5. Find or Create "Weekly Review" Topic
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .eq("name", "Weekly Review");
    let topicId;

    if (topics && topics.length > 0) {
      topicId = topics[0].id;
    } else {
      if (!user) throw new Error("Unauthorized");
      const { data: newTopic, error } = await supabase
        .from("topics")
        .insert({ name: "Weekly Review", user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      topicId = newTopic.id;
    }

    // 6. Save
    const toDateString = (d: Date) => d.toISOString().split("T")[0];

    const { error: dbError } = await supabase
      .from("periodic_summaries")
      .insert({
        topic_id: topicId,
        period_start: toDateString(oneWeekAgo),
        period_end: toDateString(now),
        human_summary: aiKnowledge.theme || "週間振り返り",
        ai_knowledge: aiKnowledge,
      });

    if (dbError) throw dbError;

    // 7. Record usage
    await recordUsage("weekly_review", { auto: true });

    revalidatePath(`/topics/${topicId}`);
    return { success: true, topicId, data: aiKnowledge, usage };
  } catch (e: unknown) {
    console.error("Auto Weekly Error:", e);
    const errorMessage = e instanceof Error ? e.message : "分析に失敗しました";
    return { success: false, error: errorMessage };
  }
}
