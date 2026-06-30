-- 077 — Enriquece get_public_mini_profile pro hover card "máximo": winrate de
-- carreira (career.wins/losses do cache STRATZ/OpenDota), recado (status_message)
-- e presença (last_seen_at). Tudo já existe no banco — o RPC só passa a expor sob
-- a barreira de colunas (profiles tem RLS restritiva; o RPC é SECURITY DEFINER).
-- Mensagens deixaram de ser "em breve" (sistema de DM, migration 074), então o
-- card precisa de dados ricos pra justificar a ação.

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
  career_wins      int,
  career_losses    int,
  status_message   text,
  last_seen_at     timestamptz,
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
    end                                              as friend_status
  from profiles p
  left join steam_links sl on sl.user_id = p.id
  left join user_levels ul on ul.user_id = p.id
  left join user_stats_extended use on use.user_id = p.id
  where p.id = p_user_id;
end;
$$;

grant execute on function public.get_public_mini_profile(uuid) to authenticated;
