"use server";

import { revalidatePath } from "next/cache";
import {
  createTopic,
  updateTopic,
  deleteTopic,
  createEntry,
  updateEntry,
  deleteEntry,
} from "@/lib/storage";
import { Entry } from "@/lib/types";

// Helper to handle Postgrest errors
function handleDbError(e: any): { success: false; error: string } {
  console.error(e);
  if (e?.code === "23505") {
    // Unique violation
    return { success: false, error: "このトピック名は既に使用されています" };
  }
  return { success: false, error: "操作に失敗しました" };
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

    const newEntry = await createEntry({
      ...entry,
      meta: metaPayload,
    });
    revalidatePath("/"); // Home page usually lists entries
    return { success: true, data: newEntry };
  } catch (e) {
    return handleDbError(e);
  }
}

export async function updateEntryAction(id: string, updates: Partial<Entry>) {
  try {
    const updated = await updateEntry(id, updates);
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
