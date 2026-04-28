import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "./supabase/server";
import { Entry, Topic } from "./types";

type LegacyEntry = {
  entry_id: string;
  created_at: string;
  updated_at: string;
  human_view: string | { narrative?: string };
  ai_view?: Record<string, unknown>;
  topic_ids?: string[];
  source_note?: string;
};

type LegacyTopic = {
  topic_id: string;
  title: string;
  created_at: string;
};

export const localDataEnabled = () =>
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

function assertWritableDatabase() {
  if (localDataEnabled()) {
    throw new Error(
      "ローカルプレビュー中は保存できません。Supabase接続後に再度実行してください。"
    );
  }
}

async function readLocalJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", fileName);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function normalizeLegacyEntry(entry: LegacyEntry): Entry {
  return {
    id: entry.entry_id,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    title: entry.source_note ?? null,
    human_view:
      typeof entry.human_view === "string"
        ? entry.human_view
        : entry.human_view.narrative ?? "",
    ai_view: entry.ai_view ?? {},
    topic_ids: entry.topic_ids ?? [],
  };
}

async function getLocalEntries(): Promise<Entry[]> {
  const entries = await readLocalJson<LegacyEntry[]>("entries.json");
  return entries
    .map(normalizeLegacyEntry)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function getLocalTopics(): Promise<Topic[]> {
  const topics = await readLocalJson<LegacyTopic[]>("topics.json");
  return topics
    .map((topic) => ({
      id: topic.topic_id,
      name: topic.title,
      created_at: topic.created_at,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// -- Entries --

export async function getRandomEntry(): Promise<Entry | undefined> {
  if (localDataEnabled()) {
    const entries = await getLocalEntries();
    if (entries.length === 0) return undefined;
    return entries[Math.floor(Math.random() * entries.length)];
  }

  const supabase = await createClient();
  const { data: ids, error } = await supabase.from("entries").select("id");

  if (error) {
    console.error("Error fetching entry IDs:", error);
    return undefined;
  }

  if (!ids || ids.length === 0) return undefined;

  const randomIndex = Math.floor(Math.random() * ids.length);
  const randomId = ids[randomIndex].id;

  return getEntry(randomId);
}

export async function getEntries(): Promise<Entry[]> {
  if (localDataEnabled()) return getLocalEntries();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (localDataEnabled()) return getLocalEntries();
    throw error;
  }
  return data as Entry[];
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  if (localDataEnabled()) {
    const entries = await getLocalEntries();
    return entries.find((entry) => entry.id === id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (localDataEnabled()) {
      const entries = await getLocalEntries();
      return entries.find((entry) => entry.id === id);
    }
    return undefined;
  }
  return data as Entry;
}

export async function createEntry(
  entry: Omit<Entry, "id" | "created_at" | "updated_at">
): Promise<Entry> {
  assertWritableDatabase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("entries")
    .insert([
      {
        user_id: user.id,
        title: entry.title,
        human_view: entry.human_view,
        ai_view: entry.ai_view,
        topic_ids: entry.topic_ids,
        mood: entry.mood,
        meta: entry.meta,
        source_url: entry.source_url,
        cite_text: entry.cite_text,
        entry_type: entry.entry_type,
        tags: entry.tags,
        images: entry.images,
        embedding: entry.embedding,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Entry;
}

export async function updateEntry(
  id: string,
  updates: Partial<Entry>
): Promise<Entry> {
  assertWritableDatabase();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Entry;
}

export async function deleteEntry(id: string): Promise<void> {
  assertWritableDatabase();

  const supabase = await createClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) throw error;
}

// -- Topics --

export async function getTopics(): Promise<Topic[]> {
  if (localDataEnabled()) return getLocalTopics();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (localDataEnabled()) return getLocalTopics();
    throw error;
  }
  return data as Topic[];
}

export async function createTopic(name: string): Promise<Topic> {
  assertWritableDatabase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("topics")
    .insert([{ name, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data as Topic;
}

export async function updateTopic(id: string, name: string): Promise<Topic> {
  assertWritableDatabase();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Topic;
}

export async function deleteTopic(id: string): Promise<void> {
  assertWritableDatabase();

  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) throw error;
}

// -- Periodic Summaries --

export async function getLatestTopicSummary(topicId: string) {
  if (localDataEnabled()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periodic_summaries")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 is "Row not found"
  return data;
}

// -- Vector Search (Serendipity) --

export async function findRelatedEntries(
  embedding: number[],
  threshold = 0.7,
  count = 5
) {
  if (localDataEnabled()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_entries", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) throw error;
  return data;
}

// -- Topic Relationships (Mind Map) --

export async function createTopicRelationship(
  sourceId: string,
  targetId: string,
  relationType: string = "related"
) {
  assertWritableDatabase();

  const supabase = await createClient();
  // Note: topic_relationships table may need user_id as well for RLS,
  // or rely on referencing topics that have user_id.
  // Assuming simple insert for now.
  const { data, error } = await supabase
    .from("topic_relationships")
    .insert([
      {
        source_topic_id: sourceId,
        target_topic_id: targetId,
        relation_type: relationType,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTopicRelationships() {
  if (localDataEnabled()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topic_relationships")
    .select("*");

  if (error) throw error;
  return data;
}

export async function deleteTopicRelationship(id: string) {
  assertWritableDatabase();

  const supabase = await createClient();
  const { error } = await supabase
    .from("topic_relationships")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// -- Storage (Images) --
