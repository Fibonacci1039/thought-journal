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
