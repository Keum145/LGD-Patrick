create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

revoke all on table public.user_workspaces from anon;
grant select, insert, update, delete on table public.user_workspaces to authenticated;

create table if not exists public.certification_cache (
  cache_key text primary key,
  normalized_name text not null,
  source text not null,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists certification_cache_expires_at_idx
on public.certification_cache (expires_at);

alter table public.certification_cache enable row level security;

revoke all on table public.certification_cache from anon, authenticated;
grant all on table public.certification_cache to service_role;

create table if not exists public.job_search_cache (
  cache_key text primary key,
  normalized_company text not null,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists job_search_cache_expires_at_idx
on public.job_search_cache (expires_at);

alter table public.job_search_cache enable row level security;

revoke all on table public.job_search_cache from anon, authenticated;
grant all on table public.job_search_cache to service_role;

drop policy if exists "Users can read their own workspace" on public.user_workspaces;
create policy "Users can read their own workspace"
on public.user_workspaces for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own workspace" on public.user_workspaces;
create policy "Users can create their own workspace"
on public.user_workspaces for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own workspace" on public.user_workspaces;
create policy "Users can update their own workspace"
on public.user_workspaces for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own workspace" on public.user_workspaces;
create policy "Users can delete their own workspace"
on public.user_workspaces for delete
to authenticated
using ((select auth.uid()) = user_id);
