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
} from "@/lib/storage";
import { Entry } from "@/lib/types";
import { generateEmbedding } from "@/lib/embeddings";
import { checkUsageLimit, recordUsage } from "@/lib/usage";

// Helper to handle Postgrest errors
function handleDbError(e: any): { success: false; error: string } {
  console.error("Database error:", e);
  if (e?.code === "23505") {
    // Unique violation
    return { success: false, error: "このトピック名は既に使用されています" };
  }
  // Return more detailed error message for debugging
  const errorMessage = e?.message || e?.error?.message || "操作に失敗しました";
  return { success: false, error: errorMessage };
}

// -- Topics --

export async function createTopicAction(name: string) {
  try {
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
      meta: metaPayload,
      embedding: embedding,
    });

    revalidatePath("/"); // Home page usually lists entries
    return { success: true, data: newEntry };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function updateEntryAction(id: string, updates: Partial<Entry>) {
  try {
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

export async function chatWithPastAction(query: string) {
  try {
    // Check usage limit first
    const usage = await checkUsageLimit("rag_chat");
    if (!usage.allowed) {
      return {
        success: false,
        error: "USAGE_LIMIT_EXCEEDED",
        usage,
      };
    }

    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Use service role key to bypass RLS
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials missing:", {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
      });
      return { success: false, error: "Database configuration error" };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const contextText = (
      similarEntries as {
        id: string;
        title?: string;
        human_view: string;
        similarity: number;
      }[]
    )
      .map(
        (e) =>
          `[Similarity: ${(e.similarity * 100).toFixed(0)}%] ${e.human_view}`
      )
      .join("\n---\n");

    // Fetch user profile for personalization
    let userProfileContext = "";
    let customRecallPrompt = "";
    try {
      const { data: profile } = await supabaseServiceRole
        .from("user_profiles")
        .select("basic_info, current_concerns, preferences")
        .eq("user_id", "default_user")
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
    } catch {
      // Profile not found, continue without it
    }

    // Use custom prompt if set, otherwise use default
    const customInstructions = customRecallPrompt
      ? `\n\nCustom Instructions from User: ${customRecallPrompt}`
      : "";

    const systemPrompt = `
     You are the user's "Second Brain". You are answering questions based ONLY on the user's past journal entries provided below.
     ${userProfileContext}
     
     User Query: ${query}
     
     Relevant Past Context:
     ${contextText}
     
     Instructions:
     - Answer in the same language as the query (Japanese).
     - Cite specific past thoughts if relevant (e.g., "Earlier you mentioned...", "On [Date] you felt...").
     - If the context doesn't contain the answer, say "I don't recall reading about that in your journal."
     - Be empathetic and thoughtful.
     - If user profile is provided, use it to give more personalized and relevant responses.
     ${customInstructions}
     `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers questions based on the user's journal entries.",
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
    await recordUsage("rag_chat", { query });

    return {
      success: true,
      data: { response, sources: similarEntries },
      usage,
    };
  } catch (e) {
    console.error("Chat processing error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: `Chat processing failed: ${errorMessage}` };
  }
}

export async function generateEntryEmbeddingAction(
  entryId: string,
  content: string
) {
  const vector = await generateEmbedding(content);
  if (!vector) return { success: false, error: "Embedding failed" };

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("entries")
    .update({ embedding: vector })
    .eq("id", entryId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function listEntriesMissingEmbeddingAction() {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch entries where embedding is null
    const { data, error } = await supabase
      .from("entries")
      .select("id, human_view")
      .is("embedding", null)
      .limit(100); // Process in batches of 100 to be safe

    if (error) throw error;
    return { success: true, data };
  } catch (e: any) {
    console.error("List Entries Error:", e);
    return { success: false, error: e.message };
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

import { createClient } from "@supabase/supabase-js";

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getUserProfileAction() {
  try {
    const { data, error } = await supabaseServiceRole
      .from("user_profiles")
      .select("*")
      .eq("user_id", "default_user")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    return { success: true, data: data || null };
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
    const updateData: Record<string, unknown> = {
      user_id: "default_user",
      basic_info: basicInfo,
      current_concerns: currentConcerns,
      updated_at: new Date().toISOString(),
    };

    // Only add preferences if provided (Pro feature)
    if (preferences) {
      updateData.preferences = preferences;
    }

    const { data, error } = await supabaseServiceRole
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
