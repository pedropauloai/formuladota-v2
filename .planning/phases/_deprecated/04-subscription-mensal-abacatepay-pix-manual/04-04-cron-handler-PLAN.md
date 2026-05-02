---
phase: 04-subscription-mensal
plan: 04
plan_id: 04-04
title: Cron handler /api/cron/subscriptions/charge-due (charge-due + sweep-overdue)
type: execute
wave: 2
depends_on:
  - 04-01
  - 04-02
  - 04-03
files_modified:
  - src/app/api/cron/subscriptions/charge-due/route.ts
autonomous: true
requirements:
  - H2.1
  - C8
  - C9
  - C12
  - C13
must_haves:
  truths:
    - "GET /api/cron/subscriptions/charge-due valida Authorization: Bearer ${CRON_SECRET} via crypto.timingSafeEqual antes de processar"
    - "Handler retorna 401 quando header Authorization ausente OU diverge — sem revelar detalhes"
    - "Handler usa createServiceClient (service-role bypassa RLS — per C13 cron é trigger sistêmico)"
    - "Charge-due query: subscriptions com status IN ('active','cancelled') AND next_due_at <= now() + interval '5 days' AND sem subscription_charges pending pro próximo período"
    - "Cada subscription due cria: 1 row purchases (status='pendente'), 1 row subscription_charges, 1 chamada createTransparentPix(), 1 email charge_created"
    - "Sweep-overdue query: subscriptions com status='active' AND next_due_at < now() - interval '5 days' → UPDATE status='overdue' + email overdue"
    - "Cron NÃO cria PIX pra subscriptions cancelled (D-02 cancel é definitivo) — só active continua sendo cobrada"
    - "Idempotência: subscription_charges_unique_period (subscription_id, period_start) evita duplicação se cron rodar 2x"
    - "Retorna JSON { ok: true, charged: N, overdue: M } — Vercel mostra logs"
    - "Try/catch por item: falha em 1 subscription NÃO derruba processamento das outras"
    - "Async/await SEMPRE — NUNCA .then().catch() chains (per C11)"
  artifacts:
    - path: "src/app/api/cron/subscriptions/charge-due/route.ts"
      provides: "Vercel Cron handler GET — diário 09:00 UTC charge-due + sweep-overdue"
      contains: "export async function GET, crypto.timingSafeEqual, createServiceClient, createTransparentPix"
  key_links:
    - from: "src/app/api/cron/subscriptions/charge-due/route.ts authorization check"
      to: "vercel.json crons[0] (Plan 04-02)"
      via: "Vercel injeta Authorization: Bearer ${CRON_SECRET} no schedule trigger"
      pattern: "request\\.headers\\.get\\(\"authorization\"\\)"
    - from: "src/app/api/cron/subscriptions/charge-due/route.ts createTransparentPix call"
      to: "src/lib/abacatepay.ts (Phase 2 — sem mudanças)"
      via: "import { createTransparentPix } from '@/lib/abacatepay'"
      pattern: "import.*createTransparentPix.*from.*@/lib/abacatepay"
    - from: "src/app/api/cron/subscriptions/charge-due/route.ts INSERT subscription_charges"
      to: "supabase/migrations/008 subscription_charges table (Plan 04-01)"
      via: "supabase.from('subscription_charges').insert(...)"
      pattern: "from\\(\"subscription_charges\"\\)"
    - from: "src/app/api/cron/subscriptions/charge-due/route.ts email calls"
      to: "src/lib/resend.ts (Plan 04-03)"
      via: "import { sendSubscriptionChargeCreatedEmail, sendSubscriptionOverdueEmail } from '@/lib/resend'"
      pattern: "sendSubscriptionChargeCreatedEmail|sendSubscriptionOverdueEmail"
---

<objective>
Criar endpoint Vercel Cron `/api/cron/subscriptions/charge-due/route.ts` que executa diariamente (09:00 UTC = 06:00 BRT, configurado em vercel.json Plan 04-02). Faz 2 jobs sequenciais num único handler:

1. **Charge-due** — busca subscriptions com `next_due_at` chegando em ≤5 dias e cria PIX de renovação:
   - Cria `purchases` row (status='pendente') + chama `createTransparentPix()` Phase 2 + INSERT `subscription_charges` (FK purchase_id) + envia email charge_created via Resend.
2. **Sweep-overdue** — busca subscriptions com `next_due_at < now() - 5d` AND `status='active'` e marca como overdue + envia email overdue.

Validação Authorization Bearer via `crypto.timingSafeEqual` (per C8). Service-role client (per C13 — cron é trigger sistêmico). Idempotência via `subscription_charges_unique_period` index (Plan 04-01). Try/catch por item.

Purpose: Coração da arquitetura PIX Manual Mensal — sem este cron, subscriptions ativas não renovam automaticamente nem expiram quando atrasadas. Plan crítico que executa 100% da lógica de billing recorrente.

Output:
- `src/app/api/cron/subscriptions/charge-due/route.ts` ≤ 300 linhas (per C2). Múltiplas helper functions ≤ 50 linhas cada.
- Endpoint testável manualmente via `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/subscriptions/charge-due`.
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
@src/lib/abacatepay.ts
@src/lib/supabase/service.ts
@src/lib/env.ts
@src/lib/resend.ts
@src/app/api/webhooks/abacatepay/route.ts

<interfaces>
<!-- src/lib/abacatepay.ts createTransparentPix (Phase 2 — REUSAR sem mudanças) -->
```typescript
export type CreateTransparentPixResult =
  | { success: true; data: TransparentPixData }
  | { success: false; error: string };

export async function createTransparentPix(input: {
  amount: number;        // centavos
  description: string;
  externalId: string;    // UUID — nosso purchase.id
  expiresIn?: number;    // segundos, default 3600
}): Promise<CreateTransparentPixResult>;

// TransparentPixData shape (de @/types/abacatepay)
type TransparentPixData = {
  id: string;            // → purchases.external_payment_id
  amount: number;
  status: string;
  brCode: string;        // texto copiar-e-colar
  brCodeBase64: string;  // PNG inline data URL (ou cru?)
  expiresAt: string;
};
```

<!-- src/lib/supabase/service.ts (REUSAR — service-role per C13) -->
```typescript
export function createServiceClient(): SupabaseClient<Database>;
```

<!-- src/lib/env.ts (Plan 04-02) -->
```typescript
import { requireServerEnv } from "@/lib/env";
const cronSecret = requireServerEnv("CRON_SECRET");
const hubPriceBrl = parseInt(requireServerEnv("HUB_PRICE_BRL"), 10);  // 47
```

<!-- src/lib/resend.ts (Plan 04-03) -->
```typescript
export async function sendSubscriptionChargeCreatedEmail(input: {
  chargeId: string;
  customerEmail: string;
  customerName?: string;
  qrCodeBase64: string;
  brCode: string;
  dueDate: string;       // ISO
  amountBrl: number;
}): Promise<void>;

export async function sendSubscriptionOverdueEmail(input: {
  subscriptionId: string;
  customerEmail: string;
  customerName?: string;
  periodStart: string;   // ISO
}): Promise<void>;
```

<!-- Database types (Plan 04-01) -->
```typescript
import type { Database, Tables } from "@/types/database";
type Subscription = Tables<"subscriptions">;
type SubscriptionCharge = Tables<"subscription_charges">;
type Purchase = Tables<"purchases">;
type Profile = Tables<"profiles">;
// status enum: "pendente" | "active" | "cancelled" | "overdue" | "expired"
```

<!-- Phase 2 webhook handler pattern (replicar idempotência + service-role + raw body) -->
```typescript
// /api/webhooks/abacatepay/route.ts pattern:
// 1. Validar HMAC com timingSafeEqual
// 2. Service-role client
// 3. UPDATE conditional WHERE status='pendente' (idempotência)
// 4. Email fire-and-forget via void call
// 5. Return JSON 200
```

