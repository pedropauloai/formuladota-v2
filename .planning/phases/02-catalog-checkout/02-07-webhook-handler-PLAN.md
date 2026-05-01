---
phase: 02-catalog-checkout
plan: 07
type: execute
wave: 2
depends_on: ["02-02", "02-03"]
files_modified:
  - src/app/api/webhooks/abacatepay/route.ts
autonomous: true
requirements: [F3.4, F3.5, C1, C3, C8, C9]
must_haves:
  truths:
    - "POST /api/webhooks/abacatepay valida HMAC-SHA256 base64 ANTES de qualquer parse JSON (raw body via request.text())"
    - "HMAC inválido retorna 401 sem revelar detalhes (timing attack mitigation via timingSafeEqual)"
    - "Payload é validado via Zod (webhookPayloadSchema) — payloads inesperados retornam 400"
    - "Idempotência: UPDATE condicional WHERE status='pendente' impede webhook duplicado de duplicar saldo"
    - "Webhook duplicado/já processado retorna 200 received:true (NÃO 5xx — senão AbacatePay retenta)"
    - "Sucesso (transparent.completed → status=pago): busca email do user no profiles e dispara sendPurchaseConfirmationEmail"
    - "Email failure NÃO derruba webhook (wrapper async com try/catch interno + void call)"
    - "transparent.refunded → status=cancelado"
    - "Service-role client usado (bypass RLS — webhook é trigger sistêmico sem cookie)"
    - "Zero any, async/await, Zod"
  artifacts:
    - path: "src/app/api/webhooks/abacatepay/route.ts"
      provides: "POST handler que valida HMAC, processa eventos transparent.*, libera saldo via UPDATE condicional, dispara email"
      exports: ["POST"]
      min_lines: 90
  key_links:
    - from: "src/app/api/webhooks/abacatepay/route.ts"
      to: "src/lib/abacatepay.ts"
      via: "verifyAbacatepayWebhookSignature(rawBody, header)"
      pattern: "verifyAbacatepayWebhookSignature"
    - from: "src/app/api/webhooks/abacatepay/route.ts"
      to: "src/lib/supabase/service.ts"
      via: "createServiceClient (bypass RLS)"
      pattern: "createServiceClient"
    - from: "src/app/api/webhooks/abacatepay/route.ts"
      to: "src/lib/resend.ts"
      via: "sendPurchaseConfirmationEmail (chamada via wrapper sendConfirmationSafely + void)"
      pattern: "sendPurchaseConfirmationEmail"
    - from: "src/app/api/webhooks/abacatepay/route.ts"
      to: "src/types/abacatepay.ts"
      via: "webhookPayloadSchema (Zod)"
      pattern: "webhookPayloadSchema"
---

<objective>
Implementar API Route POST /api/webhooks/abacatepay (per F3.4 e F3.5) — fecha o ciclo de monetização da Phase 2:

1. Recebe webhook da AbacatePay quando PIX é pago/disputado/refundado
2. Lê raw body via request.text() ANTES de qualquer parse JSON (crítico para HMAC bater — Pitfall 2 do RESEARCH.md)
3. Valida assinatura HMAC-SHA256 base64 no header X-Webhook-Signature usando verifyAbacatepayWebhookSignature (Plan 02-02)
4. Parseia e valida payload via Zod webhookPayloadSchema (Plan 02-02)
5. Para transparent.completed: UPDATE condicional WHERE status='pendente' (idempotência via UNIQUE constraint em external_payment_id + status check)
6. Para transparent.refunded: UPDATE para status='cancelado'
7. Para transparent.disputed: log apenas (sem mudança automática — admin trata manualmente)
8. Após sucesso de transparent.completed, busca email do user na tabela profiles e dispara sendPurchaseConfirmationEmail (Plan 02-03) via wrapper async sendConfirmationSafely chamado com void — try/catch interno isola falha de email do retorno do webhook (CLAUDE.md proíbe .then().catch() chains)
9. Sempre retorna 200 received:true em casos de webhook duplicado/já processado (NUNCA 5xx — senão AbacatePay retenta indefinidamente)

