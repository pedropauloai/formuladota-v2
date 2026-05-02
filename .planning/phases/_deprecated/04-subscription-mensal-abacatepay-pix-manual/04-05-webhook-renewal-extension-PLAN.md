---
phase: 04-subscription-mensal
plan: 05
plan_id: 04-05
title: Webhook handler extension — lookup subscription_charges + processSubscriptionRenewal branch
type: execute
wave: 2
depends_on:
  - 04-01
  - 04-03
files_modified:
  - src/app/api/webhooks/abacatepay/route.ts
autonomous: true
requirements:
  - H2.1
  - C8
  - C9
  - C12
  - C13
must_haves:
  truths:
    - "handlePaymentCompleted continua fazendo UPDATE conditional purchases SET status='pago' WHERE status='pendente' (idempotência Phase 2 PRESERVADA)"
    - "Após UPDATE conditional bem-sucedido, novo lookup query subscription_charges WHERE purchase_id = updated.id"
    - "Se lookup retorna row (purchase_id é subscription charge): chama processSubscriptionRenewal() — UPDATE charge.status='paid' + UPDATE subscription.next_due_at + status='active' + email charge_paid"
    - "Se lookup retorna null (purchase é compra avulsa Phase 2): mantém fluxo Phase 2 — sendPurchaseConfirmationEmail"
    - "Decisão fluxo: lookup decide qual branch — webhook NÃO precisa novos eventos AbacatePay (D-04)"
    - "processSubscriptionRenewal usa GREATEST(next_due_at, NEW_NEXT_DUE) — protege contra reorder webhooks (D-07)"
    - "Email charge_paid via fire-and-forget pattern existente (sendConfirmationSafely wrapper similar)"
    - "Async/await SEMPRE (per C11) — NUNCA promise chains"
    - "Sem novos arquivos — extensão pura do route.ts existente"
    - "src/types/abacatepay.ts SEM mudanças — D-04 sem discriminated union"
  artifacts:
    - path: "src/app/api/webhooks/abacatepay/route.ts"
      provides: "Webhook handler estendido com branch subscription renewal — preserva fluxo Phase 2"
      contains: "subscription_charges, processSubscriptionRenewal, sendSubscriptionChargePaidEmail"
  key_links:
    - from: "src/app/api/webhooks/abacatepay/route.ts handlePaymentCompleted"
      to: "supabase/migrations/008 subscription_charges (Plan 04-01)"
      via: "supabase.from('subscription_charges').select().eq('purchase_id', updated.id)"
      pattern: "from\\(\"subscription_charges\"\\)\\s*\\.select"
    - from: "src/app/api/webhooks/abacatepay/route.ts processSubscriptionRenewal"
      to: "src/lib/resend.ts sendSubscriptionChargePaidEmail (Plan 04-03)"
      via: "import + fire-and-forget call"
      pattern: "sendSubscriptionChargePaidEmail"
    - from: "src/app/api/webhooks/abacatepay/route.ts processSubscriptionRenewal"
      to: "supabase/migrations/008 subscriptions next_due_at update"
      via: "UPDATE subscriptions SET next_due_at = GREATEST(next_due_at, NEW), status='active'"
      pattern: "from\\(\"subscriptions\"\\)\\s*\\.update"
---

<objective>
Estender `src/app/api/webhooks/abacatepay/route.ts` (185 linhas Phase 2) com branch novo dentro de `handlePaymentCompleted`: APÓS o UPDATE conditional `purchases SET status='pago'` bem-sucedido (Phase 2 idempotência PRESERVADA), fazer lookup `subscription_charges WHERE purchase_id = updated.id`. Se row retorna, chamar nova função `processSubscriptionRenewal()` que:
1. UPDATE `subscription_charges.status = 'paid'`
2. UPDATE `subscriptions.next_due_at = GREATEST(next_due_at, charge.period_end)` + `status='active'` (D-07: GREATEST protege contra reorder de webhooks)
3. Fire-and-forget `sendSubscriptionChargePaidEmail`

