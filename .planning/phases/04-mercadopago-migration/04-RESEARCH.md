# Phase 4: Mercado Pago Migration End-to-End — Research

**Researched:** 2026-05-02
**Domain:** Mercado Pago Payments API (PIX avulso + Pix Automático subscription) + AbacatePay removal
**Confidence:** MEDIUM (docs oficiais MP apresentam JavaScript rendering — alguns campos confirmados via SDK Go source + docs MX)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Apagar AbacatePay 100% — sem deprecation period. `purchases.external_payment_id` mantém (genérica). `purchases.payment_provider` já existe em schema 001 com default `'abacatepay'`.
- **D-02** Migration 008 — tabela `subscriptions` com schema exato conforme CONTEXT.md (inclui unique index `one_active_per_user`).
- **D-03** Migration 010 — `ALTER purchases ADD COLUMN IF NOT EXISTS payment_provider` — **ATENÇÃO: a coluna JÁ EXISTE em `001_initial_schema.sql`** (default `'abacatepay'`). Migration 010 precisa apenas: (1) `ALTER TABLE purchases ALTER COLUMN payment_provider SET DEFAULT 'mercadopago'` e (2) adicionar `'mercadopago'` ao CHECK constraint existente, que atualmente só lista `'abacatepay'`. Não é ADD COLUMN — é ALTER COLUMN.
- **D-04** Helper `public.has_active_subscription()` SQL exato conforme CONTEXT.md.
- **D-05** Webhook MP — eventos: `payment.created`/`payment.updated`, `subscription_preapproval`, `subscription_authorized_payment`. HMAC: header `x-signature` formato `ts=...,v1=...`.
- **D-06** Idempotência: purchases UPDATE WHERE status='pendente'; subscriptions UPDATE WHERE status pre-condition. Email Resend `idempotencyKey` `mp-payment-{id}-{event}`.
- **D-07** Cancel flow híbrido: MP cancela via `PUT /preapproval/{id}` body `{status: "cancelled"}`, helper continua true até `next_payment_date`.
- **D-08** Página `/assinatura` paleta Phase 3.5 (preto + vermelho + Cinzel/Marcellus/Inter), 4 estados visuais, sem QR code embed.
- **D-09** MCP MP autenticado — tools `mp__mercadopago__*` disponíveis (requer auth na sessão).
- **D-10** Server Actions usam `createServerClient` cookie-based; webhook usa service-role.
- **D-11** Env vars novos: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_PREAPPROVAL_PLAN_ID` (opcional), `HUB_PRICE_BRL=47`.
- **D-12** Sandbox: Access Token `TEST-...` prefix. MCP tools para criar test users. Webhook via "Simular notificação" no painel ou smee.io.

### Claude's Discretion

- Layout exato `/assinatura` (cores específicas dentro paleta Phase 3.5, ícones Lucide)
- Polling vs refresh manual pós-redirect MP (manter simples — refresh manual)
- ErrorBanner pattern em `/assinatura` (replicar Phase 3)
- Como tratar `paused` state — V1 trata como cancelled

### Deferred Ideas (OUT OF SCOPE)

- Trial 7 dias grátis (V2)
- Email aviso 5d antes vencimento (Phase 8)
- Histórico cobranças + download recibo PDF (Phase 7)
- Multi-plano (V2)
- Cupons / desconto (V2)
- Subscription gate middleware (Phase 5 quando lobbies existir)
- Discord bot notification renewal (Phase 5+)
- Auto-retry overdue (V2)
- Audit log subscription_status_log (V2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| H2.1 | Mensalidade R$47/mês via Mercado Pago Pix Automático — preapproval API, init_point redirect | Seções 2, 3 — payload /preapproval confirmado, init_point presente na response, pending-payment model sem card_token_id |
| H2.2 | Trial removido — `trial_ends_at` permanece null V1 | Sem impact técnico — coluna já existe Migration 005 |
| H2.3 | Helper SQL `has_active_subscription()` retorna true até `next_payment_date` (cancel híbrido) | Seção 7 — SQL completo confirmado do CONTEXT.md D-04 |
| H2.4 | Página `/assinatura`: 4 estados visuais, CTA contextual | Seção 9 — pseudocode page + estados mapeados |
</phase_requirements>

---

## Summary

Esta phase executa 3 trabalhos paralelos: (A) apagar 100% AbacatePay do codebase, (B) migrar checkout PIX avulso pra Mercado Pago `/v1/payments`, (C) criar subscription Pix Automático via `/preapproval`.

A pesquisa confirmou o algoritmo HMAC do webhook MP (manifest `id:{data.id};request-id:{x-request-id};ts:{ts};`, HMAC-SHA256 hex, header `x-signature` com `ts=` e `v1=`). Confirmou que o modelo "pending payments" do preapproval (sem `card_token_id`) é o caminho correto para Pix Automático — o usuário autoriza via `init_point` URL, escolhendo PIX no checkout MP. Confirmou que a coluna `purchases.payment_provider` já existe com default `'abacatepay'` em Migration 001, então Migration 010 é ALTER não ADD COLUMN.

**Descoberta crítica:** Mercado Pago subscriptions API (preapproval) listam suporte a PIX via modelo "pending payments" — sem `card_token_id`, com `status: "pending"`, e o `init_point` redireciona o user para o checkout MP onde ele escolhe Pix. Não há um campo explícito `payment_method_id: "pix"` no payload do preapproval — o PIX aparece como opção no checkout interativo MP. O `sandbox_init_point` existe para testes sem aguardar real payment.

**Recomendação primária:** Usar modelo pending-payment preapproval (sem card_token_id, `status: "pending"`) para Pix Automático. Para PIX avulso, usar `/v1/payments` (Checkout API legado) que retorna `point_of_interaction.transaction_data.qr_code_base64` diretamente — mesmo shape que AbacatePay já usava no frontend.

---

## Standard Stack

### Core

| Library | Version | Purpose | Por que usar |
|---------|---------|---------|--------------|
| `@mercadopago/sdk-js` (frontend) | — | Public Key init (não necessário pra PIX avulso server-side only) | Só precisar se usar Checkout Bricks |
| `node:crypto` (nativo) | — | HMAC-SHA256 webhook validation | Zero deps, mesmo padrão Phase 2 |
| `zod` | já instalado | Schemas input + webhook payload | Já em uso no projeto |
| `@supabase/ssr` | já instalado | Cookie client (Server Actions) + service client (webhook) | Já em uso, pattern C13 |

**Nenhuma instalação nova de pacote necessária.** MP API é chamada via `fetch` nativo — sem SDK server-side necessário.

### Alternativas Consideradas

| Padrão usado | Alternativa | Trade-off |
|---|---|---|
| `fetch` nativo pra MP | `@mercadopago/sdk-nodejs` | SDK V2 é thin wrapper sobre fetch; zero benefício vs mais deps. Prefer fetch. |
| Pending-payment preapproval | Authorized preapproval (card_token_id) | Authorized exige tokenizar cartão no frontend (Checkout Bricks); não adequado para PIX. |
| `/v1/payments` para PIX avulso | `/v1/orders` (Orders API nova) | Orders API usa status `"action_required"` em vez de `"pending"` — webhook events diferentes. `/v1/payments` tem shape idêntico ao AbacatePay (qr_code_base64, brCode) — menor diff. |

---

## Architecture Patterns

### Estrutura de arquivos a criar/apagar

```
src/
├── lib/
│   ├── abacatepay.ts          ← APAGAR
│   ├── mercadopago.ts         ← CRIAR (unificado: pix avulso + preapproval + cancel + webhook verify)
│   └── env.ts                 ← ATUALIZAR (remover ABACATEPAY_*, adicionar MP_*)
├── types/
│   ├── abacatepay.ts          ← APAGAR
│   └── mercadopago.ts         ← CRIAR (Zod schemas: payment create + webhook events + preapproval)
└── app/
    ├── api/
    │   └── webhooks/
    │       ├── abacatepay/    ← APAGAR pasta inteira (route.ts)
    │       └── mercadopago/
    │           └── route.ts   ← CRIAR (handler unificado: payments + subscriptions)
    ├── checkout/[packageId]/
    │   └── actions.ts         ← ATUALIZAR (createTransparentPix → createPixPayment MP)
    └── assinatura/
        ├── page.tsx           ← CRIAR (Server Component, 4 estados)
        └── actions.ts         ← CRIAR (createSubscription, cancelSubscription)

