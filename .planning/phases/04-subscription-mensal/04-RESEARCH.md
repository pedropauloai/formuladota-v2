# Phase 4: Subscription Mensal AbacatePay — Research

**Researched:** 2026-05-02
**Domain:** AbacatePay V2 Subscriptions, Supabase RLS helpers, Zod discriminated union, Resend idempotency
**Confidence:** HIGH (docs oficiais verificados via WebFetch; patterns locais verificados via Read + node)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sem trial — coluna `profiles.trial_ends_at` permanece null em V1. Helper `has_active_subscription()` NÃO consulta `trial_ends_at`.
- **D-02:** Cancel híbrido — `cancelled_at = now()` + `status = 'cancelled'`, mas acesso válido enquanto `next_billing_at > now()`.
- **D-03:** Phase 4 cria APENAS helper SQL — sem policies em `lobbies` (Phase 5 consome).
- **D-04:** Extender `/api/webhooks/abacatepay/route.ts` existente — NÃO criar arquivo separado.
- **D-05:** 1 plano hardcoded via env `ABACATEPAY_HUB_PRODUCT_ID` + `HUB_PRICE_BRL=47`. Sem tabela `subscription_plans`.
- **D-06:** Página `/assinatura` minimal — sem histórico de cobranças.
- **D-07:** Idempotência por evento via UPDATE conditional WHERE.
- **D-08:** Migration 008 estrutura detalhada em CONTEXT (tabela `subscriptions` + índices + RLS + helper).
- **D-09:** Templates email inline cyberpunk — 3 builders: completed, renewed, cancelled.
- **D-10:** Server Actions usam cookie client (NÃO service-role). Service-role apenas no webhook.

### Claude's Discretion

- Layout exato do card de status (cores, ícones Lucide).
- Formatação `next_billing_at` em PT-BR (Intl.DateTimeFormat recomendado).
- Polling vs refresh manual pós-redirect AbacatePay (decidir simples — refresh manual).
- Naming exato do helper auxiliar (`getOrCreatePendingSubscription` vs `ensureSubscriptionRecord`).
- Erro AbacatePay em `/assinatura` — replicar `ErrorBanner` pattern de Phase 3.

### Deferred Ideas (OUT OF SCOPE)

- Trial 7 dias grátis.
- Email aviso 5 dias antes do vencimento (Phase 8).
- Tabela `subscription_plans` multi-tier (V2).
- Histórico cobranças + recibo PDF (Phase 7).
- Cupons / desconto (V2).
- Trigger automático SQL pra trial.
- Subscription gate no middleware (Phase 5).
- Polling status pós-redirect (Phase 7 polish).
- Audit log de status changes (V2).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| H2.1 | AbacatePay subscription nativa (`POST /v2/subscriptions/create`, cycle MONTHLY, R$ 47,00). Webhooks `subscription.completed/renewed/cancelled`. | §1 documenta endpoint, payload, cancel, webhook shapes com exemplos verificados. |
| H2.2 | Sem trial (removido). `profiles.trial_ends_at` permanece null. Helper não consulta trial. | §4 documenta helper SQL final sem trial_ends_at. |
| H2.3 | Helper SQL `public.has_active_subscription()` retorna true quando `status IN ('active','cancelled') AND next_billing_at > now()`. Phase 4 cria helper apenas; Phase 5 consome em policy lobbies. | §4 documenta implementação SQL exata e testes. |
| H2.4 | Página `/assinatura` minimal: card status, `next_billing_at` PT-BR, botões por estado. Emails reativos (completed/renewed/cancelled). | §7 documenta skeleton Server Component; §8 documenta templates email. |

</phase_requirements>

---

## Summary

A pesquisa revelou uma **descoberta crítica que altera o design da Phase 4**: AbacatePay subscriptions suportam **apenas CARD** como método de pagamento — PIX NÃO é suportado em subscriptions nativas. Isso contradiz a premissa inicial "PIX recorrente". O produto é checkout hospedado (redireciona para `app.abacatepay.com`), idêntico ao fluxo previsto, mas o meio de pagamento é cartão de crédito, não PIX.

Para Pedro tomar a decisão correta, as opções são: (A) Usar subscription nativa com CARD — automático, sem atrito mensal, profissional; (B) Manter PIX manual mensal via Transparent PIX com cron Vercel — mais complexo, exige ação mensal do user. Research recomenda Option A dado que o público-alvo (jogadores de Dota) tem cartão de crédito e a automação tem mais valor que o meio de pagamento.

A segunda descoberta crítica: `next_billing_at` **não existe no payload do webhook**. O campo deve ser calculado pela app como `payment.updatedAt + 30 dias` (MONTHLY). O cancel via API é **imediato** (`POST /v2/subscriptions/cancel` com body `{ id: "subs_xxx" }`), não no fim do período — então o D-02 (cancel híbrido) é 100% gerenciado pelo nosso DB, não pela AbacatePay.

**Recomendação primária:** Prosseguir com subscription CARD nativa. Atualizar copy em `/assinatura` de "PIX recorrente" para "Cartão de crédito recorrente" ou simplesmente "Mensalidade R$47". Informar Pedro sobre mudança de meio de pagamento.

---

## CRITICAL FINDING: PIX vs CARD em Subscriptions

### Descoberta (HIGH confidence — docs oficiais WebFetch 2026-05-02)

A documentação AbacatePay afirma explicitamente:

> "Assinaturas suportam apenas CARD"

O campo `methods` em `POST /v2/subscriptions/create` aceita o enum `["CARD"]` como default. A opção PIX que aparece no enum é para outros endpoints (Transparent PIX avulso), não subscriptions.

### Implicação para Phase 4

O hub-stack-deep-dive.md de 2026-04-30 menciona "R$ 0,80 por parcela (mesma do PIX avulso)" — esse dado era impreciso. Subscriptions CARD têm fee diferente (R$ 1,00 por ciclo nas plataformas de exemplo observadas).

### Decisão que Pedro precisa tomar antes de implementar (BLOQUEADOR)

Pedro deve confirmar: **subscription com cartão de crédito é aceitável para o público Dota 2 brasileiro?**

Se sim → Phase 4 implementa CARD (checkout hospedado AbacatePay, user cadastra cartão uma vez, renovação automática).

Se não → Phase 4 implementa PIX manual recorrente via Transparent PIX + Vercel Cron (mais complexo, mas PIX puro).

**Research recomenda CARD nativa** por menor fricção mensal e menor complexidade técnica. O usuário cadastra o cartão uma vez e não precisa fazer nada nos meses seguintes.

---

## 1. AbacatePay V2 Subscription — Endpoints e Payload

### 1.1 Criar Subscription Checkout

**Endpoint:** `POST https://api.abacatepay.com/v2/subscriptions/create`
**Auth:** `Authorization: Bearer {ABACATEPAY_API_KEY}`
**Confidence:** HIGH — verificado via WebFetch docs oficiais 2026-05-02

**Payload (campos relevantes):**

```json
{
  "items": [
    {
      "id": "prod_xxxx",
      "quantity": 1
    }
  ],
  "externalId": "sub-{user_uuid}",
  "completionUrl": "https://formuladota.com/assinatura?status=ativada",
  "returnUrl": "https://formuladota.com/assinatura",
  "methods": ["CARD"],
  "metadata": {
    "userId": "{user_uuid}"
  }
}
```