Decisão D-04: webhook reusa evento existente `transparent.completed` — diferenciação acontece no handler via lookup, NÃO via novo evento AbacatePay. Sem mudanças em `src/types/abacatepay.ts` (sem discriminated union).

Purpose: Cron do Plan 04-04 cria PIX → user paga → AbacatePay envia `transparent.completed` (mesmo evento Phase 2) → este handler estendido detecta que purchase é renewal e atualiza subscription. Sem essa extensão, pagamento de renewal não avançaria `next_due_at` e helper RLS retornaria false após próximo vencimento.

Output:
- `src/app/api/webhooks/abacatepay/route.ts` ≤ 300 linhas (atual 185 + ~80 linhas adicionadas)
- Sem regressão em fluxo Phase 2 (purchase avulsa continua disparando `sendPurchaseConfirmationEmail`)
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
@src/app/api/webhooks/abacatepay/route.ts
@src/lib/resend.ts
@src/types/abacatepay.ts

<interfaces>
<!-- src/app/api/webhooks/abacatepay/route.ts existing handlePaymentCompleted (Phase 2 — PRESERVAR) -->
```typescript
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
    console.error("[webhook] update purchases failed:", error.message);
    return;
  }

  if (!updated) {
    return; // webhook duplicado OU external_payment_id desconhecido
  }

  void sendConfirmationSafely(supabase, updated as ProcessedPurchase, payload);
}
```

<!-- src/lib/resend.ts (Plan 04-03) -->
```typescript
export async function sendSubscriptionChargePaidEmail(input: {
  chargeId: string;
  customerEmail: string;
  customerName?: string;
  nextDueDate: string;
  amountBrl: number;
}): Promise<void>;
```

<!-- Database types (Plan 04-01) -->
```typescript
type SubscriptionCharge = Tables<"subscription_charges">;
type Subscription = Tables<"subscriptions">;
// charge.period_end → será o novo next_due_at da subscription
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Estender handlePaymentCompleted com lookup subscription_charges + branch processSubscriptionRenewal</name>
  <files>src/app/api/webhooks/abacatepay/route.ts</files>
  <read_first>
    - src/app/api/webhooks/abacatepay/route.ts (TODO o arquivo — 185 linhas — entender pattern Phase 2)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-04 lookup pattern; D-07 GREATEST idempotência)
    - .planning/phases/04-subscription-mensal/04-RESEARCH.md §6 webhook handler extension (revisado)
    - src/lib/resend.ts pós-Plan 04-03 (assinatura sendSubscriptionChargePaidEmail)
  </read_first>
  <action>
Modificar `src/app/api/webhooks/abacatepay/route.ts`:

**Mudança 1** — em `handlePaymentCompleted`, APÓS o UPDATE conditional + check `if (!updated) return;`, ANTES de `void sendConfirmationSafely(...)`:

```typescript
  // Phase 4 extension: detectar se este purchase é renewal de subscription.
  // Lookup subscription_charges WHERE purchase_id = updated.id.
  // Se existe → branch renewal (processa subscription update + email charge_paid).
  // Se não existe → fluxo Phase 2 mantido (purchase avulsa → sendConfirmationSafely).
  const { data: charge } = await supabase
    .from("subscription_charges")
    .select("id, subscription_id, period_end, status")
    .eq("purchase_id", updated.id)
    .maybeSingle();

  if (charge) {
    // Renewal — processa subscription update sem disparar email Phase 2
    void processSubscriptionRenewalSafely(supabase, charge);
    return;
  }

  // Caso contrário, fluxo Phase 2 mantido — purchase avulsa libera saldo + email confirmação
  void sendConfirmationSafely(supabase, updated as ProcessedPurchase, payload);
```

**Mudança 2** — adicionar import no topo do arquivo:

```typescript
import { sendSubscriptionChargePaidEmail } from "@/lib/resend";
```

**Mudança 3** — adicionar 2 helpers privados ao final do arquivo (após `sendConfirmationFromPurchase`):

```typescript
/**
 * Wrapper async pra processSubscriptionRenewal — encapsula try/catch.
 * Chamado via void pro fire-and-forget intencional (per C11).
 */