Purpose: F3.4 (webhook → libera saldo) e F3.5 (email confirmação) são as duas pernas finais do funil. Sem este handler, o user paga PIX e nada acontece (purchase fica pendente eternamente). Com handler, idempotência via DB + UNIQUE constraint garante que retentativas da AbacatePay (rede flaky, deploy do app) não duplicam saldo.

Output: 1 arquivo route.ts (~120 linhas, dividido em handler principal + helpers).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-catalog-checkout/02-CONTEXT.md
@.planning/phases/02-catalog-checkout/02-RESEARCH.md
@CLAUDE.md
@src/types/database.ts

<interfaces>
Plan 02-02 já criou (deve estar disponível):
```typescript
// src/lib/abacatepay.ts
export function verifyAbacatepayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean;

// src/types/abacatepay.ts
export const webhookPayloadSchema = z.object({...});
export type AbacatepayWebhookPayload = z.infer<typeof webhookPayloadSchema>;
// Eventos: "transparent.completed" | "transparent.disputed" | "transparent.refunded"

// src/lib/supabase/service.ts
export function createServiceClient(): SupabaseClient<Database>;
```

Plan 02-03 já criou:
```typescript
// src/lib/resend.ts
export async function sendPurchaseConfirmationEmail(input: {
  purchaseId: string;
  customerEmail: string;
  customerName?: string;
  packageName: string;
  partidasCompradas: number;
  sessoesCompradas: number;
}): Promise<void>;  // nunca throw — só logs erro
```

Schema purchases (per migration 001):
```sql
purchases (
  id uuid pk,
  user_id uuid → profiles(id),
  package_id uuid → packages(id),
  status text in ('pendente','pago','expirado','cancelado'),
  external_payment_id text UNIQUE,  -- idempotência via UPSERT/UPDATE conditional
  preco_pago numeric(10,2),
  partidas_compradas integer,
  sessoes_compradas integer default 0,
  ...
);
```

Pattern 2 do RESEARCH.md (linhas 295-393) — copiar literal como base.

Idempotência (per RESEARCH.md "Idempotência — Padrão Recomendado", linhas ~777-805):
```sql
UPDATE purchases
SET status = 'pago'
WHERE external_payment_id = $1
  AND status = 'pendente'  -- condicional é a chave
RETURNING id, user_id, partidas_compradas, sessoes_compradas;
-- Se retornar 0 rows: webhook já processado → return 200
-- Se retornar 1 row: processado agora → continuar com email
```

Header HMAC: `X-Webhook-Signature` (lowercase em Next.js — usar `request.headers.get("x-webhook-signature")`).

Next.js 16 App Router — App Route handlers leem raw body via `await request.text()`. NÃO há configuração extra (`bodyParser: false` é Pages Router antigo).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Criar API Route POST /api/webhooks/abacatepay</name>
  <files>src/app/api/webhooks/abacatepay/route.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/lib/abacatepay.ts (criado em 02-02 — exports verifyAbacatepayWebhookSignature)
    - C:/Users/ADM/projects/formuladota-v2/src/types/abacatepay.ts (criado em 02-02 — exports webhookPayloadSchema)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/service.ts (criado em 02-02 — exports createServiceClient)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/resend.ts (criado em 02-03 — exports sendPurchaseConfirmationEmail)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (Tables purchases, profiles, packages)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (Pattern 2 — Webhook Handler, linhas 295-393; Pitfall 2 e 3, linhas ~810-840; Idempotência, linhas ~777-805)
  </read_first>
  <behavior>
    - Test 1: HMAC inválido → 401 status, NÃO altera DB
    - Test 2: HMAC válido + payload inválido (Zod fail) → 400, NÃO altera DB
    - Test 3: HMAC válido + transparent.completed + purchase.status=pendente → UPDATE para pago, retorna 200 received:true, dispara email (não-throw em falha)
    - Test 4: HMAC válido + transparent.completed + purchase.status=pago (idempotência — webhook duplicado) → 200 received:true, NÃO duplica saldo, NÃO dispara email duplicado (idempotencyKey do Resend bloqueia mesmo se chamasse)
    - Test 5: HMAC válido + transparent.refunded → UPDATE para cancelado (sem checar status=pendente)
    - Test 6: HMAC válido + transparent.disputed → 200 received:true, log only (sem mudar DB)
    - Test 7: external_payment_id não encontrado no DB → 200 received:true (não foi gerado por nós, ignorar — não é erro)
    - Test 8: email envio falha (Resend down) → webhook ainda retorna 200 (email é side-effect não-crítico)
  </behavior>
  <action>