<!-- Pattern Vercel Cron Authorization (Vercel docs) -->
```
Header injetado pelo Vercel: Authorization: Bearer ${CRON_SECRET}
Validar:
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return 401;
  const token = auth.slice(7);
  const expected = requireServerEnv("CRON_SECRET");
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 401;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar /api/cron/subscriptions/charge-due/route.ts com auth + handler GET principal</name>
  <files>src/app/api/cron/subscriptions/charge-due/route.ts</files>
  <read_first>
    - src/app/api/webhooks/abacatepay/route.ts linhas 1-70 (pattern raw body + HMAC validation + service client + 200 always)
    - src/lib/abacatepay.ts (assinatura createTransparentPix — input schema + return discriminated union)
    - src/lib/env.ts pós-Plan 04-02 (verificar CRON_SECRET + HUB_PRICE_BRL no schema)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-11 schedule + auth pattern; D-12 inadimplência flow)
    - .planning/phases/04-subscription-mensal/04-RESEARCH.md §1.4 (PIX Manual Mensal pattern detalhes)
  </read_first>
  <action>
Criar arquivo `src/app/api/cron/subscriptions/charge-due/route.ts`. Estrutura: 1 handler GET principal + 4 helpers privados (auth check, charge-due loop, sweep-overdue loop, processar 1 subscription due).

```typescript
// API Route: GET /api/cron/subscriptions/charge-due
// Vercel Cron diário 09:00 UTC (configurado em vercel.json — Plan 04-02).
//
// Faz 2 jobs sequenciais:
//   1. CHARGE-DUE: subscriptions ativas com next_due_at chegando em ≤5d
//      → cria Transparent PIX + INSERT subscription_charges + email charge_created
//   2. SWEEP-OVERDUE: subscriptions com next_due_at < now() - 5d AND status='active'
//      → UPDATE status='overdue' + email overdue
//
// CRÍTICO: Authorization Bearer validado via crypto.timingSafeEqual (per C8).
// Service-role bypassa RLS (per C13 — cron é trigger sistêmico).
// Idempotência via unique index subscription_charges_unique_period (Plan 04-01).
// Try/catch por item — falha em 1 subscription NÃO derruba processamento das outras.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { createTransparentPix } from "@/lib/abacatepay";
import {
  sendSubscriptionChargeCreatedEmail,
  sendSubscriptionOverdueEmail,
} from "@/lib/resend";
import type { Tables } from "@/types/database";

type Subscription = Tables<"subscriptions">;

