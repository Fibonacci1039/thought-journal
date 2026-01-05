-- Enable UUID extension
create extension if not exists "uuid-ossp";

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
  human_view text not null,
  ai_view jsonb not null,
  topic_ids uuid[] default '{}'::uuid[] not null
);

-- STRICT RLS: Only allow access to the service_role (server-side)
-- Disable all existing policies first (clean slate approach recommended manually, but here we define overrides)
alter table public.topics enable row level security;
alter table public.entries enable row level security;

-- Remove permissive policies if they exist (This SQL script is idempotent-ish if we drop first, 
-- but for safety in this artifacts, we'll just create the strict ones. 
-- User should clear old policies if they applied the previous schema.)

-- Policy: Server Only for Topics
drop policy if exists "Allow all access to topics" on public.topics;
drop policy if exists "server_only_topics" on public.topics;

create policy "server_only_topics"
on public.topics
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Policy: Server Only for Entries
drop policy if exists "Allow all access to entries" on public.entries;
drop policy if exists "server_only_entries" on public.entries;

create policy "server_only_entries"
on public.entries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
