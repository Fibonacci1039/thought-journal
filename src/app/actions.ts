"use server";

import { revalidatePath } from "next/cache";
import {
  createTopic,
  updateTopic,
  deleteTopic,
  createEntry,
  updateEntry,
  deleteEntry,
  findRelatedEntries,
  getEntries,
  getEntry,
} from "@/lib/storage";
import { Entry } from "@/lib/types";
import { generateEmbedding } from "@/lib/embeddings";
import { checkUsageLimit, recordUsage } from "@/lib/usage";

// Helper to handle Postgrest errors
type PostgresError = {
  code?: string;
  message?: string;
  error?: { message?: string };
};

function handleDbError(e: unknown): { success: false; error: string } {
  console.error("Database error:", e);
  const err = e as PostgresError;
  if (err?.code === "23505") {
    // Unique violation
    return { success: false, error: "このトピック名は既に使用されています" };
  }
  // Return more detailed error message for debugging
  const errorMessage =
    err?.message || err?.error?.message || "操作に失敗しました";
  return { success: false, error: errorMessage };
}

const localPreviewEnabled = () =>
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

const localPreviewError = {
  success: false,
  error:
    "ローカルプレビュー中は保存できません。Supabase接続後に再度実行してください。",
} as const;

// -- Topics --

export async function createTopicAction(name: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    if (!name.trim())
      return { success: false, error: "名前を入力してください" };

    const topic = await createTopic(name);
    revalidatePath("/topics");
    revalidatePath("/new"); // Topics list in new entry form might need update
    return { success: true, data: topic };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function updateTopicAction(id: string, name: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    if (!name.trim())
      return { success: false, error: "名前を入力してください" };

    const topic = await updateTopic(id, name);
    revalidatePath("/topics");
    revalidatePath("/new");
    return { success: true, data: topic };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function deleteTopicAction(id: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    await deleteTopic(id);
    revalidatePath("/topics");
    revalidatePath("/new");
    return { success: true };
  } catch (e) {
    return handleDbError(e);
  }
}

// -- Entries --

export async function createEntryAction(
  entry: Omit<Entry, "id" | "created_at" | "updated_at">
) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    // Post-processing: Calculate Time Bucket for Meta Layer
    const now = new Date();
    // Simple ISO week calculation
    const d = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );

    // YYYY-MM-DD
    const day = now.toISOString().split("T")[0];
    // YYYY-MM
    const month = day.slice(0, 7);
    // YYYY-Www
    const week = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

    // Construct Meta
    const metaPayload = {
      ...entry.meta,
      time_bucket: {
        day,
        week,
        month,
      },
    };

    // Generate Embedding
    let embedding: number[] | undefined;
    try {
      console.log(
        `[CreateEntry] Generating embedding for: ${entry.title || "(No Title)"}`
      );
      const vec = await generateEmbedding(
        `${entry.title || ""} ${entry.human_view}`
      );
      if (vec) {
        embedding = vec;
        console.log(
          `[CreateEntry] Embedding generated successfully (dimensions: ${vec.length})`
        );
      } else {
        console.warn("[CreateEntry] Embedding generation returned undefined");
      }
    } catch (e) {
      console.error("[CreateEntry] Embedding generation failed:", e);
      // Continue without embedding (can be re-indexed later)
    }

    const newEntry = await createEntry({
      ...entry,
      ai_view: {
        ...entry.ai_view,
        schema_version: entry.ai_view?.schema_version || "2.1",
        enrichment_status: hasUsefulAiView(entry.ai_view)
          ? "complete"
          : "pending",
      },
      meta: metaPayload,
      embedding: embedding,
    });

    revalidatePath("/"); // Home page usually lists entries
    return { success: true, data: newEntry };
  } catch (e) {
    return handleDbError(e);
  }
}

