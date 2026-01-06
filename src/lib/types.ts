export type Meta = {
  primary_topic?: string;
  related_topics?: string[];
  time_bucket?: {
    day: string;
    week: string;
    month: string;
  };
  change_flag?: boolean;
  importance?: 1 | 2 | 3;
};

export type Entry = {
  id: string; // UUID
  created_at: string; // ISO string
  updated_at: string; // ISO string
  human_view: string; // pure text
  ai_view: Record<string, unknown>; // JSONB (Knowledge Layer)
  topic_ids: string[]; // UUID[] (Relational)
  mood?: string | null; // Deprecated but kept for compatibility
  meta?: Meta; // Meta Index Layer
};

export type Topic = {
  id: string; // UUID
  name: string; // Renamed from title
  created_at: string;
};

export type PeriodicSummary = {
  id: string;
  topic_id: string;
  period_start: string;
  period_end: string;
  human_summary: string;
  ai_knowledge: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
