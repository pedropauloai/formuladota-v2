---
phase: 02-catalog-checkout
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/abacatepay.ts
  - src/types/abacatepay.ts
  - src/lib/supabase/service.ts
autonomous: true
requirements: [F3.3, F3.4, C1, C3, C8]
must_haves:
  truths:
    - "Função createTransparentPix gera PIX inline via POST /v2/transparents/create"
    - "Função verifyAbacatepayWebhookSignature valida HMAC-SHA256 base64 com timingSafeEqual"
    - "Cliente Supabase service-role disponível via createServiceClient (NÃO exportado para Client Components)"
    - "Schemas Zod validam payloads de webhook transparent.completed/disputed/refunded"
    - "Zero `any` no código, pnpm typecheck verde"
  artifacts:
    - path: "src/types/abacatepay.ts"
      provides: "Schemas Zod + tipos para AbacatePay V2 (request/response/webhook payloads)"
      exports: ["webhookPayloadSchema", "transparentPixResponseSchema", "AbacatepayWebhookEvent"]
      min_lines: 50
    - path: "src/lib/abacatepay.ts"
      provides: "Cliente HTTP AbacatePay V2 + verificação HMAC"
      exports: ["createTransparentPix", "verifyAbacatepayWebhookSignature"]
      min_lines: 60
    - path: "src/lib/supabase/service.ts"
      provides: "Cliente Supabase com SUPABASE_SERVICE_ROLE_KEY (bypass RLS — uso EXCLUSIVO em webhooks)"
      exports: ["createServiceClient"]
      min_lines: 15
  key_links:
    - from: "src/lib/abacatepay.ts"
      to: "src/lib/env.ts"
      via: "requireServerEnv('ABACATEPAY_API_KEY')"
      pattern: "requireServerEnv"
    - from: "src/lib/abacatepay.ts"
      to: "node:crypto"
      via: "createHmac + timingSafeEqual"
      pattern: "timingSafeEqual"
    - from: "src/lib/supabase/service.ts"
      to: "src/lib/env.ts"
      via: "requireServerEnv('SUPABASE_SERVICE_ROLE_KEY')"
      pattern: "SUPABASE_SERVICE_ROLE_KEY"
---

<objective>
Criar a camada de integração com AbacatePay V2 Transparent PIX (per D-Pagamento), incluindo schemas Zod tipados para validar payloads de webhook (per C3, F3.4) e o cliente Supabase service-role usado pelo webhook handler para bypassar RLS (per D-RLS+webhook). Esta plan NÃO toca em UI — é puro lib/types.

Purpose: webhook handler (Plan 02-07) e Server Action createCheckout (Plan 02-05) dependem do `createTransparentPix` e do `verifyAbacatepayWebhookSignature`. O `createServiceClient` é usado pelo webhook para fazer UPDATE em purchases sem cookies de sessão de usuário. Sem esses módulos, Wave 2 não pode prosseguir.

Output: 3 arquivos lib/types fortemente tipados, com Zod validando inputs/outputs externos e zero `any`.
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
@src/lib/supabase/server.ts
@src/types/database.ts

<interfaces>
<!-- Padrão existente em src/lib/env.ts -->
```typescript
export const publicEnv: { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string; NEXT_PUBLIC_SITE_URL: string };
export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string;
// Keys disponíveis: SUPABASE_SERVICE_ROLE_KEY, ABACATEPAY_API_KEY, ABACATEPAY_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM
```

<!-- Padrão existente em src/lib/supabase/server.ts -->
```typescript
// Para Server Components / Server Actions com cookies de sessão
export async function createClient(): Promise<SupabaseClient<Database>>;
```

<!-- Database types já gerados em src/types/database.ts -->
```typescript
export type Database = { public: { Tables: { ... purchases: { Row, Insert, Update }, ... }}};
```

<!-- Schema purchases (do migration 001) — campos relevantes -->
```sql
purchases (
  id uuid pk,
  user_id uuid,
  package_id uuid,
  status text check in ('pendente','pago','expirado','cancelado'),
  external_payment_id text,  -- ID retornado pela AbacatePay (idempotência)
  preco_pago numeric(10,2),
  partidas_compradas integer,
  ...
)
```

<!-- AbacatePay V2 Transparent PIX endpoint (per RESEARCH.md) -->
- POST https://api.abacatepay.com/v2/transparents/create
- Authorization: Bearer {ABACATEPAY_API_KEY}
- Request body:
  ```json
  {
    "method": "PIX",
    "data": {
      "amount": 1000,
      "description": "FormulaDota — Avulsa",
      "expiresIn": 3600,
      "metadata": { "externalId": "purchase-uuid" }
    }
  }
  ```