function hasUsefulAiView(aiView: Record<string, unknown> | undefined) {
  if (!aiView) return false;
  const reflectionAssets = aiView.reflection_assets;
  const aiViewBody = aiView.ai_view;
  return Boolean(
    (typeof reflectionAssets === "object" && reflectionAssets !== null) ||
      (typeof aiViewBody === "object" && aiViewBody !== null)
  );
}

export async function enrichEntryAiViewAction(entryId: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    const entry = await getEntry(entryId);
    if (!entry) return { success: false, error: "記録が見つかりません" };

    if (entry.ai_view?.enrichment_status === "complete") {
      return { success: true, skipped: true };
    }

    const enrichedAiView = await enrichAiViewForEntry({
      title: entry.title || "",
      human_view: entry.human_view,
      ai_view: entry.ai_view,
    });

    await updateEntry(entryId, {
      ai_view: {
        ...enrichedAiView,
        schema_version: "2.1",
        enrichment_status: "complete",
        enriched_at: new Date().toISOString(),
      },
    });

    revalidatePath("/");
    revalidatePath(`/entry/${entryId}`);
    return { success: true };
  } catch (e) {
    console.error("Async AI enrichment failed:", e);

    try {
      const currentEntry = await getEntry(entryId);
      await updateEntry(entryId, {
        ai_view: {
          ...(currentEntry?.ai_view || {}),
          enrichment_status: "failed",
          enrichment_error:
            e instanceof Error ? e.message : "AI構造化に失敗しました",
        },
      });
    } catch {
      // Keep the original failure visible in logs without masking it.
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : "AI構造化に失敗しました",
    };
  }
}

export async function updateEntryAction(id: string, updates: Partial<Entry>) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    // If human_view is updated, re-generate embedding
    const updatesWithEmbedding = { ...updates };
    if (updates.human_view || updates.title) {
      try {
        // Need to fetch full entry if updating only one, but simpler to just use what we have or accept partial embedding?
        // Ideally should combine title + content.
        // For simplicity, if human_view provided, regenerate embedding from it.
        const text = `${updates.title || ""} ${
          updates.human_view || ""
        }`.trim();
        if (text) {
          const vec = await generateEmbedding(text);
          if (vec) {
            updatesWithEmbedding.embedding = vec;
          }
        }
      } catch (e) {
        console.error("Embedding update failed", e);
      }
    }

    const updated = await updateEntry(id, updatesWithEmbedding);
    revalidatePath("/");
    revalidatePath(`/entries/${id}`);
    return { success: true, data: updated };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function deleteEntryAction(id: string) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    await deleteEntry(id);
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return handleDbError(e);
  }
}

// -- Topic Relationships (Mind Map) --

