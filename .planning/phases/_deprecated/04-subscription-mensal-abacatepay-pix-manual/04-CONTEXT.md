# Phase 4: Subscription Mensal — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** discuss-phase 4 com Pedro + research findings 2026-05-02 + decisão Pedro pós-research bloqueador (Opção 2 PIX Manual Mensal)

> **⚠ MUDANÇA SIGNIFICATIVA pós-research:** Research descobriu que AbacatePay subscription nativa SUPORTA APENAS CARD (não PIX). Pedro escolheu Opção 2: **PIX Manual Mensal via Vercel Cron + Transparent PIX** (mantém alinhamento com mercado BR PIX-first). Este CONTEXT.md foi reescrito refletindo a nova arquitetura.

<domain>
## Phase Boundary

**O que está dentro do escopo:**
- Migration 008 cria 2 tabelas: `subscriptions` (lifecycle assinatura) + `subscription_charges` (cobrança PIX mensal individual, FK pra `subscriptions` E `purchases` pra reusar idempotência Phase 2)
- Helper SQL `public.has_active_subscription()` retorna `true` quando `subscriptions.status IN ('active','cancelled') AND next_due_at > now()` (cancel híbrido — acesso até fim do período)
- Vercel Cron job (`/api/cron/subscriptions/charge-due/route.ts`) roda diário (sugestão: 09:00 BRT) — busca subscriptions ativas com `next_due_at <= now() + 5 days` SEM `subscription_charge` pendente/paga pro próximo período → cria Transparent PIX via cliente AbacatePay existente → INSERT `subscription_charge` (FK purchase) → email Resend com QR Code
- Webhook handler EXISTENTE `/api/webhooks/abacatepay/route.ts` ganha branch novo: quando `transparent.completed` chega numa purchase ligada a `subscription_charge`, atualiza `subscriptions.next_due_at += 30d`, `status='active'`, e dispara email "Renovação confirmada"
- Server Action `createInitialSubscription()` em `src/app/assinatura/actions.ts` — primeira ativação: cria `subscriptions` (status=`pendente`) + cria primeiro Transparent PIX + retorna QR Code embed na própria página
- Server Action `cancelSubscription()` — marca `cancelled_at = now()`, `status='cancelled'`, mantém `next_due_at` (acesso preservado até fim do período pago)
- Server Action `reactivateSubscription()` — re-ativa subscription cancelled (cria novo Transparent PIX manual, sem esperar cron)
- Página `/assinatura` Server Component cyberpunk: card status (Pendente/Ativa/Cancelada/Vencida), QR Code do PIX corrente quando aplicável, próxima cobrança formatada PT-BR, botões contextuais (Iniciar/Cancelar/Reativar/Pagar agora)
- Email Resend reativos: `subscription_charge_created` (com QR Code + link), `subscription_charge_paid` (renovação confirmada), `subscription_overdue` (5 dias após `next_due_at` sem pagamento → status=`overdue`)
- Cron job de inadimplência (mesmo cron job ou separado): subscriptions com `next_due_at < now() - 5 days` AND status='active' → status='overdue', dispara email aviso, helper `has_active_subscription()` passa retornar false
- Atualização docs: REQUIREMENTS.md H2.1 (PIX manual em vez de subscription nativa), ROADMAP.md Phase 4 acceptance, PROJECT.md (PIX recorrente real)

**O que está FORA do escopo:**
- AbacatePay subscription nativa CARD (descartada pós-decisão Pedro)
- Trial 7 dias grátis (REMOVIDO em discuss-phase com Pedro 2026-05-02 — coluna `trial_ends_at` permanece null em V1)
- Tabela `lobbies` e policies de criação de lobby (Phase 5)
- Email aviso 5 dias ANTES do vencimento (Phase 8 polish — Phase 4 só envia AFTER vencimento via overdue flow)
- Histórico de cobranças + download de recibo PDF (Phase 7 perfil expandido)
- Multi-plano (V2 — Phase 4 hardcoda 1 plano único via env vars)
- Cupons / códigos de desconto (V2)
- Auto-retry de PIX (se não pagou em 5 dias = overdue; user precisa Reativar manualmente)
- Subscription gate no middleware (Phase 5 quando `lobbies` table existir)

</domain>

<decisions>
## Implementation Decisions (locked)

