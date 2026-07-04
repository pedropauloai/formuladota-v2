-- 122_subscription_tiers.sql — Tiers Plus/Premium + multi-provedor — Pedro 2026-07-04.
--
-- Modelo freemium matchmaking: FREE = jogar; pagos = Plus (R$27,90 BR /
-- US$4,99 LATAM / €6,99 EU) e Premium (R$97,90 / US$17,99 / €19,99).
-- BR paga via Mercado Pago (Pix Automático, preapproval); LATAM/EU via Stripe
-- (FASE 4). Fichas avulsas NÃO são vendidas.
--
-- Benefícios (decisão Pedro 2026-07-04):
--   Plus:    criar salas · XP boost passe · cosméticos · flair de assinante
--   Premium: tudo do Plus + lobby elite Imortal (mantém gates de skill) ·
--            XP boost maior · cosméticos Godlike · prioridade/análise com PRO
-- Assinatura NUNCA compra vantagem competitiva (MMR/fila/permissão).

-- =====================================================================
-- 1. Colunas novas em subscriptions
-- =====================================================================
alter table public.subscriptions
  add column if not exists tier text not null default 'plus'
    constraint subscriptions_tier_check check (tier in ('plus','premium')),
  add column if not exists provider text not null default 'mp'
    constraint subscriptions_provider_check check (provider in ('mp','stripe')),
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;

-- IDs Stripe únicos quando presentes (webhook idempotente faz upsert por eles).
create unique index if not exists subscriptions_stripe_sub_id_uniq
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.subscriptions.tier is
  'plus | premium. Premium inclui tudo do Plus (has_subscription_tier trata a hierarquia).';
comment on column public.subscriptions.provider is
  'mp (Mercado Pago, BR) | stripe (LATAM/EU). Webhooks de cada provedor só tocam nas próprias linhas.';

-- =====================================================================
-- 2. Helpers de tier
-- =====================================================================
-- Tier ativo do usuário logado (null = sem assinatura válida).
-- Mesma regra de validade do has_active_subscription (cancel híbrido:
-- cancelled + next_payment_date futuro ainda vale). Admin = premium.
create or replace function public.active_subscription_tier()
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when public.is_admin() then 'premium'
    else (
      select s.tier
      from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('authorized', 'cancelled')
        and s.next_payment_date is not null
        and s.next_payment_date > now()
      order by case s.tier when 'premium' then 0 else 1 end
      limit 1
    )
  end;
$$;

-- true se o usuário tem PELO MENOS o tier pedido (premium satisfaz plus).
create or replace function public.has_subscription_tier(p_tier text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case p_tier
    when 'plus'    then public.active_subscription_tier() in ('plus', 'premium')
    when 'premium' then public.active_subscription_tier() = 'premium'
    else false
  end;
$$;

grant execute on function public.active_subscription_tier() to authenticated;
grant execute on function public.has_subscription_tier(text) to authenticated;

-- has_active_subscription() (gate de criar sala etc.) segue válido: Plus E
-- Premium contam — nenhuma mudança necessária nesses gates.

-- =====================================================================
-- 3. Lobby elite Imortal agora é benefício PREMIUM (decisão Pedro 2026-07-04).
--    Mantém os gates de skill intactos: Imortal Valve (mmr>=6000) + Místico
--    (nível 30). Só o requisito de assinatura sobe de "qualquer" pra premium.
--    (Base: can_join_elite da migration 044.)
-- =====================================================================
create or replace function public.can_join_elite(p_uid uuid)
returns boolean language plpgsql security definer set search_path = public stable as $$
declare
  v_premium boolean;
  v_mmr int;
  v_level int;
begin
  select exists(
    select 1 from subscriptions
    where user_id = p_uid
      and tier = 'premium'
      and status in ('authorized', 'cancelled')  -- cancel híbrido
      and next_payment_date is not null
      and next_payment_date > now()
  ) into v_premium;
  select mmr_atual into v_mmr from profiles where id = p_uid;
  select current_level into v_level from user_levels where user_id = p_uid;
  return coalesce(v_premium, false)
     and coalesce(v_mmr, 0) >= 6000      -- Imortal Valve
     and coalesce(v_level, 1) >= 30;     -- Místico (nível 30)
end;
$$;

-- =====================================================================
-- 4. Fix de bug latente: reactivateSubscription/createSubscription deletam
--    linhas pending/cancelled via cliente AUTENTICADO, mas a m008 não criou
--    policy de DELETE — o delete falhava silencioso e o unique parcial
--    subscriptions_one_active_per_user bloqueava a recriação. Permite deletar
--    APENAS a própria linha NÃO-ativa (authorized continua intocável).
-- =====================================================================
drop policy if exists subscriptions_delete_own_inactive on public.subscriptions;
create policy subscriptions_delete_own_inactive
  on public.subscriptions
  for delete
  using (
    auth.uid() = user_id
    and status in ('pending', 'cancelled', 'paused')
  );