export async function createTopicRelationshipAction(
  sourceId: string,
  targetId: string
) {
  try {
    if (sourceId === targetId) {
      return { success: false, error: "同じトピック同士は接続できません" };
    }
    const { createTopicRelationship } = await import("@/lib/storage");
    await createTopicRelationship(sourceId, targetId);
    revalidatePath("/graph");
    return { success: true };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function deleteTopicRelationshipAction(id: string) {
  try {
    const { deleteTopicRelationship } = await import("@/lib/storage");
    await deleteTopicRelationship(id);
    revalidatePath("/graph");
    return { success: true };
  } catch (e) {
    return handleDbError(e);
  }
}

// -- AI Analysis (Mind Map Grouping) --

export async function analyzeTopicContentAction(
  topicName: string,
  entries: { id: string; title: string; human_view: string }[]
) {
  try {
    const Groq = (await import("groq-sdk")).default;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return { success: false, error: "API Key not configured" };
    }

    const groq = new Groq({ apiKey });

    // Limit payload to avoid token limits (summarize if needed in future)
    const entriesText = entries
      .map(
        (e) =>
          `[ID: ${e.id}] Title: ${e.title}\nContent: ${e.human_view.slice(
            0,
            200
          )}...`
      )
      .join("\n\n");

    const prompt = `
     You are a knowledge organizer.
     Analyze the following journal entries related to the topic "${topicName}".
     Group them into 3-5 distinct semantic clusters (themes) based on their content.
     
     Return strictly valid JSON in the following format:
     {
        "groups": {
            "Theme Name 1": ["EntryID_1", "EntryID_2"],
            "Theme Name 2": ["EntryID_3"]
        }
     }
     
     Do not output markdown code blocks. Just the raw JSON string.

     Entries:
     ${entriesText}
     `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that organizes journal entries into semantic groups and returns structured JSON responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const response = completion.choices[0]?.message?.content || "";

    // Clean up potential markdown formatting if model ignores instruction
    const cleanText = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const json = JSON.parse(cleanText);
    return { success: true, data: json };
  } catch (e) {
    console.error(e);
    return { success: false, error: "AI分析に失敗しました" };
  }
}

// -- Personal AI (RAG) --

// (Removed local generateEmbedding function in favor of imported one)

// -- Personal AI (RAG) --

// (Removed local generateEmbedding function in favor of imported one)

export async function chatWithPastAction(query: string) {
  try {
    if (localPreviewEnabled()) {
      return {
        success: true,
        data: {
          response:
            "ローカルプレビュー中のため、Supabase上の過去記録検索は停止しています。",
          sources: [],
        },
        usage: {
          allowed: true,
          used: 0,
          limit: 9999,
          remaining: 9999,
        },
      };
    }

    // Check usage limit first
    const usage = await checkUsageLimit("rag_chat");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // 1. Generate Query Embedding
    const queryVector = await generateEmbedding(query);
    if (!queryVector) {
      console.error("Failed to generate embedding for query:", query);
      return {
        success: false,
        error: "Failed to generate embedding. Check GEMINI_API_KEY.",
      };
    }

    console.log("Query embedding generated, length:", queryVector.length);

    // 2. Search Similar Entries (RPC)
    // RPC call will invoke match_entries with the current user context (RLS applies)
    const { data: similarEntries, error: searchError } = await supabase.rpc(
      "match_entries",
      {
        query_embedding: queryVector,
        match_threshold: 0.3, // Lower threshold for more results
        match_count: 5,
      }
    );

    if (searchError) {
      console.error("Search Error:", searchError);
      // Check if RPC doesn't exist
      if (searchError.message?.includes("function match_entries")) {
        return {
          success: false,
          error:
            "match_entries関数がSupabaseに存在しません。schema.sqlを実行してください。",
        };
      }
      return {
        success: false,
        error: `Failed to retrieve context: ${searchError.message}`,
      };
    }

    console.log("Similar entries found:", similarEntries?.length || 0);

    // 3. Check if we have any results
    if (!similarEntries || similarEntries.length === 0) {
      // Check if there are any entries with embeddings
      const { data: entriesCheck, error: checkError } = await supabase
        .from("entries")
        .select("id, embedding")
        .not("embedding", "is", null)
        .limit(1);

      if (checkError) {
        console.error("Entries check error:", checkError);
      }

      if (!entriesCheck || entriesCheck.length === 0) {
        return {
          success: true,
          data: {
            response:
              "まだ記録がインデックスされていません。新しい記録を作成すると、自動的にインデックスが生成されます。",
            sources: [],
          },
          usage,
        };
      }

      // Entries exist but no matches
      return {
        success: true,
        data: {
          response:
            "ご質問に関連する過去の記録が見つかりませんでした。別の質問をお試しください。",
          sources: [],
        },
        usage,
      };
    }

    // 3. Generate Answer
    const Groq = (await import("groq-sdk")).default;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return { success: false, error: "GROQ_API_KEY not configured" };
    }

    const groq = new Groq({ apiKey });

    const allEntries = await getEntries();
    const entryLookup = new Map(allEntries.map((entry) => [entry.id, entry]));
    const enrichedSources = (
      similarEntries as {
        id: string;
        title?: string | null;
        human_view: string;
        similarity: number;
      }[]
    ).map((entry) => {
      const fullEntry = entryLookup.get(entry.id);
      return {
        id: entry.id,
        title: entry.title || fullEntry?.title || "無題の記録",
        human_view: entry.human_view,
        ai_view: fullEntry?.ai_view || {},
        created_at: fullEntry?.created_at,
        similarity: entry.similarity,
      };
    });

    const contextText = enrichedSources
      .map((entry) => {
        const date = entry.created_at
          ? new Date(entry.created_at).toISOString().split("T")[0]
          : "date_unknown";
        const aiView =
          entry.ai_view && Object.keys(entry.ai_view).length > 1
            ? `\nAI structured data: ${JSON.stringify(entry.ai_view)}`
            : "";

        return [
          `[${date}] ${entry.title}`,
          `Similarity: ${(entry.similarity * 100).toFixed(0)}%`,
          `Human note: ${entry.human_view}`,
          aiView,
        ].join("\n");
      })
      .join("\n---\n");

    // Fetch user profile for personalization
    let userProfileContext = "";
    let customRecallPrompt = "";
    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("basic_info, current_concerns, preferences")
          .eq("user_id", user.id) // Use actual user ID
          .single();

        if (profile) {
          if (profile.basic_info) {
            userProfileContext += `\nUser Profile: ${profile.basic_info}`;
          }
          if (profile.current_concerns) {
            userProfileContext += `\nCurrent Concerns: ${profile.current_concerns}`;
          }
          // Get custom recall prompt if set (Pro feature)
          const prefs = profile.preferences as Record<string, string> | null;
          if (prefs?.recallPrompt) {
            customRecallPrompt = prefs.recallPrompt;
          }
        }
      }
    } catch {
      // Profile not found, continue without it
    }

    // Use custom prompt if set, otherwise use default
    const customInstructions = customRecallPrompt
      ? `\n\nCustom Instructions from User: ${customRecallPrompt}`
      : "";

    const systemPrompt = `
あなたは、ユーザーがAIと対話しながらジャーナリングを進め、悩みを減らすための「思考整理パートナー」です。
過去の記録は、断定や診断の材料ではなく、本人が自分のパターンに気づくための補助線として使ってください。
${userProfileContext}

# ユーザーの今の問い
${query}

# 参照できる過去の記録
${contextText}

# 回答方針
- 必ず自然な日本語で返答する。
- 最初に、今の問いを1文で受け止める。
- 過去記録に根拠がある時だけ「以前の記録では...」のように触れる。
- 記録から推測できる「繰り返しの悩み」「価値観」「避けたい負荷」を1つずつ短く整理する。
- 最後は、今すぐできる小さな行動か、次に書くとよい問いを1つだけ提示する。
- 医療・法律・金融などの専門判断はしない。深刻な危機や自傷他害が示唆される場合は、信頼できる人や専門窓口に相談するよう促す。
- 記録に根拠がないことは「記録からはまだ判断できません」と明示する。
${customInstructions}
     `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "あなたはユーザーのジャーナリングを支援する思考整理パートナーです。必ず自然な日本語だけで回答してください。",
        },
        {
          role: "user",
          content: systemPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";

    // Record usage on success
    await recordUsage("rag_chat", {
      queryLength: query.length,
      sourceCount: enrichedSources.length,
    });

    return {
      success: true,
      data: { response, sources: enrichedSources },
      usage,
    };
  } catch (e) {
    console.error("Chat processing error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: `Chat processing failed: ${errorMessage}` };
  }
}