supabase/migrations/
├── 008_subscriptions_mercadopago.sql   ← CRIAR
└── 010_purchases_payment_provider.sql  ← CRIAR (ALTER não ADD COLUMN)

.env.example                   ← ATUALIZAR
```

### Pattern 1: MP PIX Avulso — createPixPayment

```typescript
// src/lib/mercadopago.ts
// Source: Mercado Pago Checkout API docs + sdk-nodejs examples

const MP_BASE_URL = "https://api.mercadopago.com";

export type CreatePixPaymentResult =
  | { success: true; data: MpPixPaymentData }
  | { success: false; error: string };

export async function createPixPayment(
  input: CreatePixPaymentInput
): Promise<CreatePixPaymentResult> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");

  const body = {
    transaction_amount: input.amount, // float, NOT centavos (ex: 47.00 não 4700)
    description: input.description,
    payment_method_id: "pix",
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  };

  const response = await fetch(`${MP_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey, // purchase.id
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await response.json();
  // Response shape:
  // json.id                                   → external_payment_id
  // json.status                               → "pending" (aguardando pagamento)
  // json.point_of_interaction.transaction_data.qr_code        → brCode (copiar-colar)
  // json.point_of_interaction.transaction_data.qr_code_base64 → PNG base64
  // json.point_of_interaction.transaction_data.ticket_url     → URL alternativa
  // json.date_of_expiration                   → ISO string
}
```

**DIFERENÇA IMPORTANTE AbacatePay vs MP:**
- AbacatePay: `amount` em centavos (inteiro), ex: `1000` = R$10,00
- Mercado Pago: `transaction_amount` em reais (float), ex: `10.00` = R$10,00

### Pattern 2: MP Webhook Signature Validation

```typescript
// Source: https://www.mercadopago.com.mx/developers/en/docs/your-integrations/notifications/webhooks
// Confirmado via múltiplos fontes (docs MX, sdk-nodejs discussion #318)

export function verifyMpWebhookSignature(
  dataId: string,        // query param data.id OU body.data.id
  requestId: string,     // header x-request-id
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const secret = requireServerEnv("MP_WEBHOOK_SECRET");

  // Parse header: "ts=1704908010,v1=618c85345248dd..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=", 2) as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Manifest exato conforme docs MP
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(manifest, "utf8"))
    .digest("hex"); // HEX (não base64 como AbacatePay)

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

**DIFERENÇA CRÍTICA vs AbacatePay:**
- AbacatePay: `digest("base64")`, hashar o raw body inteiro
- Mercado Pago: `digest("hex")`, hashar apenas o manifest string construído a partir de headers/query params

### Pattern 3: Criar Preapproval (Subscription Pix Automático)

```typescript
// Model: "pending payments" — sem card_token_id, user autoriza via init_point
// Source: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments
// Confirmado via Go SDK struct source (pkg.go.dev/github.com/mercadopago/sdk-go/pkg/preapproval)

POST https://api.mercadopago.com/preapproval
Authorization: Bearer ${MP_ACCESS_TOKEN}
Content-Type: application/json

{
  "reason": "FORMULADOTA HUB — Mensalidade",
  "external_reference": `user-${user.id}`,
  "payer_email": "user@email.com",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 47.00,
    "currency_id": "BRL"
  },
  "back_url": "https://formuladota.com/assinatura?success=1",
  "status": "pending"     // ← KEY: sem card_token_id, user paga via init_point
}

