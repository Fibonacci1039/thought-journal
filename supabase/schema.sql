-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable pgvector extension for embeddings
create extension if not exists "vector";

-- Table: topics
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: entries
create table if not exists public.entries (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text, -- Added: Title for the entry
  human_view text not null,
  ai_view jsonb not null,
  topic_ids uuid[] default '{}'::uuid[] not null,
  -- New Columns for v2 features
  entry_type text default 'journal', -- 'journal', 'quick_memo', 'quote', 'idea'
  tags text[] default '{}'::text[],
  images text[] default '{}'::text[], -- Array of image URLs
  embedding vector(1536), -- Gemini text-embedding-004 (768) or OpenAI (1536). Using 1536 as placeholder, adjust if using Gemini (768). Note: Gemini embedding size is 768 usually. Let's use 768 for Gemini.
  -- Wait, user might use OpenAI. Let's start with 768 for Gemini text-embedding-004.
  -- Actually, in plan I said "Gemini API (text-embedding-004)". Its dimension is 768.
  mood text,
  meta jsonb,
  source_url text,
  cite_text text
);

-- Adjust embedding dimension if needed later. using 768 for Gemini.
alter table public.entries alter column embedding type vector(768);


-- STRICT RLS: Only allow access to the service_role (server-side)
alter table public.topics enable row level security;
alter table public.entries enable row level security;

-- Policy: Server Only for Topics
drop policy if exists "server_only_topics" on public.topics;
create policy "server_only_topics"
on public.topics
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Policy: Server Only for Entries
drop policy if exists "server_only_entries" on public.entries;
create policy "server_only_entries"
on public.entries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Similarity Search Function (RPC)
create or replace function match_entries (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  human_view text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    entries.id,
    entries.title,
    entries.human_view,
    1 - (entries.embedding <=> query_embedding) as similarity
  from entries
  where 1 - (entries.embedding <=> query_embedding) > match_threshold
  order by entries.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Storage Bucket Setup (Manually create 'entry_images' in Supabase Dashboard usually, but SQL can help)
-- Note: Creating buckets via SQL varies by platform. Assuming standard Supabase storage schema if available.
-- For now, user needs to create 'entry_images' bucket in Dashboard.

-- Table: user_profiles (for personal AI prompt customization)
create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id text default 'default_user' unique,
  basic_info text, -- 基本情報（職業、年齢など）
  current_concerns text, -- 最近の悩み
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for user_profiles
alter table public.user_profiles enable row level security;

drop policy if exists "server_only_user_profiles" on public.user_profiles;
create policy "server_only_user_profiles"
on public.user_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