export async function createEntryFromChatAction(input: {
  question: string;
  response: string;
  sources?: { id?: string; title?: string; created_at?: string }[];
}) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    const question = input.question.trim();
    const response = input.response.trim();
    if (!question || !response) {
      return { success: false, error: "保存する対話がありません" };
    }

    const sourceRefs = (input.sources || [])
      .filter((source) => source.id)
      .map((source) => ({
        id: source.id,
        title: source.title || "無題の記録",
        created_at: source.created_at,
      }));

    const humanView = [
      "Personal AIとの対話",
      "",
      `問い: ${question}`,
      "",
      `AIからの返答:\n${response}`,
    ].join("\n");

    let embedding: number[] | undefined;
    try {
      const vector = await generateEmbedding(`${question}\n${response}`);
      if (vector) embedding = vector;
    } catch (e) {
      console.error("[CreateChatEntry] Embedding generation failed:", e);
    }

    const saved = await createEntry({
      title: "Personal AIとの対話",
      human_view: humanView,
      entry_type: "journal",
      tags: ["Personal AI", "対話"],
      topic_ids: [],
      images: [],
      source_url: "",
      cite_text: "",
      ai_view: {
        schema_version: "2.1",
        type: "ai_dialogue",
        conversation: {
          user_question: question,
          ai_response: response,
        },
        source_entries: sourceRefs,
        reflection_assets: {
          concern: question,
          support_from_ai: response,
          next_review_question:
            "この対話を読み返した時、今の悩みは少し軽くなっているか？",
        },
      },
      meta: {
        importance: 2,
        change_flag: false,
      },
      embedding,
    });

    revalidatePath("/");
    revalidatePath("/personal-ai");
    return { success: true, data: saved };
  } catch (e) {
    return handleDbError(e);
  }
}

