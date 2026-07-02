-- 100_recent_matches_mmr.sql — inclui o delta de MMR por jogador no feed (/partidas),
-- pra o card mostrar a variação junto do herói + avatar. Recria recent_matches
-- adicionando mp.mmr_change ao objeto de cada jogador (resto idêntico à 099).
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
          'name', coalesce(sl.persona, pr.username, mp.personaname, 'Jogador'),
          'avatar', coalesce(sl.avatar_url, pr.avatar_url)
        ) order by mp.player_slot), '[]'::jsonb)
        from public.match_players mp
        left join public.steam_links sl on sl.user_id = mp.user_id
        left join public.profiles pr on pr.id = mp.user_id
        where mp.match_id = mt.id
      ) as players
    from public.matches mt
    where mt.status = 'realizada' and mt.dota_match_id is not null
    order by mt.created_at desc
    limit greatest(coalesce(p_limit, 20), 0)
    offset greatest(coalesce(p_offset, 0), 0)
  ) t;
$function$;

grant execute on function public.recent_matches(int, int) to anon, authenticated;