async function processSubscriptionRenewalSafely(
  supabase: ReturnType<typeof createServiceClient>,
  charge: { id: string; subscription_id: string; period_end: string; status: string }
): Promise<void> {
  try {
    await processSubscriptionRenewal(supabase, charge);
  } catch (err) {
    console.error("[webhook] processSubscriptionRenewal threw:", err);
  }
}

/**
 * Processa renovação de subscription após pagamento PIX completed:
 *   1. UPDATE subscription_charges.status = 'paid' (idempotência via WHERE status='pending')
 *   2. UPDATE subscriptions: next_due_at = GREATEST(next_due_at, charge.period_end), status='active'
 *      (GREATEST protege contra reorder webhooks per D-07)
 *   3. Fire-and-forget email charge_paid (busca user email do profiles)
 */
async function processSubscriptionRenewal(
  supabase: ReturnType<typeof createServiceClient>,
  charge: { id: string; subscription_id: string; period_end: string; status: string }
): Promise<void> {
  // Idempotência charge: UPDATE WHERE status='pending' (não reprocessa já paid)
  const { data: chargeUpdated } = await supabase
    .from("subscription_charges")
    .update({ status: "paid" })
    .eq("id", charge.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!chargeUpdated) {
    // Charge já estava 'paid' — webhook duplicado, retorno silencioso
    return;
  }

  // Buscar subscription pra calcular GREATEST(next_due_at, charge.period_end)
  // GREATEST protege contra reorder webhooks: se charge atrasado chegou depois de outro mais novo,
  // não recua next_due_at.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id, next_due_at, started_at")
    .eq("id", charge.subscription_id)
    .single();

  if (!sub) {
    console.error(`[webhook] subscription ${charge.subscription_id} not found`);
    return;
  }

  const currentNextDueAt = sub.next_due_at ? new Date(sub.next_due_at).getTime() : 0;
  const periodEndMs = new Date(charge.period_end).getTime();
  const newNextDueAt = new Date(Math.max(currentNextDueAt, periodEndMs)).toISOString();

  const updates: { next_due_at: string; status: "active"; started_at?: string } = {
    next_due_at: newNextDueAt,
    status: "active",
  };

  // Primeira ativação: started_at ainda null → preenche
  if (!sub.started_at) {
    updates.started_at = new Date().toISOString();
  }

  const { error: subErr } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", sub.id);

  if (subErr) {
    console.error(`[webhook] subscription update failed: ${subErr.message}`);
    return;
  }

  // Email charge_paid (fire-and-forget) — busca email do profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, username")
    .eq("id", sub.user_id)
    .single();

  if (!profile?.email) {
    console.error(`[webhook] sem email pra user ${sub.user_id} — skip charge_paid`);
    return;
  }

  // Importar HUB_PRICE_BRL do env pra mostrar valor correto no email
  // (não vem no payload AbacatePay diretamente — usa env)
  const hubPriceBrl = parseInt(requireServerEnv("HUB_PRICE_BRL"), 10);

  await sendSubscriptionChargePaidEmail({
    chargeId: charge.id,
    customerEmail: profile.email,
    customerName: profile.username ?? undefined,
    nextDueDate: newNextDueAt,
    amountBrl: hubPriceBrl,
  });
}
```

**Mudança 4** — adicionar import `requireServerEnv` se ainda não estiver (verificar topo do arquivo):

```typescript
import { requireServerEnv } from "@/lib/env";
```

Confirmar pós-edits:
- `handlePaymentCompleted` total ≤ 50 linhas (per C2). Atual ~25 linhas + ~10 linhas adicionadas = ~35 — OK.
- `processSubscriptionRenewal` ≤ 50 linhas — split se ultrapassar (extrair `updateSubscriptionNextDue` helper se preciso).
- `processSubscriptionRenewalSafely` ≤ 15 linhas (wrapper similar a `sendConfirmationSafely` existente).
- File total ≤ 300 linhas (185 + ~80 = ~265 — OK).
- Sem regressão Phase 2:
  - `sendConfirmationSafely` ainda chamado quando `charge` é null
  - `sendPurchaseConfirmationEmail` import preservado
- Async/await sempre (per C11). NUNCA `.then().catch()`.
- Comentários PT-BR (per C12).
- `pnpm typecheck` + `pnpm lint` passam.
  </action>
  <verify>
    <automated>grep -q "subscription_charges" src/app/api/webhooks/abacatepay/route.ts && grep -q "processSubscriptionRenewal" src/app/api/webhooks/abacatepay/route.ts && grep -q "sendSubscriptionChargePaidEmail" src/app/api/webhooks/abacatepay/route.ts && grep -q "Math.max(currentNextDueAt, periodEndMs)" src/app/api/webhooks/abacatepay/route.ts && grep -q "sendConfirmationSafely" src/app/api/webhooks/abacatepay/route.ts && grep -q "sendPurchaseConfirmationEmail" src/app/api/webhooks/abacatepay/route.ts && pnpm typecheck && pnpm lint && test $(wc -l < src/app/api/webhooks/abacatepay/route.ts) -lt 301</automated>
  </verify>
  <acceptance_criteria>
    - "src/app/api/webhooks/abacatepay/route.ts contains 'subscription_charges' (lookup table)"
    - "File contains 'async function processSubscriptionRenewal'"
    - "File contains 'async function processSubscriptionRenewalSafely'"
    - "File contains 'sendSubscriptionChargePaidEmail({'"
    - "File contains 'sendConfirmationSafely' (Phase 2 preserved)"
    - "File contains 'sendPurchaseConfirmationEmail' (Phase 2 preserved)"
    - "File contains 'Math.max(currentNextDueAt, periodEndMs)' (GREATEST D-07 idempotência)"
    - "File contains '.eq(\"id\", charge.id).eq(\"status\", \"pending\")' (charge idempotência)"
    - "File contains 'requireServerEnv(\"HUB_PRICE_BRL\")'"
    - "File contains 'if (charge) {' branch BEFORE void sendConfirmationSafely"
    - "src/types/abacatepay.ts UNCHANGED (D-04 — no discriminated union)"
    - "File line count < 301 (per C2)"
    - "pnpm typecheck exits 0"
    - "pnpm lint exits 0"
  </acceptance_criteria>
  <done>
    `handlePaymentCompleted` estendido com lookup + branch renewal. `processSubscriptionRenewal` implementa charge update + subscription next_due_at GREATEST + email. Phase 2 fluxo preservado pra purchase avulsa.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Smoke test manual webhook renewal flow</name>
  <files>(none — validação manual)</files>
  <read_first>
    - src/app/api/webhooks/abacatepay/route.ts pós-Task 1
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (referência fluxo cron→webhook→renewal)
  </read_first>
  <action>
Smoke test manual em ambiente DEV (Pedro pode pular se quiser deixar pra UAT real):

**Setup:**
1. Pedro tem subscription ativa de teste (criada via Plan 04-04 smoke test ou manual SQL).
2. Subscription tem 1 `subscription_charge` em status='pending' apontando pra `purchase_id` em status='pendente'.
3. AbacatePay sandbox tem o `external_payment_id` correspondente ao `purchases.external_payment_id`.

**Test 1 — Renewal flow (expected branch new):**
1. Em dashboard AbacatePay sandbox, marcar a transparent como "completed" OU enviar webhook manual via:
   ```bash
   PAYLOAD='{
     "event": "transparent.completed",
     "data": {
       "transparent": { "id": "<external_payment_id>", "amount": 4700, "status": "PAID" },
       "customer": { "email": "pedroecarolshopcreator@gmail.com" }
     }
   }'
   SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$ABACATEPAY_WEBHOOK_SECRET" -binary | base64)
   curl -X POST http://localhost:3000/api/webhooks/abacatepay \
     -H "Content-Type: application/json" \
     -H "x-webhook-signature: $SIG" \
     -d "$PAYLOAD"
   ```
2. Resposta esperada: `{ "received": true }` (200).
3. Conferir Supabase Studio:
   - `purchases.status` = 'pago'
   - `subscription_charges.status` = 'paid'
   - `subscriptions.next_due_at` avançou pra `period_end` da charge
   - `subscriptions.status` = 'active'
   - `subscriptions.started_at` preenchido (se primeira ativação)
4. Conferir email recebido em Pedro@gmail (subject "Mensalidade renovada — acesso ativo").

**Test 2 — Phase 2 fluxo preservado (expected branch existing):**
1. Criar purchase avulsa via Plan 02-06 fluxo normal (`/checkout/<packageId>` → cria purchase).
2. Webhook completed pra essa purchase.
3. Resposta esperada: `{ "received": true }`.
4. Conferir:
   - `purchases.status` = 'pago'
   - **Sem** row em `subscription_charges` pra esse purchase_id
   - Email recebido subject "Pagamento confirmado — <packageName>" (Phase 2)

**Test 3 — Idempotência:**
1. Re-enviar mesmo webhook do Test 1.
2. Resposta esperada: `{ "received": true }`.
3. Conferir Supabase: `subscriptions.next_due_at` NÃO mudou (UPDATE charge falhou WHERE status='pending' já é 'paid').
4. Email NÃO duplicado (idempotencyKey Resend).

Documentar resultados em comentário de PR ou em SUMMARY.
  </action>
  <verify>
    <automated>node -e "console.log('Smoke test manual — vide acceptance_criteria')"</automated>
  </verify>
  <acceptance_criteria>
    - "Test 1: webhook completed pra subscription charge UPDATE charge.status to 'paid'"
    - "Test 1: subscriptions.next_due_at avança pra charge.period_end"
    - "Test 1: subscriptions.status virou 'active'"
    - "Test 1: email charge_paid recebido em Pedro@gmail"
    - "Test 2: webhook completed pra purchase avulsa NÃO encontra subscription_charge"
    - "Test 2: email Phase 2 'Pagamento confirmado' recebido (NOT charge_paid)"
    - "Test 3: re-enviar mesmo webhook → next_due_at NÃO muda + email NÃO duplica"
  </acceptance_criteria>
  <done>
    3 smoke tests manuais passam. Pedro confirma fluxo renewal funcional + Phase 2 preservada + idempotência efetiva.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck && pnpm lint` exit 0
