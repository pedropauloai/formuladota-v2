---
phase: 02-catalog-checkout
plan: 02
status: complete
completed_at: 2026-05-01
commits:
  - 70c9812 feat(02-02): types AbacatePay V2 com schemas Zod (events transparent.*)
  - 28e6001 feat(02-02): cliente AbacatePay (createTransparentPix + verifyHmac timingSafeEqual)
  - a9fdffa feat(02-02): supabase service-role client (uso exclusivo em /api/webhooks)
key-files:
  created:
    - src/types/abacatepay.ts
    - src/lib/abacatepay.ts
    - src/lib/supabase/service.ts
---

# Plan 02-02: AbacatePay client + Service-role — SUMMARY

## What was built

Three lib/types modules são a fundação técnica da Wave 2:

1. **`src/types/abacatepay.ts`** (66 linhas) — Schemas Zod tipados pra todos os payloads AbacatePay V2 Transparent PIX. Inclui `createTransparentPixInputSchema` (request), `transparentPixResponseSchema` (response), `webhookPayloadSchema` (eventos `transparent.completed/disputed/refunded`). Tipos exportados via `z.infer<>` — zero `any`.

2. **`src/lib/abacatepay.ts`** (113 linhas) — Cliente HTTP isolado:
   - `createTransparentPix(input)` → `POST /v2/transparents/create` com Bearer auth, Zod validation no input + response, discriminated union result `{success: true, data} | {success: false, error}` (caller forçado a checar). Inclui `cache: "no-store"` e fallback para falha de rede.
   - `verifyAbacatepayWebhookSignature(rawBody, header)` → HMAC-SHA256 base64 com `crypto.timingSafeEqual` (proteção contra timing attacks per C8). Doc explicita necessidade de `request.text()` antes de qualquer parse (Pitfall 2 do RESEARCH).

3. **`src/lib/supabase/service.ts`** (25 linhas) — `createServiceClient()` usando `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS. **Comentário explícito de aviso** sobre uso exclusivo em `/api/webhooks/*` ou jobs sistêmicos. `autoRefreshToken: false` + `persistSession: false`.

## Decisions

- **Discriminated union em vez de throw**: `createTransparentPix` retorna `{success, ...}` em vez de lançar exceção. Plan 02-06 (Server Action) e Plan 02-07 (webhook) terão TypeScript-narrowing forçado para tratar erro.
- **Lazy parsing**: response.json() em try/catch isolado — se AbacatePay retornar HTML de erro 500, log explícito + erro amigável.
- **`cache: "no-store"`** no fetch — evita cache de Next.js em chamada server (POST não deveria cachear, mas explícito é melhor).
- **HMAC com `request.text()`**: documentado em comment block dentro de `verifyAbacatepayWebhookSignature` (caller — Plan 02-07 — DEVE seguir).

## Validation gates

- ✓ `pnpm typecheck` exit 0 (zero `any`)
- ✓ `pnpm lint` exit 0
- ✓ Zero `.then(` ou `.catch(` (per CLAUDE.md async/await sempre)
- ✓ Endpoint correto `/v2/transparents/create` (não `/v2/checkouts/create`)
- ✓ Eventos enum `transparent.{completed,disputed,refunded}` (não `checkout.*`)

## Requirements satisfied

- F3.3 (Integração AbacatePay V2 Transparent PIX) — partial (cliente; Plan 02-06 conecta UI; Plan 02-07 trata webhook)
- F3.4 (idempotência via UNIQUE external_payment_id) — partial (HMAC verifier pronto; Plan 02-07 implementa UPDATE conditional)
- C1 (TypeScript strict, zero any) ✓
- C3 (Zod em inputs) ✓
- C8 (HMAC validation) ✓ — função pronta, Plan 02-07 chama

## Next up

Wave 2 plans podem importar tudo:
- Plan 02-06: `import { createTransparentPix } from "@/lib/abacatepay"` na Server Action `createCheckout`
- Plan 02-07: `import { verifyAbacatepayWebhookSignature } from "@/lib/abacatepay"`, `import { createServiceClient } from "@/lib/supabase/service"`