**Campos opcionais disponíveis:** `customerId` (pré-preenche dados), `coupons` (max 50), `metadata` (livre).

**Restrições:**
- Exatamente 1 item no array `items`.
- `methods` suporta apenas `["CARD"]` para subscriptions.
- Produto deve ter ciclo definido no dashboard (`MONTHLY`).

**Response shape (campo `data`):**

```json
{
  "id": "bill_abc123xyz",
  "externalId": "sub-{user_uuid}",
  "url": "https://app.abacatepay.com/pay/bill_abc123xyz",
  "amount": 4700,
  "paidAmount": null,
  "status": "PENDING",
  "items": [{ "id": "prod_xxxx", "quantity": 1 }],
  "coupons": [],
  "customerId": null,
  "createdAt": "2026-05-02T...",
  "updatedAt": "2026-05-02T...",
  "metadata": {},
  "devMode": false
}
```

**IDs importantes:**
- `data.id` = `bill_xxx` — ID do billing/checkout criado. Salvar como `abacatepay_billing_id` no nosso DB.
- O `subs_xxx` (subscription ID) aparece apenas no payload do webhook `subscription.completed` em `data.subscription.id`. NÃO é retornado no create response.

**Implicação para correlação:**
- `externalId` passado no create retorna em `data.externalId` do response e fica disponível em `payment.externalId` no webhook.
- `data.checkout.externalId` nos exemplos de webhook é **null** (não popula via checkout).
- Recomendação: usar `abacatepay_billing_id` (`bill_xxx` do create) como chave de correlação no DB. No webhook, correlacionar via `data.subscription.id` (que aparece do `subscription.completed` em diante).

**`apiVersion` e `devMode`:**
- `apiVersion: 2` — aparece no response e nos webhooks como indicador da versão da API.
- `devMode: false` — flag booleana retornada; indica se o ambiente é sandbox.
- Esses campos NÃO são passados no request, apenas retornados/enviados pelo AbacatePay.

### 1.2 Cancelar Subscription

**Endpoint:** `POST https://api.abacatepay.com/v2/subscriptions/cancel`
**Auth:** `Authorization: Bearer {ABACATEPAY_API_KEY}`
**Confidence:** HIGH — verificado via WebFetch docs oficiais 2026-05-02

**Request body:**

```json
{ "id": "subs_abc123xyz" }
```

**Nota:** O `id` aqui é o `subs_xxx` (ID da subscription), NÃO o `bill_xxx` (ID do checkout). O `subs_xxx` chega no primeiro webhook `subscription.completed` em `data.subscription.id`. Por isso, a tabela `subscriptions` no DB deve salvar ambos:
- `abacatepay_billing_id` = `bill_xxx` (do create response — presente antes do webhook)
- `abacatepay_subscription_id` = `subs_xxx` (do primeiro webhook — necessário para cancel)

**Comportamento:**

> "Cancela **imediatamente** uma assinatura ativa. Nenhuma cobrança futura será gerada. Operação irreversível."

Isso significa:
- AbacatePay para de cobrar imediatamente ao chamar cancel.
- O acesso no nosso sistema é gerenciado independentemente via `next_billing_at` (D-02 cancel híbrido).
- Nosso DB define quando o acesso expira — AbacatePay define quando para de cobrar.

**Response:** Subscription object com `status: "CANCELLED"`, `canceledAt` preenchido.

### 1.3 `next_billing_at` — Cálculo Necessário

O payload dos webhooks `subscription.completed` e `subscription.renewed` NÃO contém campo `next_billing_at` ou `nextBillingAt`.

**Como calcular:**

No webhook `subscription.completed` e `subscription.renewed`, o campo `data.payment.updatedAt` indica quando o pagamento foi processado. Para ciclo MONTHLY:

```typescript
// Calcular próxima cobrança: payment.updatedAt + 30 dias
function calcNextBillingAt(paymentUpdatedAt: string): string {
  const d = new Date(paymentUpdatedAt);
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}
```

**Alternativa:** Usar `data.subscription.updatedAt` (timestamp da última atualização da subscription) + 30 dias — ambos chegam ao mesmo resultado em `subscription.renewed`.

**Confiança:** MEDIUM — calculado por inferência do payload (`2024-12-06` → `2025-01-06` = exatamente 31 dias entre criação e renovação nos exemplos dos docs). Usar 30 dias é conservador.

---

## 2. Webhooks de Subscription — Payload Shape Exato

**Confidence:** HIGH — verificado via WebFetch 2026-05-02

### Shape geral (todos os 3 eventos)

```json
{
  "id": "log_xxx",
  "event": "subscription.completed | subscription.renewed | subscription.cancelled",
  "apiVersion": 2,
  "devMode": false,
  "data": {
    "subscription": {
      "id": "subs_tAFqDWBhcEYTjQh2K0ZYDHau",
      "amount": 4700,
      "currency": "BRL",
      "method": "CARD",
      "status": "ACTIVE | CANCELLED",
      "frequency": "MONTHLY",
      "createdAt": "2024-12-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z",
      "canceledAt": null,
      "cancelPolicy": null,
      "cancelledDueTo": null
    },
    "customer": {
      "id": "cust_xxx",
      "name": "Pedro Paulo",
      "email": "pedro@example.com",
      "taxId": "12.***.***/0001-**"
    },
    "payment": {
      "id": "char_xyz789",
      "externalId": "sub-{user_uuid}",
      "amount": 4700,
      "paidAmount": 4700,
      "platformFee": 100,
      "status": "PAID",
      "methods": ["CARD"],
      "receiptUrl": "https://app.abacatepay.com/receipt/...",
      "createdAt": "2025-01-06T20:00:00.000Z",
      "updatedAt": "2025-01-06T20:00:05.000Z"
    },
    "payerInformation": {
      "method": "CARD",
      "CARD": {
        "brand": "VISA",
        "lastFour": "4242"
      }
    },
    "checkout": {
      "id": "bill_xxx",
      "externalId": null,
      "url": "https://app.abacatepay.com/pay/bill_xxx",
      "amount": 4700,
      "status": "PAID"
    }
  }
}
```

### Diferenças por evento

| Evento | `data.subscription.status` | `data.subscription.canceledAt` | `data.payment` presente? |
|--------|----------------------------|-------------------------------|--------------------------|
| `subscription.completed` | `ACTIVE` | `null` | Sim |
| `subscription.renewed` | `ACTIVE` | `null` | Sim (novo `char_xxx`) |
| `subscription.cancelled` | `CANCELLED` | timestamp | Pode ser null/ausente |

### Correlação DB — estratégia

O `data.payment.externalId` contém o `externalId` que passamos no create (`"sub-{user_uuid}"`). Usar isso para localizar o registro:

```sql
-- No webhook handler:
-- 1. Extrair user_id do externalId: "sub-{user_uuid}" → split('-', 1)[1]
-- OU 2. UPDATE WHERE abacatepay_billing_id = data.checkout.id (mais robusto)
```

**Recomendação:** Estratégia dupla:
1. Primário: `UPDATE WHERE abacatepay_billing_id = data.checkout.id` (bill_xxx — presente nos 3 eventos).
2. Fallback: extrair `user_id` do `externalId` se `checkout.id` não bater.

### Sandbox e simulação de `subscription.renewed`

A documentação de dev mode não cobre simulação de renovação mensal para subscriptions. Não há mecanismo documentado para simular `subscription.renewed` sem esperar 30 dias.