### D-01: Sem Trial 7 dias (mantido)
- Phase 4 NÃO implementa trial. User assina → cria primeiro PIX → paga → acesso liberado.
- Coluna `profiles.trial_ends_at` MANTIDA (Migration 005) mas sempre null em V1.
- Helper `has_active_subscription()` NÃO consulta `trial_ends_at`.

### D-02: Cancel flow híbrido (mantido)
- User cancela → `subscriptions.cancelled_at = now()` + `status = 'cancelled'`, mas `next_due_at` permanece.
- Helper retorna `true` enquanto `next_due_at > now()` mesmo com status `cancelled`.
- Cron job NÃO cria novo PIX pra subscriptions com status=`cancelled` (cancel é definitivo).
- Reativar = Server Action `reactivateSubscription()` cria novo Transparent PIX manual, status volta `pendente` → `active` quando webhook completed chega.

### D-03: RLS gate prep — helper SQL only (mantido)
- Phase 4 cria APENAS `public.has_active_subscription()`. NÃO cria policies em `lobbies` (não existe).
- Phase 5 (Bot Steam Lobby) consome em `lobbies.insert WITH CHECK (public.has_active_subscription())`.

### D-04 (REVISADO): Webhook reusa `transparent.completed` existente — NÃO adiciona branches subscription.*
- **Razão:** Decisão Opção 2 PIX Manual significa que cobranças mensais usam `POST /v2/transparents/create` (mesmo endpoint Phase 2). Webhook recebe `transparent.completed` igual. Diferenciação acontece NO HANDLER — purchase pode estar ligada a `subscription_charge` (renewal) ou ser purchase avulsa Phase 2.
- **Implementação:** Em `handlePaymentCompleted()` adicionar lookup adicional: após UPDATE conditional purchase status, query `subscription_charges WHERE purchase_id=?`. Se existe, chama `processSubscriptionRenewal()` que UPDATE `subscriptions.next_due_at += 30d`, `status='active'`, dispara email renewal. Caso contrário, fluxo Phase 2 normal (libera saldo de partidas).
- **Sem discriminated union Zod** — schemas existentes Phase 2 já cobrem `transparent.*`. Sem novos eventos.
- **Sem novo arquivo** — extensão pura do `route.ts` Phase 2.

### D-05: 1 plano único hardcoded via env (mantido)
- `HUB_PRICE_BRL=47` em `.env.local`.
- Sem `ABACATEPAY_HUB_PRODUCT_ID` (não usa subscription nativa) — produto não existe no dashboard AbacatePay.
- Cron cria PIX com `description="Mensalidade FormulaDota HUB - {month}/{year}"` e `amount=parseInt(env.HUB_PRICE_BRL) * 100` (centavos).

### D-06: Página `/assinatura` minimal (mantido + ajustado)
- Server Component que mostra:
  - **Sem subscription**: card cyan com explicação "R$ 47/mês — acesso ao HUB completo via PIX recorrente" + botão "Iniciar mensalidade" (Server Action createInitialSubscription)
  - **Status `pendente`** (subscription criada mas PIX não pago): card amarelo com QR Code + texto copiar-e-colar + "Aguardando pagamento. Acesso liberado quando o PIX for confirmado."
  - **Status `active`**: card verde "Mensalidade ativa", "Próxima cobrança: {next_due_at PT-BR}", botão "Cancelar"
  - **Status `cancelled` AND `next_due_at > now()`**: card amarelo "Cancelada — acesso até {next_due_at PT-BR}", botão "Reativar"
  - **Status `overdue` OR (cancelled AND next_due_at <= now()) OR `expired`**: card vermelho "Sem acesso ativo", botão "Iniciar mensalidade" / "Reativar"
- QR Code embed via `<img src="data:image/png;base64,..." />` (data URL, mesmo pattern Phase 2 checkout)

### D-07 (REVISADO): Idempotência por evento + cron
- **Cron idempotência:** Antes de criar Transparent PIX, query `subscription_charges WHERE subscription_id=? AND period_start=? AND status IN ('pending','paid')`. Se existe, skip (cron rodou 2x no mesmo dia ou usuário criou manual via reactivate).
- **Webhook idempotência:** UPDATE `purchases SET status='pago' WHERE external_payment_id=? AND status='pendente'` (Phase 2 mantido). Adicional: UPDATE `subscriptions SET next_due_at=GREATEST(next_due_at, NEW_NEXT_DUE) WHERE id=? AND ...` (só avança nunca recua — protege contra reorder de webhooks).
- **Email idempotencyKey Resend:** `subscription-charge-created-{charge_id}`, `subscription-charge-paid-{charge_id}`, `subscription-overdue-{subscription_id}-{period_start_iso}`.