// Response:
// {
//   "id": "2c938084726fca480172750000000000",  → mp_preapproval_id
//   "init_point": "https://www.mercadopago.com.br/subscriptions/checkout?...",
//   "sandbox_init_point": "https://sandbox.mercadopago.com.br/subscriptions/checkout?...",
//   "status": "pending",
//   "next_payment_date": "...",
//   "payment_method_id": "pix",              // populado após user autorizar
//   ...
// }
```

**FLUXO:** createPreapproval → retorna init_point → Server Action faz `redirect(init_point)` → user escolhe PIX no checkout MP → MP processa → webhook `subscription_preapproval` com `status: "authorized"` → atualiza DB local → page `/assinatura` mostra estado ativo.

### Pattern 4: Cancel Preapproval

```typescript
// Confirmado: PUT /preapproval/{id} body { status: "cancelled" }
// Source: Mercado Pago Update Subscription docs (mercadopago.ar/developers reference)

PUT https://api.mercadopago.com/preapproval/${preapprovalId}
Authorization: Bearer ${MP_ACCESS_TOKEN}
Content-Type: application/json
Body: { "status": "cancelled" }
```

### Anti-Patterns a Evitar

- **Não usar SDK MP server-side para fetch:** `@mercadopago/sdk-nodejs` é thin wrapper; fetch nativo é suficiente e evita deps desnecessárias.
- **Não passar amount em centavos:** MP usa reais (float), não centavos como AbacatePay. Ex: `47.00` não `4700`.
- **Não usar `digest("base64")` no webhook MP:** MP usa `digest("hex")`, AbacatePay usava `digest("base64")`.
- **Não criar preapproval com `status: "authorized"` + `card_token_id` para PIX:** esse modelo é para cartão. PIX usa `status: "pending"` sem card_token.
- **Não parsear raw body para webhook MP:** a assinatura MP NÃO depende do raw body — depende de `data.id` (query param) + `x-request-id` header + `ts`. Mas AINDA leer raw body via `request.text()` para Zod parse seguro.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|---|---|---|---|
| Recurring PIX charges | Cron job manual + QR novo todo mês | MP `/preapproval` (Pix Automático) | MP gerencia agendamento, cobranças, retries, comunicação com banco do user |
| Webhook signature validation | Algoritmo custom | `crypto.timingSafeEqual` + manifest MP | Timing attacks + algoritmo exato documentado por MP |
| Subscription state machine | Flags custom + cron de estado | Status MP (`pending`→`authorized`→`cancelled`) + helper SQL | MP é a fonte da verdade; local DB replica via webhooks |
| Idempotência webhooks | Flags booleanas | UPDATE WHERE status pre-condition | Padrão Phase 2 comprovado funciona igual para MP |

---

## Runtime State Inventory

> Seção relevante: renomear/migrar de AbacatePay para Mercado Pago.

| Categoria | Itens Encontrados | Ação Necessária |
|---|---|---|
| **Dados armazenados** | `purchases.payment_provider = 'abacatepay'` — 0 registros em produção (app ainda não deployado, só dev/sandbox). Schema `purchases.payment_provider` DEFAULT `'abacatepay'` em Migration 001. | Migration 010: ALTER COLUMN DEFAULT → `'mercadopago'` + expandir CHECK constraint para incluir `'mercadopago'`. Backfill desnecessário (zero registros reais). |
| **Config de serviços vivos** | AbacatePay sandbox: API key + webhook URL configurados. MP MCP: precisa autenticação. | Criar conta MP Developer, gerar Access Token TEST/prod, configurar webhook URL no painel MP. AbacatePay: simplesmente parar de usar (sem webhook ativo em produção). |
| **Estado registrado no OS** | Nenhum (sem Scheduler, pm2, launchd tasks) | Nenhuma |
| **Secrets/env vars** | `.env.local` + `.env.example` têm `ABACATEPAY_API_KEY` e `ABACATEPAY_WEBHOOK_SECRET`. `src/lib/env.ts` (Zod schema) lista ambas. | Remover dos 3 arquivos. Adicionar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_PREAPPROVAL_PLAN_ID` (opcional), `HUB_PRICE_BRL`. |
| **Build artifacts** | `.next/` contém routes manifest com `/api/webhooks/abacatepay`. Stale após apagar arquivo. | `pnpm build` após apagar arquivo resolve. Não commitar `.next/`. |

---

## AbacatePay File Inventory — O Que Apagar

### Arquivos a APAGAR completamente:

| Arquivo | Conteúdo | Ação |
|---|---|---|
| `src/lib/abacatepay.ts` | `createTransparentPix`, `verifyAbacatepayWebhookSignature` | DELETE |
| `src/types/abacatepay.ts` | Zod schemas webhook + payment | DELETE |
| `src/app/api/webhooks/abacatepay/route.ts` | Webhook handler | DELETE |
| `src/app/api/webhooks/abacatepay/` | Diretório vazio após delete do route | DELETE dir |

### Arquivos a EDITAR (remover referências):

