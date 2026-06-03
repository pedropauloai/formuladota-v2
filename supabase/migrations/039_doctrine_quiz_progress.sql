-- 039 — Persistencia do Ritual de Doutrinacao (niveis 0->6).
-- Aditivo e nao-destrutivo: coluna jsonb com o set de IDs de questoes respondidas
-- corretamente. Resume cross-device + gate de "doutrinado". Segue o padrao de outras
-- colunas jsonb em profiles (favorite_heroes, dashboard_layout).
-- Aplicado em prod via Supabase MCP em 2026-06-02.

alter table public.profiles
  add column if not exists doctrine_quiz_progress jsonb not null default '[]'::jsonb;

comment on column public.profiles.doctrine_quiz_progress is
  'IDs das questoes do Ritual de Doutrinacao respondidas corretamente (niveis 0->6). Set persistido pra resume cross-device; doutrinado quando cobre o banco. Ver src/lib/quiz + docs/foundations/PROGRESSION_PUBLIC.md';
