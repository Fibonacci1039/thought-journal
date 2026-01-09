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

export type EntryType = "journal" | "quick_memo" | "quote" | "idea";

export type Entry = {
  id: string; // UUID
  created_at: string; // ISO string
  updated_at: string; // ISO string
  entry_type?: EntryType; // エントリの種類
  title?: string | null; // Optional title
  human_view: string; // pure text
  ai_view: Record<string, unknown>; // JSONB (Knowledge Layer)
  topic_ids: string[]; // UUID[] (Relational)
  tags?: string[]; // タグ（文字列配列）
  images?: string[]; // 画像URLの配列
  embedding?: number[]; // Vector embedding for semantic search
  mood?: string | null; // Deprecated but kept for compatibility
  meta?: Meta; // Meta Index Layer
  // Reference Capture
  source_url?: string | null;
  cite_text?: string | null;
};

export type Topic = {
  id: string; // UUID
  name: string; // Renamed from title
  created_at: string;
};

export type TopicRelationship = {
  id: string;
  source_topic_id: string;
  target_topic_id: string;
  relation_type: string;
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

// Usage tracking for monetization
export type UsageLog = {
  id: string;
  feature_type: "topic_analysis" | "weekly_review" | "rag_chat";
  used_at: string;
  metadata: Record<string, unknown>;
};
