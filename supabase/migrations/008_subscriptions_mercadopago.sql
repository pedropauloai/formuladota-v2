-- Migration 008 — Subscriptions Mercado Pago + helper has_active_subscription()
-- Phase 4: assinatura mensal R$47 via MP Pix Automático (preapproval API)
--
-- Aplica: node scripts/apply-migration-008.mjs
-- Ou via MCP Supabase: mcp__supabase__apply_migration

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- MP retorna no POST /preapproval response
  mp_preapproval_id text unique,

  -- opcional — se Pedro criar plano fixo via MCP MP (não necessário pra V1 PIX)
  mp_plan_id text,

  -- Status lifecycle MP: pending → authorized → cancelled (paused tratado como cancelled em V1)
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paused', 'cancelled')),

  -- Preenchido no primeiro payment_authorized webhook
  started_at timestamptz,

  -- CRÍTICO para cancel híbrido: acesso válido até next_payment_date mesmo após cancel
  next_payment_date timestamptz,

  -- Data em que o user (ou MP) cancelou
  cancelled_at timestamptz,

  -- 'pix' após user autorizar no init_point (vazio antes da autorização)
  payment_method_id text default 'pix',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para consultas por user + status (padrão em has_active_subscription)
create index subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

-- Garante que user tem no máximo 1 assinatura ativa/pendente/cancelada por vez.
-- Status 'paused' é tratado separadamente (excluído do índice único).
create unique index subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pending', 'authorized', 'cancelled');

-- Trigger updated_at (reutiliza função criada em 001_initial_schema.sql)
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =========================================
-- HELPER: has_active_subscription()
-- =========================================
-- Retorna true se o usuário autenticado tem assinatura válida.
-- Cancel híbrido: status='cancelled' + next_payment_date > now() = ainda ativo.
-- Consumido em Phase 5 (lobbies gate) via RLS e em Server Components.
create or replace function public.has_active_subscription()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = auth.uid()
      and status in ('authorized', 'cancelled')  -- cancel híbrido: cancelled ainda conta
      and next_payment_date > now()
  );
$$;

-- =========================================
-- RLS
-- =========================================
alter table public.subscriptions enable row level security;

-- User vê apenas sua própria assinatura
create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- User pode inserir sua própria assinatura (Server Action createSubscription usa cookie client)
create policy "subscriptions_insert_own"
  on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

-- UPDATE e DELETE são service-role only (webhook handler em /api/webhooks/mercadopago)
-- Sem policy de UPDATE/DELETE = apenas service role (bypass RLS) consegue alterar.
-- Isso garante que o estado da assinatura só muda via eventos do MP, nunca via client.
