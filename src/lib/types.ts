export type Entry = {
  id: string; // UUID
  created_at: string; // ISO string
  updated_at: string; // ISO string
  human_view: string; // simplified per spec
  ai_view: Record<string, unknown>; // JSONB
  topic_ids: string[]; // UUID[]
  // source_note removed as per new spec "No additional fields"
};

export type Topic = {
  id: string; // UUID
  name: string; // Renamed from title
  created_at: string;
  // description removed per spec
};
