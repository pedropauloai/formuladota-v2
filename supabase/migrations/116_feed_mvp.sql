-- 116 — Feed /partidas expõe o MVP da partida (migration 115). recent_matches passa a
-- devolver mvp_user_id (de match_details) pra o card marcar o chip do MVP. Idêntica à
-- 114 + o campo mvp_user_id.

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
      'mvp_user_id', t.mvp_user_id,
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
      md.mvp_user_id,
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

grant execute on function public.recent_matches(int, int) to anon, authenticated;
