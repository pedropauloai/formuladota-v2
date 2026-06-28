-- 062 — RPC get_queue_searchers(): quem está findando AGORA (painel do find).
--
-- match_queue tem RLS self → o cliente não enxerga a fila inteira. Esta função
-- SECURITY DEFINER devolve, pra cada waiting, só dados PÚBLICOS de competição:
-- identidade Steam (persona + avatar, igual à página da partida), as funções
-- filadas e o NÍVEL/HONOR (current_level + soma do honor_ledger). Nada privado.
--
-- Só pra logados: grant apenas a authenticated + guarda auth.uid() is not null.
-- Depende da 061 (queue_live_stats + trigger em match_queue + publication) — o
-- painel usa o evento de realtime da fila como sinal pra refetchar esta função.

create or replace function public.get_queue_searchers()
returns table (
  user_id     uuid,
  name        text,
  avatar      text,
  roles       jsonb,
  level       int,
  honor_score int,
  joined_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    mq.user_id,
    coalesce(sl.persona, p.username, 'Jogador')                 as name,
    coalesce(sl.avatar_url, p.avatar_url)                       as avatar,
    coalesce(mq.roles, '[]'::jsonb)                             as roles,
    coalesce(ul.current_level, 1)                              as level,
    coalesce((
      select sum(hl.delta)::int from honor_ledger hl where hl.user_id = mq.user_id
    ), 0)                                                       as honor_score,
    mq.joined_at
  from match_queue mq
  left join steam_links sl on sl.user_id = mq.user_id
  left join profiles    p  on p.id = mq.user_id
  left join user_levels ul on ul.user_id = mq.user_id   -- nível/HONOR (current_level)
  where mq.status = 'waiting'
    and auth.uid() is not null   -- só pra logados (defesa extra além do grant)
  order by mq.joined_at asc;
$$;

grant execute on function public.get_queue_searchers() to authenticated;