type GuidedJournalMessage = {
  role: "user" | "assistant";
  content: string;
};

async function generateTextWithAvailableAI(prompt: string, temperature = 0.7) {
  if (process.env.GROQ_API_KEY) {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature,
    });
    return completion.choices[0]?.message?.content || "";
  }

  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  return "";
}

async function enrichAiViewForEntry(input: {
  title?: string;
  human_view: string;
  ai_view: Record<string, unknown>;
}) {
  const existing = input.ai_view || {};
  const type = existing.type;
  const hasReflectionAssets =
    typeof existing.reflection_assets === "object" &&
    existing.reflection_assets !== null;

  if (
    hasReflectionAssets &&
    (type === "guided_journaling" || type === "ai_dialogue")
  ) {
    return existing;
  }

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    return existing;
  }

  try {
    const prompt = `
以下のジャーナリング記録を、後からAIが悩みの軽減や振り返りに使えるよう構造化してください。
診断や断定はせず、本人の言葉から読み取れる範囲だけを抽出してください。

# タイトル
${input.title || "無題"}

# 本文
${input.human_view}

# 既存AIデータ
${JSON.stringify(existing)}

# 出力形式
Markdownなし。JSONのみ。
{
  "schema_version": "2.1",
  "type": "journal",
  "ai_view": {
    "facts": [],
    "thoughts": [],
    "emotions": [],
    "values": [],
    "concerns": [],
    "relief_factors": [],
    "next_actions": [],
    "questions_for_future": []
  },
  "reflection_assets": {
    "core_concern": "",
    "emotional_pattern": "",
    "small_next_step": "",
    "next_review_question": ""
  }
}
    `;

    const response = await generateTextWithAvailableAI(prompt, 0.2);
    if (!response) return existing;

    const firstOpen = response.indexOf("{");
    const lastClose = response.lastIndexOf("}");
    const jsonText =
      firstOpen >= 0 && lastClose > firstOpen
        ? response.slice(firstOpen, lastClose + 1)
        : response;
    const structured = JSON.parse(jsonText);

    return {
      ...existing,
      ...structured,
      schema_version: "2.1",
    };
  } catch (e) {
    console.error("[AI View Enrichment] failed:", e);
    return existing;
  }
}

