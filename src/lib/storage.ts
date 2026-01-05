import { supabase } from "./supabase";
import { Entry, Topic } from "./types";

// -- Entries --

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
        human_view: entry.human_view,
        ai_view: entry.ai_view,
        topic_ids: entry.topic_ids,
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