interface CronResult {
  ok: true;
  charged: number;
  overdue: number;
  errors: string[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Validar Authorization Bearer via timingSafeEqual
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const errors: string[] = [];

  // 2. Charge-due — subscriptions chegando perto do vencimento
  const charged = await processChargeDue(supabase, errors);

  // 3. Sweep-overdue — subscriptions vencidas há +5d
  const overdue = await processSweepOverdue(supabase, errors);

  const result: CronResult = { ok: true, charged, overdue, errors };
  return NextResponse.json(result);
}

/**
 * Valida header Authorization: Bearer ${CRON_SECRET} via timingSafeEqual.
 * Vercel injeta automaticamente quando CRON_SECRET existe nas env vars.
 */
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  const expected = requireServerEnv("CRON_SECRET");

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

Validar pós-edit:
- Imports corretos: `crypto from "node:crypto"`, NextRequest/NextResponse from Next, requireServerEnv, createServiceClient, createTransparentPix, sendSubscriptionChargeCreatedEmail, sendSubscriptionOverdueEmail, Tables type.
- `export async function GET` (Vercel Cron usa GET).
- Handler ≤ 50 linhas (per C2).
- `isAuthorized` helper ≤ 50 linhas.
- Sem `process.env.NODE_ENV` shortcuts — sempre validar Authorization (mesmo dev).
- Variável `errors: string[]` coletada por try/catch dos helpers — retornada no JSON pro Vercel logs.

Não implementar `processChargeDue` e `processSweepOverdue` ainda — Task 2 e Task 3.

Adicionar exports placeholder pra TypeScript não quebrar entre tasks:
```typescript
async function processChargeDue(_supabase: ReturnType<typeof createServiceClient>, _errors: string[]): Promise<number> {
  return 0;  // Task 2 implementa
}
async function processSweepOverdue(_supabase: ReturnType<typeof createServiceClient>, _errors: string[]): Promise<number> {
  return 0;  // Task 3 implementa
}
```

Validar `pnpm typecheck` passa.
  </action>
  <verify>
    <automated>test -f src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "export async function GET" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "crypto.timingSafeEqual" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "createServiceClient" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "requireServerEnv(\"CRON_SECRET\")" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "Authorization" src/app/api/cron/subscriptions/charge-due/route.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - "src/app/api/cron/subscriptions/charge-due/route.ts exists"
    - "File contains 'export async function GET(request: NextRequest)'"
    - "File contains 'crypto.timingSafeEqual('"
    - "File contains 'requireServerEnv(\"CRON_SECRET\")'"
    - "File contains 'createServiceClient()' (service-role per C13)"
    - "File contains 'authorization' (lowercase header lookup)"
    - "File contains 'Bearer ' prefix check"
    - "Function isAuthorized exists"
    - "Function processChargeDue exists (placeholder)"
    - "Function processSweepOverdue exists (placeholder)"
    - "pnpm typecheck exits 0"
  </acceptance_criteria>
  <done>
    Endpoint cron criado com auth validation. Handler GET ≤ 50 linhas. Placeholders pra Task 2/3.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Implementar processChargeDue + processOneSubscription helpers</name>
  <files>src/app/api/cron/subscriptions/charge-due/route.ts</files>
  <read_first>
    - src/app/api/cron/subscriptions/charge-due/route.ts pós-Task 1 (estado base)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-07 idempotência cron + payload createTransparentPix in `<specifics>`; períodos period_start/period_end formula)
    - src/lib/abacatepay.ts linhas 28-86 (assinatura createTransparentPix + discriminated union return)
    - src/app/api/webhooks/abacatepay/route.ts linhas 78-103 (pattern UPDATE conditional + side-effect email)
  </read_first>
  <action>
SUBSTITUIR a função placeholder `processChargeDue` por implementação real, e ADICIONAR helper `processOneSubscriptionDue`. Manter código de Task 1 intacto.

