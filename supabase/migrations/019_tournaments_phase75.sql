-- Migration 019 — Tournaments (Phase 7.5).
-- tournaments: torneios FORMULADOTA. Admin cria, teams se inscrevem, sistema gera matches.
-- tournament_teams: roster registrado.
-- tournament_matches: partidas do bracket. Vincula a lobby quando ativa.

create type tournament_format as enum ('single_elim', 'double_elim', 'round_robin', 'swiss');
create type tournament_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');
create type match_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'walkover');

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (length(name) between 5 and 80),
  description text,
  format tournament_format not null default 'single_elim',
  status tournament_status not null default 'draft',
  max_teams int not null default 8 check (max_teams in (4, 8, 16, 32, 64)),
  prize_pool numeric(10,2) default 0,
  prize_pool_currency text default 'BRL',
  registration_ends_at timestamptz,
  starts_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users on delete set null,
  banner_url text,
  rules text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tournaments_status on tournaments(status);

create table if not exists tournament_teams (
  tournament_id uuid references tournaments on delete cascade not null,
  team_id uuid references teams on delete cascade not null,
  registered_at timestamptz default now(),
  eliminated_at timestamptz,
  seed int,
  primary key (tournament_id, team_id)
);

create index if not exists idx_tournament_teams_team on tournament_teams(team_id);

create table if not exists tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments on delete cascade not null,
  round int not null,
  bracket_position int not null,
  team_a_id uuid references teams on delete set null,
  team_b_id uuid references teams on delete set null,
  winner_team_id uuid references teams on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  lobby_id uuid references lobbies on delete set null,
  status match_status not null default 'scheduled',
  score_a int default 0,
  score_b int default 0,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_tournament_matches_tournament on tournament_matches(tournament_id, round);
create index if not exists idx_tournament_matches_status on tournament_matches(status);

alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table tournament_matches enable row level security;

drop policy if exists tournaments_select_all on tournaments;
create policy tournaments_select_all on tournaments for select using (true);
drop policy if exists tournaments_admin_write on tournaments;
create policy tournaments_admin_write on tournaments for all using (is_admin()) with check (is_admin());

drop policy if exists tournament_teams_select_all on tournament_teams;
create policy tournament_teams_select_all on tournament_teams for select using (true);
drop policy if exists tournament_teams_register_captain on tournament_teams;
create policy tournament_teams_register_captain on tournament_teams for insert with check (
  exists (select 1 from teams t where t.id = tournament_teams.team_id and t.captain_id = auth.uid())
  and exists (
    select 1 from tournaments tn
    where tn.id = tournament_teams.tournament_id
      and tn.status = 'open'
      and (tn.registration_ends_at is null or tn.registration_ends_at > now())
  )
);
drop policy if exists tournament_teams_unregister_captain on tournament_teams;
create policy tournament_teams_unregister_captain on tournament_teams for delete using (
  exists (select 1 from teams t where t.id = tournament_teams.team_id and t.captain_id = auth.uid())
  or is_admin()
);

drop policy if exists tournament_matches_select_all on tournament_matches;
create policy tournament_matches_select_all on tournament_matches for select using (true);
drop policy if exists tournament_matches_admin_write on tournament_matches;
create policy tournament_matches_admin_write on tournament_matches for all using (is_admin()) with check (is_admin());

create or replace view tournament_matches_expanded as
select
  m.*,
  ta.name as team_a_name, ta.tag as team_a_tag,
  tb.name as team_b_name, tb.tag as team_b_tag,
  tw.name as winner_name, tw.tag as winner_tag
from tournament_matches m
left join teams ta on ta.id = m.team_a_id
left join teams tb on tb.id = m.team_b_id
left join teams tw on tw.id = m.winner_team_id;

grant select on tournament_matches_expanded to authenticated, anon;
