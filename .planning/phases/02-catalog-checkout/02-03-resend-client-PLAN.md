---
phase: 02-catalog-checkout
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/resend.ts
  - package.json
  - pnpm-lock.yaml
autonomous: true
requirements: [F3.5, C1, C3]
user_setup:
  - service: resend
    why: "Email transacional de confirmação de pagamento (F3.5)"
    env_vars:
      - name: RESEND_API_KEY
        source: "Resend dashboard → API Keys (já configurado per STATE.md)"
      - name: EMAIL_FROM
        source: "onboarding@resend.dev (default — domínio formuladota.com não verificado ainda)"
must_haves:
  truths:
    - "Função sendPurchaseConfirmationEmail envia email via Resend SDK v6"
    - "Email tem idempotencyKey baseada em purchase.id (previne envios duplicados se webhook rodar 2x)"
    - "Falha de email NÃO faz throw — apenas console.error (email é side-effect não-crítico do webhook)"
    - "Dependência resend@^6.x adicionada ao package.json"
    - "pnpm typecheck e pnpm lint passam (zero any, async/await)"
  artifacts:
    - path: "src/lib/resend.ts"
      provides: "Helper sendPurchaseConfirmationEmail + template HTML inline cyberpunk"
      exports: ["sendPurchaseConfirmationEmail"]
      min_lines: 50
    - path: "package.json"
      provides: "Dep resend ^6.x"
      contains: "\"resend\""
  key_links:
    - from: "src/lib/resend.ts"
      to: "src/lib/env.ts"
      via: "requireServerEnv('RESEND_API_KEY')"
      pattern: "RESEND_API_KEY"
    - from: "src/lib/resend.ts"
      to: "resend SDK"
      via: "import { Resend } from 'resend'"
      pattern: "from \"resend\""
---

<objective>
Criar a camada de email transacional via Resend (per F3.5 e D-Email locked decision). Função `sendPurchaseConfirmationEmail` será chamada pelo webhook handler (Plan 02-07) APÓS confirmação `transparent.completed`. Usa `idempotencyKey` baseada em purchase.id para garantir que webhook duplicado não envie email duplo. Template HTML inline minimalista, alinhado ao tema cyberpunk (cyan #00F0FF + dark #050505), em PT-BR.

Purpose: Phase 2 entrega F3.5 (email confirmação após pagamento). O webhook handler precisa de um helper isolado que NÃO derruba a transação principal se o Resend falhar (email = side-effect não-crítico). Sem este módulo, F3.5 não pode ser implementado.

Output: 1 arquivo lib (`src/lib/resend.ts`) + dep `resend@^6.x` instalada.
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
@src/lib/env.ts

<interfaces>
<!-- Padrão existente em src/lib/env.ts -->
```typescript
export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string;
// Keys disponíveis: RESEND_API_KEY, EMAIL_FROM
```

<!-- Resend SDK v6 (per RESEARCH.md "Resend — Email de Confirmação") -->
```typescript
import { Resend } from "resend";
const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: "onboarding@resend.dev",
  to: ["user@example.com"],
  subject: "Subject",
  html: "<div>...</div>",
  idempotencyKey: "unique-string", // previne envios duplicados
});
// Resend NUNCA throws — sempre retorna { data, error }
```

<!-- Cores cyberpunk pra template (de globals.css @theme) -->
- Background: #050505
- Foreground: #f4f4f5
- Card: #0a0a1a
- Cyan primary: #00F0FF
- Muted text: #71717a
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Instalar dep resend@^6 via pnpm add</name>
  <files>package.json, pnpm-lock.yaml</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/package.json (ver deps existentes)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Standard Stack" — versão 6.12.2 verificada)
  </read_first>
  <action>
Executar no diretório raiz `C:/Users/ADM/projects/formuladota-v2`:

```bash
pnpm add resend
pnpm typecheck
```

Resultado esperado:
- `package.json` ganha `"resend": "^6.x.x"` em `dependencies`
- `pnpm-lock.yaml` atualizado
- `pnpm typecheck` permanece verde (Resend já vem com seus types)

Se houver conflito com peer dep, ajustar com `pnpm install --no-strict-peer-dependencies` (apenas se necessário). Não usar `--force`.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "\"resend\"" package.json && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` dependencies contains `"resend"` with version `^6` or higher
    - `pnpm-lock.yaml` updated (modified after install)
    - `pnpm typecheck` exits 0
    - No security warnings about deprecated packages
  </acceptance_criteria>
  <done>Dep resend instalada e typecheck verde.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/lib/resend.ts com sendPurchaseConfirmationEmail</name>
  <files>src/lib/resend.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/lib/env.ts (pattern requireServerEnv + EMAIL_FROM optional)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Resend — Email de Confirmação", linhas ~628-682, com código completo do template e helper)
    - C:/Users/ADM/projects/formuladota-v2/src/styles/globals.css (cores cyberpunk pra template HTML)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/doctrine.ts (pattern de constantes + comentários PT-BR)
  </read_first>
  <action>
Criar `src/lib/resend.ts` baseado literalmente no Pattern do RESEARCH.md (linhas ~628-682). Conteúdo exato:

```typescript
// Cliente Resend para email transacional.
// Usado pelo webhook handler /api/webhooks/abacatepay APÓS transparent.completed.
//
// IMPORTANTE: email é side-effect NÃO-CRÍTICO do webhook. Falha de envio
// NÃO deve derrubar o webhook (que já liberou saldo). Usar try/catch isolado
// no caller, ou .catch() inline.

import { Resend } from "resend";
import { requireServerEnv } from "@/lib/env";

let _resend: Resend | null = null;

// Lazy init — evita validar RESEND_API_KEY no build (só no primeiro envio)
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  }
  return _resend;
}