### D-08 (REVISADO): Migration 008 estrutura nova
```sql
-- 1. Tabela subscriptions — lifecycle macro
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente','active','cancelled','overdue','expired')),
  started_at timestamptz,            -- preenche no primeiro transparent.completed
  next_due_at timestamptz,           -- crítico — helper usa esse campo
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_status_idx on public.subscriptions (user_id, status);
create unique index subscriptions_one_active_per_user on public.subscriptions (user_id) where status in ('pendente','active','cancelled','overdue');

-- 2. Tabela subscription_charges — cobrança individual (1 por mês ativo)
create table public.subscription_charges (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  purchase_id uuid unique not null references public.purchases(id) on delete restrict, -- FK reusa idempotência transparent
  period_start timestamptz not null,
  period_end timestamptz not null,   -- period_start + 30d
  status text not null default 'pending'
    check (status in ('pending','paid','expired','refunded')),
  created_at timestamptz not null default now()
);
create index subscription_charges_subscription_id_idx on public.subscription_charges (subscription_id);
create unique index subscription_charges_unique_period
  on public.subscription_charges (subscription_id, period_start);

-- 3. RLS subscriptions
alter table public.subscriptions enable row level security;
create policy "users see own subscription" on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());
create policy "users insert own subscription" on public.subscriptions for insert
  with check (auth.uid() = user_id);
-- Sem UPDATE/DELETE policies — apenas service-role mexe (webhook handler)

-- 4. RLS subscription_charges
alter table public.subscription_charges enable row level security;
create policy "users see own charges" on public.subscription_charges for select
  using (
    exists (select 1 from public.subscriptions s where s.id = subscription_id and (s.user_id = auth.uid() or public.is_admin()))
  );
-- INSERT/UPDATE/DELETE: apenas service-role (cron job + webhook)

-- 5. Helper has_active_subscription()
create or replace function public.has_active_subscription() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active','cancelled')  -- cancel híbrido
      and next_due_at > now()
  );
$$;

-- 6. Trigger updated_at em subscriptions (reusa public.handle_updated_at se existir; senão criar)
-- Verificar Migration 001 antes; se não existe, criar:
-- create or replace function public.handle_updated_at() returns trigger ...
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();
```

### D-09 (REVISADO): Resend templates — 3 templates novos
- `sendSubscriptionChargeCreatedEmail({chargeId, customerEmail, customerName, qrCodeBase64, brCode, dueDate, amountBrl})`
  - Subject: `Mensalidade FormulaDota — pagamento PIX gerado`
  - Body: explicação + QR Code embed `<img src="data:image/png;base64,...">` + brCode copiar-e-colar + "Pague até {dueDate}"
  - idempotencyKey: `subscription-charge-created-{chargeId}`
- `sendSubscriptionChargePaidEmail({chargeId, customerEmail, customerName, nextDueDate, amountBrl})`
  - Subject: `Mensalidade renovada — acesso ativo`
  - Body: confirmação + "Próxima cobrança em {nextDueDate}"
  - idempotencyKey: `subscription-charge-paid-{chargeId}`
- `sendSubscriptionOverdueEmail({subscriptionId, customerEmail, customerName, periodStart})`
  - Subject: `Mensalidade FormulaDota — pagamento em atraso`
  - Body: "Não recebemos seu pagamento. Acesso suspenso. Reative em /assinatura"
  - idempotencyKey: `subscription-overdue-{subscriptionId}-{periodStart_iso}`

### D-10: Server Actions com cookie client (mantido)
- `src/app/assinatura/actions.ts` exporta:
  - `createInitialSubscription()` — cookie client, cria `subscriptions` status=`pendente` + `subscription_charges` row + `purchases` row + chama `createTransparentPix()` AbacatePay + INSERT charges + retorna `{qrCode, brCode}` pra render
  - `cancelSubscription()` — busca subscription ativa do user, UPDATE status=`cancelled`, cancelled_at=now() (next_due_at preservado per D-02)
  - `reactivateSubscription()` — busca subscription cancelled/expired, cria novo subscription_charge + Transparent PIX, retorna QR Code
- Service-role APENAS no cron + webhook (per C13).