**Decisão (confirmada em CONTEXT.md deferred):** Testes de renovação são manuais — Pedro aguarda o primeiro ciclo real de um usuário sandbox. Para fins de Phase 4, o handler `handleSubscriptionRenewed` é testado via envio manual de webhook com curl/Insomnia com HMAC correto.

---

## 3. Migration 008 SQL — Padrão Idempotente

**Confidence:** HIGH — baseado em leitura direta de migrations 004, 005, 006, 007 do projeto.

### Patterns estabelecidos (extraídos do projeto)

| Pattern | Exemplo no projeto | Usar em 008 |
|---------|-------------------|-------------|
| `create table if not exists` | 004, 005 | Sim |
| `drop policy if exists` antes de `create policy` | 005, 007 | Sim |
| `on conflict ... do nothing` em inserts | 005, 006 | Não necessário (sem seed) |
| `DO $$ begin ... end $$` pra lógica condicional | 005 | Sim (para triggers condicionais) |
| `create or replace function` | 004, 005 | Sim (helper has_active_subscription) |
| `create index if not exists` | 004, 005 | Sim |
| Trigger `updated_at` via `moddatetime` ou função existente | 001 | Reusar função `handle_updated_at` |

### Migration 008 SQL completo

```sql
-- formuladota v2 — Phase 4 Migration 008
-- Subscription mensal AbacatePay CARD recorrente
-- Tabela subscriptions + RLS + helper has_active_subscription()
--
-- Idempotente: create if not exists, drop policy if exists, create or replace function

-- =========================================
-- 1. TABELA subscriptions
-- =========================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- bill_xxx retornado no create response (disponível antes do webhook)
  -- usado para correlacionar webhooks subscription.*
  abacatepay_billing_id text unique,

  -- subs_xxx retornado no primeiro webhook subscription.completed
  -- necessário para chamar POST /v2/subscriptions/cancel
  abacatepay_subscription_id text unique,

  -- Status lifecycle: pendente → active | cancelled | expired
  -- 'pendente': checkout criado, pagamento ainda não confirmado
  -- 'active': webhook subscription.completed recebido
  -- 'cancelled': cancelamento solicitado (acesso até next_billing_at)
  -- 'expired': next_billing_at expirou sem renovação (manual/admin)
  status text not null default 'pendente'
    check (status in ('pendente', 'active', 'cancelled', 'expired')),

  started_at timestamptz,
  next_billing_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice composto para query do helper e middleware
create index if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

-- Garante 1 subscription ativa ou pendente por user
-- Evita duplo checkout se user clicar 2x em "Iniciar mensalidade"
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pendente', 'active');

-- =========================================
-- 2. TRIGGER updated_at
-- Reutiliza função handle_updated_at da Migration 001
-- =========================================
drop trigger if exists handle_subscriptions_updated_at on public.subscriptions;
create trigger handle_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- =========================================
-- 3. RLS
-- SELECT: owner OU admin
-- INSERT: owner apenas (Server Action createSubscriptionCheckout)
-- UPDATE: ninguém via cookie client — service-role only (webhook handler)
-- DELETE: ninguém (audit trail preservado)
-- =========================================
alter table public.subscriptions enable row level security;

drop policy if exists "users see own subscriptions" on public.subscriptions;
create policy "users see own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users create own subscriptions" on public.subscriptions;
create policy "users create own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- Sem policy para UPDATE/DELETE via cookie client.
-- Webhook usa service-role que bypassa RLS.
-- Isso impossibilita user manipular status diretamente.

-- =========================================
-- 4. HELPER has_active_subscription()
-- Retorna true se user logado tem subscription:
--   status='active' com next_billing_at > now()  (subscription corrente)
--   OU status='cancelled' com next_billing_at > now()  (período pago, cancel híbrido D-02)
-- Phase 5 (lobbies) consome este helper em:
--   WITH CHECK (public.has_active_subscription())
-- =========================================
create or replace function public.has_active_subscription()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active', 'cancelled')
      and next_billing_at > now()
  );
$$;

-- Grant para anon/authenticated (necessário para uso em RLS policies)
grant execute on function public.has_active_subscription() to authenticated;
```

### Notas importantes da Migration 008

1. **`abacatepay_billing_id` nullable:** Criado como `null` no create response via Server Action. Preenchido com `bill_xxx` quando Server Action recebe response do AbacatePay. Ou, alternativamente, preenchido antes da criação se o billing_id vier no create flow.

2. **`abacatepay_subscription_id` nullable:** Preenchido apenas quando webhook `subscription.completed` chega. Entre o checkout criado e o primeiro webhook, essa coluna fica `null`.

3. **`handle_updated_at` trigger:** Verificar que a função existe (Migration 001 criou via `moddatetime` extension ou função própria). Se não existir, criar na Migration 008.

4. **Índice `subscriptions_one_active_per_user`:** Partial unique index `WHERE status IN ('pendente','active')` — garante que usuário não crie segundo checkout enquanto primeiro ainda está pendente. Ao cancelar/expirar, status sai do conjunto → novo checkout pode ser criado.

---

## 4. Helper SQL `has_active_subscription()` — Implementação e Testes

**Confidence:** HIGH — SQL verified against project patterns em migrations 004/005.

### Implementação final (já incluída em §3)

```sql
create or replace function public.has_active_subscription()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active', 'cancelled')
      and next_billing_at > now()
  );
$$;
```

### Queries de teste pós-migration (via Supabase MCP ou SQL Editor)

```sql
-- Test 1: User com subscription active, next_billing_at no futuro → true
insert into subscriptions (user_id, status, next_billing_at)
values ('test-uuid-here', 'active', now() + interval '30 days');
-- set auth.uid() = 'test-uuid-here' e checar:
select public.has_active_subscription(); -- deve retornar true

-- Test 2: User com subscription cancelled mas next_billing_at no futuro → true (D-02)
update subscriptions set status='cancelled', cancelled_at=now()
where user_id='test-uuid-here';
select public.has_active_subscription(); -- deve retornar true (período pago ainda válido)

-- Test 3: User com subscription cancelled e next_billing_at no passado → false
update subscriptions set next_billing_at = now() - interval '1 day'
where user_id='test-uuid-here';
select public.has_active_subscription(); -- deve retornar false

-- Test 4: User com status='pendente' → false (pagamento não confirmado ainda)
update subscriptions set status='pendente', next_billing_at = now() + interval '30 days'
where user_id='test-uuid-here';
select public.has_active_subscription(); -- deve retornar false

-- Test 5: User sem subscription → false
delete from subscriptions where user_id='test-uuid-here';
select public.has_active_subscription(); -- deve retornar false
```

### Uso em Phase 5 (documentar para agent de Phase 5)

```sql
-- Phase 5 adiciona esta policy quando tabela lobbies existir:
create policy "subscribers create lobbies"
  on public.lobbies for insert
  with check (
    public.has_active_subscription()
    and public.has_accepted_doctrine(auth.uid())
    and public.is_user_active(auth.uid())
  );
```

---

## 5. Discriminated Union Zod — Schema Completo

**Confidence:** HIGH — testado localmente com Zod 3.25.76 instalado no projeto.

### Validação realizada

```
node -e "z.discriminatedUnion('event', [...])" — ✓ funciona com literal strings contendo ponto
Narrowing de tipo TypeScript por .event — ✓ funciona no runtime test
```