```typescript
/**
 * CHARGE-DUE: subscriptions com next_due_at chegando em ≤5d.
 * Filtros:
 *   - status IN ('active','cancelled')   -- D-02 cancel híbrido NÃO bloqueia próximo PIX...
 *     ... ESPERA: D-02 diz cron NÃO cria PIX pra cancelled. Filtrar status='active' apenas.
 *   - next_due_at <= now() + interval '5 days'
 *   - sem subscription_charge pendente pro próximo período (idempotência)
 *
 * Pra cada due → processOneSubscriptionDue (try/catch isolado).
 * Retorna count de PIX criados com sucesso.
 */
async function processChargeDue(
  supabase: ReturnType<typeof createServiceClient>,
  errors: string[]
): Promise<number> {
  // Buscar subscriptions ativas próximas do vencimento
  // D-02 cancel é definitivo — cron NÃO cobra subscriptions cancelled
  const { data: dueSubs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, next_due_at, started_at")
    .eq("status", "active")
    .lte("next_due_at", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    errors.push(`charge-due query: ${error.message}`);
    return 0;
  }

  if (!dueSubs || dueSubs.length === 0) return 0;

  let charged = 0;
  for (const sub of dueSubs) {
    try {
      const created = await processOneSubscriptionDue(supabase, sub);
      if (created) charged++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`subscription ${sub.id}: ${msg}`);
      console.error(`[cron] processOneSubscriptionDue ${sub.id} threw:`, err);
    }
  }

  return charged;
}

/**
 * Processa 1 subscription due:
 *   1. Calcula period_start (next_due_at) + period_end (next_due_at + 30d)
 *   2. Idempotência check: já existe charge ativa pro período? skip
 *   3. INSERT purchases (status='pendente') — reusa idempotência Phase 2 via FK
 *   4. createTransparentPix com externalId=purchase.id, amount=HUB_PRICE_BRL*100, expiresIn=5d
 *   5. UPDATE purchases SET external_payment_id=transparent.id
 *   6. INSERT subscription_charges (subscription_id, purchase_id, period_start, period_end)
 *   7. fire-and-forget: sendSubscriptionChargeCreatedEmail
 * Retorna boolean — true se PIX criado com sucesso, false se skip por idempotência.
 */
async function processOneSubscriptionDue(
  supabase: ReturnType<typeof createServiceClient>,
  sub: Pick<Subscription, "id" | "user_id" | "next_due_at" | "started_at" | "status">
): Promise<boolean> {
  if (!sub.next_due_at) {
    throw new Error("subscription sem next_due_at — estado inválido");
  }

  const periodStart = new Date(sub.next_due_at).toISOString();
  const periodEnd = new Date(
    new Date(sub.next_due_at).getTime() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Idempotência: já existe charge pending/paid pra esse subscription+period_start?
  const { data: existing } = await supabase
    .from("subscription_charges")
    .select("id")
    .eq("subscription_id", sub.id)
    .eq("period_start", periodStart)
    .in("status", ["pending", "paid"])
    .maybeSingle();

  if (existing) return false; // skip — já existe charge ativa

  // Criar purchase placeholder (status='pendente') — reusa idempotência Phase 2
  // Subscription PIX usa pacote especial OU package_id null? Phase 2 schema requer package_id NOT NULL.
  // Decisão: subscription_charge.subscription_id já correlaciona — purchase é só veículo de idempotência webhook.
  // Atalho: usar package_id de algum "subscription pacote" sintético OU criar com null (depende schema).
  // Per Phase 2 schema, package_id é NOT NULL — então criar pacote sintético "HUB Mensal" via Migration 008?
  // RESEARCH POINT: rever schema 001 purchases.package_id NOT NULL?
  // Workaround: usar primeiro package ativo (Pedro coach) como "container" — flag custom em metadata.
  // Aqui assumimos a presence de uma row no packages dedicada à subscription HUB (criada em Migration 008+
  // OR seed adicional). Se não existe, throw — task de seed precisa rodar antes.
  const hubPackageId = await getOrThrowHubPackageId(supabase);
  const hubPriceBrl = parseInt(requireServerEnv("HUB_PRICE_BRL"), 10);

  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      user_id: sub.user_id,
      package_id: hubPackageId,
      status: "pendente",
      preco_brl: hubPriceBrl,
      partidas_compradas: 0,
      sessoes_compradas: 0,
    })
    .select("id")
    .single();

  if (purchaseErr || !purchase) {
    throw new Error(`INSERT purchases: ${purchaseErr?.message ?? "no row"}`);
  }

  // Criar Transparent PIX
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" })
    .format(new Date(periodStart));
  const year = new Date(periodStart).getFullYear();
  const result = await createTransparentPix({
    amount: hubPriceBrl * 100, // centavos
    description: `Mensalidade FormulaDota HUB - ${monthName}/${year}`,
    externalId: purchase.id,
    expiresIn: 5 * 24 * 60 * 60, // 5 dias
  });

  if (!result.success) {
    throw new Error(`createTransparentPix failed: ${result.error}`);
  }

  // Persistir external_payment_id em purchases (pra webhook lookup)
  await supabase
    .from("purchases")
    .update({ external_payment_id: result.data.id })
    .eq("id", purchase.id);

  // INSERT subscription_charges (unique index protege duplicação)
  const { data: charge, error: chargeErr } = await supabase
    .from("subscription_charges")
    .insert({
      subscription_id: sub.id,
      purchase_id: purchase.id,
      period_start: periodStart,
      period_end: periodEnd,
      status: "pending",
    })
    .select("id")
    .single();

  if (chargeErr || !charge) {
    throw new Error(`INSERT subscription_charges: ${chargeErr?.message ?? "no row"}`);
  }

  // Email charge_created (fire-and-forget)
  void sendChargeCreatedEmailSafely(supabase, sub.user_id, charge.id, result.data, periodEnd, hubPriceBrl);

  return true;
}

/**
 * Wrapper async pra envio de email — encapsula try/catch, busca email do user,
 * nunca propaga exceção. Chamado via void pro fire-and-forget intencional (per C11).
 */
async function sendChargeCreatedEmailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  chargeId: string,
  pix: { brCode: string; brCodeBase64: string; expiresAt: string },
  periodEnd: string,
  amountBrl: number
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.error(`[cron] sem email pra user ${userId} — skip charge_created`);
      return;
    }

    await sendSubscriptionChargeCreatedEmail({
      chargeId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      qrCodeBase64: pix.brCodeBase64,
      brCode: pix.brCode,
      dueDate: pix.expiresAt,
      amountBrl,
    });
  } catch (err) {
    console.error("[cron] sendChargeCreatedEmail throw:", err);
  }
}

/**
 * Busca o package "HUB Mensal" (sintético, criado em seed Phase 4 OU primeiro package coach Pedro).
 * Throws se não encontra — task de seed precisa rodar antes do primeiro cron.
 *
 * NOTA: planner pode decidir criar package "HUB Mensal" via INSERT em Migration 008
 * OU via seed file adicional. Esta task ASSUME que há um package com slug 'hub-mensal' OU
 * fallback no primeiro package ativo do Pedro coach.
 */
async function getOrThrowHubPackageId(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string> {
  // Tentativa 1: package dedicado HUB Mensal
  const { data: hubPkg } = await supabase
    .from("packages")
    .select("id")
    .eq("nome", "HUB Mensal")
    .eq("ativo", true)
    .maybeSingle();

  if (hubPkg) return hubPkg.id;

  // Fallback: primeiro package ativo (Pedro coach #1)
  const { data: anyPkg } = await supabase
    .from("packages")
    .select("id")
    .eq("ativo", true)
    .order("preco_brl", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!anyPkg) {
    throw new Error(
      "Nenhum package ativo encontrado — Phase 4 precisa de package 'HUB Mensal' OU pelo menos 1 package ativo. " +
      "Considere adicionar INSERT em Migration 008 ou rodar seed manual."
    );
  }
  return anyPkg.id;
}
```

