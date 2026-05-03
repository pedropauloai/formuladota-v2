# Phase 4: Mercado Pago Migration End-to-End — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** Pedro decisão 2026-05-02 — migrar TUDO pra Mercado Pago, apagar AbacatePay completamente

> **⚠ ESCOPO AMPLO:** esta phase migra **DUAS coisas**: (1) o checkout PIX avulso da Phase 2 (atualmente AbacatePay Transparent) → Mercado Pago Payments PIX; (2) Subscription mensal (assinatura HUB R$47/mês) → Mercado Pago Pix Automático via API `/v1/preapproval`. Apaga 100% do código AbacatePay (lib, types, webhook handler, env vars, references em pages/emails).

<domain>
## Phase Boundary

**O que está dentro do escopo:**

### A) Apagar AbacatePay completamente
- Apagar `src/lib/abacatepay.ts`
- Apagar `src/types/abacatepay.ts`
- Apagar `src/app/api/webhooks/abacatepay/route.ts` + diretório vazio
- Remover env vars: `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` em `.env.local`, `.env.example`, `src/lib/env.ts` (Zod schema)
- Remover scripts: `scripts/apply-migration-005.mjs` mantém (não é AbacatePay), mas verificar
- Atualizar `purchases` schema: campo `external_payment_id` é genérico (provider-agnostic) — manter; adicionar coluna nova `payment_provider text default 'mercadopago' not null check (payment_provider in ('abacatepay', 'mercadopago'))` pra diferenciar registros legacy. Migration 010 ou parte de 008.
- README.md / docs internos referenciando AbacatePay — atualizar

### B) Mercado Pago Pix Avulso (substitui Phase 2 checkout)
- Criar `src/lib/mercadopago.ts` — cliente MP V2:
  - `createPixPayment(input)` → POST `https://api.mercadopago.com/v1/payments` com `payment_method_id="pix"`, retorna `{ id, qr_code, qr_code_base64, ticket_url }`
  - `verifyMercadopagoWebhookSignature(rawBody, headers)` — HMAC SHA-256 (MP usa algoritmo diferente — research details)
- Criar `src/types/mercadopago.ts` — Zod schemas pra payload create + webhook events
- Criar `src/app/api/webhooks/mercadopago/route.ts` — handler de notificações MP (eventos: `payment.created`, `payment.updated`, `subscription_authorized_payment`, `subscription_preapproval`)
  - Idempotência via UPDATE conditional WHERE (mesmo pattern Phase 2)
  - Service-role client (per C13)
  - SEMPRE retorna 200
  - HMAC `crypto.timingSafeEqual`
- Atualizar Server Action `createCheckout(packageId)` em `src/app/checkout/[packageId]/actions.ts` — usar `createPixPayment()` em vez de `createTransparentPix()`. Salva `external_payment_id` (id MP) + `payment_provider='mercadopago'`
- Atualizar `src/app/checkout/[packageId]/page.tsx` — render QR code igual antes (MP retorna qr_code_base64)
- Email confirmação `src/lib/resend.ts` — sem mudança lógica (libera saldo igual)

### C) Mercado Pago Pix Automático Subscription (substitui Phase 4 antiga)
- Migration 008 cria tabela `subscriptions` (id, user_id, mp_preapproval_id, mp_plan_id, status, started_at, next_payment_date, cancelled_at, payment_method_id default 'pix') + helper `public.has_active_subscription()` SQL + RLS (user vê própria, INSERT cookie client, UPDATE/DELETE service-role only)
- Criar `src/lib/mercadopago.ts` (mesmo arquivo que Pix Avulso) ganha:
  - `createPreapprovalPlan(input)` → POST `/preapproval_plan` (1x setup pelo Pedro via MCP `mp__mercadopago__*` ou via API direta)
  - `createPreapproval(input)` → POST `/preapproval` cria assinatura PIX recorrente, retorna `{ id, init_point }` (init_point = URL onde user autoriza Pix Automático)
  - `cancelPreapproval(id)` → PUT `/preapproval/{id}` body `{ status: "cancelled" }`
- Server Action `createSubscription()` em `src/app/assinatura/actions.ts` — autentica user, cria preapproval MP com `payer_email = user.email`, `auto_recurring.frequency=1`, `auto_recurring.frequency_type="months"`, `transaction_amount=47`, `currency_id="BRL"`. Retorna `init_point` URL pro user redirect autorizar.
- Server Action `cancelSubscription()` — chama `cancelPreapproval` + UPDATE local subscription `cancelled_at=now()`, mantém status `cancelled`
- Webhook handler ganha branches:
  - `subscription_preapproval` (state changes): atualiza `subscriptions.status` (authorized | paused | cancelled)
  - `subscription_authorized_payment` (renovação paga): atualiza `subscriptions.next_payment_date += 30d`, dispara email Resend "renovação confirmada"
