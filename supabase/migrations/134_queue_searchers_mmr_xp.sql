-- 134_queue_searchers_mmr_xp.sql — Medalha + anel de XP na fila — Pedro 2026-07-04.
--
-- O painel de "quem está buscando" (sidebar) passa a mostrar a MESMA medalha do
-- /ranking (SeasonRankMedal por MMR) e o anel de XP preenchido. Pra isso o RPC
-- devolve o mmr da season ativa e o total_xp_earned de cada jogador na fila.
--
-- CREATE OR REPLACE mantém a assinatura antiga + 2 colunas novas (mmr, total_xp).

create or replace function public.get_queue_searchers()
returns table(
  user_id uuid, name text, avatar text, roles jsonb, level integer,
  honor_score integer, joined_at timestamptz, game_modes jsonb,
  mmr integer, total_xp integer
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    mq.user_id,
    coalesce(sl.persona, p.username, 'Jogador')                 as name,
    coalesce(sl.avatar_url, p.avatar_url)                       as avatar,
    coalesce(mq.roles, '[]'::jsonb)                             as roles,
    coalesce(ul.current_level, 1)                              as level,
    coalesce((
      select sum(hl.delta)::int from honor_ledger hl where hl.user_id = mq.user_id
    ), 0)                                                       as honor_score,
    mq.joined_at,
    to_jsonb(coalesce(mq.game_modes, array['all_pick']::text[])) as game_modes,
    (select psm.mmr from player_season_mmr psm
       join seasons s on s.id = psm.season_id and s.active
      where psm.user_id = mq.user_id)                           as mmr,
    coalesce(ul.total_xp_earned, 0)                            as total_xp
  from match_queue mq
  left join steam_links sl on sl.user_id = mq.user_id
  left join profiles    p  on p.id = mq.user_id
  left join user_levels ul on ul.user_id = mq.user_id
  where mq.status = 'waiting'
    and auth.uid() is not null
  order by mq.joined_at asc;
$function$;