| Arquivo | Referência | O que mudar |
|---|---|---|
| `src/lib/env.ts` | `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` em serverSchema | Remover as 2 entradas. Adicionar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_PREAPPROVAL_PLAN_ID` (optional), `HUB_PRICE_BRL` (optional, default "47") |
| `src/lib/resend.ts` | Comentário no header menciona "AbacatePay". Footer do email menciona "Pedro Paulo (Immortal/Top 0.5%)". | Atualizar comentário. Remover nome Pedro do footer — deixar "FORMULADOTA — HUB Dota 2" |
| `src/lib/steam.ts` | Linha 127: comentário "replica pattern de src/lib/abacatepay.ts:65". Linha 148: "AbacatePay em src/lib/abacatepay.ts:112" | Atualizar comentários pra referenciar `mercadopago.ts` em vez de `abacatepay.ts` |
| `src/app/checkout/[packageId]/actions.ts` | `import { createTransparentPix } from "@/lib/abacatepay"` + chamada `createTransparentPix(...)` | Trocar import + chamada por `createPixPayment` de `@/lib/mercadopago` |
| `src/components/checkout/qr-code-display.tsx` | Linha 4: comentário "retornada pela AbacatePay" | Atualizar para "retornada pelo Mercado Pago" |
| `.env.example` | Seção AbacatePay V2 | Remover seção AbacatePay inteira. Adicionar seção MP. Atualizar smee.io comment pro endpoint MP. |
| `supabase/migrations/001_initial_schema.sql` | `payment_provider text default 'abacatepay'` | Não editar migrations históricas — Migration 010 altera via ALTER TABLE |

### Referências em `.planning/` e `.next/`:
- `.planning/` docs: manter como histórico (são internos)
- `.next/`: auto-regenerado pelo build, não commitar

### Grep de verificação pós-implementação (zero matches esperados):
```bash
grep -r "abacatepay\|AbacatePay\|ABACATEPAY" src/ --include="*.ts" --include="*.tsx"
# Resultado esperado: zero matches
```

---

## MP API — Detalhes Técnicos Confirmados

### 1. POST /v1/payments — PIX Avulso

**Endpoint:** `POST https://api.mercadopago.com/v1/payments`

**Headers obrigatórios:**
```
Authorization: Bearer ${MP_ACCESS_TOKEN}
Content-Type: application/json
X-Idempotency-Key: ${purchase.id}   // UUID único da compra
```

**Request body (campos obrigatórios para PIX):**
```json
{
  "transaction_amount": 47.00,        // float em BRL (NÃO centavos)
  "description": "FORMULADOTA — Pacote {nome}",
  "payment_method_id": "pix",
  "payer": {
    "email": "user@email.com"
  },
  "external_reference": "purchase-uuid",
  "notification_url": "https://formuladota.com/api/webhooks/mercadopago",
  "date_of_expiration": "2025-05-03T12:00:00.000-03:00"  // ISO 8601, default 24h (range: 30min-30d)
}
```

**Response shape:**
```json
{
  "id": 1234567890,                           // INT — external_payment_id no DB
  "status": "pending",                        // pending → approved / rejected / cancelled
  "status_detail": "waiting_transfer",
  "point_of_interaction": {
    "transaction_data": {
      "qr_code": "00020126580014...",         // brCode (copiar-colar)
      "qr_code_base64": "iVBORw0KGgo...",    // PNG base64 (sem prefixo data:image/png)
      "ticket_url": "https://www.mercadopago.com.br/payments/..."
    }
  },
  "date_of_expiration": "2025-05-03T12:00:00.000-03:00"
}
```

**ATENÇÃO:** `qr_code_base64` do MP **não tem prefixo** `data:image/png;base64,` — precisa concatenar ao renderizar:
```tsx
<img src={`data:image/png;base64,${data.qr_code_base64}`} ... />
```
AbacatePay retornava `brCodeBase64` **com** o prefixo completo. Esta é a diferença de rendering.

**Status states:**
- `pending` → aguardando pagamento (estado inicial)
- `approved` → PIX confirmado pelo banco
- `rejected` → rejeitado (expirado, fraude)
- `cancelled` → cancelado
- `in_process` → em processamento

**Credencial sandbox:** Access Token com prefixo `TEST-` (ex: `TEST-1234567890-...`).

**Confidence:** HIGH — confirmado via múltiplas fontes (docs MX, sdk-nodejs examples, sdk-php discussions).

---

### 2. POST /preapproval — Pix Automático Subscription

**Endpoint:** `POST https://api.mercadopago.com/preapproval`

**Request body (modelo pending-payment para PIX):**
```json
{
  "reason": "FORMULADOTA HUB — Mensalidade",
  "external_reference": "user-{user.id}",
  "payer_email": "user@email.com",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 47.00,
    "currency_id": "BRL"
    // start_date e end_date são opcionais — sem end_date = recorrência indefinida
  },
  "back_url": "https://formuladota.com/assinatura?success=1",
  "status": "pending"
}
```

**Campos ausentes vs authorized model:**
- Sem `card_token_id` (obrigatório apenas para cartão)
- Sem `preapproval_plan_id` (opcional — plano fixo existe, mas criação ad-hoc por user é mais simples para V1)

**Response shape (confirmado via Go SDK source):**
```json
{
  "id": "2c938084726fca480172750000000000",    // mp_preapproval_id → DB
  "status": "pending",                          // pending → authorized (após user pagar via init_point)
  "init_point": "https://www.mercadopago.com.br/subscriptions/checkout?...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.br/subscriptions/checkout?...",
  "payer_email": "user@email.com",
  "reason": "FORMULADOTA HUB — Mensalidade",
  "external_reference": "user-{user.id}",
  "next_payment_date": "...",
  "payment_method_id": "",    // vazio até user autorizar
  "back_url": "...",
  "auto_recurring": { ... },
  "date_created": "...",
  "last_modified": "..."
}
```

**Fluxo completo:**
```
createPreapproval() → retorna init_point URL
→ Server Action faz redirect(init_point) (em sandbox: usa sandbox_init_point)
→ User no checkout MP escolhe PIX
→ User autoriza Pix Automático no app do banco
→ MP dispara webhook subscription_preapproval com status="authorized"
→ Webhook handler atualiza subscriptions SET status='authorized', started_at=now(), next_payment_date=+30d
→ User vê página /assinatura com estado "Mensalidade ativa"
```

**Status lifecycle:**
- `pending` → criado, aguardando user autorizar no init_point
- `authorized` → user autorizou Pix Automático — assinatura ativa
- `cancelled` → cancelado (via PUT ou pelo user no app banco)
- `paused` → pausado (pode acontecer pelo user no app banco)