Criar `src/app/api/webhooks/abacatepay/route.ts` baseado em Pattern 2 do RESEARCH.md (linhas 295-393), com helpers privados para manter funções <50 linhas.

Conteúdo completo:

```typescript
// API Route: POST /api/webhooks/abacatepay
// Recebe eventos transparent.* da AbacatePay, valida HMAC, atualiza purchases com idempotência.
//
// CRITICAL: ler raw body via request.text() ANTES de qualquer JSON.parse — caso contrário
// o whitespace muda e a assinatura HMAC não bate (Pitfall 2 do RESEARCH.md).
//
// Webhook duplicado SEMPRE retorna 200 received:true — NUNCA 5xx — senão AbacatePay retenta
// indefinidamente e pode duplicar processamento (Pitfall 3 do RESEARCH.md).

import { NextRequest, NextResponse } from "next/server";
import { verifyAbacatepayWebhookSignature } from "@/lib/abacatepay";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPurchaseConfirmationEmail } from "@/lib/resend";
import {
  webhookPayloadSchema,
  type AbacatepayWebhookPayload,
} from "@/types/abacatepay";

interface ProcessedPurchase {
  id: string;
  user_id: string;
  partidas_compradas: number;
  sessoes_compradas: number;
  package_id: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1) Raw body ANTES de qualquer parse (HMAC depende de bytes exatos)
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  // 2) Validar HMAC
  if (!verifyAbacatepayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  // 3) Parse + validação Zod do payload
  let payload: AbacatepayWebhookPayload;
  try {
    const json: unknown = JSON.parse(rawBody);
    const parsed = webhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[webhook] payload inesperado:", parsed.error.flatten());
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const externalPaymentId = payload.data.transparent.id;

  // 4) Roteamento por evento
  if (payload.event === "transparent.completed") {
    await handlePaymentCompleted(supabase, externalPaymentId, payload);
  } else if (payload.event === "transparent.refunded") {
    await handleRefund(supabase, externalPaymentId);
  } else {
    // transparent.disputed → log only, admin trata manualmente
    console.error("[webhook] transparent.disputed received — manual review needed:", externalPaymentId);
  }

  // SEMPRE 200 — qualquer 4xx/5xx faz AbacatePay retentar
  return NextResponse.json({ received: true });
}

/**
 * Atualiza purchase para status=pago via UPDATE condicional (idempotência).
 * Se 0 rows afetadas: já processado ou não encontrado — return silently.
 * Se 1 row afetada: dispara email de confirmação (.catch isolado, não-crítico).
 */
async function handlePaymentCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  externalPaymentId: string,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  const { data: updated, error } = await supabase
    .from("purchases")
    .update({ status: "pago" })
    .eq("external_payment_id", externalPaymentId)
    .eq("status", "pendente")
    .select("id, user_id, partidas_compradas, sessoes_compradas, package_id")
    .maybeSingle();

  if (error) {
    console.error("[webhook] update failed:", error.message);
    return;
  }

  if (!updated) {
    // Webhook duplicado ou external_payment_id desconhecido — return silently
    return;
  }

  // Disparar email — non-blocking, isolado em wrapper async com try/catch interno
  // (CLAUDE.md proíbe .then().catch() chains; usamos void + função wrapper).
  void sendConfirmationSafely(supabase, updated, payload);
}

/**
 * Wrapper async para envio de email — encapsula try/catch interno e nunca lança.
 * Chamado via `void` para sinalizar fire-and-forget intencional sem bloquear o handler.
 */
async function sendConfirmationSafely(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: ProcessedPurchase,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  try {
    await sendConfirmationFromPurchase(supabase, purchase, payload);
  } catch (err) {
    console.error("[webhook] confirmação email falhou:", err);
  }
}

async function handleRefund(
  supabase: ReturnType<typeof createServiceClient>,
  externalPaymentId: string
): Promise<void> {
  const { error } = await supabase
    .from("purchases")
    .update({ status: "cancelado" })
    .eq("external_payment_id", externalPaymentId);

  if (error) {
    console.error("[webhook] refund update failed:", error.message);
  }
}

async function sendConfirmationFromPurchase(
  supabase: ReturnType<typeof createServiceClient>,
  purchase: ProcessedPurchase,
  payload: AbacatepayWebhookPayload
): Promise<void> {
  // Email do customer pode vir no payload (raro) ou buscar do profiles
  let customerEmail = payload.data.customer?.email;
  let customerName = payload.data.customer?.name;

  if (!customerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", purchase.user_id)
      .single();
    customerEmail = profile?.email ?? undefined;
    customerName = customerName ?? profile?.username ?? undefined;
  }

  if (!customerEmail) {
    console.error("[webhook] sem email do user — pulando confirmação:", purchase.user_id);
    return;
  }

  // Buscar nome do pacote
  const { data: pkg } = await supabase
    .from("packages")
    .select("nome")
    .eq("id", purchase.package_id)
    .single();

  await sendPurchaseConfirmationEmail({
    purchaseId: purchase.id,
    customerEmail,
    customerName,
    packageName: pkg?.nome ?? "Pacote",
    partidasCompradas: purchase.partidas_compradas,
    sessoesCompradas: purchase.sessoes_compradas,
  });
}
```