### Schema completo para `src/types/abacatepay.ts`

O arquivo existente tem `webhookPayloadSchema` como `z.object` simples com `event: z.enum(ABACATEPAY_WEBHOOK_EVENTS)` cobrindo apenas eventos `transparent.*`. A extensão substitui esse schema por `z.discriminatedUnion`.

**Pattern de extensão:**

```typescript
// Schemas reutilizáveis — campos comuns
export const webhookCustomerSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  taxId: z.string().optional(),
});

export const webhookTransparentSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  amount: z.number(),
  status: z.string(),
});

// Schema específico para eventos subscription.*
export const webhookSubscriptionSchema = z.object({
  id: z.string(),          // subs_xxx
  amount: z.number(),
  currency: z.string().optional(),
  method: z.string().optional(),
  status: z.string(),
  frequency: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  canceledAt: z.string().nullable().optional(),
  cancelPolicy: z.string().nullable().optional(),
  cancelledDueTo: z.string().nullable().optional(),
});

export const webhookSubscriptionPaymentSchema = z.object({
  id: z.string(),          // char_xxx
  externalId: z.string().nullable().optional(), // "sub-{user_uuid}" que passamos
  amount: z.number(),
  paidAmount: z.number().optional(),
  platformFee: z.number().optional(),
  status: z.string(),
  methods: z.array(z.string()).optional(),
  receiptUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webhookSubscriptionCheckoutSchema = z.object({
  id: z.string().optional(),        // bill_xxx
  externalId: z.string().nullable().optional(),
  url: z.string().optional(),
  amount: z.number().optional(),
  status: z.string().optional(),
});

// Data shapes por família de evento
const transparentData = z.object({
  transparent: webhookTransparentSchema,
  customer: webhookCustomerSchema.optional(),
});

const subscriptionData = z.object({
  subscription: webhookSubscriptionSchema,
  customer: webhookCustomerSchema.optional(),
  payment: webhookSubscriptionPaymentSchema.optional(),
  checkout: webhookSubscriptionCheckoutSchema.optional(),
});

// Campos base comuns (apiVersion, devMode)
const baseFields = {
  apiVersion: z.number().optional(),
  devMode: z.boolean().optional(),
};

// Discriminated union — discriminator é o campo 'event'
// TypeScript infere tipo narrowed dentro de cada case:
//   event === 'subscription.completed' → data tem .subscription, .payment, etc.
//   event === 'transparent.completed'  → data tem .transparent
export const webhookPayloadSchema = z.discriminatedUnion("event", [
  z.object({ ...baseFields, event: z.literal("transparent.completed"),  data: transparentData }),
  z.object({ ...baseFields, event: z.literal("transparent.disputed"),   data: transparentData }),
  z.object({ ...baseFields, event: z.literal("transparent.refunded"),   data: transparentData }),
  z.object({ ...baseFields, event: z.literal("subscription.completed"), data: subscriptionData }),
  z.object({ ...baseFields, event: z.literal("subscription.renewed"),   data: subscriptionData }),
  z.object({ ...baseFields, event: z.literal("subscription.cancelled"), data: subscriptionData }),
]);
export type AbacatepayWebhookPayload = z.infer<typeof webhookPayloadSchema>;
```

### Impacto no webhook handler existente

O handler atual usa `payload.data.transparent.id` e `payload.data.customer`. Com o novo schema discriminated union, TypeScript exige narrowing antes de acessar campos específicos:

```typescript
// Antes (schema simples):
const externalPaymentId = payload.data.transparent.id; // sempre acessível

// Depois (discriminated union):
if (payload.event === "transparent.completed") {
  const externalPaymentId = payload.data.transparent.id; // TypeScript narrowed
}
```

O switch existente já usa `payload.event` como discriminador — apenas adicionar os novos `case` no switch e usar narrowing correto nos helpers internos.

---

## 6. Webhook Handler — Extension Pseudocode

**Confidence:** HIGH — baseado em leitura direta do handler existente (185 linhas).

### Estrutura do handler pós-Phase 4

O switch em `route.ts` passa de:
```typescript
if (payload.event === "transparent.completed") { ... }
else if (payload.event === "transparent.refunded") { ... }
else { // disputed }
```

Para:
```typescript
switch (payload.event) {
  case "transparent.completed":   await handlePaymentCompleted(...); break;
  case "transparent.refunded":    await handleRefund(...); break;
  case "transparent.disputed":    console.error(...); break;
  case "subscription.completed":  await handleSubscriptionCompleted(...); break;
  case "subscription.renewed":    await handleSubscriptionRenewed(...); break;
  case "subscription.cancelled":  await handleSubscriptionCancelled(...); break;
}
```

### Handler `handleSubscriptionCompleted`

```typescript
async function handleSubscriptionCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  payload: Extract<AbacatepayWebhookPayload, { event: "subscription.completed" }>
): Promise<void> {
  const subsId = payload.data.subscription.id;       // subs_xxx
  const billId = payload.data.checkout?.id ?? null;  // bill_xxx (correlação)
  const paymentUpdatedAt = payload.data.payment?.updatedAt;

  // Calcular next_billing_at: payment.updatedAt + 30 dias (MONTHLY)
  const nextBillingAt = paymentUpdatedAt
    ? new Date(new Date(paymentUpdatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // UPDATE condicional — idempotência (D-07):
  // WHERE status='pendente' garante que webhook duplicado afeta 0 rows
  const { data: updated } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      abacatepay_subscription_id: subsId,
      started_at: new Date().toISOString(),
      next_billing_at: nextBillingAt,
    })
    .eq("abacatepay_billing_id", billId ?? "")  // correlaciona pelo bill_xxx
    .eq("status", "pendente")                   // idempotência
    .select("id, user_id")
    .maybeSingle();

  if (!updated) return; // duplicado ou billing_id não encontrado — no-op silencioso

  // Email fire-and-forget
  void sendSubscriptionEmailSafely("completed", supabase, updated, nextBillingAt);
}
```

### Handler `handleSubscriptionRenewed`

```typescript
async function handleSubscriptionRenewed(
  supabase: ReturnType<typeof createServiceClient>,
  payload: Extract<AbacatepayWebhookPayload, { event: "subscription.renewed" }>
): Promise<void> {
  const subsId = payload.data.subscription.id;
  const paymentUpdatedAt = payload.data.payment?.updatedAt;

  const newNextBillingAt = paymentUpdatedAt
    ? new Date(new Date(paymentUpdatedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  if (!newNextBillingAt) return; // sem data de pagamento → não atualiza

  // WHERE next_billing_at < newNextBillingAt garante idempotência em reorders (D-07)
  const { data: updated } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      next_billing_at: newNextBillingAt,
    })
    .eq("abacatepay_subscription_id", subsId)
    .lt("next_billing_at", newNextBillingAt) // só atualiza se data avança
    .select("id, user_id")
    .maybeSingle();

  if (!updated) return;

  // idempotencyKey inclui billing period para que Resend não bloqueie segundo email
  const billingPeriodIso = new Date(paymentUpdatedAt!).toISOString().slice(0, 7); // "2025-01"
  void sendSubscriptionEmailSafely("renewed", supabase, updated, newNextBillingAt, billingPeriodIso);
}
```

### Handler `handleSubscriptionCancelled`

