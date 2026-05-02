---
phase: 04-subscription-mensal
plan: 01
plan_id: 04-01
title: Migration 008 — subscriptions + subscription_charges + helper has_active_subscription + RLS
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/008_subscription_pix_manual.sql
  - src/types/database.ts
autonomous: true
requirements:
  - H2.2
  - H2.3
  - C4
  - C12
must_haves:
  truths:
    - "Tabela public.subscriptions existe com check status IN ('pendente','active','cancelled','overdue','expired') + RLS ativa"
    - "Tabela public.subscription_charges existe com FK purchase_id → public.purchases UNIQUE (reusa idempotência Phase 2)"
    - "Helper public.has_active_subscription() retorna boolean true quando status IN ('active','cancelled') AND next_due_at > now() (cancel híbrido D-02)"
    - "Helper público.has_active_subscription() executável por authenticated (grant execute)"
    - "RLS subscriptions: SELECT owner-or-admin + INSERT owner-only — SEM policy UPDATE/DELETE (service-role only via webhook/cron)"
    - "RLS subscription_charges: SELECT via subscriptions.user_id-or-admin — SEM policy INSERT/UPDATE/DELETE (service-role only per C13)"
    - "Unique partial index subscriptions_one_active_per_user em (user_id) WHERE status IN ('pendente','active','cancelled','overdue') — evita duplicação"
    - "Unique index subscription_charges_unique_period em (subscription_id, period_start) — evita charge duplicado pro mesmo período"
    - "Trigger updated_at em subscriptions via public.set_updated_at() existente em Migration 001"
    - "src/types/database.ts contém types Row/Insert/Update das 2 novas tables com Relationships:[] e function has_active_subscription"
  artifacts:
    - path: "supabase/migrations/008_subscription_pix_manual.sql"
      provides: "DDL completa Phase 4 — schema PIX Manual Mensal (subscriptions lifecycle + subscription_charges PIX individual + helper RLS)"
      contains: "create table if not exists public.subscriptions, create table if not exists public.subscription_charges, create or replace function public.has_active_subscription"
    - path: "src/types/database.ts"
      provides: "Types regenerados pós-Migration 008 com subscriptions, subscription_charges e Functions.has_active_subscription"
      contains: "subscriptions: {, subscription_charges: {, has_active_subscription:"
  key_links:
    - from: "supabase/migrations/008_subscription_pix_manual.sql"
      to: "public.purchases (Phase 2 idempotência)"
      via: "FK subscription_charges.purchase_id → public.purchases(id) on delete restrict"
      pattern: "references public\\.purchases\\(id\\) on delete restrict"
    - from: "supabase/migrations/008_subscription_pix_manual.sql"
      to: "public.profiles (cascade delete)"
      via: "FK subscriptions.user_id → public.profiles(id) on delete cascade"
      pattern: "references public\\.profiles\\(id\\) on delete cascade"
    - from: "public.has_active_subscription()"
      to: "Phase 5 lobbies RLS (futuro)"
      via: "grant execute to authenticated — Phase 5 consome em WITH CHECK"
      pattern: "grant execute on function public\\.has_active_subscription\\(\\)"
---

<objective>
Aplicar Migration 008 que cria fundação SQL da Phase 4 (Subscription PIX Manual Mensal): tabela `subscriptions` (lifecycle macro), tabela `subscription_charges` (cobrança PIX individual mensal, FK reusa `purchases` Phase 2 pra idempotência), helper RLS `public.has_active_subscription()` (consumido pela Phase 5 quando `lobbies` existir), policies cookie-client-only (INSERT subscriptions) e service-role-only (charges + UPDATE subscriptions).

Esta é a fundação de TODA a Phase 4 — sem isso, webhook extension, cron handler, Server Actions e página /assinatura não funcionam. Mais nenhum plan da Phase 4 pode rodar antes deste.

Pattern reusa convenções estabelecidas em Migrations 002, 004, 005, 007: idempotência via `create table if not exists`, `drop policy if exists`, `create or replace function`. Helper segue padrão `security definer set search_path = public` per Migration 002 (`is_admin()`).

Purpose: Centralizar todo DDL da Phase 4 numa migration única e idempotente, permitindo reaplicação segura em sandbox e produção.

