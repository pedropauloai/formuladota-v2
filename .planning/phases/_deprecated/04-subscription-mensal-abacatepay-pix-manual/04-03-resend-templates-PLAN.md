---
phase: 04-subscription-mensal
plan: 03
plan_id: 04-03
title: Resend templates — 3 builders subscription (charge_created com QR, charge_paid, overdue)
type: execute
wave: 2
depends_on:
  - 04-02
files_modified:
  - src/lib/resend.ts
autonomous: true
requirements:
  - H2.4
  - C7
  - C12
must_haves:
  truths:
    - "src/lib/resend.ts exporta sendSubscriptionChargeCreatedEmail({chargeId, customerEmail, customerName?, qrCodeBase64, brCode, dueDate, amountBrl})"
    - "src/lib/resend.ts exporta sendSubscriptionChargePaidEmail({chargeId, customerEmail, customerName?, nextDueDate, amountBrl})"
    - "src/lib/resend.ts exporta sendSubscriptionOverdueEmail({subscriptionId, customerEmail, customerName?, periodStart})"
    - "Cada builder usa idempotencyKey distinto: subscription-charge-created-{chargeId}, subscription-charge-paid-{chargeId}, subscription-overdue-{subscriptionId}-{periodStart_iso}"
    - "QR Code embed via <img src='data:image/png;base64,{qrCodeBase64}'> — pattern Phase 2 checkout-client"
    - "Cyberpunk theme cyan #00F0FF + purple #A855F7 + dark #050505 mantido (per C7)"
    - "Cada função retorna void e captura erros internos via try/catch (fire-and-forget per resend.ts header existente)"
    - "Lazy init Resend client (getResend()) reusado — sem recriar"
    - "amountBrl e dueDate formatados PT-BR (Intl.NumberFormat + Intl.DateTimeFormat)"
  artifacts:
    - path: "src/lib/resend.ts"
      provides: "3 builders email subscription extendendo arquivo existente Phase 2 (sem mudar sendPurchaseConfirmationEmail)"
      contains: "export async function sendSubscriptionChargeCreatedEmail, export async function sendSubscriptionChargePaidEmail, export async function sendSubscriptionOverdueEmail"
  key_links:
    - from: "src/lib/resend.ts (3 builders)"
      to: "src/app/api/cron/subscriptions/charge-due/route.ts (Plan 04-04)"
      via: "import { sendSubscriptionChargeCreatedEmail, sendSubscriptionOverdueEmail } from '@/lib/resend'"
      pattern: "sendSubscriptionChargeCreatedEmail|sendSubscriptionOverdueEmail"
    - from: "src/lib/resend.ts sendSubscriptionChargePaidEmail"
      to: "src/app/api/webhooks/abacatepay/route.ts (Plan 04-05)"
      via: "import + call em processSubscriptionRenewal helper"
      pattern: "sendSubscriptionChargePaidEmail"
    - from: "src/lib/resend.ts sendSubscriptionChargeCreatedEmail"
      to: "src/app/assinatura/actions.ts (Plan 04-06)"
      via: "import + call em createInitialSubscription/reactivateSubscription"
      pattern: "sendSubscriptionChargeCreatedEmail"
---

<objective>
Estender `src/lib/resend.ts` (95 linhas atuais) com 3 builders email novos pra Phase 4 Subscription PIX Manual:
1. `sendSubscriptionChargeCreatedEmail` — disparado quando cron OU createInitialSubscription/reactivate cria PIX. Inclui QR Code embed + brCode copiar-e-colar + due date.
2. `sendSubscriptionChargePaidEmail` — disparado pelo webhook `processSubscriptionRenewal` após `transparent.completed` em renewal charge.
3. `sendSubscriptionOverdueEmail` — disparado pelo cron sweep_overdue após status='overdue' transição.