- Response (success):
  ```json
  {
    "success": true,
    "data": {
      "id": "pix_char_abc123",
      "amount": 1000,
      "status": "PENDING",
      "brCode": "00020160014BR.GOV.BCB.PIX...",
      "brCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
      "expiresAt": "2026-04-30T20:00:00.000Z"
    }
  }
  ```

<!-- Webhook events V2 (per RESEARCH.md) -->
- `transparent.completed` (libera saldo)
- `transparent.disputed` (registrar — não muda status)
- `transparent.refunded` (status=cancelado)

<!-- HMAC config (per RESEARCH.md) -->
- Header: `X-Webhook-Signature`
- Algoritmo: HMAC-SHA256 base64
- Secret: `ABACATEPAY_WEBHOOK_SECRET`
- Validação: `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar src/types/abacatepay.ts com schemas Zod</name>
  <files>src/types/abacatepay.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "AbacatePay V2 — Referência Completa", subseção "Eventos Webhook Corretos")
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (conferir tipos purchases)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/doctrine.ts (referência de pattern de constantes tipadas)
  </read_first>
  <action>
Criar `src/types/abacatepay.ts` exportando schemas Zod e tipos derivados via `z.infer<>`. Conteúdo exato:

```typescript
// AbacatePay V2 Transparent PIX — schemas Zod e tipos.
// Fonte canônica: https://docs.abacatepay.com/pages/transparents/create.md
// Webhook events: https://docs.abacatepay.com/pages/webhooks/events/transparent.md

import { z } from "zod";

// ====== REQUEST: criar PIX ======

export const createTransparentPixInputSchema = z.object({
  amount: z.number().int().positive(), // centavos
  description: z.string().min(1).max(200),
  externalId: z.string().uuid(), // nosso purchase.id
  expiresIn: z.number().int().positive().optional(), // segundos, default 3600
});
export type CreateTransparentPixInput = z.infer<typeof createTransparentPixInputSchema>;

// ====== RESPONSE: criar PIX ======

export const transparentPixDataSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.string(),
  brCode: z.string(),         // texto copiar-e-colar
  brCodeBase64: z.string(),   // PNG inline (data:image/png;base64,...)
  expiresAt: z.string(),
});
export type TransparentPixData = z.infer<typeof transparentPixDataSchema>;

export const transparentPixResponseSchema = z.object({
  success: z.boolean(),
  data: transparentPixDataSchema.optional(),
  error: z.string().optional(),
});
export type TransparentPixResponse = z.infer<typeof transparentPixResponseSchema>;

// ====== WEBHOOK: payload events transparent.* ======

export const ABACATEPAY_WEBHOOK_EVENTS = [
  "transparent.completed",
  "transparent.disputed",
  "transparent.refunded",
] as const;
export type AbacatepayWebhookEvent = (typeof ABACATEPAY_WEBHOOK_EVENTS)[number];

export const webhookCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const webhookTransparentSchema = z.object({
  id: z.string(),                       // external_payment_id no nosso DB
  externalId: z.string().optional(),    // purchase.id que passamos como metadata
  amount: z.number(),
  status: z.string(),
});

export const webhookPayloadSchema = z.object({
  event: z.enum(ABACATEPAY_WEBHOOK_EVENTS),
  apiVersion: z.number().optional(),
  devMode: z.boolean().optional(),
  data: z.object({
    transparent: webhookTransparentSchema,
    customer: webhookCustomerSchema.optional(),
  }),
});
export type AbacatepayWebhookPayload = z.infer<typeof webhookPayloadSchema>;
```

Confirmar typecheck.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/types/abacatepay.ts && grep -q "export const webhookPayloadSchema" src/types/abacatepay.ts && grep -q "export const transparentPixResponseSchema" src/types/abacatepay.ts && grep -q "transparent.completed" src/types/abacatepay.ts && grep -q "transparent.disputed" src/types/abacatepay.ts && grep -q "transparent.refunded" src/types/abacatepay.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - File `src/types/abacatepay.ts` exists
    - File contains `export const webhookPayloadSchema = z.object`
    - File contains `export const transparentPixResponseSchema`
    - File contains the three events as exact strings: `"transparent.completed"`, `"transparent.disputed"`, `"transparent.refunded"`
    - File contains `export type AbacatepayWebhookPayload = z.infer<typeof webhookPayloadSchema>`
    - File contains `export const createTransparentPixInputSchema`
    - File does NOT contain string `"checkout.completed"` (produto errado — só Transparent)
    - File does NOT contain `: any` (zero `any` per C1)
    - `pnpm typecheck` exits 0
  </acceptance_criteria>
  <done>Schemas Zod tipados, eventos enum corretos (transparent.*), zero any.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/lib/abacatepay.ts (cliente HTTP + HMAC verify)</name>
  <files>src/lib/abacatepay.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/types/abacatepay.ts (criado em Task 1)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/env.ts (requireServerEnv pattern)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "HMAC Signature" e "Pattern 3: AbacatePay Client")
  </read_first>
  <action>
Criar `src/lib/abacatepay.ts` com duas funções públicas:

1. `createTransparentPix(input)` — chama `POST https://api.abacatepay.com/v2/transparents/create`
2. `verifyAbacatepayWebhookSignature(rawBody, signatureHeader)` — valida HMAC SHA-256 base64 com `timingSafeEqual`