```typescript
async function handleSubscriptionCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  payload: Extract<AbacatepayWebhookPayload, { event: "subscription.cancelled" }>
): Promise<void> {
  const subsId = payload.data.subscription.id;

  // WHERE status='active' — idempotente: duplicado é no-op (D-07)
  const { data: updated } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("abacatepay_subscription_id", subsId)
    .eq("status", "active")
    .select("id, user_id, next_billing_at")
    .maybeSingle();

  if (!updated) return;

  // Email cancelamento (apenas se ainda tem período válido — mais útil)
  void sendSubscriptionEmailSafely("cancelled", supabase, updated, updated.next_billing_at);
}
```

### `idempotencyKey` por evento

| Evento | `idempotencyKey` |
|--------|-----------------|
| `subscription.completed` | `subscription-completed-{subscription.id}` |
| `subscription.renewed` | `subscription-renewed-{subscription.id}-{YYYY-MM}` |
| `subscription.cancelled` | `subscription-cancelled-{subscription.id}` |

O billing period ISO `{YYYY-MM}` em `renewed` previne que Resend rejeite o segundo email de renovação (mês seguinte teria mesma base key sem o período).

---

## 7. Server Actions — Estrutura e Padrões

**Confidence:** HIGH — baseado em leitura de `src/app/vincular/steam/actions.ts` e patterns CONTEXT.md.

### `createSubscriptionCheckout` — pattern

```typescript
"use server";
// src/app/assinatura/actions.ts

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSubscription } from "@/lib/abacatepay";
import { requireServerEnv } from "@/lib/env";

export async function createSubscriptionCheckout(): Promise<void> {
  // 1. Autenticar via cookie client (D-10 — NÃO service-role per C13)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required");

  // 2. Checar se já tem subscription ativa (evitar duplicatas)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pendente", "active"])
    .maybeSingle();

  // O índice subscriptions_one_active_per_user também protege no DB
  if (existing) redirect("/assinatura?error=subscription_already_active");

  // 3. Chamar AbacatePay — retorna bill_xxx + url
  const productId = requireServerEnv("ABACATEPAY_HUB_PRODUCT_ID");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const result = await createSubscription(user.id, productId, siteUrl);
  if (!result.success) redirect("/assinatura?error=payment_provider_error");

  // 4. Salvar registro pendente no DB (INSERT via cookie client — RLS permite)
  const { error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      abacatepay_billing_id: result.data.id, // bill_xxx
      status: "pendente",
    });

  if (error) {
    // Se for violação de unique index (já tem pendente/active), redirecionar
    console.error("[assinatura] insert falhou:", error.message);
    redirect("/assinatura?error=subscription_conflict");
  }

  // 5. Redirecionar para checkout AbacatePay (padrão steam actions.ts)
  redirect(result.data.url);
}
```

### `cancelSubscription` — pattern

```typescript
export async function cancelSubscription(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required");

  // Buscar subscription ativa do user
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, abacatepay_subscription_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription?.abacatepay_subscription_id) {
    redirect("/assinatura?error=no_active_subscription");
  }

  // Chamar AbacatePay cancel (imediato — AbacatePay para de cobrar)
  const result = await cancelAbacatepaySubscription(subscription.abacatepay_subscription_id);
  if (!result.success) redirect("/assinatura?error=cancel_failed");

  // Atualizar DB (D-02: mantém next_billing_at — acesso até fim do período)
  await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  redirect("/assinatura?status=cancelled");
}
```

### `redirect()` para URL externa — pattern confirmado

`src/app/vincular/steam/actions.ts` usa `redirect(steamUrl)` onde `steamUrl` é uma URL externa (domínio Steam). O mesmo pattern funciona para URL AbacatePay `https://app.abacatepay.com/pay/bill_xxx`. Next.js converte em 303 See Other automaticamente.

---

## 8. Página `/assinatura` — Server Component Skeleton

**Confidence:** HIGH — pattern extraído de `/perfil/page.tsx` e `/codigo-de-conduta` pages.

### Estrutura de arquivo

```
src/app/assinatura/
├── page.tsx         # Server Component — query + UI condicional
└── actions.ts       # createSubscriptionCheckout + cancelSubscription
```

### Skeleton do page.tsx

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createSubscriptionCheckout, cancelSubscription } from "./actions";

// StatusCard extraído no mesmo arquivo (pattern ErrorBanner Phase 3)
// para manter page.tsx ≤ 50 linhas sem criar arquivo separado

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Query subscription atual (2-query approach: sem JOIN)
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status, next_billing_at, cancelled_at, started_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const hasAccess = subscription?.status === "active" ||
    (subscription?.status === "cancelled" &&
     subscription.next_billing_at &&
     new Date(subscription.next_billing_at) > new Date());

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl space-y-8">
        {params.error && <ErrorBanner message={errorMessages[params.error] ?? params.error} />}
        <SubscriptionCard
          subscription={subscription}
          hasAccess={hasAccess}
        />
      </div>
    </main>
  );
}
```

### Estado visual por status (D-06)

| Status | Cor border/badge | Texto | Botão |
|--------|-----------------|-------|-------|
| Sem subscription | cyan `#00F0FF` | "R$ 47/mês — acesso completo ao HUB" | "Iniciar mensalidade" |
| `active` | verde `#22c55e` | "Mensalidade ativa — Próxima cobrança: {data}" | "Cancelar mensalidade" |
| `cancelled` + futuro | amarelo `#eab308` | "Cancelada — Acesso até: {data}" | "Reativar mensalidade" |
| `cancelled` + expirado / `expired` | vermelho `#ef4444` | "Sem acesso ativo" | "Iniciar mensalidade" |
| `pendente` | purple `#A855F7` | "Pagamento pendente — complete o checkout" | Link para URL AbacatePay |

### Formatação `next_billing_at` PT-BR

```typescript
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  // Resultado: "06 de janeiro de 2025"
}
```

---

## 9. `src/lib/abacatepay.ts` — Funções a Adicionar

### `createSubscription`

```typescript
export type CreateSubscriptionResult =
  | { success: true; data: { id: string; url: string; externalId: string } }
  | { success: false; error: string };

export async function createSubscription(
  userId: string,
  productId: string,
  siteUrl: string
): Promise<CreateSubscriptionResult> {
  const apiKey = requireServerEnv("ABACATEPAY_API_KEY");

  const body = {
    items: [{ id: productId, quantity: 1 }],
    externalId: `sub-${userId}`,
    completionUrl: `${siteUrl}/assinatura?status=ativada`,
    returnUrl: `${siteUrl}/assinatura`,
    methods: ["CARD"],
    metadata: { userId },
  };

  // fetch + try/catch + Zod validation (padrão createTransparentPix)
  // Response: { data: { id: "bill_xxx", url: "...", externalId: "..." }, success: true }
}
```

### `cancelAbacatepaySubscription`

```typescript
export type CancelSubscriptionResult =
  | { success: true }
  | { success: false; error: string };

export async function cancelAbacatepaySubscription(
  subscriptionId: string // subs_xxx
): Promise<CancelSubscriptionResult> {
  const apiKey = requireServerEnv("ABACATEPAY_API_KEY");

  // POST /v2/subscriptions/cancel com body { id: subscriptionId }
  // Response: { data: { status: "CANCELLED", ... }, success: true }
}
```

---

## 10. `src/lib/resend.ts` — Templates Email

