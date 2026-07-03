-- 114 — Feed /partidas: marca de PUNIÇÃO por jogador NESTA partida + MÉDIA de MMR.
-- Pedro 2026-07-03:
--   1) overlay público no jogador que foi banido/suspenso NAQUELA partida específica
--      (accountability = Mural da Vergonha). banned = existe user_warnings APLICADA de
--      severidade banimento/suspensao vinculada ao dota_match_id da partida — NÃO o
--      status geral (o mesmo jogador só recebe o overlay na partida do castigo).
--   2) média de MMR de cada time no card do histórico (favorito/zebra), lendo o avg
--      já persistido em match_details (migration 113).
-- Recria live_matches + recent_matches adicionando os campos. Corpo idêntico ao da
-- migration 105, + 'banned' por jogador e (no histórico) as médias por partida.

create or replace function public.live_matches()
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
  with sea as (select id from public.seasons where active limit 1)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'dota_match_id', l.dota_match_id,
      'name', l.name,
      'started_at', coalesce(l.started_at, l.created_at),
      'players', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', lp.user_id,
          'team', lp.team,
          'name', coalesce(pr.username, sl.persona, 'Jogador'),
          'avatar', coalesce(sl.avatar_url, pr.avatar_url),
          'level', coalesce(ul.current_level, 1),
          'mmr', psm.mmr,
          'banned', exists(
            select 1 from public.user_warnings w
            where w.user_id = lp.user_id
              and w.dota_match_id = l.dota_match_id
              and w.status = 'aplicada'
              and w.severity in ('banimento','suspensao')
          )
        )), '[]'::jsonb)
        from public.lobby_players lp
        left join public.steam_links sl on sl.user_id = lp.user_id
        left join public.profiles pr on pr.id = lp.user_id
        left join public.user_levels ul on ul.user_id = lp.user_id
        left join public.player_season_mmr psm on psm.user_id = lp.user_id and psm.season_id = (select id from sea)
        where lp.lobby_id = l.id
      )
    ) order by coalesce(l.started_at, l.created_at) desc
  ), '[]'::jsonb)
  from public.lobbies l
  where l.status = 'in_progress' and l.dota_match_id is not null;
$function$;

create or replace function public.recent_matches(p_limit int default 20, p_offset int default 0)
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'dota_match_id', t.dota_match_id,
      'radiant_win', t.radiant_win,
      'radiant_score', t.radiant_score,
      'dire_score', t.dire_score,
      'duration_min', t.duration_min,
      'date', t.date,
      'radiant_avg_mmr', t.radiant_avg_mmr,
      'dire_avg_mmr', t.dire_avg_mmr,
      'players', t.players
    ) order by t.created_at desc
  ), '[]'::jsonb)
  from (
    select
      mt.id,
      mt.dota_match_id,
      mt.radiant_win,
      mt.radiant_score,
      mt.dire_score,
      mt.duracao_min as duration_min,
      coalesce(mt.enriched_at, mt.created_at) as date,
      mt.created_at,
      md.radiant_avg_mmr,
      md.dire_avg_mmr,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', mp.user_id,
          'team', mp.team,
          'hero_id', mp.hero_id,
          'is_winner', mp.is_winner,
          'kills', mp.kills,
          'deaths', mp.deaths,
          'assists', mp.assists,
          'mmr_change', mp.mmr_change,
          'name', coalesce(pr.username, sl.persona, mp.personaname, 'Jogador'),
          'avatar', coalesce(sl.avatar_url, pr.avatar_url),
          'level', coalesce(ul.current_level, 1),
          'mmr', psm.mmr,
          'banned', exists(
            select 1 from public.user_warnings w
            where w.user_id = mp.user_id
              and w.dota_match_id = mt.dota_match_id
              and w.status = 'aplicada'
              and w.severity in ('banimento','suspensao')
          )
        ) order by mp.player_slot), '[]'::jsonb)
        from public.match_players mp
        left join public.steam_links sl on sl.user_id = mp.user_id
        left join public.profiles pr on pr.id = mp.user_id
        left join public.user_levels ul on ul.user_id = mp.user_id
        left join public.player_season_mmr psm on psm.user_id = mp.user_id and psm.season_id = (select id from public.seasons where active limit 1)
        where mp.match_id = mt.id
      ) as players
    from public.matches mt
    left join public.match_details md on md.match_id = mt.id
    where mt.status = 'realizada' and mt.dota_match_id is not null
    order by mt.created_at desc
    limit greatest(coalesce(p_limit, 20), 0)
    offset greatest(coalesce(p_offset, 0), 0)
  ) t;
$function$;

grant execute on function public.live_matches() to anon, authenticated;
grant execute on function public.recent_matches(int, int) to anon, authenticated;
