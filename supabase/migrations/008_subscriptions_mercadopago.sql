-- Migration 008 — Subscriptions Mercado Pago Pix Automático (Phase 4)
-- Aplicada em 2026-05-03 via mcp__supabase__apply_migration.
--
-- Substitui a abordagem AbacatePay PIX Manual via Vercel Cron (descartada pós-pivot 2026-05-02).
-- Mercado Pago Pix Automático (Bacen 2025) suporta débito recorrente em PIX nativo via /preapproval API.
-- User autoriza UMA VEZ no init_point e MP cobra automaticamente todo mês.
--
-- Schema:
--   subscriptions     — lifecycle macro (1 row por user×preapproval)
--   has_active_subscription() — helper SQL pra Phase 5 consumir em policy lobbies.insert
--
-- Cancel híbrido (D-02): user cancela → status='cancelled' + cancelled_at set, mas helper
-- retorna true até next_payment_date passar (acesso preservado até fim do período pago).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mp_preapproval_id text unique,                            -- preencher no webhook authorized
  mp_plan_id text,                                           -- opcional, se Pedro criar plano fixo
  status text not null default 'pending'
    check (status in ('pending','authorized','paused','cancelled')),
  started_at timestamptz,                                    -- preenche no primeiro authorized
  next_payment_date timestamptz,                             -- crítico — helper consulta esse campo
  cancelled_at timestamptz,
  payment_method_id text default 'pix',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pending','authorized','paused');
-- Cancelled subscriptions não bloqueiam re-criação de nova subscription (user pode cancelar e reativar)

-- Trigger updated_at — reusa public.handle_updated_at se existe (Migration 001), senão criar
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_updated_at'
  ) then
    create or replace function public.handle_updated_at() returns trigger
    language plpgsql as $func$
    begin
      new.updated_at := now();
      return new;
    end;
    $func$;
  end if;
end $$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- Helper SQL has_active_subscription() — cancel híbrido implementado aqui
-- Phase 5 consumirá em policy lobbies.insert WITH CHECK (public.has_active_subscription())
create or replace function public.has_active_subscription() returns boolean
  language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('authorized', 'cancelled')
      and next_payment_date is not null
      and next_payment_date > now()
  );
$$;

-- RLS subscriptions
alter table public.subscriptions enable row level security;

drop policy if exists "users see own subscription" on public.subscriptions;
create policy "users see own subscription" on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users insert own subscription" on public.subscriptions;
create policy "users insert own subscription" on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- UPDATE/DELETE: apenas service-role (webhook handler bypassa RLS)
-- Sem policy explícita = bloqueado pra cookie clients.