interface SendPurchaseConfirmationInput {
  purchaseId: string;       // usado como idempotencyKey
  customerEmail: string;    // user.email do Supabase profiles
  customerName?: string;    // opcional; fallback "Olá!"
  packageName: string;      // ex: "Avulsa", "Pacote 5", "Mentoria mensal"
  partidasCompradas: number;
  sessoesCompradas: number;
}

/**
 * Envia email de confirmação de pagamento.
 *
 * Retorna `void` — falhas são logadas via console.error mas NÃO propagam.
 * Use idempotencyKey baseada em purchaseId para evitar envios duplicados
 * caso o webhook handler rode duas vezes.
 */
export async function sendPurchaseConfirmationEmail(
  input: SendPurchaseConfirmationInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send({
      from,
      to: [input.customerEmail],
      subject: `Pagamento confirmado — ${input.packageName}`,
      html: buildConfirmationHtml(input),
      // Previne envios duplicados se webhook rodar 2x
      // (ver Pitfall 5 no RESEARCH.md)
      idempotencyKey: `purchase-confirmed-${input.purchaseId}`,
    });

    if (error) {
      console.error("[resend] envio retornou erro:", error.message);
      return;
    }
  } catch (err) {
    // Defensivo — Resend SDK não deveria throw, mas isolar é melhor
    console.error("[resend] envio jogou exceção:", err);
  }
}

function buildConfirmationHtml(input: SendPurchaseConfirmationInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const partidasLine = input.partidasCompradas > 0
    ? `<li><strong>${input.partidasCompradas}</strong> partida(s) com Pedro</li>`
    : "";
  const sessoesLine = input.sessoesCompradas > 0
    ? `<li><strong>${input.sessoesCompradas}</strong> sessão(ões) teórica(s)</li>`
    : "";

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      <h1 style="color:#00F0FF;font-size:28px;margin:0 0 16px 0;letter-spacing:-0.02em">Pagamento Confirmado</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Recebemos seu pagamento de <strong style="color:#00F0FF">${input.packageName}</strong>. Seu saldo foi liberado:
      </p>
      <ul style="background:#0a0a1a;border:1px solid #27272a;padding:16px 24px;border-radius:6px;list-style:none;margin:0 0 24px 0">
        ${partidasLine}
        ${sessoesLine}
      </ul>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Quando o agendamento estiver disponível, você poderá reservar seus horários direto no site.
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FormulaDota — Mentoria Dota 2 com Pedro Paulo (Immortal/Top 0.5%)
      </p>
    </div>
  `;
}
```

Confirmar:
- Zero `any` (per C1)
- Funções < 50 linhas cada (sendPurchaseConfirmationEmail tem ~25, buildConfirmationHtml tem ~30 — ok)
- Arquivo total < 300 linhas (vai ter ~85)
- async/await (não `.then()` chains)
- pnpm typecheck e pnpm lint passam

NÃO instalar `react-email` ou outras libs — template HTML inline string é suficiente per CONTEXT.md "Email com template HTML rico (usar React Email lib) — fica como minor improvement futuro" deferred.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/lib/resend.ts && grep -q "export async function sendPurchaseConfirmationEmail" src/lib/resend.ts && grep -q "idempotencyKey" src/lib/resend.ts && grep -q "from \"resend\"" src/lib/resend.ts && grep -q "RESEND_API_KEY" src/lib/resend.ts && grep -q "#00F0FF" src/lib/resend.ts && ! grep -q ": any" src/lib/resend.ts && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/resend.ts` exists
    - File contains exact string `export async function sendPurchaseConfirmationEmail`
    - File contains exact string `idempotencyKey:` (idempotência via Resend)
    - File contains string `purchase-confirmed-` (prefix do idempotencyKey baseado em purchase.id)
    - File imports from `"resend"` (the SDK, not custom implementation)
    - File uses `requireServerEnv("RESEND_API_KEY")` (centralized env access per project pattern)
    - File contains color `#00F0FF` (cyan cyberpunk per C7)
    - File contains color `#050505` (dark cyberpunk per C7)
    - File does NOT contain `: any` (zero any per C1)
    - File does NOT contain `.then(` (async/await only per CLAUDE.md)
    - File does NOT contain `process.env.RESEND_API_KEY` direto (deve usar `requireServerEnv`)
    - File line count < 300 (per CLAUDE.md)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Helper sendPurchaseConfirmationEmail funcional, idempotente, com template cyberpunk PT-BR. Pronto pro webhook handler em Plan 02-07 importar.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exits 0
- `pnpm lint` exits 0
- `src/lib/resend.ts` existe e exporta `sendPurchaseConfirmationEmail`
- `package.json` tem `resend` em dependencies
- Zero `any`, sem `.then()` chains, sem `process.env` direto
</verification>

<success_criteria>
- F3.5 (email confirmação) tem helper pronto pra ser invocado pelo webhook handler
- Idempotência via Resend `idempotencyKey` evita envios duplicados em retentativas de webhook
- Template HTML alinhado ao tema cyberpunk (cyan + dark) em PT-BR
- Falha de Resend não derruba webhook (try/catch interno + .catch isolado pelo caller)
</success_criteria>

<output>
Após completar as 2 tasks, criar `.planning/phases/02-catalog-checkout/02-03-resend-client-SUMMARY.md` com:
- Versão do `resend` instalada
- Estratégia de idempotência (key format)
- Notas sobre tratamento de falha (não-throw)
- Template HTML construído (preview/snapshot do markup)
</output>
