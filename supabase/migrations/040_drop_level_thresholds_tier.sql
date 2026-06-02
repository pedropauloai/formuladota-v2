-- 040 — Limpeza: remove coluna orfa level_thresholds.tier.
-- O tier agora deriva do nivel via getTierForLevel (src/lib/levels.ts) — a coluna
-- (valores antigos bronze/silver/etc) nao e mais lida por nenhum codigo.
-- Aplicado em prod via Supabase MCP em 2026-06-02.
alter table public.level_thresholds drop column if exists tier;
