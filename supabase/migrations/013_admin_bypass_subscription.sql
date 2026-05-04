-- Migration 013 — Admin bypass: helper has_active_subscription() retorna true pra admins
-- Aplicada 2026-05-03 via mcp__supabase__apply_migration.
-- Pedro pediu — admin não precisa pagar mensalidade.
--
-- Antes (Migration 008): helper só checava subscriptions table.
-- Depois (esta): retorna true se is_admin() OU subscription ativa/cancelada-em-período.

create or replace function public.has_active_subscription() returns boolean
  language sql stable security definer set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and status in ('authorized', 'cancelled')
        and next_payment_date is not null
        and next_payment_date > now()
    );
$$;
