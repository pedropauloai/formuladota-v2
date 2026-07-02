-- 089_ranking_foundation.sql — Fundação do sistema de nivelamento.
-- Ver docs/foundations/RANKING_SYSTEM.md. Aditivo/seguro.

alter table public.seasons add column if not exists beta boolean not null default false;
alter table public.seasons add column if not exists season_number int;

alter table public.player_season_mmr add column if not exists placements_played int not null default 0;
alter table public.player_season_mmr add column if not exists calibrated boolean not null default false;
alter table public.player_season_mmr add column if not exists peak_mmr int;
alter table public.player_season_mmr add column if not exists leaderboard_rank int;

alter table public.match_players add column if not exists mmr_change int;

-- Imortalização: 1 linha por (user, season), gravada PRA SEMPRE.
create table if not exists public.season_achievements (
  user_id          uuid not null references auth.users(id) on delete cascade,
  season_id        int  not null references public.seasons(id) on delete cascade,
  final_medal      text,
  final_stars      int,
  final_mmr        int,
  leaderboard_rank int,
  title            text,
  created_at       timestamptz not null default now(),
  primary key (user_id, season_id)
);
alter table public.season_achievements enable row level security;
drop policy if exists season_achievements_public_read on public.season_achievements;
create policy season_achievements_public_read on public.season_achievements
  as permissive for select to public using (true);
create index if not exists idx_season_achievements_season on public.season_achievements(season_id);
create index if not exists idx_season_achievements_user on public.season_achievements(user_id);

-- Season atual vira PRÉ-TEMPORADA (beta, não conta); cria a S1 real (01/ago).
update public.seasons
  set beta = true, season_number = 0, name = 'Pré-temporada (Beta)'
  where id = 1;

insert into public.seasons (name, season_number, beta, active, started_at, ended_at)
select 'Temporada 1 — Genesis', 1, false, false,
       '2026-08-01T00:00:00-03:00'::timestamptz, '2026-09-30T23:59:59-03:00'::timestamptz
where not exists (select 1 from public.seasons where season_number = 1 and not beta);
