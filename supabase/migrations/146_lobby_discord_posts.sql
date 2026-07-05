-- 146: rastreia posts no Discord por lobby (fila "partida formada" + resultados).
-- O cron posta os pendentes e carimba aqui, sem duplicar. NÃO faz backfill de
-- posted (deixa NULL) → as partidas existentes entram no retroativo do canal.
alter table public.lobbies
  add column if not exists formed_discord_posted_at timestamptz,   -- 🔎 fila (partida formada/iniciada)
  add column if not exists result_discord_posted_at timestamptz;   -- 📊 resultados (placar final)

create index if not exists lobbies_result_pending_idx
  on public.lobbies (status, result_discord_posted_at)
  where result_discord_posted_at is null and dota_match_id is not null;