**Confidence:** HIGH — baseado em leitura de resend.ts existente (96 linhas) + patterns CONTEXT.md D-09.

### 3 funções a adicionar

```typescript
interface SubscriptionEmailBase {
  subscriptionId: string;  // usado como idempotencyKey base
  customerEmail: string;
  customerName?: string;
  nextBillingAt: string;   // ISO string → formatar PT-BR no builder
}

// 1. subscription.completed
export async function sendSubscriptionCompletedEmail(
  input: SubscriptionEmailBase & { billingPeriod?: string }
): Promise<void>

// 2. subscription.renewed
export async function sendSubscriptionRenewedEmail(
  input: SubscriptionEmailBase & { billingPeriodIso: string } // "2025-01"
): Promise<void>

// 3. subscription.cancelled
export async function sendSubscriptionCancelledEmail(
  input: SubscriptionEmailBase
): Promise<void>
```

### idempotencyKey pattern (confirmado Resend SDK v6.12.2)

```typescript
await resend.emails.send(payload, {
  idempotencyKey: `subscription-completed-${input.subscriptionId}`,
});
// Para renewed (evitar bloquear mês seguinte):
idempotencyKey: `subscription-renewed-${input.subscriptionId}-${input.billingPeriodIso}`
```

### Template builder cyberpunk — estrutura base

```typescript
function buildSubscriptionCompletedHtml(input: SubscriptionEmailBase): string {
  const nextDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(input.nextBillingAt));

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;
                padding:32px;max-width:600px;margin:0 auto;border-radius:8px;
                border:1px solid #27272a">
      <h1 style="color:#00F0FF;font-size:28px;margin:0 0 16px 0">Bem-vindo ao HUB!</h1>
      <p>Sua mensalidade de <strong style="color:#00F0FF">R$ 47</strong> está ativa.</p>
      <p>Próxima cobrança: <strong>${nextDate}</strong></p>
      <p style="color:#71717a;font-size:12px;margin-top:32px;
                border-top:1px solid #27272a;padding-top:16px">
        FormulaDota HUB — Dota 2 competitivo com Pedro Paulo (Immortal/Top 0.5%)
      </p>
    </div>
  `;
}
```

---

## 11. `src/lib/env.ts` — Adição de env vars

```typescript
// Adicionar ao serverSchema:
ABACATEPAY_HUB_PRODUCT_ID: optional,  // prod_xxxx do dashboard AbacatePay
HUB_PRICE_BRL: optional,               // "47" — display only; cobrança usa preço do dashboard
```

**Pedro task manual:** Criar produto no dashboard AbacatePay sandbox (`Nome: FormulaDota HUB Mensal`, `Preço: 4700`, `Ciclo: MONTHLY`), copiar `prod_xxxx`, adicionar em `.env.local`.

---

## Common Pitfalls

### Pitfall 1: Acessar `payload.data.transparent` após discriminated union

**O que vai errar:** O handler existente acessa `payload.data.transparent.id` diretamente. Com o schema discriminated union, TypeScript vai reclamar que `data` pode ser `transparentData | subscriptionData`, e `transparent` não existe em `subscriptionData`.

**Como evitar:** Dentro do `switch(payload.event)` (ou `if payload.event === "transparent.completed"`), TypeScript faz narrowing automático. Acessar `payload.data.transparent` apenas dentro dos branches `transparent.*`.

**Código de correção no handler existente:**

```typescript
// Antes:
const externalPaymentId = payload.data.transparent.id; // TypeScript error após discriminated union

// Depois (dentro do if/case correto):
if (payload.event === "transparent.completed") {
  const externalPaymentId = payload.data.transparent.id; // OK — narrowed
}
```

### Pitfall 2: `bill_xxx` vs `subs_xxx` — dois IDs diferentes

**O que vai errar:** O create response retorna `bill_xxx` (billing/checkout ID). O `subs_xxx` (subscription ID) chega apenas no primeiro webhook `subscription.completed`. Usar `subs_xxx` para cancel antes de receber o webhook → crash porque campo é null.

**Como evitar:**
- DB: `abacatepay_billing_id` (bill_xxx) preenchido no INSERT pelo Server Action.
- DB: `abacatepay_subscription_id` (subs_xxx) preenchido pelo webhook `subscription.completed` UPDATE.
- Server Action `cancelSubscription` verifica que `abacatepay_subscription_id IS NOT NULL` antes de chamar API.
- UI: botão "Cancelar" só aparece quando `status='active'` — garantia de que webhook completed já foi processado.

### Pitfall 3: `next_billing_at` não vem no payload

**O que vai errar:** Webhook não traz `next_billing_at` → campo fica `null` → helper `has_active_subscription()` retorna `false` imediatamente porque `next_billing_at > now()` é `NULL > now()` = `false`.

**Como evitar:** Calcular `next_billing_at = payment.updatedAt + 30 dias` nos handlers `subscription.completed` e `subscription.renewed`. Verificar que o cálculo usa `data.payment.updatedAt` (não `data.subscription.updatedAt` — podem diferir por segundos).

### Pitfall 4: Cancel AbacatePay é imediato — ação irreversível

**O que vai errar:** Usuário clica "Cancelar mensalidade" → AbacatePay cancela imediatamente → se DB não atualizar `cancelled_at` por erro de rede, AbacatePay não cobra mais mas nosso DB ainda mostra `active`.

**Como evitar:** Sequência obrigatória no `cancelSubscription` Server Action:
1. Chamar AbacatePay primeiro.
2. Se AbacatePay suceder → UPDATE DB.
3. Se DB falhar → logar erro mas AbacatePay já cancelou — admin trata manualmente.
4. NÃO reverter o cancel no AbacatePay em caso de erro DB (irreversível + complexo).

### Pitfall 5: Subscriptions são CARD, não PIX

**O que vai errar:** Dashboard AbacatePay configurado com `method: PIX` → create retorna erro 400 ou ignora o campo → checkout apresenta cartão ao usuário quando copy promete PIX.

**Como evitar:**
- Sempre passar `methods: ["CARD"]` no payload.
- Atualizar toda copy que mencione "PIX recorrente" → "Cartão de crédito recorrente" ou neutro "R$ 47/mês".
- **Pedro deve ser informado desta mudança antes de lançar.**

### Pitfall 6: `externalId` em `data.checkout` é null nos webhooks

**O que vai errar:** Tentar correlacionar via `data.checkout.externalId` nos handlers → sempre `null` → zero rows atualizadas → subscription nunca ativada.

**Como evitar:** Correlacionar via `data.checkout.id` (bill_xxx) que está sempre presente, OU via `data.subscription.id` (subs_xxx) após o primeiro completed. Nunca confiar em `checkout.externalId`.

### Pitfall 7: RLS bloqueia UPDATE do webhook

**O que vai errar:** Webhook handler usa `createServiceClient()` corretamente (per C13) → sem RLS block. Mas se acidentalmente usar `createClient()` (cookie) → UPDATE subscription via webhook retorna 0 rows (RLS bloqueia update por non-owner).

**Como evitar:** `route.ts` importa APENAS `createServiceClient` de `@/lib/supabase/service`. Zero import de `@/lib/supabase/server` no arquivo do webhook. Code review grep: `grep -n "supabase/server" src/app/api/webhooks/abacatepay/route.ts` deve retornar vazio.

---

## Validation Architecture

> Nyquist validation habilitado para esta fase (não explicitamente desabilitado).

### Estratégia

O projeto não tem framework de testes automatizados instalado (sem jest.config, vitest.config, pytest.ini). Validação é manual end-to-end + grep checks + queries SQL diretas.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Nenhum instalado — validação manual + SQL queries |
| Config file | N/A |
| Quick run command | `pnpm typecheck && pnpm lint` |
| Full suite command | `pnpm typecheck && pnpm lint && pnpm build` |

### Passos de Validação Manual End-to-End

**Pré-condição:** `ABACATEPAY_HUB_PRODUCT_ID=prod_xxxx` configurado em `.env.local` (Pedro cria produto no dashboard sandbox primeiro).

#### Fluxo 1 — Subscription Criada

1. Abrir `/assinatura` sem estar logado → redirect `/login` ✓
2. Logar com Discord → abrir `/assinatura` → card cyan "Iniciar mensalidade" aparece ✓
3. Clicar "Iniciar mensalidade" → redirect para `app.abacatepay.com/pay/bill_xxx` ✓
4. Verificar no Supabase SQL Editor que registro inserido: `SELECT * FROM subscriptions WHERE user_id = '{user_id}';` → `status='pendente'`, `abacatepay_billing_id='bill_xxx'` ✓

#### Fluxo 2 — Webhook subscription.completed

5. Simular webhook via curl/Insomnia:

```bash
# Calcular HMAC:
# echo -n '{json}' | openssl dgst -sha256 -hmac "$ABACATEPAY_WEBHOOK_SECRET" -binary | base64

