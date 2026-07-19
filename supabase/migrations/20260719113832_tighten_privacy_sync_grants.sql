revoke all on table public.practice_events from anon, authenticated;
revoke all on table public.daily_progress from anon, authenticated;
revoke all on table public.daily_reflections from anon, authenticated;
revoke all on table public.daily_intentions from anon, authenticated;
revoke all on table public.preferences from anon, authenticated;
revoke all on table public.health_daily_derived from anon, authenticated;
revoke all on table public.push_installations from anon, authenticated;

grant select, insert, update on table public.practice_events to authenticated;
grant select, insert, update on table public.daily_progress to authenticated;
grant select, insert, update on table public.daily_reflections to authenticated;
grant select, insert, update on table public.daily_intentions to authenticated;
grant select, insert, update on table public.preferences to authenticated;
grant select, insert, update on table public.health_daily_derived to authenticated;

grant select, insert, update, delete on table public.push_installations to service_role;