Reusar pattern Phase 2: lazy init `getResend()`, void return + try/catch interno (fire-and-forget — falha email não derruba caller crítico), idempotencyKey distinto por charge. Theme cyberpunk per C7 (cyan #00F0FF, purple #A855F7, dark #050505).

Purpose: Notificações reativas pro user mantém engagement com flow PIX manual (sem cartão automático). Plan 04-03 desbloqueia 04-04 (cron usa charge_created/overdue) e 04-05 (webhook usa charge_paid) e 04-06 (Server Actions usam charge_created).

Output:
- `src/lib/resend.ts` extendido com 3 funções públicas + 3 helpers privados de HTML build (similar a `buildConfirmationHtml` existente)
- Sem regressão em `sendPurchaseConfirmationEmail` (Phase 2 mantido intacto)
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
@src/lib/resend.ts

<interfaces>
<!-- src/lib/resend.ts existing exports + pattern (Phase 2) -->
```typescript
import { Resend } from "resend";
import { requireServerEnv } from "@/lib/env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  }
  return _resend;
}

interface SendPurchaseConfirmationInput {
  purchaseId: string;
  customerEmail: string;
  customerName?: string;
  packageName: string;
  partidasCompradas: number;
  sessoesCompradas: number;
}

export async function sendPurchaseConfirmationEmail(
  input: SendPurchaseConfirmationInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  try {
    const { error } = await resend.emails.send(
      { from, to: [input.customerEmail], subject: "...", html: buildConfirmationHtml(input) },
      { idempotencyKey: `purchase-confirmed-${input.purchaseId}` }
    );
    if (error) console.error("[resend] envio retornou erro:", error.message);
  } catch (err) {
    console.error("[resend] envio jogou exceção:", err);
  }
}
```

<!-- Cyberpunk theme tokens (per CLAUDE.md) -->
```
background dark: #050505
cyan primary:    #00F0FF
purple accent:   #A855F7
card bg:         #0A0A1A
font display:    Space Grotesk
border:          #27272a
```

<!-- Pattern QR Code embed (Phase 2 checkout-client.tsx) -->
```html
<img src="data:image/png;base64,{qrCodeBase64}" alt="QR Code PIX" style="...">
```
- O `qrCodeBase64` que vem da AbacatePay já inclui prefixo `data:image/png;base64,` em alguns casos OU vem cru (verificar). Pattern checkout Phase 2 confirma — se cru, prepend; se já é data URL, usar direto.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Adicionar 3 interfaces de input + 3 funções públicas em src/lib/resend.ts</name>
  <files>src/lib/resend.ts</files>
  <read_first>
    - src/lib/resend.ts (estado atual — copiar pattern getResend, try/catch, void return, idempotencyKey)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-09 spec exato dos 3 templates: subjects, idempotencyKeys, conteúdo)
    - src/components/checkout/checkout-client.tsx (pattern QR Code embed — confirmar formato qrCodeBase64)
  </read_first>
  <action>
Anexar (NÃO substituir o que existe) ao final de `src/lib/resend.ts` o seguinte código:

```typescript
// =========================================
// Phase 4 — Subscription Mensal PIX Manual
// 3 builders email reativos: charge_created (com QR), charge_paid, overdue.
// Cada um com idempotencyKey distinto pra Resend SDK v6 deduplicar retries.
// =========================================

interface SendSubscriptionChargeCreatedInput {
  chargeId: string;          // subscription_charges.id — usado como idempotencyKey
  customerEmail: string;
  customerName?: string;
  qrCodeBase64: string;      // PNG inline data URL OU cru (verificar prefixo)
  brCode: string;            // texto copiar-e-colar
  dueDate: string;           // ISO string — formatar PT-BR via Intl
  amountBrl: number;         // centavos OU reais — handler decide; aqui assume reais (47)
}

/**
 * Envia email "Mensalidade FormulaDota — pagamento PIX gerado" com QR Code embed.
 *
 * Disparado quando:
 *  - createInitialSubscription Server Action cria primeiro PIX (Plan 04-06)
 *  - reactivateSubscription Server Action cria novo PIX (Plan 04-06)
 *  - Cron charge-due cria PIX de renovação (Plan 04-04)
 *
 * Retorna void — falha email NÃO propaga (fire-and-forget).
 * idempotencyKey: subscription-charge-created-{chargeId}
 */
export async function sendSubscriptionChargeCreatedEmail(
  input: SendSubscriptionChargeCreatedInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Mensalidade FormulaDota — pagamento PIX gerado",
        html: buildChargeCreatedHtml(input),
      },
      { idempotencyKey: `subscription-charge-created-${input.chargeId}` }
    );
    if (error) {
      console.error("[resend] charge_created retornou erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] charge_created jogou exceção:", err);
  }
}

interface SendSubscriptionChargePaidInput {
  chargeId: string;          // subscription_charges.id — idempotencyKey
  customerEmail: string;
  customerName?: string;
  nextDueDate: string;       // ISO — quando próxima renovação acontece
  amountBrl: number;         // reais
}

/**
 * Envia email "Mensalidade renovada — acesso ativo" após webhook transparent.completed
 * em charge ligada a subscription (Plan 04-05).
 *
 * idempotencyKey: subscription-charge-paid-{chargeId}
 */
export async function sendSubscriptionChargePaidEmail(
  input: SendSubscriptionChargePaidInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Mensalidade renovada — acesso ativo",
        html: buildChargePaidHtml(input),
      },
      { idempotencyKey: `subscription-charge-paid-${input.chargeId}` }
    );
    if (error) {
      console.error("[resend] charge_paid retornou erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] charge_paid jogou exceção:", err);
  }
}

interface SendSubscriptionOverdueInput {
  subscriptionId: string;    // subscriptions.id
  customerEmail: string;
  customerName?: string;
  periodStart: string;       // ISO — usado em idempotencyKey pra deduplicar mesmo período
}

/**
 * Envia email "Mensalidade FormulaDota — pagamento em atraso" após cron sweep_overdue
 * marcar subscription.status='overdue' (Plan 04-04).
 *
 * idempotencyKey: subscription-overdue-{subscriptionId}-{periodStart_iso}
 */
export async function sendSubscriptionOverdueEmail(
  input: SendSubscriptionOverdueInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Mensalidade FormulaDota — pagamento em atraso",
        html: buildOverdueHtml(input),
      },
      {
        idempotencyKey: `subscription-overdue-${input.subscriptionId}-${input.periodStart}`,
      }
    );
    if (error) {
      console.error("[resend] overdue retornou erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] overdue jogou exceção:", err);
  }
}
```

Confirmar:
- 3 funções `export async function ... : Promise<void>` (return void per pattern Phase 2).
- 3 idempotencyKeys distintos seguindo D-09 EXATO.
- `getResend()` lazy init reusado (não recria).
- try/catch interno + console.error (per pattern existente).
- NÃO modificar `sendPurchaseConfirmationEmail` ou `buildConfirmationHtml` existente.
- Manter `from = process.env.EMAIL_FROM ?? "onboarding@resend.dev"` (pattern existente — Resend domain `formuladota.com` ainda não verificado per STATE.md linha 96).
  </action>
  <verify>
    <automated>grep -q "export async function sendSubscriptionChargeCreatedEmail" src/lib/resend.ts && grep -q "export async function sendSubscriptionChargePaidEmail" src/lib/resend.ts && grep -q "export async function sendSubscriptionOverdueEmail" src/lib/resend.ts && grep -q "subscription-charge-created-" src/lib/resend.ts && grep -q "subscription-charge-paid-" src/lib/resend.ts && grep -q "subscription-overdue-" src/lib/resend.ts</automated>
  </verify>
  <acceptance_criteria>
    - "src/lib/resend.ts contains 'export async function sendSubscriptionChargeCreatedEmail'"
    - "src/lib/resend.ts contains 'export async function sendSubscriptionChargePaidEmail'"
    - "src/lib/resend.ts contains 'export async function sendSubscriptionOverdueEmail'"
    - "src/lib/resend.ts contains 'subscription-charge-created-${input.chargeId}' (idempotencyKey)"
    - "src/lib/resend.ts contains 'subscription-charge-paid-${input.chargeId}'"
    - "src/lib/resend.ts contains 'subscription-overdue-${input.subscriptionId}-${input.periodStart}'"
    - "src/lib/resend.ts still contains 'export async function sendPurchaseConfirmationEmail' (Phase 2 untouched)"
    - "Each new function has 'try {' and 'catch (err)' blocks"
    - "Each new function returns 'Promise<void>'"
  </acceptance_criteria>
  <done>
    3 builders email exportados + 3 interfaces de input. Pattern Phase 2 fielmente replicado. Plan 04-04, 04-05, 04-06 conseguem importar e chamar.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Adicionar 3 helpers privados de HTML build (cyberpunk theme C7)</name>
  <files>src/lib/resend.ts</files>
  <read_first>
    - src/lib/resend.ts pós-Task 1 (verificar funções públicas chamando builders)
    - src/lib/resend.ts função buildConfirmationHtml linhas 67-95 (pattern HTML cyberpunk inline)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-09 conteúdo de cada email)
    - CLAUDE.md linhas 53-62 (theme tokens cyan #00F0FF, purple #A855F7, dark #050505, card bg #0A0A1A, font Space Grotesk)
  </read_first>
  <action>
Anexar ao final de `src/lib/resend.ts` (após as 3 funções públicas) os 3 helpers privados:

```typescript
// =========================================
// HTML builders — replicam pattern buildConfirmationHtml com theme cyberpunk
// =========================================

function buildChargeCreatedHtml(input: SendSubscriptionChargeCreatedInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const dueDateBR = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })
    .format(new Date(input.dueDate));
  const amountBR = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(input.amountBrl);

  // qrCodeBase64 da AbacatePay vem em formato data URL OU cru — Phase 2 checkout
  // mostra que vem como "data:image/png;base64,..." pronto. Defensivo: se não tem prefixo, prepend.
  const qrSrc = input.qrCodeBase64.startsWith("data:")
    ? input.qrCodeBase64
    : `data:image/png;base64,${input.qrCodeBase64}`;

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      <h1 style="color:#00F0FF;font-size:28px;margin:0 0 16px 0;letter-spacing:-0.02em">Pagamento PIX gerado</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Sua mensalidade FormulaDota de <strong style="color:#00F0FF">${amountBR}</strong> foi gerada. Pague até <strong>${dueDateBR}</strong> pra manter o acesso ativo ao HUB.
      </p>
      <div style="background:#0A0A1A;border:1px solid #27272a;padding:16px;border-radius:6px;text-align:center;margin:0 0 16px 0">
        <img src="${qrSrc}" alt="QR Code PIX" style="max-width:240px;width:100%;height:auto;display:block;margin:0 auto" />
      </div>
      <p style="font-size:14px;line-height:1.5;color:#a1a1aa;margin:0 0 8px 0">Ou copie o código PIX:</p>
      <code style="display:block;background:#0A0A1A;border:1px solid #A855F7;border-radius:6px;padding:12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#A855F7;word-break:break-all;margin:0 0 24px 0">${input.brCode}</code>
      <p style="color:#71717a;font-size:12px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FormulaDota — HUB Dota 2. Dúvidas? Responde esse email.
      </p>
    </div>
  `;
}