Confirmar:
- pnpm typecheck e pnpm lint passam
- Zero `any`
- Cada função < 50 linhas (POST ~40, helpers <30)
- Arquivo total < 300 linhas (vai ficar ~150)
- request.text() chamado ANTES de qualquer JSON.parse
- Sempre retorna 200 (exceto 401 HMAC inválido / 400 payload inválido)

Validar fluxo via curl manual (documentado em README — Plan 02-04):
```bash
# 1) Gerar HMAC válido (precisa do secret do .env.local)
SECRET="seu_secret_aqui"
BODY='{"event":"transparent.completed","data":{"transparent":{"id":"pix_test_123","amount":1000,"status":"PAID"}}}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# 2) Postar
curl -X POST http://localhost:3000/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY"
# Esperado: 200 {"received":true} (assumindo external_payment_id existe no DB)
```
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/app/api/webhooks/abacatepay/route.ts && grep -q "export async function POST" src/app/api/webhooks/abacatepay/route.ts && grep -q "request.text()" src/app/api/webhooks/abacatepay/route.ts && grep -q "verifyAbacatepayWebhookSignature" src/app/api/webhooks/abacatepay/route.ts && grep -q "webhookPayloadSchema" src/app/api/webhooks/abacatepay/route.ts && grep -q "createServiceClient" src/app/api/webhooks/abacatepay/route.ts && grep -q "sendPurchaseConfirmationEmail" src/app/api/webhooks/abacatepay/route.ts && grep -q 'status.*"pago"' src/app/api/webhooks/abacatepay/route.ts && grep -q 'status.*"pendente"' src/app/api/webhooks/abacatepay/route.ts && grep -q 'status.*"cancelado"' src/app/api/webhooks/abacatepay/route.ts && grep -q "transparent.completed" src/app/api/webhooks/abacatepay/route.ts && grep -q "transparent.refunded" src/app/api/webhooks/abacatepay/route.ts && grep -q "received: true" src/app/api/webhooks/abacatepay/route.ts && grep -q "async function sendConfirmationSafely" src/app/api/webhooks/abacatepay/route.ts && grep -q "void sendConfirmationSafely" src/app/api/webhooks/abacatepay/route.ts && ! grep -q ": any" src/app/api/webhooks/abacatepay/route.ts && ! grep -qE "\.then\(" src/app/api/webhooks/abacatepay/route.ts && ! grep -qE "\.catch\(" src/app/api/webhooks/abacatepay/route.ts && ! grep -qE "console\.warn\(" src/app/api/webhooks/abacatepay/route.ts && pnpm typecheck && pnpm lint && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/webhooks/abacatepay/route.ts` exists
    - File contains exact string `export async function POST`
    - File calls `request.text()` BEFORE any `JSON.parse` (Pitfall 2 mitigation)
    - File calls `verifyAbacatepayWebhookSignature(rawBody, signature)` from `@/lib/abacatepay`
    - File parses payload via `webhookPayloadSchema.safeParse` from `@/types/abacatepay`
    - File uses `createServiceClient` from `@/lib/supabase/service` (bypass RLS)
    - File calls `sendPurchaseConfirmationEmail` from `@/lib/resend`
    - File contains UPDATE with `.eq("status", "pendente")` (idempotência condicional per C9)
    - File handles `transparent.completed` event (status → pago)
    - File handles `transparent.refunded` event (status → cancelado)
    - File handles `transparent.disputed` event (log only, sem mudar DB)
    - File returns `{ received: true }` for all success/idempotent paths (NUNCA 5xx em duplicado per Pitfall 3)
    - File returns 401 for invalid HMAC (per C8)
    - File returns 400 for invalid payload (per C3 Zod validation)
    - File contains `async function sendConfirmationSafely` (wrapper helper isolando email failures)
    - File contains `void sendConfirmationSafely` (fire-and-forget call sem promise chaining)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT contain `.then(` (async/await only per CLAUDE.md)
    - File does NOT contain `.catch(` (async/await only per CLAUDE.md — ZERO promise chaining; usar try/catch blocks)
    - File does NOT contain `console.warn(` (apenas `console.error` em servidor per CLAUDE.md)
    - File line count < 300 (per CLAUDE.md max files)
    - All functions < 50 lines (per CLAUDE.md max funcs)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
    - `pnpm build` exits 0 (route compila como Next.js Route Handler)
  </acceptance_criteria>
  <done>Webhook handler funcional: HMAC validado, idempotência via UPDATE condicional, email disparado isoladamente, erros logados sem derrubar webhook.</done>
</task>

</tasks>

<verification>
- pnpm typecheck, pnpm lint, pnpm build exit 0
- Manual: smee.io tunnel (Plan 02-04) + simulação AbacatePay sandbox via `POST /v2/transparents/simulate-payment?id={pix_id}` deve disparar webhook → ver no terminal Next.js que recebeu, ver no DB que purchase.status virou 'pago', ver email no Resend dashboard
- Manual: postar webhook 2x consecutivos → primeira UPDATE retorna row, segunda retorna 0 rows (idempotência), email enviado só uma vez (idempotencyKey do Resend)
- Manual: postar webhook com signature errada → 401 sem mudar DB
- Manual: postar webhook com payload bizarro (event desconhecido) → 400
</verification>

<success_criteria>
- F3.4 (webhook → libera saldo, idempotente) operacional
- F3.5 (email confirmação após pagamento) operacional
- C8 (HMAC validation) — timingSafeEqual via Plan 02-02 helper
- C9 (idempotência) — UPDATE conditional WHERE status='pendente' garante atomicidade
- Webhook é resiliente: rede flaky / retentativas / payload inesperado / Resend down — tudo handled
</success_criteria>

<output>
Após completar a task, criar `.planning/phases/02-catalog-checkout/02-07-webhook-handler-SUMMARY.md` com:
- Estrutura do POST handler (5 etapas: raw body → HMAC → Zod → service client → roteamento por evento)
- Helpers privados (handlePaymentCompleted, handleRefund, sendConfirmationFromPurchase)
- Idempotência: como UPDATE condicional + UNIQUE evitam saldo duplicado
- Notas sobre retornos 200 universais (exceto 401/400)
- Como Pedro testou (curl + smee.io + simulate-payment AbacatePay sandbox)
</output>