curl -X POST http://localhost:3000/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: {HMAC_CALCULADO}" \
  -d '{
    "event": "subscription.completed",
    "apiVersion": 2,
    "devMode": true,
    "data": {
      "subscription": { "id": "subs_test123", "amount": 4700, "status": "ACTIVE", "frequency": "MONTHLY", "createdAt": "2026-05-02T20:00:00Z", "updatedAt": "2026-05-02T20:00:00Z" },
      "customer": { "email": "pedro@test.com", "name": "Pedro Test" },
      "payment": { "id": "char_test", "amount": 4700, "status": "PAID", "createdAt": "2026-05-02T20:00:00Z", "updatedAt": "2026-05-02T20:00:05Z" },
      "checkout": { "id": "bill_xxx", "externalId": null }
    }
  }'
```

6. Verificar resposta: `{ "received": true }` com HTTP 200 ✓
7. Verificar DB: `SELECT status, abacatepay_subscription_id, next_billing_at FROM subscriptions WHERE abacatepay_billing_id='bill_xxx';` → `status='active'`, `subs_xxx` preenchido, `next_billing_at` = ~30 dias no futuro ✓
8. Abrir `/assinatura` → card verde "Mensalidade ativa — Próxima cobrança: {data}" ✓
9. Verificar email recebido em inbox (se `EMAIL_FROM` configurado) ✓

#### Fluxo 3 — Webhook duplicado (idempotência)

10. Reenviar o mesmo webhook do passo 5 ✓
11. Verificar DB: 0 rows alteradas (UPDATE WHERE status='pendente' → status já é 'active') ✓
12. Verificar resposta ainda: `{ "received": true }` HTTP 200 (não 5xx) ✓

#### Fluxo 4 — Cancel Subscription

13. Na página `/assinatura` com status 'active', clicar "Cancelar mensalidade" ✓
14. Verificar que AbacatePay recebeu cancel (dashboard sandbox) ✓
15. Verificar DB: `SELECT status, cancelled_at, next_billing_at FROM subscriptions WHERE id='{id}';` → `status='cancelled'`, `cancelled_at` preenchido, `next_billing_at` PRESERVADO ✓
16. Abrir `/assinatura` → card amarelo "Cancelada — Acesso até: {data}" (acesso ainda válido porque `next_billing_at > now()`) ✓

#### Fluxo 5 — Webhook subscription.renewed

17. Simular webhook renewed (mesmo formato, event='subscription.renewed', `updatedAt` + 30 dias a frente) ✓
18. Verificar DB: `next_billing_at` avançado para +30 dias ✓
19. Segundo renewed com mesma data → 0 rows (idempotência) ✓

#### Fluxo 6 — helper `has_active_subscription()`

20. Via Supabase SQL Editor, simular user ativo:

```sql
-- Como service role, checar resultado do helper para o user de teste:
select has_active_subscription() from auth.users -- NÃO funciona sem auth context
-- Usar RPC ou verificar comportamento via query direta:
select exists (
  select 1 from subscriptions
  where user_id = '{user_uuid}'
    and status in ('active','cancelled')
    and next_billing_at > now()
); -- deve retornar true
```

### Grep Checks Pós-Implementação

```bash
# Verificar que service-role não vaza em Server Components/Actions (C13)
grep -rn "createServiceClient" src/app/ --include="*.ts" --include="*.tsx"
# Deve retornar APENAS: src/app/api/webhooks/abacatepay/route.ts

# Verificar que webhook handler não importa cookie client
grep -n "supabase/server" src/app/api/webhooks/abacatepay/route.ts
# Deve retornar vazio

# Verificar zero 'any' TypeScript (C1)
grep -rn ": any" src/app/assinatura/ src/lib/abacatepay.ts src/types/abacatepay.ts
# Deve retornar vazio

# Verificar que funções têm max 50 linhas (C2) — manual review
wc -l src/app/assinatura/actions.ts src/app/api/webhooks/abacatepay/route.ts

# Verificar que webhook retorna 200 sempre (não 5xx no happy path)
grep -n "status: 4\|status: 5" src/app/api/webhooks/abacatepay/route.ts
# Deve retornar apenas o 401 do HMAC inválido — não outros erros 4xx/5xx
```

### Phase Gate

Fase concluída quando:
- [ ] `pnpm typecheck` passa zero erros
- [ ] `pnpm lint` passa zero erros
- [ ] `pnpm build` completa sem erros
- [ ] Todos os 6 fluxos de validação manual executados e verificados
- [ ] Grep checks retornam resultados esperados
- [ ] Migration 008 aplicada ao Supabase sandbox sem erros
- [ ] Pedro confirma que subscription CARD (não PIX) é aceitável para o produto

---

## Standard Stack

### Core (Phase 4 específico)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 3.25.76 | Schema validation + discriminated union | Já instalado; tested locally |
| Resend SDK | 6.12.2 | Email transacional com idempotencyKey | Já instalado; pattern Phase 2 |
| @supabase/ssr | 0.5.2 | Server/client Supabase | Já instalado; pattern todo projeto |
| Next.js | 16.2.4 | App Router, Server Actions, redirect | Core framework |

### Nenhuma dependência nova necessária

Phase 4 reutiliza 100% das dependências já instaladas. Sem `pnpm install` de novos packages.

### Migrations aplicadas via script existente

```bash
node scripts/apply-migration-005.mjs  # padrão existente — adaptar para migration 008
# OU via MCP Supabase tools quando disponíveis
```

---

## Architecture Patterns

### Estrutura de arquivos a criar/modificar

```
src/
├── app/
│   ├── assinatura/
│   │   ├── page.tsx          # NOVO — Server Component (≤ 50 linhas + helper funções)
│   │   └── actions.ts        # NOVO — createSubscriptionCheckout + cancelSubscription
│   └── api/webhooks/abacatepay/
│       └── route.ts          # MODIFICAR — +3 handlers + switch extension
├── lib/
│   ├── abacatepay.ts         # MODIFICAR — +createSubscription +cancelAbacatepaySubscription
│   ├── resend.ts             # MODIFICAR — +3 email funções
│   └── env.ts                # MODIFICAR — +ABACATEPAY_HUB_PRODUCT_ID +HUB_PRICE_BRL
└── types/
    └── abacatepay.ts         # MODIFICAR — replace webhookPayloadSchema com discriminated union
