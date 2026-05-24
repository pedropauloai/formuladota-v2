-- Migration 010 — purchases.payment_provider: default → mercadopago
-- Phase 4: AbacatePay era o provider Phase 2; Mercado Pago é o provider padrão daqui pra frente.
--
-- ATENÇÃO: payment_provider JÁ EXISTE em 001_initial_schema.sql com default 'abacatepay'.
-- Esta migration NÃO usa ADD COLUMN — usa ALTER COLUMN para mudar apenas o DEFAULT.
--
-- Historicamente: registros criados antes desta migration têm payment_provider='abacatepay' (correto).
-- Novos registros (MP PIX avulso Phase 4+) terão payment_provider='mercadopago' automaticamente.

-- Alterar default para novos registros de compras (MP é o provider padrão agora)
alter table public.purchases
  alter column payment_provider set default 'mercadopago';

-- Adicionar 'mercadopago' ao CHECK constraint se ainda não inclui.
-- Tentativa segura: se constraint já existir com esse nome, drop+recreate.
-- Se não existir, cria do zero.
do $$
begin
  -- Remove constraint antiga se existir (pode ter só 'abacatepay')
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'purchases'
      and constraint_name = 'purchases_payment_provider_check'
  ) then
    alter table public.purchases
      drop constraint purchases_payment_provider_check;
  end if;

  -- Recria com ambos providers
  alter table public.purchases
    add constraint purchases_payment_provider_check
    check (payment_provider in ('abacatepay', 'mercadopago'));
end $$;

-- Comentário: backfill de registros existentes não é necessário.
-- Registros Phase 2 (AbacatePay) já têm payment_provider='abacatepay' (valor salvo, não o default).
-- Registros Phase 4+ (MP) terão payment_provider='mercadopago' pelo novo default.