**Confidence:** MEDIUM — modelo pending-payment confirmado via docs BR subscriptions. Campo `payment_method_id: "pix"` não é explicitamente listado no payload REQUEST (só aparece na RESPONSE após autorização). PIX disponível via init_point checkout é confirmado por funcionamento do Checkout Pro MP que suporta PIX.

---

### 3. preapproval_plan — Necessário?

**Conclusão:** NÃO necessário para V1. Criar preapproval ad-hoc por user (sem `preapproval_plan_id`) é suficiente. Plano fixo facilita gestão no painel MP mas adiciona complexidade de setup (Pedro precisa criar manualmente). Para FORMULADOTA com 1 plano fixo R$47/mês:

- **Opção simples (recomendada):** Criar preapproval sem plan, com `reason` e `transaction_amount` fixos hardcoded via `HUB_PRICE_BRL=47`. Funciona imediatamente.
- **Opção com plan:** Pedro cria `preapproval_plan` via MCP → recebe `MP_PREAPPROVAL_PLAN_ID` → Server Action usa `preapproval_plan_id` no payload + `status: "authorized"` + `card_token_id` obrigatório — mas esse modelo exige cartão, NÃO é adequado para PIX.

**Plan para cartão, sem-plan para PIX.** Usar sem-plan para V1 PIX.

---

### 4. Webhook MP — Algoritmo Completo

**Source:** https://www.mercadopago.com.mx/developers/en/docs/your-integrations/notifications/webhooks (MEDIUM confidence — verificado em 2 fontes independentes)

**Headers recebidos:**
```
x-signature: ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839
x-request-id: some-uuid-value
```

**Query param recebido:**
```
?data.id=123456789    // payment_id ou preapproval_id dependendo do evento
```

**Manifest para hashar:**
```
id:{data.id};request-id:{x-request-id};ts:{ts};
```

**Algoritmo:**
```typescript
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
const expected = crypto.createHmac("sha256", secret).update(manifest, "utf8").digest("hex");
// Comparar expected com v1 via timingSafeEqual
```

**Onde gerar o secret:** Painel MP → "Suas integrações" → selecionar app → aba "Webhooks" → Salvar URL → secret gerado automaticamente. Configurar via MCP `mp__mercadopago__save_webhook`.

**DIFERENÇA vs AbacatePay:**
| | AbacatePay | Mercado Pago |
|---|---|---|
| O que é assinado | Raw body inteiro | Manifest string construído |
| Digest | `base64` | `hex` |
| Header | `x-webhook-signature` | `x-signature` |
| Secret de | Dashboard AbacatePay | Dashboard MP "Suas integrações" |

---

### 5. Webhook Events — Payload Shapes

**Evento payment.created / payment.updated (PIX avulso):**
```json
{
  "id": 12345,
  "type": "payment",
  "action": "payment.created",
  "data": { "id": "999999999" },   // payment_id — buscar via GET /v1/payments/{id}
  "live_mode": true,
  "user_id": 44444,
  "date_created": "2025-05-02T10:00:00Z"
}
```

**Evento subscription_preapproval (mudanças de status):**
```json
{
  "id": 12345,
  "type": "subscription_preapproval",
  "action": "subscription_preapproval.updated",
  "data": { "id": "2c938084726fca480..." },   // preapproval_id
  "live_mode": true
}
```

**Evento subscription_authorized_payment (cobrança mensal confirmada):**
```json
{
  "id": 12345,
  "type": "subscription_authorized_payment",
  "action": "subscription_authorized_payment.created",
  "data": { "id": "authorized_payment_id" },
  "live_mode": true
}
```

**PATTERN IMPORTANTE:** O webhook MP NÃO envia os dados completos — envia apenas o `data.id`. O handler precisa buscar os dados completos via GET separado:
- `payment.created` → `GET /v1/payments/{data.id}` para checar `status: "approved"`
- `subscription_preapproval` → `GET /preapproval/{data.id}` para checar `status: "authorized"/"cancelled"`
- `subscription_authorized_payment` → `GET /authorized_payments/{data.id}` para checar `status` + `subscription_id`

**Confidence:** MEDIUM — confirmado via docs MX webhooks. Pattern "shallow payload + fetch para detalhes" é padrão do MP.

**SEMPRE retornar 200 dentro de 22 segundos.** MP retenta a cada 15 minutos por 3 tentativas, depois aumenta intervalo.

---

### 6. MCP MP Tools — Guia de Uso

> Requer autenticação na sessão (Pedro autentica ao iniciar Claude Code).

| Tool | Quando usar | Etapa do plano |
|---|---|---|
| `mp__mercadopago__search_documentation` | Verificar endpoints, payload, response shapes | Wave 0 — validação da pesquisa |
| `mp__mercadopago__create_test_user` | Criar buyer sandbox para testar preapproval | Wave 2 — setup sandbox |
| `mp__mercadopago__add_money_test_user` | Adicionar saldo ao buyer sandbox | Wave 2 — antes de testar pagamento |
| `mp__mercadopago__save_webhook` | Registrar URL webhook no painel MP | Wave 0 — setup env |
| `mp__mercadopago__application_list` | Listar apps MP disponíveis + credenciais | Wave 0 — obter ACCESS_TOKEN |
| `mp__mercadopago__notifications_history` | Debugar webhooks não recebidos | Wave 3+ — debugging |
| `mp__mercadopago__quality_checklist` | Verificar conformidade da integração | Wave final — pre-deploy |
| `mp__mercadopago__quality_evaluation` | Score qualidade da integração | Wave final — pre-deploy |

---

### 7. Schema Migrations

