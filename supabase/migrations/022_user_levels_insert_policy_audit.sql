-- Migration 022 — Auditoria: fixes pra user_levels e trigger auto-init.
-- Bug detectado: user_levels só tinha SELECT policy. /progresso fazia insert
-- explícito que falhava silently com RLS 42501. Novos users (post-Migration 021
-- backfill) não tinham row em user_levels.

drop policy if exists user_levels_insert_self on user_levels;
create policy user_levels_insert_self on user_levels
  for insert with check (auth.uid() = user_id);

drop policy if exists user_levels_update_self on user_levels;
create policy user_levels_update_self on user_levels
  for update using (auth.uid() = user_id);

-- Auto-criar user_levels row em novo profile (resilience pra novos signups)
create or replace function public.init_user_levels_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_levels (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_init_user_levels on profiles;
create trigger trg_init_user_levels
  after insert on profiles
  for each row execute function init_user_levels_on_profile();
