-- 103_feed_discord_name.sql — nick do feed passa a priorizar o HANDLE do Discord
-- (estável) sobre a persona da Steam (editável/anonimato). Espelha a decisão do
-- lib/identity.ts (displayName Discord-first). Só as RPCs do feed mudam — wall_of_shame
-- e match_bans já usavam profiles.username (Discord). Avatar segue Steam > Discord.

create or replace function public.live_matches()
returns jsonb
language sql
security definer
set search_path to 'public'
stable
as $function$
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
          'level', coalesce(ul.current_level, 1)
        )), '[]'::jsonb)
        from public.lobby_players lp
        left join public.steam_links sl on sl.user_id = lp.user_id
        left join public.profiles pr on pr.id = lp.user_id
        left join public.user_levels ul on ul.user_id = lp.user_id
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
          'name', coalesce(pr.username, sl.persona, mp.personaname, 'Jogador'),
          'avatar', coalesce(sl.avatar_url, pr.avatar_url),
          'level', coalesce(ul.current_level, 1)
        ) order by mp.player_slot), '[]'::jsonb)
        from public.match_players mp
        left join public.steam_links sl on sl.user_id = mp.user_id
        left join public.profiles pr on pr.id = mp.user_id
        left join public.user_levels ul on ul.user_id = mp.user_id
        where mp.match_id = mt.id
      ) as players
    from public.matches mt
    where mt.status = 'realizada' and mt.dota_match_id is not null
    order by mt.created_at desc
    limit greatest(coalesce(p_limit, 20), 0)
    offset greatest(coalesce(p_offset, 0), 0)
  ) t;
$function$;

grant execute on function public.live_matches() to anon, authenticated;
grant execute on function public.recent_matches(int, int) to anon, authenticated;