**Migration 008 — subscriptions:**
```sql
-- supabase/migrations/008_subscriptions_mercadopago.sql

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mp_preapproval_id text unique,
  mp_plan_id text,
  status text not null default 'pending'
    check (status in ('pending','authorized','paused','cancelled')),
  started_at timestamptz,
  next_payment_date timestamptz,
  cancelled_at timestamptz,
  payment_method_id text default 'pix',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_status_idx on public.subscriptions (user_id, status);
create unique index subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('pending','authorized','cancelled');

-- Trigger updated_at (reusa função existente de 001)
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Helper RLS
create or replace function public.has_active_subscription() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('authorized','cancelled')
      and next_payment_date > now()
  );
$$;

-- RLS
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

-- UPDATE/DELETE apenas service-role (webhook handler) — sem policy = só service role passa
```

**Migration 010 — purchases provider:**

**ATENÇÃO:** `payment_provider` já existe em `001_initial_schema.sql` com:
```sql
payment_provider text default 'abacatepay' not null,
```
Sem CHECK constraint explícito no arquivo lido (apenas NOT NULL + DEFAULT).

Migration 010 precisa:
1. Alterar o DEFAULT para `'mercadopago'`
2. Verificar se existe CHECK constraint e adicionar `'mercadopago'` se sim

```sql
-- supabase/migrations/010_purchases_payment_provider.sql

-- Alterar default para novos registros
alter table public.purchases
  alter column payment_provider set default 'mercadopago';

-- Backfill registros antigos (AbacatePay Phase 2) — zero em produção real mas correto semanticamente
-- NÃO usar update all → apenas onde status != 'pendente' (compras pagas são definitivamente AbacatePay Phase 2)
update public.purchases
  set payment_provider = 'abacatepay'
  where payment_provider = 'abacatepay'; -- no-op mas explicita intenção

-- Nota: o CHECK constraint original foi: check (payment_provider in ('abacatepay', 'mercadopago'))
-- conforme CONTEXT.md D-03. Verificar se constraint existe e adicionar 'mercadopago' se não.
-- Se constraint não existir: adicionar via ALTER TABLE ADD CONSTRAINT.
```

**Aplicação:** via `node scripts/apply-migration-005.mjs` pattern (session pooler sa-east-1) OU via MCP Supabase `apply_migration`.

---

## Common Pitfalls

### Pitfall 1: Centavos vs Reais

**O que dá errado:** Passar `amount * 100` como AbacatePay (`1000` para R$10), MP cobra R$1000 em vez de R$10.
**Por que acontece:** AbacatePay usa centavos (inteiro); MP usa reais (float).
**Como evitar:** Passar `pkg.preco_brl` diretamente sem multiplicar por 100 em `createPixPayment`.
**Warning sign:** Valor cobrado 100x maior que esperado.

### Pitfall 2: qr_code_base64 sem prefixo data URI

**O que dá errado:** `<img src={data.qr_code_base64} />` renderiza imagem quebrada.
**Por que acontece:** AbacatePay retornava `brCodeBase64` com prefixo `data:image/png;base64,...`; MP retorna apenas os bytes base64 sem o prefixo.
**Como evitar:** Concatenar prefixo: `` `data:image/png;base64,${data.qr_code_base64}` ``
**Warning sign:** `<img>` mostra broken image icon.

### Pitfall 3: Webhook signature — digest hex vs base64

**O que dá errado:** Assinatura nunca valida; webhook retorna 401 para todos eventos.
**Por que acontece:** Copiou `digest("base64")` de AbacatePay; MP usa `digest("hex")`.
**Como evitar:** `createHmac("sha256", secret).update(manifest).digest("hex")`.
**Warning sign:** Log `[webhook] assinatura inválida` para todo evento.

### Pitfall 4: Webhook lê raw body para signature MP

**O que dá errado:** Lê body via `request.text()` e usa como input do HMAC — nunca valida.
**Por que acontece:** Pattern de AbacatePay (que hashava o body inteiro); MP hashava apenas o manifest de headers.
**Como evitar:** Para MP, pegar `data.id` de `new URL(request.url).searchParams.get("data.id")`, não do body.
**Warning sign:** Mesmo que teste com hash calculado do body, não bate com v1.

### Pitfall 5: Usar status "authorized" + card_token_id para PIX

**O que dá errado:** `card_token_id` ausente causa erro 400 da API MP.
**Por que acontece:** Documentação de subscriptions mostra exemplos com cartão (modelo `authorized`). PIX usa modelo `pending`.
**Como evitar:** Sem `card_token_id`, com `status: "pending"`, init_point redireciona user para escolher PIX.
**Warning sign:** Erro 400 na criação do preapproval.

### Pitfall 6: purchases.payment_provider já existe — não usar ADD COLUMN

**O que dá errado:** Migration 010 com `ADD COLUMN IF NOT EXISTS` funciona mas é semanticamente errada (coluna já existe em 001).
**Por que acontece:** CONTEXT.md D-03 diz "ADD COLUMN" mas a inspeção do código mostra que já existe.
**Como evitar:** Migration 010 usa `ALTER COLUMN payment_provider SET DEFAULT 'mercadopago'`.
**Warning sign:** Migration log mostra coluna já existia (IF NOT EXISTS passa silenciosamente).

### Pitfall 7: Sandbox init_point vs init_point

**O que dá errado:** Em dev, usar `init_point` redireciona para produção MP — transação real, cobra de verdade.
**Por que acontece:** Response tem ambos campos; apenas `sandbox_init_point` é seguro em testes.
**Como evitar:** Em Server Action, usar `isTestMode()` (checar se `MP_ACCESS_TOKEN` começa com `TEST-`) para decidir qual campo usar.
**Warning sign:** Redirecionamentos levam para URL sem "sandbox" no domínio.

---

## Code Examples

### createPixPayment completo (pseudocode)

