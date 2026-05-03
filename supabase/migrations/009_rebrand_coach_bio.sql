-- Migration 009 — Rebrand bio coach (remover menção "Pedro Paulo", alinhar com B6)
-- Aplicada em 2026-05-03 via mcp__supabase__apply_migration.
--
-- Phase 3.5 rebrand B6: ZERO menção "Pedro Paulo" / "PPA" em UI/emails.
-- Bio coach Pedro foi inserida em Migration 006 com nome próprio — agora rebrand pra texto genérico.
-- Slug "pedro-paulo" mantém (técnico/URL interno V3 multi-coach).

update public.coaches
set bio = 'Coach Immortal — Top 0.5% / 7000 MMR. Mais de 15 anos de Dota 2, 50.000h+ jogadas. Criador da metodologia FORMULADOTA de progressão em ranked.'
where slug = 'pedro-paulo';
