-- Ritual local-first product model. Only daily aggregates are stored here;
-- raw sensor samples remain on device/provider storage.
create table if not exists public.health_daily_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  metrics jsonb not null default '{}'::jsonb,
  shine_score smallint check (shine_score between 0 and 100),
  shine_state text not null default 'waiting' check (shine_state in ('shining','balanced','tense','overload','waiting')),
  primary_driver text,
  secondary_driver text,
  trend text not null default 'unknown' check (trend in ('improving','declining','stable','unknown')),
  data_quality text not null default 'none' check (data_quality in ('full','partial','minimal','none')),
  source_kind text not null default 'none',
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.user_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  target_count smallint not null check (target_count between 1 and 365),
  period text not null default 'week' check (period in ('week','month')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.insight_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, insight_id)
);

create index if not exists health_daily_snapshots_user_date_idx on public.health_daily_snapshots (user_id, date desc);
create index if not exists user_goals_user_active_idx on public.user_goals (user_id, archived, updated_at desc);
create index if not exists user_notes_user_created_idx on public.user_notes (user_id, created_at desc);
create index if not exists insight_reads_user_date_idx on public.insight_reads (user_id, read_at desc);

alter table public.health_daily_snapshots enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_notes enable row level security;
alter table public.user_achievements enable row level security;
alter table public.insight_reads enable row level security;

grant select, insert, update on public.health_daily_snapshots to authenticated;
grant select, insert, update, delete on public.user_goals, public.user_notes to authenticated;
grant select, insert on public.user_achievements, public.insight_reads to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy health_daily_snapshots_select_own on public.health_daily_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy health_daily_snapshots_insert_own on public.health_daily_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy health_daily_snapshots_update_own on public.health_daily_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy user_goals_select_own on public.user_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy user_goals_insert_own on public.user_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_goals_update_own on public.user_goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_goals_delete_own on public.user_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy user_notes_select_own on public.user_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy user_notes_insert_own on public.user_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_notes_update_own on public.user_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_notes_delete_own on public.user_notes for delete to authenticated using ((select auth.uid()) = user_id);

create policy user_achievements_select_own on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy user_achievements_insert_own on public.user_achievements for insert to authenticated with check ((select auth.uid()) = user_id);
create policy insight_reads_select_own on public.insight_reads for select to authenticated using ((select auth.uid()) = user_id);
create policy insight_reads_insert_own on public.insight_reads for insert to authenticated with check ((select auth.uid()) = user_id);
