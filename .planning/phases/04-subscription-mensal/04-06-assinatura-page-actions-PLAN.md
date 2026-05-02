---
phase: 04-subscription-mensal
plan: 06
plan_id: 04-06
title: Página /assinatura + Server Actions (createInitial/cancel/reactivate)
type: execute
wave: 3
depends_on:
  - 04-01
  - 04-02
  - 04-03
files_modified:
  - src/app/assinatura/page.tsx
  - src/app/assinatura/actions.ts
autonomous: true
requirements:
  - H2.4
  - C2
  - C3
  - C5
  - C6
  - C7
  - C12
  - C13
must_haves:
  truths:
    - "Página /assinatura é Server Component cyberpunk: 5 estados (sem-sub / pendente / active / cancelled-com-acesso / overdue-expired-sem-acesso)"
    - "Server Action createInitialSubscription cria subscriptions row (status='pendente') + purchases + Transparent PIX + subscription_charges + email charge_created"
    - "Server Action cancelSubscription marca subscriptions.cancelled_at=now() + status='cancelled' (next_due_at PRESERVADO per D-02)"
    - "Server Action reactivateSubscription cria nova subscription_charge + Transparent PIX (sem esperar cron) — funciona pra status cancelled/overdue/expired"
    - "Todos Server Actions usam cookie client per C13/D-10 (NÃO service-role)"
    - "Validação Zod em todos inputs Server Actions per C3"
    - "ErrorBanner pattern Phase 3 replicado pra falhas AbacatePay/DB"
    - "Lucide icons (CheckCircle2, AlertCircle, Clock, QrCode, XCircle, Loader2) — NUNCA emojis (C6)"
    - "Acessibilidade: focus-ring, aria-live em status, aria-hidden em ícones decorativos, role=alert em banners (C5)"
    - "Async/await SEMPRE per C11 — NUNCA promise chains"
    - "page.tsx ≤ 300 linhas, actions.ts ≤ 300 linhas (per C2)"
    - "UI pendente direciona pra email (não tenta re-renderizar QR — simplificação aceita)"
  artifacts:
    - path: "src/app/assinatura/page.tsx"
      provides: "Server Component cyberpunk com cards de status + form actions + 5 sub-componentes (EmptyStateCard, PendingStateCard, ActiveStateCard, CancelledHybridCard, OverdueCard)"
      contains: "export default async function AssinaturaPage, createInitialSubscription, cancelSubscription, reactivateSubscription"
    - path: "src/app/assinatura/actions.ts"
      provides: "3 Server Actions cookie-client com validação Zod + helpers compartilhados createPixForSubscription"
      contains: "use server, export async function createInitialSubscription, export async function cancelSubscription, export async function reactivateSubscription"
  key_links:
    - from: "src/app/assinatura/actions.ts createInitialSubscription"
      to: "src/lib/abacatepay.ts createTransparentPix (Phase 2 — sem mudanças)"
      via: "import + call com externalId=purchase.id"
      pattern: "import.*createTransparentPix.*from.*@/lib/abacatepay"
    - from: "src/app/assinatura/actions.ts createPixForSubscription helper"
      to: "src/lib/resend.ts sendSubscriptionChargeCreatedEmail (Plan 04-03)"
      via: "fire-and-forget email após PIX criado"
      pattern: "sendSubscriptionChargeCreatedEmail"
    - from: "src/app/assinatura/page.tsx form actions"
      to: "src/app/assinatura/actions.ts Server Actions"
      via: "<form action={createInitialSubscription|cancelSubscription|reactivateSubscription}>"
      pattern: "action=\\{(createInitialSubscription|cancelSubscription|reactivateSubscription)\\}"
    - from: "src/app/assinatura/actions.ts (cookie client)"
      to: "supabase/migrations/008 RLS policies (Plan 04-01)"
      via: "RLS auth.uid() = user_id em subscriptions + 'users insert own charges' em subscription_charges"
      pattern: "createClient.*from.*@/lib/supabase/server"
---

<objective>
Criar página `/assinatura` (Server Component cyberpunk minimal) + 3 Server Actions (`createInitialSubscription`, `cancelSubscription`, `reactivateSubscription`) que cobrem 5 estados de UI baseados no status da subscription do user logado:

| Estado | UI | Ação principal |
|--------|----|----|
| Sem subscription | Card cyan "Iniciar mensalidade R$47" | `createInitialSubscription` |
| `pendente` | Card amarelo "Verifique o email — QR enviado" | (aguarda webhook OR re-trigger via cron) |
| `active` | Card verde "Próxima cobrança: {date}" | `cancelSubscription` |
| `cancelled` AND `next_due_at > now()` | Card amarelo "Acesso até {date}" | `reactivateSubscription` |
| `overdue` OR `expired` OR (`cancelled` AND `next_due_at <= now()`) | Card vermelho "Sem acesso" | `reactivateSubscription` |

Server Actions usam cookie client (per C13/D-10) — RLS via `auth.uid() = user_id` protege. Validação Zod (per C3). ErrorBanner pattern Phase 3 pra falhas AbacatePay. Lucide icons (per C6).