function buildChargePaidHtml(input: SendSubscriptionChargePaidInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const nextDateBR = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })
    .format(new Date(input.nextDueDate));
  const amountBR = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(input.amountBrl);

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      <h1 style="color:#00F0FF;font-size:28px;margin:0 0 16px 0;letter-spacing:-0.02em">Mensalidade renovada</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Recebemos seu pagamento de <strong style="color:#00F0FF">${amountBR}</strong>. Acesso ao HUB FormulaDota está ativo.
      </p>
      <div style="background:#0A0A1A;border:1px solid #27272a;padding:16px 24px;border-radius:6px;margin:0 0 24px 0">
        <p style="font-size:14px;line-height:1.5;margin:0;color:#a1a1aa">Próxima cobrança:</p>
        <p style="font-size:18px;line-height:1.5;margin:8px 0 0 0;color:#00F0FF;font-weight:600">${nextDateBR}</p>
      </div>
      <p style="color:#71717a;font-size:12px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FormulaDota — HUB Dota 2.
      </p>
    </div>
  `;
}

function buildOverdueHtml(input: SendSubscriptionOverdueInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      <h1 style="color:#A855F7;font-size:28px;margin:0 0 16px 0;letter-spacing:-0.02em">Pagamento em atraso</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Não recebemos seu pagamento PIX dentro do prazo. Seu acesso ao HUB FormulaDota foi suspenso.
      </p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Pra reativar, entre em <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/assinatura" style="color:#00F0FF;text-decoration:underline">/assinatura</a> e gere um novo PIX.
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FormulaDota — HUB Dota 2.
      </p>
    </div>
  `;
}
```

Confirmar:
- 3 helpers privados (sem `export`).
- `Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })` para datas (decisão Claude's Discretion CONTEXT.md).
- `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` para valores.
- Theme cyberpunk completo (cyan #00F0FF cabeçalhos, purple #A855F7 accents, dark #050505 bg, card #0A0A1A).
- QR Code defensivo: aceita data URL OR raw base64 (prepend conditional).
- Overdue email usa cor `#A855F7` (purple) no h1 ao invés de cyan — sinaliza warning visualmente per cyberpunk warning convention.
- Validar `pnpm typecheck` passa.
  </action>
  <verify>
    <automated>grep -q "function buildChargeCreatedHtml" src/lib/resend.ts && grep -q "function buildChargePaidHtml" src/lib/resend.ts && grep -q "function buildOverdueHtml" src/lib/resend.ts && grep -q "Intl.DateTimeFormat(\"pt-BR\"" src/lib/resend.ts && grep -q "Intl.NumberFormat(\"pt-BR\"" src/lib/resend.ts && grep -q "#00F0FF" src/lib/resend.ts && grep -q "#A855F7" src/lib/resend.ts && grep -q "#050505" src/lib/resend.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - "src/lib/resend.ts contains 'function buildChargeCreatedHtml' (private — no export)"
    - "src/lib/resend.ts contains 'function buildChargePaidHtml'"
    - "src/lib/resend.ts contains 'function buildOverdueHtml'"
    - "src/lib/resend.ts contains 'Intl.DateTimeFormat(\"pt-BR\", { dateStyle: \"long\" })'"
    - "src/lib/resend.ts contains 'Intl.NumberFormat(\"pt-BR\", { style: \"currency\", currency: \"BRL\" })'"
    - "src/lib/resend.ts contains color tokens '#00F0FF', '#A855F7', '#050505', '#0A0A1A'"
    - "src/lib/resend.ts contains 'data:image/png;base64' (QR embed pattern)"
    - "src/lib/resend.ts contains 'NEXT_PUBLIC_SITE_URL' (overdue email link to /assinatura)"
    - "src/lib/resend.ts file size < 300 lines (per C2)"
    - "pnpm typecheck exits 0"
    - "pnpm lint exits 0"
  </acceptance_criteria>
  <done>
    3 helpers HTML criados com theme cyberpunk completo. Datas e valores em PT-BR. QR Code defensivo handle. Sem regressão Phase 2.
  </done>