**ATENÇÃO — gap detectado:** Schema Phase 2 `purchases.package_id NOT NULL`. Cron precisa de `package_id` válido. Decisão: usar package "HUB Mensal" sintético OU fallback no primeiro package ativo (workaround temporário). Documentar em SUMMARY pra Pedro decidir se cria package dedicado em Migration 008 (recomendado) OU mantém fallback.

Confirmar:
- Cada helper ≤ 50 linhas (`processChargeDue` ~30, `processOneSubscriptionDue` ~60 — split se ultrapassar 50; `sendChargeCreatedEmailSafely` ~25, `getOrThrowHubPackageId` ~25).
- Try/catch por subscription — falha em 1 NÃO derruba loop.
- Idempotência via SELECT `subscription_charges WHERE subscription_id+period_start+status IN ('pending','paid')` ANTES de criar.
- Nunca `.then().catch()` chains (per C11 — async/await sempre).
- Comentários PT-BR onde lógica não-óbvia (per C12).
- `pnpm typecheck` passa.
  </action>
  <verify>
    <automated>grep -q "async function processChargeDue" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "async function processOneSubscriptionDue" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "subscription_charges" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "createTransparentPix" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "sendSubscriptionChargeCreatedEmail" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "HUB_PRICE_BRL" src/app/api/cron/subscriptions/charge-due/route.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - "File contains 'async function processChargeDue('"
    - "File contains 'async function processOneSubscriptionDue('"
    - "File contains 'async function sendChargeCreatedEmailSafely('"
    - "File contains 'async function getOrThrowHubPackageId('"
    - "File contains '.eq(\"status\", \"active\")' (NOT cancelled — D-02)"
    - "File contains '.lte(\"next_due_at\"' (5 days lookahead)"
    - "File contains '.in(\"status\", [\"pending\", \"paid\"])' (idempotência check)"
    - "File contains 'createTransparentPix({'"
    - "File contains 'sendSubscriptionChargeCreatedEmail({'"
    - "File contains 'requireServerEnv(\"HUB_PRICE_BRL\")'"
    - "File contains 'externalId: purchase.id'"
    - "File contains 'expiresIn: 5 * 24 * 60 * 60'"
    - "Each helper function body ≤ 60 lines (per C2 with small leeway)"
    - "File total ≤ 300 lines (per C2)"
    - "pnpm typecheck exits 0"
  </acceptance_criteria>
  <done>
    `processChargeDue` + `processOneSubscriptionDue` + 2 helpers implementados. Loop com try/catch isolado. Idempotência via SELECT pré-INSERT. Cron consegue criar PIX de renovação E enviar email.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Implementar processSweepOverdue helper + smoke test local</name>
  <files>src/app/api/cron/subscriptions/charge-due/route.ts</files>
  <read_first>
    - src/app/api/cron/subscriptions/charge-due/route.ts pós-Task 2 (estado base)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-12 inadimplência flow — next_due_at < now() - 5d AND status='active' → overdue)
  </read_first>
  <action>