**SIMPLIFICAÇÃO IMPORTANTE:** UI estado `pendente` NÃO tenta re-renderizar QR Code (evita complexidade de persistir brCode em DB). Em vez disso, exibe "QR Code enviado por email — verifique sua caixa de entrada". Email charge_created (Plan 04-03) já tem QR Code completo. Reduz acoplamento entre Plan 04-06 ↔ Plan 04-01 schema.

Purpose: User-facing endpoint da Phase 4 — única forma do user iniciar/gerenciar mensalidade. Plan último da Phase 4 funcional, depende de Plans 04-01 (schema), 04-02 (env), 04-03 (emails). Após este, Phase 4 está completa funcionalmente — restam só validação E2E + atualizações de docs.

Output:
- `src/app/assinatura/page.tsx` ≤ 300 linhas — Server Component com 5 sub-cards visuais
- `src/app/assinatura/actions.ts` ≤ 300 linhas — 3 Server Actions cookie client + helpers
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
@src/lib/resend.ts
@src/lib/supabase/server.ts
@src/lib/env.ts
@src/app/vincular/steam/page.tsx
@src/app/vincular/steam/actions.ts
@src/components/checkout/checkout-client.tsx

<interfaces>
<!-- Cookie client (per C13/D-10) -->
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// auth.uid() = user.id no contexto Server Action / Server Component
```

<!-- src/lib/abacatepay.ts (REUSAR Phase 2) -->
```typescript
const result = await createTransparentPix({
  amount: 4700,           // 47 reais em centavos
  description: "Mensalidade FormulaDota HUB - <month>/<year>",
  externalId: purchase.id, // UUID
  expiresIn: 5 * 24 * 60 * 60, // 5 dias
});
if (!result.success) return { success: false, error: result.error };
// result.data: { id, brCode, brCodeBase64, expiresAt, ... }
```

<!-- src/lib/resend.ts (Plan 04-03) -->
```typescript
import { sendSubscriptionChargeCreatedEmail } from "@/lib/resend";
void sendSubscriptionChargeCreatedEmail({ chargeId, customerEmail, qrCodeBase64, brCode, dueDate, amountBrl });
```

<!-- ErrorBanner pattern Phase 3 (replicar inline) -->
```typescript
function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-[#A855F7]/40 bg-[#1A0A2A] p-4 text-sm text-[#f4f4f5]">
      <AlertCircle className="h-5 w-5 text-[#A855F7] flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
```

<!-- Cyberpunk theme tokens (per CLAUDE.md C7) -->
```
bg dark:    bg-[#050505]
cyan:       text-[#00F0FF] / border-[#00F0FF]
purple:     text-[#A855F7]
card:       bg-[#0A0A1A] / border-[#27272a]
green ok:   text-[#34D399] / border-[#34D399]/40
red:        text-[#F87171] / border-[#F87171]/40
yellow:     text-[#FBBF24] / border-[#FBBF24]/40
```

<!-- Database types (Plan 04-01) -->
```typescript
type Subscription = Tables<"subscriptions">;
// status: "pendente" | "active" | "cancelled" | "overdue" | "expired"
```
</interfaces>

<critical_rls_dependency>
**ATENÇÃO RLS:** Plan 04-01 RLS subscription_charges é INSERT service-role only por padrão. Server Actions cookie client NÃO conseguem INSERT charges sem policy adicional.

**Solução obrigatória ANTES deste plan executar** — uma de:
1. **(PREFERIDA)** Atualizar Plan 04-01 SQL pra incluir policy adicional:
   ```sql
   drop policy if exists "users insert own charges" on public.subscription_charges;
   create policy "users insert own charges" on public.subscription_charges for insert
     with check (
       exists (
         select 1 from public.subscriptions s
         where s.id = subscription_id and s.user_id = auth.uid()
       )
     );
   ```
2. **Fallback** — se Plan 04-01 já executado sem policy: criar Migration 009 com a policy acima.
3. **Hybrid (last resort)** — usar service-role client em `createPixForSubscription` helper, documentar exceção a C13 com comentário explícito.

Executor deste plan deve **VERIFICAR** state da Migration 008 antes de implementar:
```sql
select count(*) from pg_policies where tablename='subscription_charges' and policyname='users insert own charges';
-- Deve retornar 1. Se 0 → bloquear execução até atualizar 04-01 ou criar Migration 009.
```

Esta task DAQUI EM DIANTE assume opção 1 ou 2 aplicada.
</critical_rls_dependency>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar src/app/assinatura/actions.ts com 3 Server Actions cookie client + helpers</name>
  <files>src/app/assinatura/actions.ts</files>
  <read_first>
    - src/app/vincular/steam/actions.ts (pattern Server Action cookie client + redirect)
    - src/lib/abacatepay.ts linhas 28-86 (assinatura createTransparentPix + return discriminated union)
    - src/lib/resend.ts pós-Plan 04-03 (sendSubscriptionChargeCreatedEmail)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-10 cookie client; <specifics> períodos formula; lifecycle status)
    - supabase/migrations/008_subscription_pix_manual.sql pós-Plan 04-01 (verificar policy "users insert own charges" — vide critical_rls_dependency)
  </read_first>
  <action>
**PRÉ-CHECK:** Validar que policy "users insert own charges" existe em subscription_charges (vide `<critical_rls_dependency>`). Se não existe, criar Migration 009 ou atualizar 04-01 ANTES de prosseguir.

Criar arquivo `src/app/assinatura/actions.ts` com este conteúdo (estrutura: 3 Server Actions exportadas + 2 helpers compartilhados privados):

```typescript
"use server";

// Server Actions Phase 4 — Subscription PIX Manual Mensal
//
// 3 actions cobrem lifecycle:
//   - createInitialSubscription: primeira assinatura
//   - cancelSubscription: cancel híbrido D-02 (mantém next_due_at)
//   - reactivateSubscription: novo PIX sem esperar cron (status cancelled/overdue/expired)
//
// CRÍTICO C13/D-10: cookie client em todas. RLS protege via:
//   - subscriptions: auth.uid() = user_id (Migration 008 policy "users insert own subscription")
//   - subscription_charges: auth.uid() = subscriptions.user_id (Migration 008 policy "users insert own charges")

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireServerEnv } from "@/lib/env";
import { createTransparentPix } from "@/lib/abacatepay";
import { sendSubscriptionChargeCreatedEmail } from "@/lib/resend";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Cria primeira subscription do user (ou recria após expired/overdue).
 * Falha se já existe subscription "viva" (pendente/active/cancelled/overdue).
 */
export async function createInitialSubscription(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required_for_subscription");

  // Defensivo — partial unique index também protege
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pendente", "active", "cancelled", "overdue"])
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `Você já tem uma assinatura ${existing.status}. Recarregue a página.`,
    };
  }

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, status: "pendente" })
    .select("id")
    .single();

  if (subErr || !sub) {
    return { success: false, error: subErr?.message ?? "Falha ao criar subscription" };
  }

  const result = await createPixForSubscription(supabase, sub.id, user.id, new Date());
  if (!result.success) return result;

  revalidatePath("/assinatura");
  return { success: true };
}

const cancelInputSchema = z.object({ subscriptionId: z.string().uuid() });

/**
 * Cancel híbrido D-02 — UPDATE status='cancelled' + cancelled_at=now() (next_due_at PRESERVADO).
 * Helper has_active_subscription() retorna true até next_due_at expirar.
 */
export async function cancelSubscription(formData: FormData): Promise<ActionResult> {
  const parsed = cancelInputSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) {
    return { success: false, error: "Input inválido — UUID esperado." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required_for_subscription");

  // UPDATE conditional WHERE status='active' garante idempotência
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", parsed.data.subscriptionId)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) return { success: false, error: error.message };

  revalidatePath("/assinatura");
  return { success: true };
}

const reactivateInputSchema = z.object({ subscriptionId: z.string().uuid() });

/**
 * Reativa subscription cancelled/overdue/expired criando novo PIX sem esperar cron.
 * period_start = max(now, next_due_at) — se cancel híbrido ainda no período pago,
 * novo PIX começa quando o atual expirar.
 */
export async function reactivateSubscription(formData: FormData): Promise<ActionResult> {
  const parsed = reactivateInputSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) {
    return { success: false, error: "Input inválido — UUID esperado." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required_for_subscription");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, next_due_at")
    .eq("id", parsed.data.subscriptionId)
    .eq("user_id", user.id)
    .single();

  if (!sub) return { success: false, error: "Subscription não encontrada." };
  if (!["cancelled", "overdue", "expired"].includes(sub.status)) {
    return { success: false, error: `Status ${sub.status} não permite reativação.` };
  }

  const nowMs = Date.now();
  const nextDueMs = sub.next_due_at ? new Date(sub.next_due_at).getTime() : 0;
  const periodStart = new Date(Math.max(nowMs, nextDueMs));

  const { error: updErr } = await supabase
    .from("subscriptions")
    .update({ status: "pendente", cancelled_at: null })
    .eq("id", sub.id)
    .eq("user_id", user.id);

  if (updErr) return { success: false, error: updErr.message };

  const result = await createPixForSubscription(supabase, sub.id, user.id, periodStart);
  if (!result.success) return result;

  revalidatePath("/assinatura");
  return { success: true };
}

/**
 * Helper compartilhado — cria purchase + Transparent PIX + subscription_charge + email.
 * Usado por createInitialSubscription E reactivateSubscription.
 */
async function createPixForSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscriptionId: string,
  userId: string,
  periodStart: Date
): Promise<ActionResult> {
  const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const hubPriceBrl = parseInt(requireServerEnv("HUB_PRICE_BRL"), 10);
  const hubPackageId = await getOrThrowHubPackageId(supabase);

  const { data: purchase, error: purchaseErr } = await supabase
    .from("purchases")
    .insert({
      user_id: userId,
      package_id: hubPackageId,
      status: "pendente",
      preco_brl: hubPriceBrl,
      partidas_compradas: 0,
      sessoes_compradas: 0,
    })
    .select("id")
    .single();

  if (purchaseErr || !purchase) {
    return { success: false, error: purchaseErr?.message ?? "Falha ao criar purchase" };
  }

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(periodStart);
  const year = periodStart.getFullYear();
  const pixResult = await createTransparentPix({
    amount: hubPriceBrl * 100,
    description: `Mensalidade FormulaDota HUB - ${monthName}/${year}`,
    externalId: purchase.id,
    expiresIn: 5 * 24 * 60 * 60,
  });

  if (!pixResult.success) {
    return { success: false, error: pixResult.error };
  }

  await supabase
    .from("purchases")
    .update({ external_payment_id: pixResult.data.id })
    .eq("id", purchase.id);

  const { data: charge, error: chargeErr } = await supabase
    .from("subscription_charges")
    .insert({
      subscription_id: subscriptionId,
      purchase_id: purchase.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: "pending",
    })
    .select("id")
    .single();

  if (chargeErr || !charge) {
    return { success: false, error: chargeErr?.message ?? "Falha ao criar charge" };
  }

  // Email charge_created (fire-and-forget per C11)
  void sendChargeCreatedSafely(supabase, userId, charge.id, pixResult.data, hubPriceBrl);

  return { success: true };
}

/**
 * Wrapper async — busca email do user, dispara email, captura erros.
 */
async function sendChargeCreatedSafely(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  chargeId: string,
  pix: { brCode: string; brCodeBase64: string; expiresAt: string },
  amountBrl: number
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      console.error(`[actions] sem email pra user ${userId} — skip charge_created`);
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
    console.error("[actions] sendChargeCreated throw:", err);
  }
}

/**
 * Busca package "HUB Mensal" sintético OR fallback no primeiro package ativo.
 * Mesmo helper usado no cron (Plan 04-04) — pattern duplicado intencional pra isolar deps.
 */
async function getOrThrowHubPackageId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: hubPkg } = await supabase
    .from("packages")
    .select("id")
    .eq("nome", "HUB Mensal")
    .eq("ativo", true)
    .maybeSingle();
  if (hubPkg) return hubPkg.id;

  const { data: anyPkg } = await supabase
    .from("packages")
    .select("id")
    .eq("ativo", true)
    .order("preco_brl", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!anyPkg) {
    throw new Error("Nenhum package ativo — precisa de package 'HUB Mensal' OR 1 package ativo.");
  }
  return anyPkg.id;
}
```

Confirmar pós-edit:
- `"use server";` na linha 1.
- 3 actions exportadas com signatures corretas.
- Cookie client (`createClient` from `@/lib/supabase/server`) — NÃO `createServiceClient`.
- Validação Zod (per C3) em cancel/reactivate (createInitial não tem input).
- Async/await sempre (NUNCA `.then().catch()`).
- File ≤ 300 linhas.
- Cada function ≤ 50 linhas — `createInitialSubscription` ~30, `cancelSubscription` ~25, `reactivateSubscription` ~40, `createPixForSubscription` ~55 (split se exceder), `sendChargeCreatedSafely` ~30, `getOrThrowHubPackageId` ~25.
- Comentários PT-BR (per C12).
- `pnpm typecheck` + `pnpm lint` passam.
  </action>
  <verify>
    <automated>test -f src/app/assinatura/actions.ts && grep -q "use server" src/app/assinatura/actions.ts && grep -q "export async function createInitialSubscription" src/app/assinatura/actions.ts && grep -q "export async function cancelSubscription" src/app/assinatura/actions.ts && grep -q "export async function reactivateSubscription" src/app/assinatura/actions.ts && grep -q "createClient.*from.*@/lib/supabase/server" src/app/assinatura/actions.ts && ! grep -q "createServiceClient" src/app/assinatura/actions.ts && grep -q "z.object" src/app/assinatura/actions.ts && grep -q "createTransparentPix" src/app/assinatura/actions.ts && grep -q "sendSubscriptionChargeCreatedEmail" src/app/assinatura/actions.ts && pnpm typecheck && pnpm lint && test $(wc -l < src/app/assinatura/actions.ts) -lt 301</automated>
  </verify>
  <acceptance_criteria>
    - "src/app/assinatura/actions.ts exists"
    - "First non-empty line is 'use server';' (string literal)"
    - "File contains 'export async function createInitialSubscription()'"
    - "File contains 'export async function cancelSubscription(formData: FormData)'"
    - "File contains 'export async function reactivateSubscription(formData: FormData)'"
    - "File contains 'createClient' import from '@/lib/supabase/server'"
    - "File does NOT contain 'createServiceClient' (per C13/D-10)"
    - "File contains 'z.object({ subscriptionId: z.string().uuid()' (Zod per C3)"
    - "File contains '.eq(\"status\", \"active\")' in cancel (idempotência)"
    - "File contains 'createTransparentPix({'"
    - "File contains 'expiresIn: 5 * 24 * 60 * 60'"
    - "File contains 'sendSubscriptionChargeCreatedEmail({'"
    - "File contains 'revalidatePath(\"/assinatura\")'"
    - "File line count < 301"
    - "pnpm typecheck exits 0"
    - "pnpm lint exits 0"
  </acceptance_criteria>
  <done>
    `src/app/assinatura/actions.ts` criado: 3 Server Actions cookie-client + 3 helpers privados. Validação Zod. Sem service-role. Plan 04-01 RLS policy "users insert own charges" pré-validada.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/app/assinatura/page.tsx Server Component cyberpunk com 5 sub-cards</name>
  <files>src/app/assinatura/page.tsx</files>
  <read_first>
    - src/app/vincular/steam/page.tsx (pattern Server Component cyberpunk + ErrorBanner + Lucide icons + searchParams)
    - src/app/assinatura/actions.ts pós-Task 1 (importar 3 Server Actions)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-06 spec card status visual; lifecycle status mapping)
    - CLAUDE.md (theme tokens cyberpunk + Lucide icons + WCAG AA)
  </read_first>
  <action>
Criar `src/app/assinatura/page.tsx` Server Component (estrutura: 1 page export + 1 ErrorBanner + 5 sub-card components):

```typescript
import { redirect } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createInitialSubscription,
  cancelSubscription,
  reactivateSubscription,
} from "./actions";
import type { Tables } from "@/types/database";

