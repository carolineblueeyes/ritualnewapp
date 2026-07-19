create table if not exists public.practice_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  practice_id text not null,
  event_date date not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  source text not null default 'app' check (source in ('app', 'import')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_event_id)
);

create table if not exists public.daily_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_minutes integer not null default 0 check (total_minutes >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  shine_score_derived integer not null default 0 check (shine_score_derived between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.daily_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  answer text not null check (answer in ('yes', 'partially', 'no')),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.daily_intentions (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  preset_intention_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_practice_ids jsonb not null default '[]'::jsonb,
  favorite_atmosphere_ids jsonb not null default '[]'::jsonb,
  notification_settings jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  privacy_consent_version text not null default '2026-07-19',
  updated_at timestamptz not null default now()
);

create table if not exists public.health_daily_derived (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  score integer not null check (score between 0 and 100),
  data_quality text not null check (data_quality in ('full', 'partial', 'minimal', 'none')),
  source_kind text not null check (source_kind in ('healthapp', 'ring', 'none')),
  trend_bucket text not null default 'stable' check (trend_bucket in ('up', 'stable', 'down', 'unknown')),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.push_installations (
  installation_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  updated_at timestamptz not null default now()
);

create index if not exists practice_events_user_date_idx on public.practice_events (user_id, event_date desc);
create index if not exists push_installations_user_id_idx on public.push_installations (user_id);

alter table public.practice_events enable row level security;
alter table public.daily_progress enable row level security;
alter table public.daily_reflections enable row level security;
alter table public.daily_intentions enable row level security;
alter table public.preferences enable row level security;
alter table public.health_daily_derived enable row level security;
alter table public.push_installations enable row level security;

revoke all on table public.practice_events from anon, authenticated;
revoke all on table public.daily_progress from anon, authenticated;
revoke all on table public.daily_reflections from anon, authenticated;
revoke all on table public.daily_intentions from anon, authenticated;
revoke all on table public.preferences from anon, authenticated;
revoke all on table public.health_daily_derived from anon, authenticated;

grant select, insert, update on table public.practice_events to authenticated;
grant select, insert, update on table public.daily_progress to authenticated;
grant select, insert, update on table public.daily_reflections to authenticated;
grant select, insert, update on table public.daily_intentions to authenticated;
grant select, insert, update on table public.preferences to authenticated;
grant select, insert, update on table public.health_daily_derived to authenticated;

revoke all on table public.push_installations from anon, authenticated;
grant select, insert, update, delete on table public.push_installations to service_role;

create policy "Users can read own practice events"
  on public.practice_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own practice events"
  on public.practice_events for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own practice events"
  on public.practice_events for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own daily progress"
  on public.daily_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own daily progress"
  on public.daily_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own daily progress"
  on public.daily_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own reflections"
  on public.daily_reflections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own reflections"
  on public.daily_reflections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own reflections"
  on public.daily_reflections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own intentions"
  on public.daily_intentions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own intentions"
  on public.daily_intentions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own intentions"
  on public.daily_intentions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own preferences"
  on public.preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own preferences"
  on public.preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own preferences"
  on public.preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read own health derived data"
  on public.health_daily_derived for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own health derived data"
  on public.health_daily_derived for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own health derived data"
  on public.health_daily_derived for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