Output:
- `supabase/migrations/008_subscription_pix_manual.sql` aplicado no projeto Supabase `nyvbfdsxjpiwgdroptdi`
- `src/types/database.ts` regenerado contendo `subscriptions`, `subscription_charges` e função `has_active_subscription`
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-subscription-mensal/04-CONTEXT.md
@.planning/phases/04-subscription-mensal/04-RESEARCH.md
@supabase/migrations/001_initial_schema.sql
@supabase/migrations/002_rls_policies.sql
@supabase/migrations/004_doctrine_and_moderation.sql
@supabase/migrations/005_steam_roles_multicoach.sql
@src/types/database.ts

<interfaces>
<!-- Helper is_admin() existente (Migration 002 — replicar pattern security definer) -->
```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
```

<!-- Trigger updated_at existente (Migration 001) — REUSAR -->
```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- ATENÇÃO: nome correto é set_updated_at (não handle_updated_at como em Research §3)
```

<!-- Tabela purchases existente (Migration 001) — FK target -->
```sql
public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete restrict,
  status text not null check (status in ('pendente','pago','expirado','cancelado')),
  external_payment_id text,
  ...
)
```

<!-- Pattern Database type a manter (cada table requer Row/Insert/Update + Relationships:[]) -->
```typescript
// src/types/database.ts top-level requer:
//   Views: Record<never, never>;
//   Functions: { has_active_subscription: { Args: ...; Returns: boolean }; ... }
// (Phase 2 viu queries retornarem 'never' sem isso)
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar arquivo Migration 008 com 2 tabelas, helper RLS, policies e indexes</name>
  <files>supabase/migrations/008_subscription_pix_manual.sql</files>
  <read_first>
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-08 tem SQL skeleton — usar como base, com correções desta task)
    - .planning/phases/04-subscription-mensal/04-RESEARCH.md §3 (Migration patterns — idempotente)
    - supabase/migrations/004_doctrine_and_moderation.sql (pattern multi-bloco com seções comentadas)
    - supabase/migrations/005_steam_roles_multicoach.sql (pattern DO $$ blocks idempotentes)
    - supabase/migrations/002_rls_policies.sql linhas 1-50 (pattern is_admin helper + RLS)
    - supabase/migrations/001_initial_schema.sql linhas 142-160 (função set_updated_at — nome canônico, NÃO handle_updated_at)
  </read_first>
  <action>
Criar arquivo `supabase/migrations/008_subscription_pix_manual.sql` com o SQL completo abaixo (copiar literalmente). Cabeçalho em PT-BR explica contexto Phase 4.

```sql
-- formuladota v2 — Phase 4 Migration 008
-- Subscription Mensal PIX Manual (R$ 47/mês via Vercel Cron + Transparent PIX)
-- Tabela subscriptions (lifecycle macro) + subscription_charges (cobrança individual)
-- + helper has_active_subscription() consumido pela Phase 5 (lobbies RLS).
--
-- IMPORTANTE: AbacatePay subscription nativa NÃO é usada (suporta apenas CARD).
-- Mensalidade é PIX manual mensal: cron cria Transparent PIX, webhook completa,
-- next_due_at avança 30d. Reusa idempotência Phase 2 via FK purchases.
--
-- Idempotente: create if not exists, drop policy if exists, create or replace function.

-- =========================================
-- 1. TABELA subscriptions — lifecycle macro
-- =========================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Status lifecycle:
  -- 'pendente': criada, primeiro PIX gerado, aguardando pagamento
  -- 'active':   transparent.completed recebido, acesso liberado
  -- 'cancelled': user cancelou — cancel híbrido D-02 (acesso preservado até next_due_at)
  -- 'overdue':  next_due_at < now() - 5d sem pagamento (cron sweep)
  -- 'expired':  helper detecta cancelled + next_due_at < now() (manual/admin transition)
  status text not null default 'pendente'
    check (status in ('pendente','active','cancelled','overdue','expired')),

  started_at timestamptz,        -- preenche no primeiro transparent.completed
  next_due_at timestamptz,       -- crítico — helper has_active_subscription() usa este campo
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

-- Garante 1 subscription "viva" por user — evita duplo checkout
-- Cancelled/overdue mantidos no conjunto pra forçar reativação na mesma row
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pendente','active','cancelled','overdue');