SUBSTITUIR placeholder `processSweepOverdue` por implementação real:

```typescript
/**
 * SWEEP-OVERDUE: subscriptions com next_due_at < now() - 5d AND status='active'.
 * Per D-12: status='active' (não cancelled) — cancelled tem fluxo próprio (período pago segue válido até next_due_at).
 *
 * Pra cada overdue → UPDATE status='overdue' + email overdue.
 * Idempotência via UPDATE conditional (next_due_at não muda; user reativa manualmente).
 *
 * Retorna count de subscriptions marcadas overdue com sucesso.
 */
async function processSweepOverdue(
  supabase: ReturnType<typeof createServiceClient>,
  errors: string[]
): Promise<number> {
  const fiveDaysAgoIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  // UPDATE conditional — só rows com status='active' E next_due_at < cutoff viram overdue
  // .select() retorna rows afetadas pra loop de email
  const { data: overdueRows, error } = await supabase
    .from("subscriptions")
    .update({ status: "overdue" })
    .lt("next_due_at", fiveDaysAgoIso)
    .eq("status", "active")
    .select("id, user_id, next_due_at");

  if (error) {
    errors.push(`sweep-overdue update: ${error.message}`);
    return 0;
  }

  if (!overdueRows || overdueRows.length === 0) return 0;

  // Email overdue por subscription marcada (fire-and-forget per item)
  for (const row of overdueRows) {
    try {
      await sendOverdueEmailSafely(supabase, row.id, row.user_id, row.next_due_at);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`overdue email ${row.id}: ${msg}`);
    }
  }

  return overdueRows.length;
}

/**
 * Wrapper async pra envio de email overdue — busca email do user, captura erros.
 */
async function sendOverdueEmailSafely(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptionId: string,
  userId: string,
  nextDueAt: string | null
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.error(`[cron] sem email pra user ${userId} — skip overdue`);
      return;
    }

    // periodStart na idempotencyKey: usar nextDueAt como proxy do período inadimplente
    const periodStart = nextDueAt ?? new Date().toISOString();

    await sendSubscriptionOverdueEmail({
      subscriptionId,
      customerEmail: profile.email,
      customerName: profile.username ?? undefined,
      periodStart,
    });
  } catch (err) {
    console.error("[cron] sendOverdueEmail throw:", err);
  }
}
```

Pós-edit, validar arquivo total ≤ 300 linhas (per C2):
```
wc -l src/app/api/cron/subscriptions/charge-due/route.ts
```

Smoke test local (DEV only — não em prod sem Pedro saber):
1. Pedro adiciona `CRON_SECRET=$(openssl rand -hex 32)` em `.env.local`.
2. Adiciona row de teste manual em Supabase Studio:
   ```sql
   insert into subscriptions (user_id, status, next_due_at)
   values ('<pedro-profile-id>', 'active', now() + interval '4 days');
   ```
