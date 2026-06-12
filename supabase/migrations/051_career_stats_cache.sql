-- 051 — Cache de stats de carreira do jogador (pacote perfil — Pedro 2026-06-11)
--
-- user_stats_extended ganha a coluna `career` (jsonb): payload completo dos
-- endpoints de jogador da OpenDota validados com a conta real do Pedro:
--   /players      → rank_tier, leaderboard_rank
--   /players/wl   → win, lose (winrate de carreira)
--   /players/heroes → top heróis (jogos, vitórias, last_played)
--   /players/totals → acumulados (kills, assists, last_hits, ...)
-- TTL de sync segue o padrão existente (last_synced_at, 24h).
-- jsonb flexível > N colunas: é CACHE de API externa, shape evolui com a API.

alter table public.user_stats_extended
  add column if not exists career jsonb;