</task>

</tasks>

<verification>
1. `pnpm typecheck` passa após edits.
2. `pnpm lint` passa.
3. `src/lib/resend.ts` total < 300 linhas (per C2 — pattern Phase 2 era 95 linhas; +3 funções pubs +3 helpers HTML deve totalizar ~280-290 linhas — manter sob limite).
4. Sem regressão em `sendPurchaseConfirmationEmail` (Phase 2):
   - `grep "export async function sendPurchaseConfirmationEmail" src/lib/resend.ts` retorna 1 match.
   - `grep "buildConfirmationHtml" src/lib/resend.ts` retorna 2 matches (chamado em send + def).
5. Pedro pode optar por rodar smoke test manual:
   ```typescript
   // Em runtime test:
   await sendSubscriptionChargeCreatedEmail({
     chargeId: "test-uuid",
     customerEmail: "pedroecarolshopcreator@gmail.com",
     qrCodeBase64: "<base64 valido>",
     brCode: "0002012...",
     dueDate: "2026-06-01T12:00:00Z",
     amountBrl: 47,
   });
   // Inspecionar email recebido visualmente.
   ```
</verification>

<success_criteria>
- [x] 3 funções públicas exportadas (sendSubscriptionChargeCreatedEmail, sendSubscriptionChargePaidEmail, sendSubscriptionOverdueEmail)
- [x] 3 helpers HTML privados (buildChargeCreatedHtml, buildChargePaidHtml, buildOverdueHtml)
- [x] Idempotency keys distintos per D-09
- [x] Theme cyberpunk C7 (cyan/purple/dark)
- [x] PT-BR formatting (Intl.DateTimeFormat + Intl.NumberFormat)
- [x] sendPurchaseConfirmationEmail Phase 2 intacto
- [x] pnpm typecheck + lint exit 0
- [x] File size < 300 lines (per C2)
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-03-SUMMARY.md` documentando:
- Pattern QR Code defensivo (data URL prefix conditional)
- Decisão cor warning purple #A855F7 no overdue (vs cyan completed/created)
- Tamanho final do arquivo resend.ts (deve ficar em ~280 linhas)
</output>