Conteúdo exato:

```typescript
// Cliente AbacatePay V2 — Transparent PIX (QR Code inline).
// Não usar produto Checkout (página hospedada); só Transparent.
// Docs: https://docs.abacatepay.com/pages/transparents/create.md

import crypto from "node:crypto";
import { requireServerEnv } from "@/lib/env";
import {
  createTransparentPixInputSchema,
  transparentPixResponseSchema,
  type CreateTransparentPixInput,
  type TransparentPixData,
} from "@/types/abacatepay";

const BASE_URL = "https://api.abacatepay.com/v2";

// Resultado discriminated union — força caller a checar .success
export type CreateTransparentPixResult =
  | { success: true; data: TransparentPixData }
  | { success: false; error: string };

/**
 * Cria um PIX transparente (QR Code inline) na AbacatePay V2.
 * Retorna `brCode` (texto copiar-e-colar) e `brCodeBase64` (PNG data URL).
 *
 * O `externalId` deve ser o `purchase.id` do nosso DB — usado como metadata
 * para correlacionar o webhook de volta.
 */
export async function createTransparentPix(
  input: CreateTransparentPixInput
): Promise<CreateTransparentPixResult> {
  const parsed = createTransparentPixInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Input inválido para criar PIX." };
  }

  const apiKey = requireServerEnv("ABACATEPAY_API_KEY");
  const body = {
    method: "PIX" as const,
    data: {
      amount: parsed.data.amount,
      description: parsed.data.description,
      expiresIn: parsed.data.expiresIn ?? 3600,
      metadata: { externalId: parsed.data.externalId },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/transparents/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[abacatepay] fetch falhou:", err);
    return { success: false, error: "Falha de rede ao contatar AbacatePay." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    console.error("[abacatepay] resposta JSON inválida");
    return { success: false, error: "Resposta inválida do AbacatePay." };
  }

  const validated = transparentPixResponseSchema.safeParse(json);

  if (!validated.success) {
    console.error("[abacatepay] resposta inesperada:", json);
    return { success: false, error: "Resposta inesperada da AbacatePay." };
  }

  if (!validated.data.success || !validated.data.data) {
    return {
      success: false,
      error: validated.data.error ?? "AbacatePay retornou erro.",
    };
  }

  return { success: true, data: validated.data.data };
}

/**
 * Verifica HMAC-SHA256 (base64) do webhook AbacatePay.
 *
 * IMPORTANTE: passar o `rawBody` lido via `request.text()` ANTES de qualquer
 * `JSON.parse`. Parsear+stringificar muda whitespace e quebra a assinatura.
 *
 * Usa `timingSafeEqual` para mitigar timing attacks (per C8).
 */
export function verifyAbacatepayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const secret = requireServerEnv("ABACATEPAY_WEBHOOK_SECRET");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

Confirmar typecheck (zero `any`) e que arquivo tem < 300 linhas (vai ter ~80).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/lib/abacatepay.ts && grep -q "export async function createTransparentPix" src/lib/abacatepay.ts && grep -q "export function verifyAbacatepayWebhookSignature" src/lib/abacatepay.ts && grep -q "timingSafeEqual" src/lib/abacatepay.ts && grep -q "createHmac" src/lib/abacatepay.ts && grep -q "transparents/create" src/lib/abacatepay.ts && ! grep -q ": any" src/lib/abacatepay.ts && ! grep -qE "\.then\(" src/lib/abacatepay.ts && ! grep -qE "\.catch\(" src/lib/abacatepay.ts && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/abacatepay.ts` exists
    - File contains `export async function createTransparentPix`
    - File contains `export function verifyAbacatepayWebhookSignature`
    - File contains exact string `crypto.timingSafeEqual` (not just `===`)
    - File contains exact string `createHmac("sha256"` (or with single quotes)
    - File contains exact string `https://api.abacatepay.com/v2` (or `${BASE_URL}` with `/v2`)
    - File POSTs to path `/transparents/create` (NOT `/checkouts/create` — produto errado)
    - File does NOT contain `: any` (zero `any` per C1)
    - File does NOT contain `.then(` (async/await only per CLAUDE.md)
    - File does NOT contain `.catch(` (async/await only per CLAUDE.md — ZERO promise chaining; use try/catch blocks)
    - File line count < 300 (per CLAUDE.md max files limit)
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Cliente AbacatePay funcional com tipos seguros e HMAC timing-safe.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Criar src/lib/supabase/service.ts (service-role client)</name>
  <files>src/lib/supabase/service.ts</files>
  <read_first>
    - C:/Users/ADM/projects/formuladota-v2/src/lib/supabase/server.ts (pattern existente)
    - C:/Users/ADM/projects/formuladota-v2/src/lib/env.ts (requireServerEnv)
    - C:/Users/ADM/projects/formuladota-v2/src/types/database.ts (tipo Database)
    - C:/Users/ADM/projects/formuladota-v2/.planning/phases/02-catalog-checkout/02-RESEARCH.md (seção "Pattern 4: Service Role Client")
  </read_first>
  <action>