export async function guidedJournalingTurnAction(input: {
  systemPrompt: string;
  starterQuestion: string;
  messages: GuidedJournalMessage[];
}) {
  try {
    if (localPreviewEnabled()) {
      const lastUserMessage = [...input.messages]
        .reverse()
        .find((message) => message.role === "user")?.content;
      return {
        success: true,
        data: {
          response: lastUserMessage
            ? "少し整理すると、今の話の中で一番引っかかっているのはどこですか？"
            : input.starterQuestion,
        },
      };
    }

    const transcript = input.messages
      .map((message) =>
        message.role === "user"
          ? `User: ${message.content}`
          : `AI: ${message.content}`
      )
      .join("\n");

    const userAnswerCount = input.messages.filter(
      (message) => message.role === "user"
    ).length;

    const prompt = `
${input.systemPrompt}

あなたは今、アプリ内のジャーナリング対話を進めています。
目的は、ユーザーの悩みや考えを整理し、あとで記録として保存できる状態にすることです。

# 対話ルール
- 返答は日本語で、80〜160字程度。
- 一度に聞く質問は1つだけ。
- 安易な励ましや結論の押し付けは避ける。
- ユーザーの言葉を短く受け止めてから、次の問いを出す。
- 2回以上ユーザーが答えていて、悩み・感情・価値観・次の一歩のいずれかが見えてきたら、記録化を促してよい。
- 記録化を促す場合も、続けたい人が続けられるように押し付けない。
- 医療・法律・金融などの専門判断はしない。

# これまでの対話
${transcript || "(まだ対話は始まっていません)"}

# ユーザー回答数
${userAnswerCount}

# 出力形式
Markdownなし。以下のJSONのみ。
{
  "response": "ユーザーに見せる次の返答。80〜160字程度。",
  "ready_to_capture": true または false,
  "capture_reason": "記録化を促す理由。未準備なら空文字。"
}
    `;

    const response = await generateTextWithAvailableAI(prompt, 0.7);
    if (!response) {
      return { success: false, error: "AIプロバイダーが設定されていません" };
    }

    try {
      const firstOpen = response.indexOf("{");
      const lastClose = response.lastIndexOf("}");
      const jsonText =
        firstOpen >= 0 && lastClose > firstOpen
          ? response.slice(firstOpen, lastClose + 1)
          : response;
      const parsed = JSON.parse(jsonText) as {
        response?: string;
        ready_to_capture?: boolean;
        capture_reason?: string;
      };

      return {
        success: true,
        data: {
          response: parsed.response || response.trim(),
          readyToCapture: Boolean(parsed.ready_to_capture),
          captureReason: parsed.capture_reason || "",
        },
      };
    } catch {
      return {
        success: true,
        data: {
          response: response.trim(),
          readyToCapture: userAnswerCount >= 3,
          captureReason: userAnswerCount >= 3 ? "十分に整理できています" : "",
        },
      };
    }
  } catch (e) {
    console.error("Guided journaling error:", e);
    return { success: false, error: "AI対話に失敗しました" };
  }
}

export async function generateJournalingDraftAction(input: {
  systemPrompt: string;
  messages: GuidedJournalMessage[];
}) {
  try {
    const transcript = input.messages
      .map((message) =>
        message.role === "user"
          ? `User: ${message.content}`
          : `AI: ${message.content}`
      )
      .join("\n");

    if (!transcript.trim()) {
      return { success: false, error: "対話がありません" };
    }

    if (localPreviewEnabled()) {
      const humanView = input.messages
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .join("\n\n");

      return {
        success: true,
        data: {
          title: "AIジャーナリング",
          human_view: humanView,
          ai_view: {
            schema_version: "2.1",
            type: "guided_journaling",
            reflection_assets: {
              concerns: [],
              emotions: [],
              values: [],
              next_actions: [],
              questions_for_future: [],
            },
          },
        },
      };
    }

    const prompt = `
${input.systemPrompt}

以下はユーザーとAIのジャーナリング対話です。
この対話を、アプリに保存するための「人間用の記録」と「AI用の構造化データ」に変換してください。

# 対話
${transcript}

# 出力形式
Markdownなし。以下のJSONのみ。
{
  "title": "20字以内の短いタイトル",
  "human_view": "ユーザーが後から読み返せる自然な一人称の記録。AIの発言ではなく、本人の気づきとしてまとめる。",
  "ai_view": {
    "schema_version": "2.1",
    "type": "guided_journaling",
    "ai_view": {
      "facts": [],
      "thoughts": [],
      "emotions": [],
      "values": [],
      "concerns": [],
      "relief_factors": [],
      "next_actions": [],
      "questions_for_future": []
    },
    "reflection_assets": {
      "core_concern": "",
      "emotional_pattern": "",
      "small_next_step": "",
      "next_review_question": ""
    }
  }
}
    `;

    const response = await generateTextWithAvailableAI(prompt, 0.3);
    if (!response) {
      return { success: false, error: "AIプロバイダーが設定されていません" };
    }

    const firstOpen = response.indexOf("{");
    const lastClose = response.lastIndexOf("}");
    const jsonText =
      firstOpen >= 0 && lastClose > firstOpen
        ? response.slice(firstOpen, lastClose + 1)
        : response;
    const parsed = JSON.parse(jsonText);

    return { success: true, data: parsed };
  } catch (e) {
    console.error("Generate journaling draft error:", e);
    return { success: false, error: "対話の記録化に失敗しました" };
  }
}