### D-11 (NOVO): Vercel Cron config
- Adicionar em `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/subscriptions/charge-due", "schedule": "0 9 * * *" }] }
  ```
- Schedule: diário 09:00 UTC (= 06:00 BRT — antes do horário comercial)
- Authorization: header `Authorization: Bearer ${CRON_SECRET}` (Vercel injeta automaticamente). Validar no handler antes de processar.
- Endpoint `/api/cron/subscriptions/charge-due/route.ts`:
  - Valida `Authorization` header com `CRON_SECRET` (timingSafeEqual)
  - Service-role client
  - Query: subscriptions ativas/cancelled com `next_due_at <= now() + 5 days` AND sem charge pending pro próximo período
  - Loop: pra cada → cria Transparent PIX + INSERT charge + envia email charge_created
  - Função separada na mesma pasta `/api/cron/subscriptions/sweep-overdue/route.ts` ou no mesmo handler — sweep subscriptions com `next_due_at < now() - 5 days` AND status='active' → UPDATE status='overdue' + email overdue
  - Schedule único OU 2 crons separados (decisão planner — mais simples 1 cron faz tudo).

### D-12 (NOVO): Inadimplência flow
- Subscription com `next_due_at` passou e webhook completed não veio em 5 dias → status='overdue'
- Helper `has_active_subscription()` retorna false (status NOT IN ('active','cancelled'))
- User tentando rotas STEAM_REQUIRED_PATHS continua passando (não bloqueia em Phase 4 — Phase 5 ativa)
- User vê em `/assinatura` o status overdue + botão "Reativar" (cria novo PIX)
- NÃO aplicar cobrança automática de juros/multa (V2 polish)

### Claude's Discretion (não locked, planner pode decidir)
- Layout exato do card de status em `/assinatura` (cores, ícones Lucide)
- Como formatar `next_due_at` em PT-BR (provavelmente `Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })`)
- Polling vs refresh manual pós-criar PIX (manter simples — refresh manual)
- 1 cron handler que faz both charge-due AND sweep-overdue OR 2 cron handlers separados (planner decide)
- Naming exato (e.g., `getOrCreateSubscription` vs `ensureSubscriptionRecord`)
- ErrorBanner pattern em `/assinatura` (replicar Phase 3)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision e contrato
- `.planning/PROJECT.md` — visão pós-pivô (será atualizada — PIX recorrente é PIX manual mensal)
- `.planning/ROADMAP.md` — Phase 4 escopo + acceptance (será atualizado refletindo PIX manual)
- `.planning/REQUIREMENTS.md` — H2.1 (PIX manual via Cron, NÃO subscription nativa AbacatePay), H2.2 (sem trial), H2.3 (RLS helper), H2.4 (página /assinatura) + cross-cutting C1-C13

### Schema atual (não modificar; só adicionar via Migration 008)
- `supabase/migrations/001_initial_schema.sql` — `profiles`, `packages`, `purchases` (Phase 4 reusa idempotência via FK)
- `supabase/migrations/002_rls_policies.sql` — pattern policy + helper `is_admin()`
- `supabase/migrations/004_doctrine_and_moderation.sql` — pattern de helpers RLS (security definer set search_path)
- `supabase/migrations/005_steam_roles_multicoach.sql` — `profiles.trial_ends_at` (manter null V1)
- `supabase/migrations/006_finalize_pedro_coach_seed.sql` — Pedro coach #1
- `supabase/migrations/007_public_coach_profiles_visible.sql` — RLS public read coaches

### Lib patterns existentes (REUSAR — não recriar)
- `src/lib/abacatepay.ts` (113 linhas) — `createTransparentPix()` Phase 2 reusa direto pro cron + Server Action createInitialSubscription. `verifyAbacatepayWebhookSignature()` mantém. **Sem novas funções** (CORRIGIDO — não adicionar createSubscription/cancelSubscription porque não usamos subscription nativa).
- `src/lib/resend.ts` (95 linhas) — extender com 3 funções (`sendSubscriptionChargeCreatedEmail`, `sendSubscriptionChargePaidEmail`, `sendSubscriptionOverdueEmail`). Lazy init Resend client mantido.
- `src/lib/env.ts` — adicionar `HUB_PRICE_BRL` (number, default 47) + `CRON_SECRET` (string min 32 chars, server only). Sem `ABACATEPAY_HUB_PRODUCT_ID` (não usa subscription nativa).
- `src/lib/supabase/service.ts` — usar APENAS no cron + webhook (per C13)
- `src/lib/supabase/server.ts` — pattern Server Action e Server Component cookie client

