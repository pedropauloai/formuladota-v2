-- 052 — Arquitetura de liga (ticket) pras partidas DA PLATAFORMA (Pedro 2026-06-11)
--
-- Separação canônica de dados:
--   CARREIRA (conta pessoal no Dota) → cache user_stats_extended.career (APIs
--     de jogador STRATZ/OpenDota). Nunca mistura com plataforma.
--   PLATAFORMA (partidas realizadas via FormulaDota) → matches/match_players.
--     As salas de lobby serão criadas pelo bot Steam SEMPRE com o ticket da
--     nossa LIGA — toda partida da plataforma nasce com league_id, o que
--     permite coletar resultados via API por liga (STRATZ league/OpenDota
--     leagues/{id}/matches) de forma confiável, sem depender do jogador.
--
-- O bot ainda não existe (hooks prontos) — estas colunas são o contrato.

alter table public.lobbies
  add column if not exists league_id bigint;

alter table public.matches
  add column if not exists league_id bigint;

comment on column public.lobbies.league_id is
  'Ticket de liga usado pelo bot ao criar a sala no Dota — toda partida da plataforma pertence à nossa liga.';
comment on column public.matches.league_id is
  'Liga (ticket) da partida — permite coleta via API por league_id em vez de depender do jogador.';

create index if not exists matches_league_idx
  on public.matches (league_id) where league_id is not null;