-- =========================================
-- 2. TABELA subscription_charges — cobrança individual (1 por mês ativo)
-- =========================================
create table if not exists public.subscription_charges (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  -- FK pra purchases reusa idempotência Phase 2 (UPDATE conditional WHERE status='pendente')
  -- on delete restrict — não dropar purchase paga sem antes dropar charge
  purchase_id uuid unique not null references public.purchases(id) on delete restrict,

  period_start timestamptz not null,
  period_end timestamptz not null,            -- period_start + 30 days

  status text not null default 'pending'
    check (status in ('pending','paid','expired','refunded')),

  created_at timestamptz not null default now()
);

create index if not exists subscription_charges_subscription_id_idx
  on public.subscription_charges (subscription_id);

-- Garante 1 charge por subscription por período (cron rodando 2x no mesmo dia = skip)
create unique index if not exists subscription_charges_unique_period
  on public.subscription_charges (subscription_id, period_start);

-- =========================================
-- 3. TRIGGER updated_at em subscriptions
-- Reusa public.set_updated_at() de Migration 001 (NOME CANÔNICO — não handle_updated_at)
-- =========================================
drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =========================================
-- 4. RLS subscriptions
-- SELECT: owner OR admin
-- INSERT: owner only (Server Action createInitialSubscription via cookie client)
-- UPDATE/DELETE: SEM policy — service-role only (webhook handler + cron)
-- =========================================
alter table public.subscriptions enable row level security;

drop policy if exists "users see own subscription" on public.subscriptions;
create policy "users see own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users insert own subscription" on public.subscriptions;
create policy "users insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- Sem UPDATE/DELETE policies — apenas service-role (per C13 + decisão D-08)

-- =========================================
-- 5. RLS subscription_charges
-- SELECT: via subscription owner OR admin
-- INSERT/UPDATE/DELETE: SEM policy — service-role only (cron + webhook per C13)
-- =========================================
alter table public.subscription_charges enable row level security;

drop policy if exists "users see own charges" on public.subscription_charges;
create policy "users see own charges"
  on public.subscription_charges for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  );

-- Sem INSERT/UPDATE/DELETE — apenas service-role (cron job + webhook handler)

-- =========================================
-- 6. HELPER has_active_subscription()
-- Retorna true quando user logado tem subscription:
--   status='active'    com next_due_at > now()  (assinatura corrente)
--   OR status='cancelled' com next_due_at > now()  (cancel híbrido D-02 — acesso até fim período)
-- Phase 5 consome em: lobbies WITH CHECK (public.has_active_subscription())
-- =========================================
create or replace function public.has_active_subscription()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active','cancelled')
      and next_due_at > now()
  );
$$;

