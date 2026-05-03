-- Migration 011 — Lobbies in-house criados pelo bot Steam (Phase 5)
-- Aplicada 2026-05-03 via mcp__supabase__apply_migration.
-- Estrutura suporta H3.1-H3.6: bot cria lobby, players entram via UI, match_id capturado ao fim.
--
-- RLS gate: criar/entrar em lobby exige has_active_subscription() (helper Phase 4) +
-- is_user_active() (Phase 1.5 doutrina) + has_accepted_doctrine() (Phase 1.5).

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  password text not null,
  game_mode text not null default 'all_pick'
    check (game_mode in ('all_pick','captains_mode','random_draft','single_draft')),
  status text not null default 'pending'
    check (status in ('pending','open','in_progress','completed','cancelled','bot_unavailable')),
  steam_lobby_id text,
  dota_match_id text unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  max_players integer not null default 10 check (max_players in (10, 6, 4, 2)),
  mmr_target_min integer,
  mmr_target_max integer,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  bot_error text
);

create index if not exists lobbies_status_idx on public.lobbies (status);
create index if not exists lobbies_created_by_idx on public.lobbies (created_by);

create table if not exists public.lobby_players (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('radiant','dire','spectator')),
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index if not exists lobby_players_user_idx on public.lobby_players (user_id);

-- Trigger lifecycle (auto-set started_at, ended_at)
create or replace function public.handle_lobbies_updated_at() returns trigger
  language plpgsql as $$
begin
  if new.status = 'in_progress' and old.status != 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status in ('completed','cancelled') and old.status not in ('completed','cancelled') and new.ended_at is null then
    new.ended_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists lobbies_lifecycle on public.lobbies;
create trigger lobbies_lifecycle
  before update on public.lobbies
  for each row execute function public.handle_lobbies_updated_at();

-- RLS
alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;

drop policy if exists "everyone reads lobbies" on public.lobbies;
create policy "everyone reads lobbies" on public.lobbies for select using (true);

drop policy if exists "active subscribers create lobby" on public.lobbies;
create policy "active subscribers create lobby" on public.lobbies for insert
  with check (
    auth.uid() = created_by
    and public.has_active_subscription()
    and public.is_user_active(auth.uid())
    and public.has_accepted_doctrine(auth.uid())
  );

drop policy if exists "admin and creator manage lobby" on public.lobbies;
create policy "admin and creator manage lobby" on public.lobbies for update
  using (auth.uid() = created_by or public.is_admin())
  with check (auth.uid() = created_by or public.is_admin());

drop policy if exists "everyone reads lobby players" on public.lobby_players;
create policy "everyone reads lobby players" on public.lobby_players for select using (true);

drop policy if exists "active subscribers join lobby" on public.lobby_players;
create policy "active subscribers join lobby" on public.lobby_players for insert
  with check (
    auth.uid() = user_id
    and public.has_active_subscription()
    and public.is_user_active(auth.uid())
    and public.has_accepted_doctrine(auth.uid())
  );

drop policy if exists "users leave own lobby" on public.lobby_players;
create policy "users leave own lobby" on public.lobby_players for delete
  using (auth.uid() = user_id or public.is_admin());