export async function generateEntryEmbeddingAction(
  entryId: string,
  content: string
) {
  if (localPreviewEnabled()) return localPreviewError;

  const vector = await generateEmbedding(content);
  if (!vector) return { success: false, error: "Embedding failed" };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // RLS will ensure user only updates their own entry
  const { error } = await supabase
    .from("entries")
    .update({ embedding: vector })
    .eq("id", entryId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function listEntriesMissingEmbeddingAction() {
  try {
    if (localPreviewEnabled()) return { success: true, data: [] };

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Fetch entries where embedding is null
    // RLS ensures we only see our own entries
    const { data, error } = await supabase
      .from("entries")
      .select("id, human_view")
      .is("embedding", null)
      .limit(100);

    if (error) throw error;
    return { success: true, data };
  } catch (e: unknown) {
    console.error("List Entries Error:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function findRelatedEntriesAction(text: string) {
  try {
    if (!text.trim()) return { success: false, error: "Text is empty" };

    const embedding = await generateEmbedding(text);
    if (!embedding) {
      return { success: false, error: "Failed to generate embedding" };
    }

    const related = await findRelatedEntries(embedding);
    return { success: true, data: related };
  } catch (e: unknown) {
    return handleDbError(e);
  }
}

// -- User Profile (Personal AI Settings) --

// Removed separate createClient import, using lazy import inside functions if needed
// Actually, let's keep it consistent.

export async function getUserProfileAction() {
  try {
    if (localPreviewEnabled()) {
      return {
        success: true,
        data: {
          basic_info: "",
          current_concerns: "",
          preferences: {},
          is_pro: false,
        },
      };
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    // Return empty profile object if none exists, instead of null error
    const ADMIN_EMAILS = ["yuitofibo@fuji.waseda.jp"];
    const isPro = user?.email && ADMIN_EMAILS.includes(user.email);

    return { success: true, data: { ...(data || {}), is_pro: isPro } };
  } catch (e: unknown) {
    console.error("Get User Profile Error:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function saveUserProfileAction(
  basicInfo: string,
  currentConcerns: string,
  preferences?: {
    recallPrompt?: string;
    topicAnalysisPrompt?: string;
    entrySummaryPrompt?: string;
  }
) {
  try {
    if (localPreviewEnabled()) return localPreviewError;

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const updateData: Record<string, unknown> = {
      user_id: user.id,
      basic_info: basicInfo,
      current_concerns: currentConcerns,
      updated_at: new Date().toISOString(),
    };

    // Only add preferences if provided (Pro feature)
    if (preferences) {
      updateData.preferences = preferences;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(updateData, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/settings");
    return { success: true, data };
  } catch (e: unknown) {
    console.error("Save User Profile Error:", e);
    return { success: false, error: (e as Error).message };
  }
}