grant execute on function public.has_active_subscription() to authenticated;
```

Conferir:
1. NOME da função trigger é `set_updated_at` (Migration 001 linha 143), NÃO `handle_updated_at` como aparece em Research §3 — Research está incorreto, código real do projeto usa `set_updated_at`.
2. Helper `is_admin()` já existe em Migration 002 — referenciar diretamente sem recriar.
3. Sem seed inicial (Phase 4 não cria nenhuma subscription — primeira é via Server Action createInitialSubscription).
4. Comentários PT-BR no header e em cada seção (per C12).
  </action>
  <verify>
    <automated>test -f supabase/migrations/008_subscription_pix_manual.sql && grep -q "create table if not exists public.subscriptions" supabase/migrations/008_subscription_pix_manual.sql && grep -q "create table if not exists public.subscription_charges" supabase/migrations/008_subscription_pix_manual.sql && grep -q "create or replace function public.has_active_subscription" supabase/migrations/008_subscription_pix_manual.sql && grep -q "set_updated_at" supabase/migrations/008_subscription_pix_manual.sql && grep -q "purchase_id uuid unique not null references public.purchases" supabase/migrations/008_subscription_pix_manual.sql && grep -q "grant execute on function public.has_active_subscription() to authenticated" supabase/migrations/008_subscription_pix_manual.sql && echo OK</automated>
  </verify>
  <acceptance_criteria>
    - "supabase/migrations/008_subscription_pix_manual.sql exists"
    - "File contains 'create table if not exists public.subscriptions' (case-sensitive)"
    - "File contains 'create table if not exists public.subscription_charges'"
    - "File contains 'create or replace function public.has_active_subscription'"
    - "File contains 'check (status in (''pendente'',''active'',''cancelled'',''overdue'',''expired''))'"
    - "File contains 'purchase_id uuid unique not null references public.purchases(id) on delete restrict'"
    - "File contains 'execute function public.set_updated_at()' (NOT handle_updated_at)"
    - "File contains 'grant execute on function public.has_active_subscription() to authenticated'"
    - "File contains 'where status in (''pendente'',''active'',''cancelled'',''overdue'')' (partial unique index status set)"
    - "File contains 'security definer set search_path = public' for helper function"
  </acceptance_criteria>
  <done>
    Arquivo `supabase/migrations/008_subscription_pix_manual.sql` criado com SQL completo (2 tabelas + helper + RLS + indexes). Idempotente — pode ser executado múltiplas vezes sem erro.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Aplicar Migration 008 no projeto Supabase via Supabase MCP</name>
  <files>(none — invocação MCP, sem mudança de arquivo)</files>
  <read_first>
    - supabase/migrations/008_subscription_pix_manual.sql (criado em Task 1)
    - .planning/STATE.md linhas 76-83 (lista de migrations já aplicadas — confirmar 007 é última)
  </read_first>
  <action>
Aplicar Migration 008 no projeto Supabase `nyvbfdsxjpiwgdroptdi` via tool Supabase MCP.

Comando MCP a executar (executor terá acesso a `mcp__supabase__apply_migration`):
```
mcp__supabase__apply_migration({
  project_id: "nyvbfdsxjpiwgdroptdi",
  name: "008_subscription_pix_manual",
  query: "<conteúdo completo de supabase/migrations/008_subscription_pix_manual.sql>"
})
```

Se MCP não estiver disponível na sessão (vide STATE.md linha 130 — Phase 3 caiu de volta em script Node), fallback: criar `scripts/apply-migration-008.mjs` espelhando `scripts/apply-migration-005.mjs` (mesmo pattern session pooler aws-1-sa-east-1:5432), executar via:
```
node scripts/apply-migration-008.mjs
```

Conferir output: deve listar criação de 2 tabelas, 4 indexes (1 PK + 1 status + 1 partial unique + 1 charges PK + 1 subscription_id + 1 unique period), 1 trigger, 3 policies (1 select subscriptions + 1 insert subscriptions + 1 select charges), 1 function helper. Sem erros.

Validação adicional pós-apply via MCP `mcp__supabase__execute_sql`:
```sql
select count(*) from information_schema.tables
where table_schema='public' and table_name in ('subscriptions','subscription_charges');
-- Deve retornar 2

