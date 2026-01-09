-- =============================================
-- Usage Tracking for Monetization (Phase 1)
-- =============================================

-- Table: usage_logs (使用量ログ)
-- Tracks individual feature usage events for billing/limiting
create table if not exists public.usage_logs (
  id uuid primary key default uuid_generate_v4(),
  feature_type text not null, -- 'topic_analysis', 'weekly_review', 'rag_chat'
  used_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Index for efficient monthly usage queries
create index if not exists idx_usage_logs_feature_month 
on public.usage_logs (feature_type, used_at);

-- RLS Policy: Server Only (same pattern as other tables)
alter table public.usage_logs enable row level security;

drop policy if exists "server_only_usage" on public.usage_logs;
create policy "server_only_usage" on public.usage_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =============================================
-- Helper function: Get monthly usage count
-- =============================================
create or replace function get_monthly_usage(p_feature_type text)
returns integer
language plpgsql
security definer
as $$
declare
  usage_count integer;
begin
  select count(*)::integer into usage_count
  from usage_logs
  where feature_type = p_feature_type
    and used_at >= date_trunc('month', now());
  
  return coalesce(usage_count, 0);
end;
$$;