2. File ≤ 300 linhas
3. Smoke tests manuais Task 2 — 3 cenários passam
4. Validar lookup performance:
   - Com 1000 subscriptions ativas + 30 charges/dia = 30k charges em 1 ano. SELECT WHERE purchase_id = X com index PK em purchases é O(1). Sem issue.
   - `subscription_charges_subscription_id_idx` ajuda OUTRAS queries (cron) mas não esta — esta usa unique index implícito da PK + constraint UNIQUE em purchase_id.
5. Validar separação:
   - `src/types/abacatepay.ts` SEM mudanças (`git diff` mostra sem edits — D-04)
   - `src/lib/abacatepay.ts` SEM mudanças (D-04)
   - APENAS `src/app/api/webhooks/abacatepay/route.ts` modificado
</verification>

<success_criteria>
- [x] handlePaymentCompleted estendido com lookup subscription_charges + branch renewal
- [x] processSubscriptionRenewal implementa: UPDATE charge (idempotente) + UPDATE sub (GREATEST) + email
- [x] Phase 2 fluxo preservado quando lookup é null
- [x] Sem mudanças em src/types/abacatepay.ts (D-04)
- [x] Sem mudanças em src/lib/abacatepay.ts (D-04)
- [x] File ≤ 300 linhas
- [x] Smoke tests Task 2 passam
- [x] pnpm typecheck + lint exit 0
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-05-SUMMARY.md` documentando:
- Tamanho final do arquivo route.ts (deve ficar ~260-280 linhas, sob 300)
- Resultados smoke tests (3 cenários)
- Confirmação que types/abacatepay.ts não foi tocado (D-04)
- Edge case validation: webhook chegando com `external_payment_id` desconhecido continua retornando silently sem erro 5xx (Phase 2 pattern preservado)
</output>