### API Route existente (extender, não recriar)
- `src/app/api/webhooks/abacatepay/route.ts` (185 linhas) — adicionar logic em `handlePaymentCompleted`: após UPDATE conditional, query `subscription_charges WHERE purchase_id=?`. Se existe, chamar nova função `processSubscriptionRenewal()` que UPDATE subscription + dispara email charge_paid. Caso contrário, fluxo Phase 2 normal (sendPurchaseConfirmationEmail).
- **NÃO criar** `/api/webhooks/abacatepay/subscriptions/route.ts` — não usa subscription nativa.
- **NOVO endpoint** `/api/cron/subscriptions/charge-due/route.ts` — Vercel Cron handler.

### Types
- `src/types/abacatepay.ts` — **SEM mudanças**. Schemas Zod existentes (`transparent.completed/disputed/refunded`) cobrem 100% do uso (não usamos subscription.* events).
- `src/types/database.ts` — regenerar pós-Migration 008 via Supabase MCP `mcp__supabase__generate_typescript_types`.

### Frontend patterns existentes (replicar visual)
- `src/components/catalog/package-card.tsx` — pattern card cyberpunk Badge variant
- `src/app/checkout/[packageId]/page.tsx` (Phase 2) — pattern QR Code embed via data URL `<img>`
- `src/components/auth/error-banner.tsx` (Phase 3) — replicar em `/assinatura` pra erros AbacatePay/cron
- `src/app/codigo-de-conduta/page.tsx` ou `/onboarding/doutrina` — pattern Server Component cyberpunk

### Research existente
- `.planning/phases/04-subscription-mensal/04-RESEARCH.md` — research detalhado (LER NOTA NO TOPO sobre Opção 2 escolhida; §1.4 PIX Manual é o caminho)
- `.planning/research/hub-stack-deep-dive.md` §1.4 — pattern PIX manual mensal já discutido (mais detalhes)

### AbacatePay docs (mesmo Phase 2 — endpoints `/v2/transparents/*`)
- https://docs.abacatepay.com/pages/transparents/create.md — endpoint criar Transparent PIX (já em uso Phase 2)
- https://docs.abacatepay.com/pages/webhooks/events/transparents.md — eventos `transparent.completed/disputed/refunded` (já em uso Phase 2)

### Vercel Cron docs
- https://vercel.com/docs/cron-jobs — config via `vercel.json`, header `Authorization: Bearer ${CRON_SECRET}`

### Resend SDK v6
- https://resend.com/docs/api-reference/emails/send-email — idempotencyKey segundo argumento (já em uso Phase 2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/abacatepay.ts`: `createTransparentPix()` reusa 100% sem mudanças. **Não precisa adicionar funções subscription** (decisão Opção 2).
- `src/app/checkout/[packageId]/page.tsx` (Phase 2): tem QR Code embed via data URL — copiar pattern em `/assinatura` quando status pendente.
- `src/lib/resend.ts`: pattern `getResend()` lazy init + `buildXxxHtml()` helpers. Extender com 3 builders novos.
- `src/app/api/webhooks/abacatepay/route.ts`: handler Phase 2 com idempotência via UPDATE conditional + email fire-and-forget. Extensão pequena (lookup `subscription_charges` + branch).
- Migrations 005-007 estabelecem pattern: arquivo separado, idempotente, comentário PT-BR no header explicando contexto.

