-- 048 — Slots FIXOS por posição no lobby (pedido Pedro 2026-06-11)
--
-- Antes: lobby_players só guardava o TIME; a coluna preenchia de cima pra baixo
-- pela ordem de entrada. Comportamento correto (cliente Dota): o jogador escolhe
-- um slot ESPECÍFICO (pode entrar no 4 com o 1-3 vazios) e a troca respeita a
-- posição escolhida.
--
-- slot: 0..(max_players/2 - 1) pra radiant/dire; NULL pra espectador.
-- Índice único parcial garante 1 jogador por posição (race-safe: segundo clique
-- no mesmo slot leva 23505 → "Slot ocupado").

alter table public.lobby_players add column if not exists slot smallint;

-- Backfill dos lobbies existentes: posição sequencial por (lobby, time) na
-- ordem de entrada — preserva o visual atual das salas abertas.
with ranked as (
  select lobby_id, user_id,
         row_number() over (partition by lobby_id, team order by joined_at) - 1 as rn
  from public.lobby_players
  where team in ('radiant', 'dire')
)
update public.lobby_players lp
set slot = r.rn
from ranked r
where lp.lobby_id = r.lobby_id and lp.user_id = r.user_id and lp.slot is null;

create unique index if not exists lobby_players_slot_unique
  on public.lobby_players (lobby_id, team, slot)
  where slot is not null;
