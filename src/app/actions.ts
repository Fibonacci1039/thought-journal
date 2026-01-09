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
      const vec = await generateEmbedding(
        `${entry.title || ""} ${entry.human_view}`
      );
      if (vec) embedding = vec;
    } catch (e) {
      console.error("Embedding generation failed", e);
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
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { success: false, error: "API Key not configured" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

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

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up potential markdown formatting if model ignores instruction
    const cleanText = text
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
    const { GoogleGenerativeAI } = await import("@google/generative-ai");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Generate Query Embedding
    const queryVector = await generateEmbedding(query);
    if (!queryVector) {
      return { success: false, error: "Failed to generate embedding" };
    }

    // 2. Search Similar Entries (RPC)
    const { data: similarEntries, error: searchError } = await supabase.rpc(
      "match_entries",
      {
        query_embedding: queryVector,
        match_threshold: 0.5,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error("Search Error:", searchError);
      return { success: false, error: "Failed to retrieve context" };
    }

    // 3. Generate Answer
    const apiKey = process.env.GEMINI_API_KEY!;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

    const contextText =
      (similarEntries as any[])
        ?.map((e) => `[${e.date || "Past"}] ${e.human_view}`)
        .join("\n---\n") || "No relevant past entries found.";

    const systemPrompt = `
     You are the user's "Second Brain". You are answering questions based ONLY on the user's past journal entries provided below.
     
     User Query: ${query}
     
     Relevant Past Context:
     ${contextText}
     
     Instructions:
     - Answer in the same language as the query (Japanese).
     - Cite specific past thoughts if relevant (e.g., "Earlier you mentioned...", "On [Date] you felt...").
     - If the context doesn't contain the answer, say "I don't recall reading about that in your journal."
     - Be empathetic and thoughtful.
     `;

    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    // Record usage on success
    await recordUsage("rag_chat", { query });

    return {
      success: true,
      data: { response, sources: similarEntries },
      usage,
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Chat processing failed" };
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
  } catch (e: any) {
    return handleDbError(e);
  }
}