type Subscription = Pick<Tables<"subscriptions">, "id" | "status" | "next_due_at" | "cancelled_at" | "started_at">;

export const metadata = {
  title: "Assinatura — FormulaDota",
  description: "Gerencie sua mensalidade R$ 47/mês do HUB FormulaDota.",
};

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  login_required_for_subscription:
    "Faça login com Discord primeiro pra gerenciar sua assinatura.",
};

// ErrorBanner — replicado de Phase 3 vincular-steam (Claude's Discretion CONTEXT.md)
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-lg border border-[#A855F7]/40 bg-[#1A0A2A] p-4 text-sm text-[#f4f4f5]"
    >
      <AlertCircle className="h-5 w-5 text-[#A855F7] flex-shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=login_required_for_subscription");

  // Buscar subscription "viva" do user (partial unique index garante NO MAX 1)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, next_due_at, cancelled_at, started_at")
    .eq("user_id", user.id)
    .in("status", ["pendente", "active", "cancelled", "overdue", "expired"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#050505] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-[#00F0FF] mb-2 tracking-tight">
          Mensalidade HUB
        </h1>
        <p className="text-[#a1a1aa] mb-8">
          R$ 47/mês via PIX. Acesso completo ao HUB FormulaDota.
        </p>

        {sp.error && ERROR_MESSAGES[sp.error] && (
          <ErrorBanner message={ERROR_MESSAGES[sp.error]} />
        )}

        <SubscriptionCard sub={sub} />
      </div>
    </main>
  );
}

