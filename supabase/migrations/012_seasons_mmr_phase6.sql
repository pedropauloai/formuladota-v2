-- Migration 012 — Sistema de Ligas + MMR + Temporadas (Phase 6)
-- Aplicada 2026-05-03 via mcp__supabase__apply_migration.
-- H4.1-H4.4: matchmaking interno, MMR Elo K=25 base 1000, seasons trimestrais.

create table if not exists public.seasons (
  id serial primary key,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  prize_pool numeric(10,2) default 0 not null,
  prize_pool_currency text default 'BRL' not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists seasons_only_one_active on public.seasons (active) where active = true;

insert into public.seasons (name, active)
  values ('Temporada 1 — Genesis', true)
  on conflict do nothing;

create table if not exists public.player_season_mmr (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id integer not null references public.seasons(id) on delete cascade,
  mmr integer not null default 1000,
  vitorias integer not null default 0,
  derrotas integer not null default 0,
  partidas_total integer not null default 0,
  last_match_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

create index if not exists player_season_mmr_season_mmr_idx
  on public.player_season_mmr (season_id, mmr desc);

-- Helper SQL: mmr_to_tier (Herald 1 → Immortal 8)
create or replace function public.mmr_to_tier(p_mmr integer)
  returns table (tier integer, stars integer, tier_name text)
  language sql immutable
as $$
  with bands as (
    select 1 as tier, 'Herald' as name, 0 as min_mmr, 770 as range, 154 as star_size
    union all select 2, 'Guardian', 770, 770, 154
    union all select 3, 'Crusader', 1540, 770, 154
    union all select 4, 'Archon', 2310, 770, 154
    union all select 5, 'Legend', 3080, 770, 154
    union all select 6, 'Ancient', 3850, 770, 154
    union all select 7, 'Divine', 4620, 770, 154
    union all select 8, 'Immortal', 5390, 9999999, 0
  )
  select b.tier,
         case when b.tier = 8 then 0
              else least(5, greatest(1, ((p_mmr - b.min_mmr) / b.star_size)::int + 1))
         end as stars,
         b.name
  from bands b
  where p_mmr >= b.min_mmr and p_mmr < b.min_mmr + b.range
  limit 1;
$$;

create or replace function public.ensure_player_season_mmr(p_user_id uuid)
  returns void
  language plpgsql security definer set search_path = public
as $$
declare v_season_id integer;
begin
  select id into v_season_id from public.seasons where active = true limit 1;
  if v_season_id is null then return; end if;
  insert into public.player_season_mmr (user_id, season_id, mmr)
    values (p_user_id, v_season_id, 1000)
    on conflict (user_id, season_id) do nothing;
end;
$$;

alter table public.seasons enable row level security;
alter table public.player_season_mmr enable row level security;

drop policy if exists "everyone reads seasons" on public.seasons;
create policy "everyone reads seasons" on public.seasons for select using (true);

drop policy if exists "admin manages seasons" on public.seasons;
create policy "admin manages seasons" on public.seasons for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "everyone reads ranking" on public.player_season_mmr;
create policy "everyone reads ranking" on public.player_season_mmr for select using (true);