### Established Patterns
- **2-query approach** — `/assinatura` busca subscription do user + (se status pendente) busca latest subscription_charge + purchase pra obter QR.
- **Service-role APENAS em /api/webhooks/* e /api/cron/*** (extensão de C13 — cron é trigger sistêmico igual webhook). Server Actions usam cookie client.
- **`Pick<Tables<T>, K>`** em selects parciais (zero `as` cast).
- **HMAC SHA-256 base64 + timingSafeEqual** — webhook secret `ABACATEPAY_WEBHOOK_SECRET`. Cron usa `CRON_SECRET` separado validado via `timingSafeEqual`.
- **Webhook SEMPRE 200** mesmo em validation failure pós-HMAC (HMAC fail = 401).
- **Cron sempre retorna `{ ok: true, processed: N }`** — Vercel mostra logs.
- **Migration idempotente** via `create table if not exists`, `drop policy if exists`, `on conflict do nothing`.

### Integration Points
- Header global (`src/components/layout/header.tsx`): adicionar link "Assinatura" no nav (Phase 8 polish — fora scope Phase 4)
- Middleware `src/lib/supabase/middleware.ts`: **NÃO modificar** Phase 4. Phase 5 adiciona subscription gate quando `lobbies` existir.
- Tabela `subscriptions.user_id` FK pra `profiles.id` cascade delete.
- Tabela `subscription_charges.purchase_id` FK pra `purchases.id` restrict (não dropar purchase paga). Reusa idempotência Phase 2.

</code_context>

<specifics>
## Specific Ideas

### Pedro task manual (Phase 4 setup)
1. **Gerar `CRON_SECRET`** (32+ chars random): `openssl rand -hex 32` ou `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Adicionar em `.env.local` e em Vercel env vars (production).
2. **NENHUM produto criar no dashboard AbacatePay** — Phase 4 não usa subscription nativa.
3. **Atualizar email Resend domain** se quiser remetente diferente de `onboarding@resend.dev` — opcional, pode manter dev sender pra V1.

### Cron payload de criação de PIX mensal
```ts
// Para cada subscription ativa com next_due_at <= now() + 5d:
const result = await createTransparentPix({
  amount: HUB_PRICE_BRL * 100,  // centavos
  description: `Mensalidade FormulaDota HUB - ${monthName}/${year}`,
  expiresIn: 432000,  // 5 dias em segundos
  externalId: purchaseId,  // FK pra purchases (idempotência)
});
```

### Lifecycle de status `subscriptions`
```
pendente   → active     (primeiro transparent.completed do subscription_charge)
active     → cancelled  (Server Action cancelSubscription — mantém next_due_at)
active     → overdue    (cron sweep_overdue: next_due_at < now() - 5d)
cancelled  → active     (Server Action reactivateSubscription + transparent.completed novo)
cancelled  → expired    (cron sweep_overdue OR helper detecta: status='cancelled' AND next_due_at < now())
overdue    → active     (Server Action reactivateSubscription + transparent.completed novo)
overdue    → expired    (após X dias overdue — V2 cleanup; V1 mantém overdue indefinidamente, user reativa quando quiser)
expired    → active     (Server Action createInitialSubscription cria nova OR reactivate da existente)
```

### Schema env vars novos
```
# PIX manual mensal
HUB_PRICE_BRL=47

# Vercel Cron auth
CRON_SECRET=<openssl rand -hex 32>
```

### Períodos (`subscription_charges.period_start` / `period_end`)
- Primeira charge: `period_start = now()`, `period_end = now() + 30 days`
- Renewal charge: `period_start = subscription.next_due_at`, `period_end = subscription.next_due_at + 30 days`
- Pago: UPDATE `subscriptions.next_due_at = subscription_charge.period_end`
- Reativação: `period_start = max(now(), subscription.next_due_at)`, `period_end = period_start + 30 days`

</specifics>

<deferred>
## Deferred Ideas (NOT in Phase 4)

- **AbacatePay subscription nativa CARD** — descartada V1; possível em V2 se Pedro decidir oferecer cartão como alternativa
- **Trial 7 dias grátis** — V2 (Pedro 2026-05-02 removeu)
- **Email aviso 5 dias ANTES vencimento** — Phase 8 polish (Phase 4 só envia AFTER overdue)
- **Tabela `subscription_plans` multi-tier** — V2 quando lançar plano premium
- **Histórico de cobranças + download recibo PDF** — Phase 7 perfil expandido
- **Cupons / códigos de desconto** — V2
- **Auto-retry de PIX** após overdue — V1 user reativa manual; V2 considerar cron retry
- **Subscription gate no middleware** — Phase 5 quando `lobbies` table existir
- **Polling status pós-criar PIX** — Phase 7 polish; Phase 4 user dá refresh manual
- **Audit log de status changes** — V2; Phase 4 não cria `subscription_status_log` table
- **Integração Discord bot** — bot envia DM com QR Code? — Phase 5 polish
- **Pagamento parcial / proporcional** (cliente paga R$23 e recebe 15 dias) — não vale a pena V1
- **Cobrar multa/juros** após overdue — V2 polish

</deferred>

---

*Phase: 04-subscription-mensal*
*Context gathered: 2026-05-02 via discuss-phase + research findings + decisão Pedro Opção 2 (PIX Manual Mensal)*