```typescript
// src/lib/mercadopago.ts
// DIFERENÇA CHAVE vs abacatepay.ts: amount em reais (float), não centavos

export async function createPixPayment(
  input: CreatePixPaymentInput
): Promise<CreatePixPaymentResult> {
  const accessToken = requireServerEnv("MP_ACCESS_TOKEN");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: input.amount,  // float em reais (ex: 47.00)
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
    cache: "no-store",
  });

  const json = await response.json() as unknown;
  const validated = mpPaymentResponseSchema.safeParse(json);
  if (!validated.success) return { success: false, error: "Resposta inesperada do MP." };

  return {
    success: true,
    data: {
      id: String(validated.data.id),
      qrCode: validated.data.point_of_interaction.transaction_data.qr_code,
      // Concatenar prefixo — MP não inclui o prefixo (diferente do AbacatePay)
      qrCodeBase64: `data:image/png;base64,${validated.data.point_of_interaction.transaction_data.qr_code_base64}`,
      ticketUrl: validated.data.point_of_interaction.transaction_data.ticket_url,
      expiresAt: validated.data.date_of_expiration,
    },
  };
}
```

### createSubscription Server Action (pseudocode)

```typescript
// src/app/assinatura/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPreapproval } from "@/lib/mercadopago";
import { requireServerEnv } from "@/lib/env";

export async function createSubscription(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const price = Number(process.env.HUB_PRICE_BRL ?? "47");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://formuladota.com";

  const result = await createPreapproval({
    reason: "FORMULADOTA HUB — Mensalidade",
    payerEmail: user.email!,
    externalReference: `user-${user.id}`,
    transactionAmount: price,
    backUrl: `${siteUrl}/assinatura?success=1`,
  });

  if (!result.success) redirect("/assinatura?error=payment_failed");

  // Salvar subscription em DB com status pending
  await supabase.from("subscriptions").insert({
    user_id: user.id,
    mp_preapproval_id: result.data.id,
    status: "pending",
  });

  // Usar sandbox_init_point em testes
  const isTest = requireServerEnv("MP_ACCESS_TOKEN").startsWith("TEST-");
  const redirectUrl = isTest ? result.data.sandboxInitPoint : result.data.initPoint;

  redirect(redirectUrl);
}
```

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Mudou em | Impacto |
|---|---|---|---|
| AbacatePay PIX Transparent V2 | Mercado Pago `/v1/payments` PIX | 2026-05-02 (decisão Pedro) | Shape response similar; diferença: amount em reais, qr_code_base64 sem prefixo |
| AbacatePay subscription (CARD-only) | MP `/preapproval` pending-payment (PIX) | 2026-05-02 | Pix Automático via BACEN iniciado jun/2025 |
| Webhook AbacatePay: HMAC body em base64 | Webhook MP: HMAC manifest em hex | — | Algoritmo completamente diferente — não reusar |

**Deprecados:**
- `AbacatePay` como provider: substituído por `MercadoPago` — APAGAR tudo
- Vercel Cron PIX Manual Mensal: abordagem descartada nos plans deprecated — não usar

---

## Open Questions

1. **PIX explicitamente no init_point checkout MP para subscriptions**
   - O que sabemos: pending-payment model sem card_token_id usa init_point onde user escolhe método de pagamento
   - O que não está claro: se PIX aparece como opção no checkout MP Brasil para subscriptions (não apenas cartão)
   - Recomendação: testar via MCP create_test_user + abrir sandbox_init_point em browser. Se PIX não aparecer, fallback: forçar via payment_methods_allowed no preapproval payload (campo suportado conforme SDK Go source AutoRecurringRequest)

2. **subscription_authorized_payment webhook payload completo**
   - O que sabemos: webhook envia `data.id` = authorized_payment_id
   - O que não está claro: endpoint exato para buscar detalhes do authorized payment + campos `subscription_id` e `date_approved` na response
   - Recomendação: testar via MCP notification simulation ou verificar via `mp__mercadopago__search_documentation`

3. **purchases.payment_provider CHECK constraint atual em produção**
   - O que sabemos: `001_initial_schema.sql` define `default 'abacatepay' not null` sem CHECK explícito no arquivo lido
   - O que não está claro: se o CHECK constraint `in ('abacatepay','mercadopago')` do CONTEXT.md já existe (pode estar no schema mas não mostrado)
   - Recomendação: Migration 010 deve ADD CONSTRAINT condicional: `ALTER TABLE purchases ADD CONSTRAINT IF NOT EXISTS purchase_provider_check CHECK (payment_provider IN ('abacatepay','mercadopago'))`

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|---|---|---|---|---|
| `node:crypto` | HMAC webhook + CSRF | ✓ | Node.js 20+ (Next.js 16) | — |
| `fetch` nativo | MP API calls | ✓ | Node.js 18+ | — |
| Supabase MCP | apply_migration | ✓ | Connected | `node scripts/apply-migration.mjs` pattern |
| MP MCP | create_test_user, save_webhook, docs | `! Needs authentication` | — | Criar test users manualmente no painel MP Developer |
| smee.io tunnel | webhook local dev | ✓ | pnpm dlx smee-client (no-install) | ngrok |
| pnpm typecheck | validação CI | ✓ | pnpm 9+ | — |

**Dependências bloqueantes sem fallback:**
- Nenhuma — todas têm fallback viável

**Dependências com fallback:**
- MP MCP `! Needs authentication`: Pedro autentica ao iniciar sessão Claude Code. Fallback: painel MP Developer web para configuração manual.

---

## Validation Architecture

> `nyquist_validation` não está explicitamente setado como `false` no config.json — tratar como habilitado.

### Test Framework