- Página `/assinatura` Server Component:
  - Sem subscription: card preto+vermelho com explicação + CTA "Iniciar mensalidade R$47" (Server Action createSubscription → redirect init_point)
  - Status `authorized`: card verde sutil "Mensalidade ativa" + "Próxima cobrança: {next_payment_date PT-BR}" + CTA "Cancelar"
  - Status `cancelled` + dentro do período: "Cancelada — acesso até {next_payment_date}" + CTA "Reativar"
  - Status `cancelled` + expirado OR `paused`: "Sem acesso" + CTA "Iniciar mensalidade"
- Cancel flow híbrido: MP cancela imediato, mas helper `has_active_subscription()` retorna true até `next_payment_date` (mantém acesso até fim do período pago)
- Helper SQL `has_active_subscription()` consumido em Phase 5 quando `lobbies` existir (não nesta phase)

### D) Setup Pedro
- Pedro precisa criar conta Mercado Pago Developer (https://www.mercadopago.com.br/developers)
- Gerar `ACCESS_TOKEN` (test ou production) + `WEBHOOK_SECRET`
- Adicionar em `.env.local`: `MP_ACCESS_TOKEN=...`, `MP_WEBHOOK_SECRET=...`, `MP_PUBLIC_KEY=...`, `MP_PREAPPROVAL_PLAN_ID=...`
- Configurar webhook URL no painel MP: `https://formuladota.com/api/webhooks/mercadopago` (ou tunnel smee.io em dev)
- Criar preapproval_plan via MCP MP (research vai usar `mp__mercadopago__*` tools)

**O que está FORA do escopo:**
- Trial 7 dias grátis (REMOVIDO em pivot 2026-05-02)
- Tabela `lobbies` e policies de criação de lobby (Phase 5)
- Email aviso 5 dias antes vencimento (Phase 8)
- Histórico cobranças + recibo PDF (Phase 7 perfil)
- Multi-plano (V2)
- Integração Discord notificação de renovação (Phase 5+)
- Subscription gate no middleware (Phase 5)

</domain>

<decisions>
## Implementation Decisions (locked)

### D-01: Apagar AbacatePay 100% — sem deprecation period
- Pedro autorizou apagar tudo pra evitar confusão
- Coluna `purchases.external_payment_id` mantém (genérica) + adiciona `payment_provider`
- Migrations históricas (003 seed_packages tem referências?) — verificar; se não tem, skip
- Histórico em `_deprecated/` mantido pra referência

### D-02: Migration 008 — subscriptions table
```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mp_preapproval_id text unique,         -- MP retorna no create response
  mp_plan_id text,                        -- preapproval_plan_id se Pedro usar plan
  status text not null default 'pending'
    check (status in ('pending','authorized','paused','cancelled')),
  started_at timestamptz,                 -- preenche no primeiro payment authorized
  next_payment_date timestamptz,          -- crítico — helper usa
  cancelled_at timestamptz,
  payment_method_id text default 'pix',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_status_idx on public.subscriptions (user_id, status);
create unique index subscriptions_one_active_per_user on public.subscriptions (user_id) where status in ('pending','authorized','cancelled');
```

### D-03: Migration 010 — purchases provider column
```sql
alter table public.purchases
  add column if not exists payment_provider text default 'mercadopago' not null
  check (payment_provider in ('abacatepay', 'mercadopago'));
-- Backfill rows existentes (Phase 2 era AbacatePay):
update public.purchases set payment_provider = 'abacatepay' where created_at < now();
-- Default já é mercadopago pra registros novos.
```

### D-04: Helper `has_active_subscription()`
```sql
create or replace function public.has_active_subscription() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('authorized','cancelled')   -- cancel híbrido
      and next_payment_date > now()
  );
$$;
```

### D-05: Webhook MP — eventos suportados
- `payment.created` / `payment.updated` — pagamentos avulsos PIX (substitui transparent.completed)
- `subscription_preapproval` — mudanças de estado da assinatura (authorized, paused, cancelled)
- `subscription_authorized_payment` — pagamento mensal recorrente recebido (atualiza next_payment_date)
- HMAC validation: MP usa header `x-signature` formato `ts=...,v1=...` — algorithm: HMAC SHA-256 sobre `id:{data_id};request-id:{x-request-id};ts:{ts};` (research vai confirmar)

### D-06: Idempotência
- `purchases`: UPDATE conditional WHERE status='pendente' (mesmo pattern Phase 2 — funciona pra MP)
- `subscriptions`: UPDATE conditional WHERE status pre-condition. Ex: `subscription_authorized_payment` faz `UPDATE subscriptions SET next_payment_date=GREATEST(next_payment_date, NEW_DATE), status='authorized' WHERE mp_preapproval_id=? AND status IN ('pending','authorized')`
- Email idempotencyKey Resend: `mp-payment-{id}-{event}`, `subscription-renewed-{preapproval_id}-{period_iso}`

### D-07: Cancel flow híbrido
- Server Action `cancelSubscription()`:
  1. Busca subscription user
  2. Chama MP `PUT /preapproval/{id}` body `{ status: "cancelled" }`
  3. UPDATE local `cancelled_at=now()`, `status='cancelled'` (NÃO modifica `next_payment_date`)
- Webhook `subscription_preapproval` event "cancelled" — UPDATE local idempotente (no-op se já cancelled)
- Helper `has_active_subscription()` retorna true até `next_payment_date` mesmo com status cancelled

### D-08: Página `/assinatura` cyberpunk → dark fantasy
- Reusa paleta Phase 3.5 (preto + vermelho + Cinzel/Marcellus/Inter)
- Sem QR code embed (MP usa `init_point` URL — user clica e MP renderiza fluxo Pix Automático)
- 4 estados visuais (sem subscription, authorized, cancelled+ativo, cancelled+expirado/paused)

### D-09: Setup MP via MCP
- MCP MP autenticado (`claude mcp list` mostra `mercadopago: ✓ Connected`)
- Tools disponíveis: `mp__mercadopago__create_test_user`, `mp__mercadopago__add_money_test_user`, `mp__mercadopago__save_webhook`, `mp__mercadopago__search_documentation`, etc.
- Pedro NÃO precisa criar conta MP manual — researcher pode usar MCP pra criar test users + simular fluxos
- Para production deploy, Pedro precisa eventualmente conta real MP — mas dev/staging usa MCP test users

### D-10: Server Actions com cookie client (per C13)
- `createCheckout` e `createSubscription`/`cancelSubscription`/`reactivateSubscription` usam `createServerClient` cookie-based
- Webhook handler usa service-role client
- RLS protege

### D-11: Schema env vars novos
```bash
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...     # production OR TEST-... (test mode)
MP_PUBLIC_KEY=APP_USR-...       # frontend public key
MP_WEBHOOK_SECRET=...           # webhook signing secret
MP_PREAPPROVAL_PLAN_ID=...      # opcional — created via MCP create_preapproval_plan
HUB_PRICE_BRL=47
```

### D-12: Hot path — sandbox testing
- MP sandbox usa Access Token `TEST-...` prefix
- MCP MP tem tools `create_test_user` + `add_money_test_user` pra simular pagamentos
- Webhook events em sandbox via panel MP "Simular notificação"
- Local dev: smee.io OR ngrok pro webhook (mesmo pattern Phase 2)

### Claude's Discretion
- Layout exato `/assinatura` (cores específicas dentro paleta Phase 3.5, ícones Lucide)
- Polling vs refresh manual pós-redirect MP (manter simples — refresh manual)
- ErrorBanner pattern em `/assinatura` (replicar Phase 3)
- Como tratar `paused` state no MP (pode acontecer se usuário cancelou no app MP) — V1 trata como cancelled

</decisions>

<canonical_refs>
## Canonical References

### Vision e contrato
- `.planning/PIVOTS-2026-05-02.md` — pivots completos (LER PRIMEIRO)
- `.planning/PROJECT.md` — visão pós-rebrand (Mercado Pago Pix Automático)
- `.planning/ROADMAP.md` — Phase 4 acceptance
- `.planning/REQUIREMENTS.md` — H2.1, H2.2, H2.3, H2.4 (revalidados pra MP)

### Schema (modificar via Migration 008 + 010)
- `supabase/migrations/001_initial_schema.sql` — `purchases` table (recebe coluna `payment_provider`)
- `supabase/migrations/004_doctrine_and_moderation.sql` — pattern helper RLS
- `supabase/migrations/005_steam_roles_multicoach.sql` — pattern multi-table migration

### Lib patterns existentes (NÃO reusar AbacatePay — apagar tudo)
- `src/lib/env.ts` — adicionar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_PREAPPROVAL_PLAN_ID`, `HUB_PRICE_BRL`
- `src/lib/resend.ts` — extender com 3 builders subscription emails (post-Phase 3.5 rebrand visual)
- `src/lib/supabase/service.ts` — service-role apenas em /api/webhooks/* (per C13)

### MCP Mercado Pago (autenticado 2026-05-02)
- Endpoint: `https://mcp.mercadopago.com/mcp`
- Tools deferred (use ToolSearch pra carregar):
  - `mp__mercadopago__add_money_test_user` — adiciona saldo a test user
  - `mp__mercadopago__application_list` — lista apps MP
  - `mp__mercadopago__create_test_user` — cria test user pra simulações
  - `mp__mercadopago__notifications_history` — histórico webhooks
  - `mp__mercadopago__quality_checklist` — verificar qualidade integração
  - `mp__mercadopago__quality_evaluation` — avaliar integração
  - `mp__mercadopago__save_webhook` — salvar config webhook URL
  - `mp__mercadopago__search_documentation` — pesquisar docs MP

### MP API Docs
- https://www.mercadopago.com.br/developers/pt/reference — referência completa
- https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post — criar pagamento (PIX avulso)
- https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post — criar assinatura (preapproval)
- https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval_plan/post — criar plano (1x setup)
- https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks — webhook signature validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Patterns reutilizáveis (mesmo de Phase 2)
- HMAC validation com `crypto.timingSafeEqual` — ajustar algoritmo MP (header `x-signature` parsing)
- UPDATE conditional WHERE status — idempotência (Phase 2 funciona idêntico pra MP)
- Webhook SEMPRE retorna 200 — exception HMAC fail = 401
- Email Resend `idempotencyKey` segundo arg
- Server Actions cookie client + service-role webhook (C13)
- 2-query approach (não JOIN Supabase)
- `Pick<Tables<T>, K>` em selects parciais

### Apagar
- Todos arquivos `*abacatepay*` (lib, types, route, env)
- Referências `AbacatePay` em comments / docs

### Adicionar
- `src/lib/mercadopago.ts` (1 arquivo unificado: pix avulso + preapproval + cancel + webhook verify)
- `src/types/mercadopago.ts` (schemas Zod)
- `src/app/api/webhooks/mercadopago/route.ts` (handler)
- `src/app/assinatura/page.tsx` + `src/app/assinatura/actions.ts`
- `supabase/migrations/008_subscriptions_mercadopago.sql`
- `supabase/migrations/010_purchases_payment_provider.sql`

</code_context>

<specifics>
## Specific Ideas

### MP create payment (PIX avulso) payload
```ts
POST https://api.mercadopago.com/v1/payments
Authorization: Bearer ${MP_ACCESS_TOKEN}
X-Idempotency-Key: ${purchase.id}    // unique purchase id
Content-Type: application/json

{
  "transaction_amount": 47.00,
  "description": "FORMULADOTA — Pacote {nome}",
  "payment_method_id": "pix",
  "payer": { "email": "user@email.com" },
  "external_reference": "${purchase.id}",
  "notification_url": "https://formuladota.com/api/webhooks/mercadopago"
}

// Response includes:
// - id (MP payment id)
// - point_of_interaction.transaction_data.qr_code (BR Code text)
// - point_of_interaction.transaction_data.qr_code_base64 (PNG data URL)
// - point_of_interaction.transaction_data.ticket_url (alternative URL)
```

### MP create preapproval (subscription) payload
```ts
POST https://api.mercadopago.com/preapproval
Authorization: Bearer ${MP_ACCESS_TOKEN}
Content-Type: application/json

{
  "reason": "FORMULADOTA HUB — Mensalidade",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 47.00,
    "currency_id": "BRL"
  },
  "back_url": "https://formuladota.com/assinatura?success=1",
  "external_reference": "user-${user.id}",
  "payer_email": "user@email.com",
  "status": "pending"
}

// Response:
// - id (preapproval id)
// - init_point (URL where user authorizes Pix Automatico)
// - status (pending → authorized after user authorizes)
```

### MP cancel preapproval
```ts
PUT https://api.mercadopago.com/preapproval/${id}
Authorization: Bearer ${MP_ACCESS_TOKEN}
Body: { "status": "cancelled" }
```

### MP webhook signature validation
```ts
// Header: x-signature: ts=1234567890,v1=abcdef...
// Calculate manifest: id:${data.id};request-id:${x-request-id};ts:${ts};
// HMAC SHA-256 with MP_WEBHOOK_SECRET, compare hex with v1 value via timingSafeEqual
```

</specifics>

<deferred>
## Deferred Ideas (NOT in Phase 4)

- Trial 7 dias grátis (V2)
- Email aviso 5d antes vencimento (Phase 8)
- Histórico cobranças + download recibo PDF (Phase 7)
- Multi-plano (V2)
- Cupons / desconto (V2)
- Subscription gate middleware (Phase 5 quando lobbies existir)
- Discord bot notification renewal (Phase 5+)
- Auto-retry overdue (V2)
- Audit log subscription_status_log (V2)

</deferred>

---

*Phase: 04-mercadopago-migration*
*Context gathered: 2026-05-02 via decisão direta Pedro (migrar tudo MP, apagar AbacatePay)*