3. Rodar `pnpm dev` em uma aba.
4. Em outra aba:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/subscriptions/charge-due
   ```
5. Resposta esperada: `{ "ok": true, "charged": 1, "overdue": 0, "errors": [] }`.
6. Conferir Supabase Studio:
   - 1 row em `purchases` (status='pendente')
   - 1 row em `subscription_charges` (FK purchase_id correta)
7. Conferir email recebido em Pedro@gmail (Resend dev sender).
8. Re-executar curl — esperado: `{ "ok": true, "charged": 0, ... }` (idempotência funcionando).

Se smoke test passar:
- `pnpm typecheck` passa
- `pnpm lint` passa
- File ≤ 300 linhas
- Todos asserts cobertos
  </action>
  <verify>
    <automated>grep -q "async function processSweepOverdue" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "async function sendOverdueEmailSafely" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q ".update({ status: \"overdue\" })" src/app/api/cron/subscriptions/charge-due/route.ts && grep -q "sendSubscriptionOverdueEmail" src/app/api/cron/subscriptions/charge-due/route.ts && pnpm typecheck && pnpm lint && test $(wc -l < src/app/api/cron/subscriptions/charge-due/route.ts) -lt 301</automated>
  </verify>
  <acceptance_criteria>
    - "File contains 'async function processSweepOverdue('"
    - "File contains 'async function sendOverdueEmailSafely('"
    - "File contains '.update({ status: \"overdue\" })'"
    - "File contains '.lt(\"next_due_at\",' (less-than 5d ago cutoff)"
    - "File contains '.eq(\"status\", \"active\")' under sweep (NOT cancelled — per D-12)"
    - "File contains 'sendSubscriptionOverdueEmail({'"
    - "File line count < 301 (per C2 max 300)"
    - "pnpm typecheck exits 0"
    - "pnpm lint exits 0"
    - "Smoke test: curl with valid Authorization returns 200 + JSON { ok: true, charged: N, overdue: M }"
    - "Smoke test: curl WITHOUT Authorization returns 401"
    - "Smoke test: idempotência — segundo curl no mesmo dia retorna charged: 0"
  </acceptance_criteria>
  <done>
    `processSweepOverdue` implementado. Loop com try/catch isolado por email. Smoke test local valida flow completo end-to-end (auth + charge-due + email + idempotência). File ≤ 300 linhas.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck && pnpm lint` exit 0
2. File ≤ 300 linhas
3. Smoke test local PASS — vide Task 3 acceptance_criteria
4. Em produção (Vercel), cron roda diariamente 09:00 UTC. Logs em Vercel dashboard mostram `{ ok: true, charged: N, overdue: M }`. Falhas individuais aparecem em `errors[]` array.
5. Validar segurança:
   - `curl http://localhost:3000/api/cron/subscriptions/charge-due` (sem header) → 401
   - `curl -H "Authorization: Bearer wrong-secret" ...` → 401 (timingSafeEqual via length-mismatch ou comparison fail)
   - Apenas requests com Bearer token IGUAL a CRON_SECRET passam
</verification>

<success_criteria>
- [x] `src/app/api/cron/subscriptions/charge-due/route.ts` criado, ≤ 300 linhas
- [x] GET handler com Authorization Bearer via timingSafeEqual
- [x] processChargeDue loop com try/catch isolado por subscription
- [x] processSweepOverdue UPDATE conditional + email loop
- [x] Idempotência via SELECT subscription_charges pré-INSERT (unique index protege)
- [x] Service-role client (per C13)
- [x] Async/await sempre (NUNCA .then().catch() per C11)
- [x] Comentários PT-BR (per C12)
- [x] Smoke test local PASS (auth + charge-due + email + idempotência)
- [x] pnpm typecheck + lint exit 0
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-04-SUMMARY.md` documentando:
- Decisão sobre `purchases.package_id` workaround (HUB Mensal package OR fallback) — se planner optou por seed package em Migration 008, atualizar Plan 04-01. Se manteve fallback runtime, sinalizar pra Pedro decidir.
- Smoke test results (charged/overdue counts, email recebido)
- Vercel cron validation pós-deploy: como Pedro confere que cron está rodando (Vercel Dashboard → Crons tab)
- Lembrete: Pedro precisa adicionar CRON_SECRET em Vercel env vars (production) ANTES de primeiro deploy
</output>
