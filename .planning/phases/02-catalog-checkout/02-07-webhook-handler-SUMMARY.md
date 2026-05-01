---
phase: 02-catalog-checkout
plan: "07"
subsystem: payments
tags: [webhook, abacatepay, pix, hmac, idempotency, email]
dependency_graph:
  requires: ["02-02", "02-03"]
  provides: ["webhook-handler", "payment-confirmation-flow"]
  affects: ["purchases-table-status", "email-notifications"]
tech_stack:
  added: []
  patterns: ["HMAC-SHA256 webhook validation", "idempotent conditional UPDATE", "fire-and-forget email via void+async wrapper"]
key_files:
  created:
    - src/app/api/webhooks/abacatepay/route.ts
  modified:
    - src/types/database.ts
decisions:
  - "Adicionado Relationships:[] em todas as tables de database.ts — campo obrigatorio pelo tipo GenericTable do Supabase JS v2 sem o qual .update() resolve como never"
  - "Views/Functions/Enums/CompositeTypes agora Record<never,never> em vez de Record<string,never> — evita poisoning da interseccao TablesAndViews"
  - "Filter de idempotencia usa .eq(status,pendente) nativo apos fix do database.ts — sem necessidade de casts intermediarios"
metrics:
  duration_minutes: 45
  completed_at: "2026-05-01T21:27:53Z"
  tasks_completed: 1
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 07: Webhook Handler AbacatePay Summary

**One-liner:** Handler POST /api/webhooks/abacatepay com HMAC-SHA256 timingSafeEqual, idempotencia via UPDATE condicional WHERE status='pendente', e email fire-and-forget isolado em wrapper async.

## O que foi implementado

### Estrutura do POST handler (5 etapas)

1. **Raw body via `request.text()`** — Leitura do corpo bruto ANTES de qualquer `JSON.parse`. Critico para HMAC bater: parser muda whitespace e invalida assinatura.

2. **Validacao HMAC** — `verifyAbacatepayWebhookSignature(rawBody, signature)` com `timingSafeEqual` (Plan 02-02). HMAC invalido retorna 401 sem revelar detalhes.

3. **Validacao Zod** — `webhookPayloadSchema.safeParse(json)` valida schema do payload. Payload invalido retorna 400.

4. **Service client** — `createServiceClient()` (bypass RLS, Plan 02-02). Webhook e trigger sistemico sem cookie de sessao.

5. **Roteamento por evento**:
   - `transparent.completed` → `handlePaymentCompleted()` (UPDATE pago + email)
   - `transparent.refunded` → `handleRefund()` (UPDATE cancelado)
   - `transparent.disputed` → `console.error` only, sem mutacao no DB

### Helpers privados

- **`handlePaymentCompleted`** — UPDATE condicional `WHERE external_payment_id=? AND status='pendente'`. Usa `.eq("status", "pendente")` como filtro atomico de idempotencia. Se `maybeSingle()` retorna `null`: webhook duplicado ou ID desconhecido — retorno silencioso (nao e erro). Se retorna 1 row: purchase liberada → dispara email via `void sendConfirmationSafely(...)`.

- **`handleRefund`** — UPDATE simples para `status='cancelado'` sem checar status anterior (refund e definitivo).

- **`sendConfirmationSafely`** — Wrapper async com try/catch interno que nunca propaga excecao. Chamado via `void` para sinalizar fire-and-forget intencional. Isola falha de email do retorno do webhook.

- **`sendConfirmationFromPurchase`** — Busca email do user no `profiles` (fallback caso payload nao traga `customer.email`), busca nome do pacote em `packages`, e despacha `sendPurchaseConfirmationEmail`.

### Idempotencia — como funciona

```sql
UPDATE purchases
SET status = 'pago'
WHERE external_payment_id = $1
  AND status = 'pendente'   -- condicional e a chave
RETURNING id, user_id, ...;
-- 0 rows: ja processado (webhook duplicado) → return silently + 200
-- 1 row: processado agora → continuar com email
```

AbacatePay pode retentar o mesmo webhook N vezes (rede flaky, deploy do app). O `UNIQUE(external_payment_id)` + filtro `status='pendente'` garante atomicidade: apenas a primeira chamada retorna 1 row, as seguintes retornam 0.

### Retornos — por que sempre 200

- `401` apenas para HMAC invalido (antes de qualquer logica de negocio)
- `400` apenas para payload Zod invalido
- **Qualquer outro caminho retorna `200 { received: true }`**, incluindo:
  - Webhook duplicado (purchase ja em status 'pago')
  - `external_payment_id` desconhecido (nao foi gerado por nos)
  - Email falhou (Resend down)
  - `transparent.disputed` (log only)

Retornar 5xx faria AbacatePay retentar indefinidamente, potencialmente duplicando processamento.

## Desvios do Plano

### Auto-fixed Issues

**1. [Rule 1 - Bug] database.ts sem Relationships em todas as tables**

- **Encontrado durante:** Task 1 (typecheck retornou erros de tipo 'never' em .update())
- **Problema:** Supabase JS v2 define `GenericTable` com campo `Relationships: GenericRelationship[]` obrigatorio. Sem esse campo, TypeScript nao consegue inferir que o retorno de `.from("purchases")` e uma `Table` — cai no overload de `Views`, que resolvia como `never`, quebrando `.update()` e `.select()`.
- **Correccao:** Adicionado `Relationships: []` em todas as 9 tabelas do `database.ts`.
- **Arquivos modificados:** `src/types/database.ts`
- **Commit:** f8265ef

**2. [Rule 1 - Bug] database.ts com Views: Record<string,never> envenenando TablesAndViews**

- **Encontrado durante:** Task 1 (mesmo ciclo de investigacao do item acima)
- **Problema:** `Record<string, never>` faz `keyof Views = string`, que sobrepoe o overload de `.from()` para Views em qualquer nome de tabela. `TablesAndViews = Tables & Exclude<Record<string,never>, ''>` = `Tables & Record<string,never>` = `never` em todos os acessos.
- **Correccao:** `Views/Functions/Enums/CompositeTypes` agora sao `Record<never, never>` (= `{}` efetivamente), cujo `keyof` e `never`, impedindo o overload de Views de ser selecionado para qualquer string.
- **Arquivos modificados:** `src/types/database.ts`
- **Commit:** f8265ef

## Known Stubs

Nenhum. O handler e funcional: valida HMAC, atualiza DB e dispara email.

## Self-Check: PASSED

- route.ts existe em `src/app/api/webhooks/abacatepay/route.ts`: FOUND
- Commit f8265ef (feat webhook handler): FOUND
- Commit bfb3c56 (chore linter cleanup): FOUND
- `pnpm typecheck`: exit 0
- `pnpm lint`: exit 0
- `pnpm build`: exit 0 (rota compilada como `/api/webhooks/abacatepay` — ƒ Dynamic)
