-- 066 — get_public_mini_profile passa a expor o RANK VALVE REAL (career.rankTier).
--
-- Bug 2026-06-29: a medalha SKILL no hover card vinha de profiles.mmr_atual (quase
-- sempre null) → Herald pra todo mundo, mesmo com o rank Valve real sincronizado em
-- user_stats_extended.career (STRATZ/OpenDota). Adiciona rank_tier + leaderboard_rank
-- ao retorno pra o card derivar a medalha do rank real (fallback MMR só sem carreira).
-- user_stats_extended tem SELECT público (stats_ext_select_all) — leitura segura.

-- Mudança no tipo de retorno (novas colunas) → CREATE OR REPLACE não basta.
drop function if exists public.get_public_mini_profile(uuid);

create or replace function public.get_public_mini_profile(p_user_id uuid)
returns table (
  user_id          uuid,
  name             text,
  avatar           text,
  steam_id_64      text,
  level            int,
  mmr              int,
  rank_tier        int,
  leaderboard_rank int,
  favorite_heroes  jsonb,
  friend_status    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    return;
  end if;

  return query
  select
    p.id,
    coalesce(sl.persona, p.username, 'Jogador')      as name,
    coalesce(sl.avatar_url, p.avatar_url)            as avatar,
    sl.steam_id_64,
    coalesce(ul.current_level, 1)                    as level,
    p.mmr_atual                                      as mmr,
    (use.career->>'rankTier')::int                   as rank_tier,
    (use.career->>'leaderboardRank')::int            as leaderboard_rank,
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
    end                                              as friend_status
  from profiles p
  left join steam_links sl on sl.user_id = p.id
  left join user_levels ul on ul.user_id = p.id
  left join user_stats_extended use on use.user_id = p.id
  where p.id = p_user_id;
end;
$$;

grant execute on function public.get_public_mini_profile(uuid) to authenticated;
