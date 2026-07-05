-- 142_lobby_live_stats.sql — telemetria AO VIVO da partida — Pedro 2026-07-05.
--
-- Habilita mostrar heróis + net worth/KDA em tempo real (delay DotaTV) no placar.
-- Fonte: Steam WebAPI GetRealtimeStats (funciona porque a partida é league match).
--   - server_steam_id: id do servidor da partida, capturado pelo bot do SO cache no
--     lançamento (é o que o GetRealtimeStats exige).
--   - live_stats: snapshot NORMALIZADO pelo bot (times radiant/dire + jogadores com
--     hero_id/level/k/d/a/net_worth + game_time). O site só lê e desenha.
--   - live_stats_at: quando o snapshot foi atualizado (pro site saber se está fresco).
--
-- ALTER ADD COLUMN é rápido e não-bloqueante. Reload do schema logo após (fora deste
-- arquivo, via NOTIFY) pra o PostgREST enxergar as colunas na hora.

alter table public.lobbies
  add column if not exists server_steam_id text,
  add column if not exists live_stats jsonb,
  add column if not exists live_stats_at timestamptz;
