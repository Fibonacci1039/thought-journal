import "server-only";
import { createClient } from "./supabase/server";
import { Entry, Topic } from "./types";

// -- Entries --

export async function getRandomEntry(): Promise<Entry | undefined> {
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Entry[];
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return undefined;
  return data as Entry;
}

export async function createEntry(
  entry: Omit<Entry, "id" | "created_at" | "updated_at">
): Promise<Entry> {
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
  const supabase = await createClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) throw error;
}

// -- Topics --

export async function getTopics(): Promise<Topic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Topic[];
}

export async function createTopic(name: string): Promise<Topic> {
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
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) throw error;
}

// -- Periodic Summaries --

export async function getLatestTopicSummary(topicId: string) {
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topic_relationships")
    .select("*");

  if (error) throw error;
  return data;
}

export async function deleteTopicRelationship(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("topic_relationships")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// -- Storage (Images) --
