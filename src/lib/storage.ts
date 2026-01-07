import { supabase } from "./supabase";
import { Entry, Topic } from "./types";

// -- Entries --

export async function getRandomEntry(): Promise<Entry | undefined> {
  // PostgREST doesn't support random() natively in a simple way without extensions or RPC,
  // but for a personal app with <10k entries, fetching IDs or using a limit/offset trick is fine.
  // Here we'll use a simple "fetch IDs -> pick one -> fetch details" approach for simplicity/compatibility.

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
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Entry[];
}

export async function getEntry(id: string): Promise<Entry | undefined> {
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
  const { data, error } = await supabase
    .from("entries")
    .insert([
      {
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
  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) throw error;
}

// -- Topics --

export async function getTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("created_at", { ascending: true }); // Spec doesn't strictly specify sort, but ascending creation is standard

  if (error) throw error;
  return data as Topic[];
}

export async function createTopic(name: string): Promise<Topic> {
  const { data, error } = await supabase
    .from("topics")
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;
  return data as Topic;
}

export async function updateTopic(id: string, name: string): Promise<Topic> {
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
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) throw error;
}

// -- Periodic Summaries --

export async function getLatestTopicSummary(topicId: string) {
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
  // Sort IDs to ensure unique check works regardless of direction if we want bidirectional
  // But for now, let's treat as directed or user-defined.
  // Actually, to prevent "A->B" and "B->A" dupes if we mean undirected, we might sort.
  // Let's assume directed for now (Source -> Target).

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
  const { data, error } = await supabase
    .from("topic_relationships")
    .select("*");

  if (error) throw error;
  return data;
}

export async function deleteTopicRelationship(id: string) {
  const { error } = await supabase
    .from("topic_relationships")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// -- Storage (Images) --