select pg_get_functiondef('public.has_active_subscription()'::regprocedure);
-- Deve retornar definição da função
```
  </action>
  <verify>
    <automated>node -e "console.log('Verificação manual via MCP — vide acceptance_criteria')"</automated>
  </verify>
  <acceptance_criteria>
    - "Supabase MCP execute_sql 'select count(*) from information_schema.tables where table_schema=public and table_name=subscriptions' returns 1"
    - "Supabase MCP execute_sql 'select count(*) from information_schema.tables where table_schema=public and table_name=subscription_charges' returns 1"
    - "Supabase MCP execute_sql 'select pg_get_functiondef(public.has_active_subscription()::regprocedure)' returns non-null body containing 'status in'"
    - "Supabase MCP execute_sql 'select count(*) from pg_policies where tablename=subscriptions' returns 2 (select + insert)"
    - "Supabase MCP execute_sql 'select count(*) from pg_policies where tablename=subscription_charges' returns 1 (select only)"
    - "Supabase MCP execute_sql 'select count(*) from pg_indexes where tablename=subscriptions and indexname=subscriptions_one_active_per_user' returns 1"
    - "No error output during migration apply"
  </acceptance_criteria>
  <done>
    Migration 008 aplicada com sucesso no Supabase. 2 tabelas + helper + indexes + RLS criados. Re-execução é idempotente (sem erro em segundo apply).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Regenerar src/types/database.ts pós-Migration 008 via Supabase MCP</name>
  <files>src/types/database.ts</files>
  <read_first>
    - src/types/database.ts (estado atual — checar shape Tables/Views/Functions)
    - .planning/STATE.md linha 125 ("Database.ts precisa Relationships:[] + Views: Record<never, never>")
  </read_first>
  <action>
Regenerar `src/types/database.ts` via Supabase MCP `mcp__supabase__generate_typescript_types`:
```
mcp__supabase__generate_typescript_types({ project_id: "nyvbfdsxjpiwgdroptdi" })
```

O retorno é o conteúdo TypeScript completo. SOBRESCREVER `src/types/database.ts` integralmente.

Conferir resultado:
1. `Database.public.Tables.subscriptions` existe com:
   - `Row`: `{ id: string; user_id: string; status: "pendente" | "active" | "cancelled" | "overdue" | "expired"; started_at: string | null; next_due_at: string | null; cancelled_at: string | null; created_at: string; updated_at: string }`
   - `Insert` e `Update` análogos
   - `Relationships: [...]` (FK pra profiles)
2. `Database.public.Tables.subscription_charges` existe com:
   - `Row`: `{ id, subscription_id, purchase_id, period_start, period_end, status: "pending"|"paid"|"expired"|"refunded", created_at }`
   - `Relationships: [...]` (FKs subscriptions + purchases)
3. `Database.public.Functions.has_active_subscription` existe com `{ Args: Record<PropertyKey, never>; Returns: boolean }`.
4. `Database.public.Views: Record<never, never>` mantido (per Phase 2 lesson).

Após sobrescrever, rodar typecheck:
```
pnpm typecheck
```
Deve passar sem erros (zero erros novos introduzidos pela regeneração).
  </action>
  <verify>
    <automated>grep -q "subscriptions:" src/types/database.ts && grep -q "subscription_charges:" src/types/database.ts && grep -q "has_active_subscription:" src/types/database.ts && grep -q '"pendente" | "active" | "cancelled" | "overdue" | "expired"' src/types/database.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - "src/types/database.ts contains 'subscriptions: {'"
    - "src/types/database.ts contains 'subscription_charges: {'"
    - "src/types/database.ts contains 'has_active_subscription:'"
    - "src/types/database.ts contains string literal '\"pendente\" | \"active\" | \"cancelled\" | \"overdue\" | \"expired\"' (status enum)"
    - "src/types/database.ts contains 'Returns: boolean' under has_active_subscription"
    - "src/types/database.ts contains 'period_start: string' and 'period_end: string'"
    - "pnpm typecheck exits 0"
  </acceptance_criteria>
  <done>
    `src/types/database.ts` regenerado com types das 2 novas tabelas + função helper. `pnpm typecheck` passa.
  </done>
</task>

</tasks>

<verification>
Pós-execução, validar via Supabase MCP:
```sql
-- Test helper retorna false sem subscription
select public.has_active_subscription();
-- Esperado: false (sem auth.uid context)

-- Test inserir subscription ativa, helper retorna true (precisa auth.uid setado)
-- Validação real será no Plan 04-06 (Server Actions + página /assinatura)
```

Validar `src/types/database.ts` tem as 2 novas tables + Function:
```bash
pnpm typecheck
```

Validar Migration 008 é idempotente:
- Re-aplicar Migration 008 — deve completar sem erro (tudo `if not exists` / `drop ... if exists` / `create or replace`).
</verification>

<success_criteria>
- [x] `supabase/migrations/008_subscription_pix_manual.sql` criado com SQL completo
- [x] Migration 008 aplicada no Supabase project nyvbfdsxjpiwgdroptdi sem erros
- [x] `src/types/database.ts` regenerado com types subscriptions, subscription_charges, has_active_subscription
- [x] `pnpm typecheck` exits 0
- [x] RLS ativada nas 2 tabelas (vide acceptance_criteria Task 2 — pg_policies count)
- [x] Helper `has_active_subscription()` retorna boolean executável por authenticated role
- [x] Re-aplicar Migration 008 é idempotente (zero erros em segundo apply)
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-01-SUMMARY.md` seguindo template `C:/Users/ADM/.claude/get-shit-done/templates/summary.md` com:
- Decisões técnicas tomadas (ex: "set_updated_at em vez de handle_updated_at — Research 04-RESEARCH.md §3 estava incorreto")
- Comandos exatos executados (MCP apply_migration ou script Node fallback)
- Tempo gasto e blockers (se houver — ex: MCP indisponível e fallback Node script)
</output>
