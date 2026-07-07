-- =====================================================================
-- 153 — Remove o scaffolding MORTO de leaderboard-por-região.
--
-- Contexto: a migration 121 criou player_season_mmr.region (+ trigger de
-- snapshot + índice) imaginando um leaderboard regional. Na prática o RANKING
-- é GLOBAL (nenhuma query/RPC filtra por essa coluna). A região de JOGO vive
-- em profiles.region (fonte da verdade da fila/lobby) e match_queue.region —
-- essas continuam intactas. Aqui só limpamos a coluna que nunca foi usada.
--
-- Ordem: trigger → função → índice → coluna (a CHECK constraint cai junto com
-- a coluna). Tudo idempotente (IF EXISTS) — seguro reaplicar.
-- A action updateUserRegionAdmin deixou de escrever nessa coluna (mesmo PR).
-- =====================================================================

drop trigger if exists trg_set_season_mmr_region on public.player_season_mmr;

drop function if exists public.set_season_mmr_region();

drop index if exists public.idx_player_season_mmr_region;

alter table public.player_season_mmr
  drop column if exists region;
