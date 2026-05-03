-- Migration 010 — purchases.payment_provider (Phase 4 Mercado Pago migration)
-- Aplicada em 2026-05-03 via mcp__supabase__apply_migration.
--
-- Phase 2 (AbacatePay) foi completamente migrado pra Mercado Pago em 2026-05-02 (Phase 4).
-- Adicionando coluna payment_provider pra rastrear provider de cada purchase.
-- Registros existentes (pré-Phase 4) marcados como 'abacatepay' historical.
-- Registros novos (pós-Phase 4) default 'mercadopago'.

alter table public.purchases
  add column if not exists payment_provider text default 'mercadopago' not null
  check (payment_provider in ('abacatepay', 'mercadopago'));

-- Backfill rows existentes (Phase 2 era AbacatePay).
-- Idempotente: se rodou 2x, segunda vez não muda nada (rows já têm provider != 'mercadopago')
update public.purchases
set payment_provider = 'abacatepay'
where created_at < '2026-05-03'::timestamptz
  and payment_provider = 'mercadopago';