Criar `src/lib/supabase/service.ts`. **CRÍTICO**: este cliente usa `SUPABASE_SERVICE_ROLE_KEY` (bypass de RLS) e deve ser usado EXCLUSIVAMENTE em API Routes de webhook ou jobs sistêmicos. NÃO importar em Server Components/Actions de usuário (causaria escalação de privilégio).

Conteúdo exato:

```typescript
// Cliente Supabase com SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
//
// USAR APENAS em API Routes de webhook (/api/webhooks/*) ou jobs sistêmicos.
// NUNCA importar em Server Components, Server Actions de usuário, ou Client Components.
// Bypass de RLS é justo aqui porque webhooks são triggers sistêmicos sem cookie de sessão.
//
// Para mutations de usuário, usar createClient() de @/lib/supabase/server (cookie-based).

import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createServiceClient() {
  const serviceKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

Confirmar typecheck.
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/lib/supabase/service.ts && grep -q "export function createServiceClient" src/lib/supabase/service.ts && grep -q "SUPABASE_SERVICE_ROLE_KEY" src/lib/supabase/service.ts && grep -q "createClient<Database>" src/lib/supabase/service.ts && grep -q "autoRefreshToken: false" src/lib/supabase/service.ts && grep -q "persistSession: false" src/lib/supabase/service.ts && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/supabase/service.ts` exists
    - File contains `export function createServiceClient`
    - File contains exact string `SUPABASE_SERVICE_ROLE_KEY`
    - File contains exact string `createClient<Database>`
    - File contains `autoRefreshToken: false` and `persistSession: false`
    - File imports from `"@supabase/supabase-js"` (NOT `"@supabase/ssr"` — service-role usa client base)
    - File contains warning comment about bypass RLS / uso exclusivo em webhooks
    - `pnpm typecheck` exits 0
    - `pnpm lint` exits 0
  </acceptance_criteria>
  <done>Service-role client disponível para webhook handler em Plan 02-07.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exits 0
- `pnpm lint` exits 0
- `src/types/abacatepay.ts`, `src/lib/abacatepay.ts`, `src/lib/supabase/service.ts` existem
- Zero `any` em todos os arquivos novos
- Comentário de aviso em service.ts sobre uso exclusivo
</verification>

<success_criteria>
- AbacatePay client e webhook signature verifier prontos para uso pelo webhook handler
- Service-role client isolado, comentado, com export único
- Zod schemas cobrem requests, responses, e payloads de webhook
- Plans 02-05 (Server Action) e 02-07 (Webhook handler) podem importar tudo direto
</success_criteria>

<output>
Após completar as 3 tasks, criar `.planning/phases/02-catalog-checkout/02-02-abacatepay-client-SUMMARY.md` com:
- Endpoints AbacatePay usados
- Eventos webhook reconhecidos
- Notas sobre zero `any` e timingSafeEqual
- Aviso sobre uso exclusivo do service-role client
</output>
