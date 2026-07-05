-- 150: RPCs pros hovers do topbar (Pedro 2026-07-05).
-- online_players: quem está online agora (last_seen < 3min, banido fora) com medalha.
-- season_positions: colocação 1-based na season (banido fora) pra numeração da medalha
--   dos Imortais — casa com a /ranking.

create or replace function public.online_players()
returns table(user_id uuid, name text, avatar text, mmr integer, level integer, season_pos integer)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  with s as (select id from public.seasons where active limit 1),
  ranked as (
    select psm.user_id, psm.mmr,
           row_number() over (order by psm.mmr desc)::int as pos
    from public.player_season_mmr psm, s
    where psm.season_id = s.id
      and psm.user_id not in (select id from public.profiles where behavior_status = 'banned')
  )
  select
    p.id,
    coalesce(ppi.username, sl.persona, 'Jogador'),
    coalesce(sl.avatar_url, ppi.avatar_url),
    r.mmr::int,
    coalesce(ul.current_level, 1),
    r.pos
  from public.profiles p
  left join public.steam_links sl on sl.user_id = p.id
  left join public.public_player_identities ppi on ppi.id = p.id
  left join public.user_levels ul on ul.user_id = p.id
  left join ranked r on r.user_id = p.id
  where p.last_seen_at > now() - interval '3 minutes'
    and p.behavior_status <> 'banned'
  order by r.mmr desc nulls last, p.last_seen_at desc
  limit 40;
$fn$;
grant execute on function public.online_players() to authenticated, anon;

create or replace function public.season_positions(p_ids uuid[])
returns table(user_id uuid, pos integer)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  with s as (select id from public.seasons where active limit 1),
  ranked as (
    select psm.user_id, row_number() over (order by psm.mmr desc)::int as pos
    from public.player_season_mmr psm, s
    where psm.season_id = s.id
      and psm.user_id not in (select id from public.profiles where behavior_status = 'banned')
  )
  select r.user_id, r.pos from ranked r where r.user_id = any(p_ids);
$fn$;
grant execute on function public.season_positions(uuid[]) to authenticated, anon;
