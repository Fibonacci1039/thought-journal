"use server";

import { getEntries } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

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

# 出力形式 (JSON)
以下のJSON形式のみを出力してください。Markdownのコードブロックは不要です。
${ANALYSIS_SCHEMA}
    `;

    return { success: true, prompt };
  } catch (e: any) {
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
    // A. Validate JSON
    // Clean up potential Markdown code blocks if user copied them
    const cleanedJson = jsonString
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiKnowledge;
    try {
      aiKnowledge = JSON.parse(cleanedJson);
    } catch (e) {
      return {
        success: false,
        error:
          "JSONの形式が正しくありません。AIの回答のJSON部分のみを貼り付けてください。",
      };
    }

    // B. Save to Database
    const now = new Date();
    // Use fixed "all-time" range logic for now
    const periodEnd = now.toISOString();

    const { error } = await supabase.from("periodic_summaries").insert({
      topic_id: topicId,
      period_start: now.toISOString(), // Placeholder
      period_end: periodEnd,
      human_summary: aiKnowledge.reason || "手動分析完了",
      ai_knowledge: aiKnowledge,
    });

    if (error) throw error;

    revalidatePath(`/topics/${topicId}`);
    return { success: true };
  } catch (e: any) {
    console.error("Save Analysis Error:", e);
    return { success: false, error: "データの保存に失敗しました" };
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

    return { success: true, prompt };
  } catch (e: any) {
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
    } catch (e) {
      return {
        success: false,
        error:
          "JSONの形式が正しくありません。AIの回答にJSONが含まれているか確認してください。",
      };
    }

    // 1. Find or Create "Weekly Review" Topic
    const { data: topics } = await supabase
      .from("topics")
      .select("*")
      .eq("name", "Weekly Review");
    let topicId;

    if (topics && topics.length > 0) {
      topicId = topics[0].id;
    } else {
      const { data: newTopic, error } = await supabase
        .from("topics")
        .insert({ name: "Weekly Review", description: "週次振り返り用" })
        .select()
        .single();
      if (error) throw error;
      topicId = newTopic.id;
    }

    // 2. Save
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("periodic_summaries").insert({
      topic_id: topicId,
      period_start: oneWeekAgo.toISOString(),
      period_end: now.toISOString(),
      human_summary: aiKnowledge.theme || "週間振り返り",
      ai_knowledge: aiKnowledge,
    });

    if (error) throw error;

    revalidatePath(`/topics/${topicId}`);
    return { success: true, topicId };
  } catch (e: any) {
    console.error("Save Weekly Error:", e);
    return { success: false, error: "保存に失敗しました" };
  }
}
