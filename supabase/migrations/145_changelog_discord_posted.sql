-- 145: rastreia se a entrada já foi espelhada no Discord (🆕 atualizações).
-- O cron (finalize-matches, 1x/min) posta as published ainda não postadas e carimba aqui.
alter table public.changelog_entries
  add column if not exists discord_posted_at timestamptz;

-- Backfill: as 16 entradas RETROATIVAS (seed 144) NÃO devem floodar o canal.
-- Marca todas as já publicadas como "já postadas" — só entradas NOVAS espelham daqui pra frente.
update public.changelog_entries
  set discord_posted_at = now()
  where published = true and discord_posted_at is null;

create index if not exists changelog_discord_pending_idx
  on public.changelog_entries (published, discord_posted_at)
  where published = true and discord_posted_at is null;
