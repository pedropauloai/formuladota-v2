-- 131_fix_mini_profile_pos_type.sql — Corrige type mismatch no hover — Pedro 2026-07-04.
--
-- BUG: na migration 129, predominant_pos usa mode() within group (order by rp), onde
-- rp = row_number() (bigint). A coluna de retorno foi declarada `integer` → o RPC
-- falhava com "structure of query does not match function result type" quando rodava
-- autenticado → getPublicMiniProfile devolvia null → hover mostrava "perfil
-- indisponível". Fix: cast do mode() pra int.

create or replace function public.get_public_mini_profile(p_user_id uuid)
returns table(
  user_id uuid, name text, avatar text, steam_id_64 text, level integer, mmr integer,
  rank_tier integer, leaderboard_rank integer, career_wins integer, career_losses integer,
  status_message text, last_seen_at timestamptz, favorite_heroes jsonb, friend_status text,
  season_mvps integer, season_matches integer, predominant_pos integer, social_links jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(p.username, sl.persona, 'Jogador')      as name,
    coalesce(sl.avatar_url, p.avatar_url)            as avatar,
    sl.steam_id_64,
    coalesce(ul.current_level, 1)                    as level,
    p.mmr_atual                                      as mmr,
    (use.career->>'rankTier')::int                   as rank_tier,
    (use.career->>'leaderboardRank')::int            as leaderboard_rank,
    (use.career->>'wins')::int                       as career_wins,
    (use.career->>'losses')::int                     as career_losses,
    p.status_message                                 as status_message,
    p.last_seen_at                                   as last_seen_at,
    coalesce(p.favorite_heroes, '[]'::jsonb)         as favorite_heroes,
    case
      when v_viewer = p.id then 'self'
      else coalesce((
        select case f.status
                 when 'accepted' then 'friends'
                 when 'pending'  then 'pending'
                 when 'blocked'  then 'blocked'
                 else 'none'
               end
        from friendships f
        where (f.requester_id = v_viewer and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = v_viewer)
        limit 1
      ), 'none')
    end                                              as friend_status,
    coalesce((
      select psm.mvps from player_season_mmr psm
      join seasons s on s.id = psm.season_id and s.active
      where psm.user_id = p.id
    ), 0)                                            as season_mvps,
    coalesce((
      select psm.partidas_total from player_season_mmr psm
      join seasons s on s.id = psm.season_id and s.active
      where psm.user_id = p.id
    ), 0)                                            as season_matches,
    (
      select mode() within group (order by rp)
      from (
        select row_number() over (
                 partition by mp.match_id, mp.team
                 order by coalesce(mp.net_worth, 0) desc
               ) as rp,
               mp.user_id
        from match_players mp
        where mp.match_id in (select match_id from match_players where user_id = p.id)
      ) ranked
      where ranked.user_id = p.id
    )::int                                           as predominant_pos,
    coalesce(p.social_links, '{}'::jsonb)            as social_links
  from profiles p
  left join steam_links sl on sl.user_id = p.id
  left join user_levels ul on ul.user_id = p.id
  left join user_stats_extended use on use.user_id = p.id
  where p.id = p_user_id;
end;
$function$;

grant execute on function public.get_public_mini_profile(uuid) to authenticated;