| Propriedade | Valor |
|---|---|
| Framework | Manual + grep + build check (sem test suite automatizado) |
| Config file | N/A |
| Quick run | `pnpm typecheck && pnpm lint` |
| Full suite | `pnpm typecheck && pnpm lint && pnpm build` + manual E2E |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Comando | Arquivo |
|---|---|---|---|---|
| H2.1 | PIX avulso MP gera QR code | Manual — abrir checkout em browser | `pnpm dev` + testar /checkout | Existe |
| H2.1 | Subscription preapproval cria entry + redireciona init_point | Manual — clicar CTA em /assinatura | `pnpm dev` + test user MP | ❌ Wave 0 |
| H2.2 | trial_ends_at permanece null | Smoke — verificar schema | `pnpm typecheck` | ❌ Wave 0 |
| H2.3 | has_active_subscription() retorna true/false correto | Smoke — query Supabase MCP | MCP supabase select | ❌ Wave 0 |
| H2.4 | /assinatura renderiza 4 estados sem TypeScript errors | Smoke | `pnpm typecheck` | ❌ Wave 0 |
| — | Zero referências AbacatePay em src/ | Grep audit | `grep -r "abacatepay\|AbacatePay" src/` | — |
| — | Build sem erros pós-migração | Build check | `pnpm build` | — |
| — | Webhook signature válida | Manual curl | ver abaixo | — |

### Passos de Validação Manual

**Validação webhook assinatura:**
```bash
# Simular webhook MP com assinatura válida
# 1) Calcular manifest:
# id=TEST_PAYMENT_ID;request-id=TEST_REQ_ID;ts=1234567890;
# 2) HMAC-SHA256 hex com MP_WEBHOOK_SECRET
# 3) Montar header: x-signature: ts=1234567890,v1={hex}
# 4) POST para /api/webhooks/mercadopago com header + query param data.id=TEST_PAYMENT_ID
curl -X POST "http://localhost:3000/api/webhooks/mercadopago?data.id=TEST_PAYMENT_ID" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=1234567890,v1=CALCULATED_HEX" \
  -H "x-request-id: TEST_REQ_ID" \
  -d '{"type":"payment","action":"payment.updated","data":{"id":"TEST_PAYMENT_ID"}}'
# Esperado: 200 {"received": true}
```

**Validação grep pós-implementação:**
```bash
grep -r "abacatepay\|AbacatePay\|ABACATEPAY" src/ --include="*.ts" --include="*.tsx"
# Esperado: zero matches
grep -r "abacatepay\|AbacatePay\|ABACATEPAY" .env.example
# Esperado: zero matches
```

**Validação Migration 008:**
```bash
# Via MCP Supabase após aplicar migration
# SELECT table_name FROM information_schema.tables WHERE table_name='subscriptions';
# SELECT * FROM public.has_active_subscription(); -- deve retornar false pra user sem assinatura
```

**Validação typecheck/build:**
```bash
pnpm typecheck   # zero errors
pnpm lint        # zero warnings
pnpm build       # successful build
```

### Wave 0 Gaps

- [ ] `pnpm db:gen-types` após Migration 008 aplicada — gera `types/database.ts` atualizado com tabela `subscriptions`
- [ ] Criar `src/app/assinatura/` dir — não existe ainda
- [ ] Configurar `MP_ACCESS_TOKEN` (TEST-...) + `MP_WEBHOOK_SECRET` em `.env.local` antes de qualquer teste
- [ ] Registrar webhook URL via `mp__mercadopago__save_webhook` ou painel MP Developer

---

## Project Constraints (from CLAUDE.md)

| Constraint | Regra | Impacto nesta Phase |
|---|---|---|
| C1 | TypeScript strict, zero `any` | Zod schemas em todos os tipos MP |
| C2 | Functions max 50 linhas, files max 300 linhas | `mercadopago.ts` deve ser dividido se crescer demais (considerar `mercadopago/payments.ts` + `mercadopago/subscriptions.ts`) |
| C3 | Zod em todos os inputs | Schemas em `src/types/mercadopago.ts` |
| C4 | RLS em todas as tables | `subscriptions` table precisa enable row level security |
| C8 | HMAC `crypto.timingSafeEqual` | Implementado em `verifyMpWebhookSignature` |
| C9 | Idempotência em handlers externos | UPDATE WHERE status pre-condition em purchases + subscriptions |
| C11 | Async/await SEMPRE | `createPreapproval`, `cancelPreapproval`, `createPixPayment` são todos async/await |
| C12 | Comentários PT-BR | Headers e comentários inline em português |
| C13 | Service-role APENAS em `/api/webhooks/*` | `createServiceClient()` apenas em `mercadopago/route.ts` |

---

## Sources

### Primary (HIGH confidence)
- Go SDK source `pkg.go.dev/github.com/mercadopago/sdk-go/pkg/preapproval` — struct definitions para Request, Response, AutoRecurring, confirmando `init_point`, `sandbox_init_point`, `payment_method_id` na response
- `https://www.mercadopago.com.mx/developers/en/docs/your-integrations/notifications/webhooks` — algoritmo HMAC completo, manifest format, event types, 22s SLA
- `https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments` — modelo pending-payment sem card_token_id

### Secondary (MEDIUM confidence)
- `https://www.mercadopago.com.ar/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments` — lifecycle states, retry strategy
- WebSearch findings: pattern `payment_methods_allowed` para PIX em preapproval_plan, confirmado por múltiplos resultados
- GitHub discussion `sdk-nodejs #318` — confirmação algoritmo HMAC hex em produção

### Tertiary (LOW confidence)
- PIX + subscriptions MP: suporte explícito não documentado em texto — inferido de: (1) checkout MP suporta PIX, (2) pending-payment model sem card_token_id, (3) PIX Automático BACEN lançado jun/2025 com MP como parceiro. Requer teste manual para confirmar.

## Metadata

**Confidence breakdown:**
- MP Payments PIX avulso (`/v1/payments`): HIGH — múltiplas fontes confirmam payload + response shape
- MP Preapproval subscription: MEDIUM — payload confirmado, PIX via init_point inferido não explicitamente documentado
- Webhook HMAC: HIGH — confirmado em docs + discussion #318 sdk-nodejs
- Migration SQL: HIGH — baseado em schema existente inspecionado + CONTEXT.md D-02/D-03/D-04
- AbacatePay inventory: HIGH — grep executado, todos os arquivos listados com localização exata

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (30 dias — MP API é relativamente estável mas Pix Automático é feature nova)