supabase/migrations/
    └── 008_subscriptions.sql # NOVO — tabela + RLS + helper
```

### Pattern: helper extractors no mesmo arquivo (Phase 3 pattern)

Funções auxiliares como `formatDate`, `ErrorBanner`, `SubscriptionCard` são extraídas no mesmo arquivo do page.tsx. Isso honra C2 (max 50 linhas por função) sem criar churn de imports desnecessários para componentes de página única.

### Anti-Patterns a Evitar

- **NÃO** criar `/api/webhooks/abacatepay/subscriptions/route.ts` separado (D-04).
- **NÃO** usar service-role em Server Actions (C13, D-10).
- **NÃO** adicionar tabela `subscription_plans` (D-05).
- **NÃO** consultar `trial_ends_at` no helper (D-01).
- **NÃO** fazer `.then().catch()` chains em nenhum código novo (C11).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC verification | Custom crypto logic | `verifyAbacatepayWebhookSignature` existente em `src/lib/abacatepay.ts` | Phase 2 já implementou com timingSafeEqual |
| Email dedup | Custom tracking table | Resend `idempotencyKey` parameter | SDK nativo, zero overhead |
| Subscription status page | Custom polling | Next.js Server Component + `redirect()` com searchParams | Simples, sem estado client |
| Date formatting PT-BR | Custom date formatter | `Intl.DateTimeFormat('pt-BR')` | Web API nativa, sem deps |
| DB type safety | Tipo manual | `Pick<Tables<"subscriptions">, K>` existente no projeto | Pattern estabelecido Phase 2/3 |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webhook schema `z.object` fixo | `z.discriminatedUnion` por `event` | Phase 4 | TypeScript narrowing automático por evento |
| PIX avulso `bill_xxx` único ID | Dois IDs: `bill_xxx` (checkout) + `subs_xxx` (subscription) | Phase 4 | Precisar salvar ambos no DB |
| AbacatePay Transparent PIX inline | Subscription CARD checkout hospedado | Phase 4 | Redirecionamento para página AbacatePay |

---

## Open Questions

1. **Pedro deve confirmar: CARD ok para público Dota 2 BR?**
   - O que sabemos: AbacatePay subscription = CARD apenas (docs confirmados).
   - O que está incerto: público-alvo tem cartão/prefere PIX?
   - Recomendação: Confirmar com Pedro antes de implementar. Se PIX preferido, investigar PIX manual mensal (Vercel Cron + Transparent PIX, mais complexo).

2. **`handle_updated_at` — função existe na Migration 001?**
   - O que sabemos: Migration 001 cria `profiles`, `packages`, etc. com trigger `updated_at`.
   - O que está incerto: se usa `moddatetime` extension ou função própria `handle_updated_at`.
   - Recomendação: Plan 04-01 lê Migration 001 para confirmar nome da função antes de criar trigger em 008.

3. **Sandbox AbacatePay suporta subscription?**
   - O que sabemos: docs mencionam `devMode: true` em respostas sandbox.
   - O que está incerto: produto criado em sandbox tem ciclo cobrável? Webhook de renovação chega em sandbox após 30 dias ou há simulação?
   - Recomendação: Pedro testa create subscription em sandbox ao configurar `prod_xxxx`. Se sandbox não suportar renovação automática, testar webhook renewed via curl manual.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Scripts, dev server | ✓ | v22.22.0 | — |
| pnpm | Package manager | ✓ | 10.28.2 | — |
| Zod | Schema validation | ✓ | 3.25.76 (instalado) | — |
| Resend SDK | Email | ✓ | 6.12.2 (instalado) | — |
| ABACATEPAY_HUB_PRODUCT_ID | createSubscription | ✗ | — | Pedro cria manual pré-execução |
| Supabase Migration 008 | subscriptions table | ✗ | — | Aplicar via script ou MCP |

**Missing dependencies com fallback:**
- `ABACATEPAY_HUB_PRODUCT_ID` — Pedro deve criar produto no dashboard AbacatePay sandbox antes de executar Plans da Phase 4. Sem isso, `createSubscription` lança `requireServerEnv` error.

---

## Sources

### Primary (HIGH confidence)
- WebFetch `https://docs.abacatepay.com/pages/subscriptions/create.md` — endpoint, payload, response shape, CARD-only confirmation
- WebFetch `https://docs.abacatepay.com/pages/subscriptions/cancel.md` — endpoint POST `/v2/subscriptions/cancel`, cancel imediato
- WebFetch `https://docs.abacatepay.com/pages/webhooks/events/subscriptions.md` — event names, payload shape, subs_xxx/bill_xxx/char_xxx prefixes
- WebFetch `https://docs.abacatepay.com/llms.txt` — índice completo; confirmação de página cancel
- Leitura direta `src/types/abacatepay.ts` — schema Zod existente
- Leitura direta `src/app/api/webhooks/abacatepay/route.ts` — handler existente
- Leitura direta `src/lib/abacatepay.ts` — cliente existente
- Leitura direta `src/lib/resend.ts` — email cliente + idempotencyKey pattern
- Leitura direta `src/lib/env.ts` — env schema pattern
- Leitura direta `src/app/vincular/steam/actions.ts` — redirect URL externa pattern
- Leitura direta `supabase/migrations/004_doctrine_and_moderation.sql` — helpers RLS, trigger pattern
- Leitura direta `supabase/migrations/005_steam_roles_multicoach.sql` — migration multi-table idempotente
- node -e test `z.discriminatedUnion` com Zod 3.25.76 — confirmação funcional ✓

### Secondary (MEDIUM confidence)
- WebFetch devmode.md — sandbox testing limitado para subscriptions (nenhuma doc de simulação renewal)
- `.planning/research/hub-stack-deep-dive.md` §1 — research 2026-04-30 (REVALIDADO; PIX finding contradiz)

### Tertiary (LOW confidence)
- Cálculo `next_billing_at = payment.updatedAt + 30 dias` — inferido dos timestamps dos exemplos nos docs (2024-12-06 → 2025-01-06); não documentado explicitamente como fórmula

---

## Metadata

**Confidence breakdown:**
- AbacatePay endpoints: HIGH — WebFetch docs oficiais 2026-05-02
- Cancel behavior (imediato): HIGH — docs explícitos "cancela imediatamente"
- Subscription CARD-only: HIGH — docs explícitos "assinaturas suportam apenas CARD"
- `next_billing_at` ausente no payload: HIGH — confirmado em múltiplos exemplos dos docs
- Cálculo next_billing_at (+30 dias): MEDIUM — inferido de timestamps; não documentado como fórmula
- Discriminated union Zod: HIGH — testado localmente com Zod 3.25.76
- Migration patterns: HIGH — baseado em migrations 004-007 do projeto
- Resend idempotencyKey: HIGH — código existente em src/lib/resend.ts Linha 53

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (AbacatePay docs são estáveis; PIX finding pode mudar se AbacatePay adicionar suporte)