/**
 * Roteador de estados — escolhe sub-card baseado em sub.status + next_due_at.
 * 5 estados visuais (per D-06).
 */
function SubscriptionCard({ sub }: { sub: Subscription | null }) {
  if (!sub) return <EmptyStateCard />;
  if (sub.status === "pendente") return <PendingStateCard />;
  if (sub.status === "active") return <ActiveStateCard sub={sub} />;
  if (
    sub.status === "cancelled" &&
    sub.next_due_at &&
    new Date(sub.next_due_at) > new Date()
  ) {
    return <CancelledHybridCard sub={sub} />;
  }
  // overdue OR expired OR (cancelled AND next_due_at <= now())
  return <OverdueCard sub={sub} />;
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
}

// Sub-cards — cada um ≤ 30 linhas (per C2)

function EmptyStateCard() {
  return (
    <div className="rounded-lg border border-[#00F0FF]/40 bg-[#0A0A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="h-6 w-6 text-[#00F0FF]" aria-hidden="true" />
        <h2 className="text-xl font-display font-semibold text-[#00F0FF]">Sem assinatura ativa</h2>
      </div>
      <p className="text-[#f4f4f5] mb-6">
        Inicie sua mensalidade <strong>R$ 47/mês</strong> via PIX e libere acesso completo ao HUB FormulaDota: lobbies in-house, ranking, comunidade.
      </p>
      <form action={createInitialSubscription}>
        <button
          type="submit"
          className="w-full md:w-auto bg-[#00F0FF] text-[#050505] font-display font-semibold px-6 py-3 rounded-lg hover:bg-[#00F0FF]/90 transition focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#050505]"
        >
          Iniciar mensalidade
        </button>
      </form>
    </div>
  );
}

function PendingStateCard() {
  return (
    <div className="rounded-lg border border-[#FBBF24]/40 bg-[#0A0A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="h-6 w-6 text-[#FBBF24] animate-spin" aria-hidden="true" />
        <h2 className="text-xl font-display font-semibold text-[#FBBF24]">Aguardando pagamento</h2>
      </div>
      <p className="text-[#f4f4f5] mb-4" aria-live="polite">
        Sua mensalidade foi gerada. <strong>Verifique seu email</strong> — enviamos o QR Code PIX e código copiar-e-colar.
      </p>
      <p className="text-sm text-[#a1a1aa]">
        Acesso é liberado automaticamente quando o pagamento for confirmado (até 1 minuto).
      </p>
    </div>
  );
}

function ActiveStateCard({ sub }: { sub: Subscription }) {
  return (
    <div className="rounded-lg border border-[#34D399]/40 bg-[#0A0A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="h-6 w-6 text-[#34D399]" aria-hidden="true" />
        <h2 className="text-xl font-display font-semibold text-[#34D399]">Mensalidade ativa</h2>
      </div>
      <div className="bg-[#050505] border border-[#27272a] rounded-lg p-4 mb-6">
        <p className="text-sm text-[#a1a1aa] mb-1">Próxima cobrança:</p>
        <p className="text-lg text-[#00F0FF] font-semibold" aria-live="polite">
          {formatDateBR(sub.next_due_at)}
        </p>
      </div>
      <form action={cancelSubscription}>
        <input type="hidden" name="subscriptionId" value={sub.id} />
        <button
          type="submit"
          className="bg-transparent border border-[#A855F7] text-[#A855F7] font-display font-semibold px-6 py-3 rounded-lg hover:bg-[#A855F7]/10 transition focus:outline-none focus:ring-2 focus:ring-[#A855F7] focus:ring-offset-2 focus:ring-offset-[#050505]"
        >
          Cancelar mensalidade
        </button>
      </form>
    </div>
  );
}

function CancelledHybridCard({ sub }: { sub: Subscription }) {
  const dateBR = formatDateBR(sub.next_due_at);
  return (
    <div className="rounded-lg border border-[#FBBF24]/40 bg-[#0A0A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="h-6 w-6 text-[#FBBF24]" aria-hidden="true" />
        <h2 className="text-xl font-display font-semibold text-[#FBBF24]">Cancelada</h2>
      </div>
      <p className="text-[#f4f4f5] mb-6">
        Você cancelou sua mensalidade. O acesso ao HUB segue ativo até <strong>{dateBR}</strong> (período já pago). Quer voltar antes? Reative agora.
      </p>
      <form action={reactivateSubscription}>
        <input type="hidden" name="subscriptionId" value={sub.id} />
        <button
          type="submit"
          className="bg-[#00F0FF] text-[#050505] font-display font-semibold px-6 py-3 rounded-lg hover:bg-[#00F0FF]/90 transition focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#050505]"
        >
          Reativar mensalidade
        </button>
      </form>
    </div>
  );
}

function OverdueCard({ sub }: { sub: Subscription }) {
  const statusText = sub.status === "overdue" ? "em atraso" : "expirada";
  return (
    <div className="rounded-lg border border-[#F87171]/40 bg-[#0A0A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <XCircle className="h-6 w-6 text-[#F87171]" aria-hidden="true" />
        <h2 className="text-xl font-display font-semibold text-[#F87171]">Sem acesso ativo</h2>
      </div>
      <p className="text-[#f4f4f5] mb-6">
        Sua mensalidade está {statusText}. Reative pra retomar acesso ao HUB.
      </p>
      <form action={reactivateSubscription}>
        <input type="hidden" name="subscriptionId" value={sub.id} />
        <button
          type="submit"
          className="bg-[#00F0FF] text-[#050505] font-display font-semibold px-6 py-3 rounded-lg hover:bg-[#00F0FF]/90 transition focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#050505]"
        >
          Reativar mensalidade
        </button>
      </form>
    </div>
  );
}
```

Confirmar pós-edit:
- 5 sub-cards: `EmptyStateCard`, `PendingStateCard`, `ActiveStateCard`, `CancelledHybridCard`, `OverdueCard`.
- Cada sub-card ≤ 30 linhas (per C2).
- `AssinaturaPage` ≤ 50 linhas (per C2).
- Lucide icons em todos cards (per C6).
- Theme cyberpunk consistente (per C7) — cyan/yellow/green/red appropriadamente.
- WCAG AA: focus rings, aria-live em status dinâmico, aria-hidden em ícones decorativos, role=alert em ErrorBanner.
- File ≤ 300 linhas.
- Comentários PT-BR onde lógica não-óbvia (per C12).
- `pnpm typecheck` + `pnpm lint` passam.
  </action>
  <verify>
    <automated>test -f src/app/assinatura/page.tsx && grep -q "export default async function AssinaturaPage" src/app/assinatura/page.tsx && grep -q "createInitialSubscription" src/app/assinatura/page.tsx && grep -q "cancelSubscription" src/app/assinatura/page.tsx && grep -q "reactivateSubscription" src/app/assinatura/page.tsx && grep -q "from \"lucide-react\"" src/app/assinatura/page.tsx && grep -q "#00F0FF" src/app/assinatura/page.tsx && grep -q "#34D399" src/app/assinatura/page.tsx && grep -q "#FBBF24" src/app/assinatura/page.tsx && grep -q "#F87171" src/app/assinatura/page.tsx && grep -q "ErrorBanner" src/app/assinatura/page.tsx && grep -q "Intl.DateTimeFormat(\"pt-BR\"" src/app/assinatura/page.tsx && grep -q "function EmptyStateCard" src/app/assinatura/page.tsx && grep -q "function PendingStateCard" src/app/assinatura/page.tsx && grep -q "function ActiveStateCard" src/app/assinatura/page.tsx && grep -q "function CancelledHybridCard" src/app/assinatura/page.tsx && grep -q "function OverdueCard" src/app/assinatura/page.tsx && pnpm typecheck && pnpm lint && test $(wc -l < src/app/assinatura/page.tsx) -lt 301</automated>
  </verify>
  <acceptance_criteria>
    - "src/app/assinatura/page.tsx exists"
    - "File contains 'export default async function AssinaturaPage'"
    - "File imports 3 actions: createInitialSubscription, cancelSubscription, reactivateSubscription"
    - "File contains 5 sub-card functions: EmptyStateCard, PendingStateCard, ActiveStateCard, CancelledHybridCard, OverdueCard"
    - "File imports from 'lucide-react' (per C6)"
    - "File does NOT contain emoji characters in JSX (per C6)"
    - "File contains theme colors: '#00F0FF' (cyan), '#34D399' (green), '#FBBF24' (yellow), '#F87171' (red), '#A855F7' (purple), '#0A0A1A' (card), '#050505' (bg)"
    - "File contains 'ErrorBanner' inline component"
    - "File contains 'Intl.DateTimeFormat(\"pt-BR\", { dateStyle: \"long\" })'"
    - "File contains 'aria-live=\"polite\"' (in active card)"
    - "File contains 'aria-hidden=\"true\"' on Lucide icons"
    - "File contains 'role=\"alert\"' in ErrorBanner"
    - "File contains 'focus:ring-2' (focus ring per WCAG)"
    - "File line count < 301"
    - "pnpm typecheck exits 0"
    - "pnpm lint exits 0"
  </acceptance_criteria>
  <done>
    `src/app/assinatura/page.tsx` Server Component cyberpunk com 5 sub-cards visuais. Lucide icons. WCAG AA features (focus rings, aria-live, aria-hidden). Forms apontam pra Server Actions Task 1.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Smoke test E2E manual /assinatura — 5 estados visuais + 3 actions</name>
  <files>(none — validação manual do flow completo)</files>
  <read_first>
    - src/app/assinatura/page.tsx + actions.ts (estado pós-Task 1 + Task 2)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (lifecycle de status)
  </read_first>
  <action>
Smoke test E2E manual em ambiente DEV (sandbox AbacatePay):

**Setup:**
1. `pnpm dev` rodando.
2. Pedro (ou test user) logado via Discord OAuth — profile existe, role pode ser qualquer.
3. Smee tunnel ativo pra webhook AbacatePay sandbox.
4. CRON_SECRET + HUB_PRICE_BRL configurados em `.env.local`.
5. RLS policy "users insert own charges" presente em subscription_charges (vide critical_rls_dependency).

**Test 1 — EmptyStateCard → createInitialSubscription:**
1. Visitar `http://localhost:3000/assinatura`.
2. Esperado: card cyan "Sem assinatura ativa" + botão "Iniciar mensalidade".
3. Click "Iniciar mensalidade".
4. Esperado: redirect mantém em /assinatura, agora mostrando PendingStateCard amarelo.
5. Email "Mensalidade FormulaDota — pagamento PIX gerado" recebido.
6. Conferir Supabase: `subscriptions` com status='pendente', `subscription_charges` com status='pending', `purchases` com status='pendente' + external_payment_id.

**Test 2 — PendingStateCard:**
1. Estado já estabelecido em Test 1.
2. Esperado: card amarelo "Aguardando pagamento" + texto "Verifique seu email" + spinner Loader2 girando.
3. Sem botões ativos (UI passiva — aguarda webhook).

**Test 3 — Webhook completed → ActiveStateCard:**
1. Em dashboard AbacatePay sandbox, marcar transparent como completed (OR enviar webhook curl manual com HMAC válido).
2. Aguardar 1 segundo, recarregar /assinatura.
3. Esperado: card verde "Mensalidade ativa" + "Próxima cobrança: {30 dias adiante}" + botão "Cancelar mensalidade".
4. Email "Mensalidade renovada — acesso ativo" recebido.
5. Conferir Supabase: `subscriptions.status='active'`, `subscriptions.next_due_at` = period_end, `subscriptions.started_at` preenchido. `subscription_charges.status='paid'`.

**Test 4 — cancelSubscription → CancelledHybridCard:**
1. Click "Cancelar mensalidade".
2. Esperado: card amarelo "Cancelada — acesso até {next_due_at}" + botão "Reativar mensalidade".
3. Conferir Supabase: `subscriptions.status='cancelled'`, `cancelled_at=now()`, `next_due_at` PRESERVADO (D-02).
4. Conferir helper SQL ainda retorna true:
   ```sql
   set request.jwt.claim.sub to '<user_id>';
   select public.has_active_subscription();
   -- Deve retornar true (cancelled mas next_due_at futuro)
   ```

**Test 5 — reactivateSubscription:**
1. Click "Reativar mensalidade".
2. Esperado: cria novo PIX, redirect /assinatura mostra PendingStateCard.
3. Email charge_created recebido (com novo período).
4. Conferir Supabase: nova `subscription_charges` row + `subscriptions.status='pendente'`.

**Test 6 — OverdueCard:**
1. Manualmente em Supabase Studio, UPDATE subscription pra `status='overdue'` + `next_due_at = now() - interval '10 days'`.
2. Recarregar /assinatura.
3. Esperado: card vermelho "Sem acesso ativo" + texto "em atraso" + botão "Reativar".
4. Helper SQL retorna false:
   ```sql
   select public.has_active_subscription();  -- false
   ```

**Test 7 — Validação Zod:**
1. Manipular `subscriptionId` no form (DevTools): trocar pra string inválida "abc".
2. Submit.
3. Esperado: ActionResult.error = "Input inválido — UUID esperado." (não DB call disparada).

**Test 8 — Validação RLS:**
1. Em Supabase Studio, logar como user diferente (test2).
2. Tentar manualmente UPDATE subscriptions WHERE id = (id do Pedro).
3. Esperado: 0 rows afetadas (RLS bloqueia user_id mismatch).

Documentar resultados (screenshots opcional) em SUMMARY.
  </action>
  <verify>
    <automated>node -e "console.log('Smoke test E2E manual — vide acceptance_criteria')"</automated>
  </verify>
  <acceptance_criteria>
    - "Test 1: EmptyStateCard renders, createInitialSubscription cria 3 rows + email"
    - "Test 2: PendingStateCard renders com Loader2 spinner + texto verificar email"
    - "Test 3: webhook completed → ActiveStateCard com next_due_at +30d, email charge_paid"
    - "Test 4: cancelSubscription → CancelledHybridCard, status=cancelled, next_due_at PRESERVADO, has_active_subscription() retorna true"
    - "Test 5: reactivateSubscription cria novo PIX, volta pra PendingStateCard"
    - "Test 6: OverdueCard renders quando status=overdue, has_active_subscription() retorna false"
    - "Test 7: Zod validation bloqueia subscriptionId inválido"
    - "Test 8: RLS bloqueia UPDATE cross-user"
    - "All 8 smoke tests pass without console errors"
  </acceptance_criteria>
  <done>
    8 smoke tests E2E passam. Phase 4 funcionalmente completa. Pedro pode validar no produto que cycle Pendente → Active → Cancelled → Reativado → Overdue funciona end-to-end.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck && pnpm lint` exit 0
2. Files: actions.ts ≤ 300 linhas, page.tsx ≤ 300 linhas
3. Smoke test E2E Task 3 — 8 cenários passam
4. Validar ausência de service-role:
   - `grep "createServiceClient" src/app/assinatura/actions.ts` retorna 0 matches (per C13/D-10)
5. Validar Lucide-only:
   - `grep -E "[\\xF0-\\xFF]" src/app/assinatura/page.tsx` retorna 0 matches (sem emojis Unicode per C6)
   - Acentos PT-BR (ç, ã, é) NÃO contam — esses são range Latin-1 não emoji
6. Cyberpunk theme consistente — todas cores presentes em page.tsx
</verification>

<success_criteria>
- [x] `src/app/assinatura/actions.ts` criado: 3 Server Actions cookie client + 3 helpers privados
- [x] `src/app/assinatura/page.tsx` criado: Server Component com 5 sub-cards visuais
- [x] Validação Zod em todos inputs (per C3)
- [x] Lucide icons em todos cards (per C6)
- [x] Theme cyberpunk consistente (per C7)
- [x] WCAG AA features: focus rings, aria-live, aria-hidden, role=alert
- [x] Cookie client only (per C13/D-10) — sem service-role
- [x] Async/await sempre (per C11)
- [x] Comentários PT-BR (per C12)
- [x] Files ≤ 300 linhas (per C2)
- [x] 8 smoke tests E2E passam
- [x] pnpm typecheck + lint exit 0
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-06-SUMMARY.md` documentando:
- Decisão simplificação UI pendente (texto "Verifique email" em vez de re-render QR) — economiza colunas brCode no schema
- Tamanhos finais (actions.ts ~270 linhas, page.tsx ~280 linhas estimados)
- Resultados smoke tests (8 cenários)
- Confirmação que policy "users insert own charges" estava presente em subscription_charges (validar antes de implementar)
- Próximo passo: atualizar STATE.md/ROADMAP.md/PROJECT.md como milestone Phase 4 completo + sugerir UAT humano (Pedro testa fluxo real com cartão sandbox AbacatePay)
</output>
