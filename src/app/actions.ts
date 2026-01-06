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
    const newEntry = await createEntry(entry);
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
    return { success: true };
  } catch (e) {
    return handleDbError(e);
  }
}
