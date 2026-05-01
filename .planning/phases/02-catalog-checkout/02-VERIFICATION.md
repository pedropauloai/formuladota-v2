---
phase: 02-catalog-checkout
verified_at: 2026-04-30T23:59:00Z
status: human_needed
score: 13/13 automated must-haves verified
re_verification: false
human_verification:
  - test: "Comprar pacote PIX end-to-end em sandbox — fluxo completo"
    expected: "QR Code aparece em /checkout/[id], pagar via simulate-payment, purchase.status muda para 'pago'"
    why_human: "Requer chave sandbox AbacatePay real, smee.io tunnel rodando e DB Supabase conectado"
  - test: "Saldo aparece em /partidas após pagamento confirmado"
    expected: "SaldoCard mostra partidas/sessões disponíveis correspondendo ao pacote comprado"
    why_human: "Requer pagamento E2E concluído no passo anterior"
  - test: "Webhook duplicado NÃO duplica saldo (idempotência C9)"
    expected: "Disparar simulate-payment 2x: purchase.status permanece 'pago', partidas_compradas inalterado"
    why_human: "Requer chamada real à API AbacatePay sandbox + verificação SQL no Supabase Studio"
  - test: "Email de confirmação enviado (F3.5)"
    expected: "Resend dashboard mostra email com subject 'Pagamento confirmado — {nome_pacote}' e status 'delivered'"
    why_human: "Requer RESEND_API_KEY configurada e pagamento E2E"
  - test: "User com behavior_status='suspended' não consegue comprar"
    expected: "createCheckout retorna erro amigável sobre suspensão (RLS error 42501 capturado)"
    why_human: "Requer SET manualmente no Supabase Studio: UPDATE profiles SET behavior_status='suspended' WHERE id=..."
  - test: "HMAC inválido retorna 401"
    expected: "curl -X POST localhost:3000/api/webhooks/abacatepay com X-Webhook-Signature: invalido retorna {error:'Assinatura inválida'} 401"
    why_human: "Requer dev server rodando; pode ser Pedro ou Claude com acesso ao terminal"
  - test: "Acessibilidade visual (C5)"
    expected: "Lighthouse Accessibility >= 90 em /pacotes e /checkout/[id]"
    why_human: "Requer browser com Lighthouse — análise visual e de contraste"
---

# Phase 02 — Catalog & Checkout Verification Report

**Phase Goal:** User aceito consegue comprar pacote via PIX (AbacatePay V2 Transparent). Webhook valida pagamento (HMAC SHA-256 base64), atualiza purchase com idempotência (UPDATE conditional + UNIQUE external_payment_id), libera saldo, dispara email confirmação Resend. RLS já bloqueia compra sem aceite/status ativo (migration 004).

**Verified:** 2026-04-30T23:59:00Z
**Status:** human_needed — todos os checks automatizados passaram; 7 items requerem validação manual
**Re-verification:** Não — verificação inicial

---

## 1. Goal Achievement — Acceptance Criteria

### Critério 1: Comprar pacote PIX end-to-end funciona em sandbox

**Caminho de código verificado:**

```
/pacotes (page.tsx) 
  → PackageGrid → PackageCard 
  → Link /checkout/${pkg.id}
  → /checkout/[packageId]/page.tsx (notFound() se inativo/inexistente)
  → CheckoutClient (useEffect + useTransition)
  → createCheckout(packageId) [Server Action]
    → Zod validation UUID
    → findActivePackage() via Supabase anon client
    → insertPendingPurchase() → RLS bloqueia se !doctrine_accepted || status!=ok/warned
    → createTransparentPix() → POST /v2/transparents/create
    → UPDATE external_payment_id
    → retorna { brCode, brCodeBase64, expiresAt }
  → QRCodeDisplay renderiza PNG + botão copiar
```

Status: VERIFIED no código — end-to-end path completo e sem stubs. Validação E2E com sandbox requer teste manual.

---

### Critério 2: Saldo aparece em /partidas após pagamento

**Caminho de código verificado:**

```
/api/webhooks/abacatepay/route.ts — transparent.completed
  → handlePaymentCompleted()
    → UPDATE purchases SET status='pago' WHERE external_payment_id=? AND status='pendente'
    → maybeSingle() retorna purchase atualizada
  
/partidas/page.tsx (Server Component)
  → .from("purchases").select(...).eq("status", "pago")
  → .reduce() para soma partidas_compradas - partidas_usadas
  → SaldoCard({ partidasDisponiveis, sessoesDisponiveis })
```

Status: VERIFIED no código — o webhook atualiza status='pago', o /partidas filtra por status='pago' e agrega o saldo. Sem stubs, dados reais do DB.

---

### Critério 3: Webhook duplicado NÃO duplica saldo (idempotência)

**Mecanismo verificado em `route.ts` linha 86-89:**

```typescript
.update({ status: "pago" })
.eq("external_payment_id", externalPaymentId)
.eq("status", "pendente")  // condicional — chave da idempotência
.maybeSingle()
```

Se `maybeSingle()` retorna `null` (já processado): retorno silencioso, sem email, sem side effects.
Resposta sempre `200 { received: true }` — AbacatePay não retenta.

Status: VERIFIED no código — UPDATE condicional atômico no PostgreSQL. Duplicata retorna 0 rows e segue o early-return em linha 96-99. Teste E2E com 2x simulate-payment requer sandbox.

---

## 2. Requirement Coverage

| Req ID | Descrição | Arquivo(s) de implementação | Status |
|--------|-----------|----------------------------|--------|
| F2.1 | Pacotes têm: nome, descricao, tipo, qtd_partidas, qtd_sessoes, preco_brl, ativo | migration 003 (schema preexistente) + `package-card.tsx` consome todos os campos | SATISFIED |
| F2.2 | Catálogo público lista pacotes ativos | `src/app/pacotes/page.tsx` — `.eq("ativo", true).order("display_order")` | SATISFIED |
| F3.1 | Click em pacote abre checkout | `package-card.tsx` — `Link href="/checkout/${pkg.id}"` | SATISFIED |
| F3.2 | Checkout cria purchase com status `pendente` | `actions.ts` — `insertPendingPurchase()` INSERT status="pendente" | SATISFIED |
| F3.3 | AbacatePay V2 gera QR Code PIX | `abacatepay.ts` — POST `/v2/transparents/create`; `qr-code-display.tsx` renderiza `brCodeBase64` | SATISFIED |
| F3.4 | Webhook confirma pagamento → pago → libera saldo (idempotência) | `route.ts` — UPDATE condicional WHERE status='pendente'; `partidas/page.tsx` agrega saldo | SATISFIED |
| F3.5 | Email confirmação Resend | `resend.ts` — `sendPurchaseConfirmationEmail()` com `idempotencyKey`; chamado em `sendConfirmationSafely()` via `void` | SATISFIED (email) — Discord notification DEFERRED (Phase 4, explícito em CONTEXT.md ln 24) |
| C1 | TypeScript strict, zero `any` | `pnpm typecheck` exit 0; grep `: any\b` → sem matches em todo `src/` | SATISFIED |
| C3 | Zod em todos os inputs | `actions.ts` — `checkoutInputSchema.safeParse`; `route.ts` — `webhookPayloadSchema.safeParse`; `abacatepay.ts` — `createTransparentPixInputSchema.safeParse` | SATISFIED |
| C5 | WCAG 2.1 AA | `aria-label` em todos os CTAs, `aria-hidden="true"` nos ícones, `role="alert"` no estado de erro, `aria-busy="true"` no loading | NEEDS HUMAN (Lighthouse visual) |
| C6 | Lucide icons, sem emojis | Grep emojiRe → 0 matches nos 8 arquivos Phase 2; todos os ícones via `lucide-react` | SATISFIED |
| C7 | Tema cyberpunk | `#00F0FF` e `#A855F7` encontrados em 18 arquivos; `bg-[#050505]` em pacotes/page.tsx e partidas/page.tsx | SATISFIED |
| C8 | HMAC validation | `verifyAbacatepayWebhookSignature()` com `crypto.timingSafeEqual`; `request.text()` na linha 30 do route.ts, ANTES de qualquer parse | SATISFIED |
| C9 | Idempotência | UPDATE condicional `.eq("status", "pendente")` + `external_payment_id` UNIQUE constraint (migration 001) + `maybeSingle()` retorno checado | SATISFIED |

**Requisitos fora do escopo desta phase (correto por CONTEXT.md):**

- F2.3 (admin CRUD pacotes) — Phase 5
- F2.4 (seed 4 pacotes) — migration 003, já aplicada em Phase 1
- F3.5 notificação Discord — Phase 4 (bot não está rodando)
- C4 (RLS em todas as tables) — verificado em Phase 1/1.5; Phase 2 confia no schema
- C10 (limite 3 partidas/dia) — Phase 3 (agendamento)

---

## 3. CLAUDE.md Compliance

| Regra | Resultado | Evidência |
|-------|-----------|-----------|
| TypeScript strict, zero `any` | PASS | `pnpm typecheck` exit 0; grep `: any\b` → 0 matches |
| Functions max 50 linhas | WARN | `createCheckout()` = 54 linhas (actions.ts:41-94). Demais funções dentro do limite |
| Files max 300 linhas | PASS | Maior arquivo: route.ts 185 linhas |
| async/await, nunca .then()/.catch() chains | PASS | grep `.then\|.catch` → 0 matches em `src/app/` e `src/lib/` |
| Zod em inputs | PASS | Todos os inputs validados com `safeParse` |
| Logger: console.error apenas em server | PASS | `console.log` → 0 matches; apenas `console.error` em server-side code |
| ES6 imports, nunca require() | PASS | grep `require(` → 0 matches em src/ |
| Lucide icons, nunca emojis em UI | PASS | Verificado programaticamente — 0 emojis Unicode |
| Tema cyberpunk aplicado | PASS | Cores em 18 arquivos |
| shadcn/ui components | PASS | Button, Card, Badge, Skeleton, Sonner usados consistentemente |

**Detalhe do warning C2:** `createCheckout()` em `actions.ts` tem 54 linhas (4 acima do limite). A função já delegou operações para `findActivePackage()` e `insertPendingPurchase()` — o excesso vem dos blocos de limpeza de órfã e update de `external_payment_id`. Não é bloqueador; pode ser refatorado em Phase seguinte.

---

## 4. Security Checks

| Check | Resultado | Evidência |
|-------|-----------|-----------|
| HMAC com `crypto.timingSafeEqual` | PASS | `abacatepay.ts:112` — `return crypto.timingSafeEqual(a, b)` |
| `request.text()` ANTES de JSON.parse | PASS | `route.ts:30` — `const rawBody = await request.text()` (linha 30, antes de qualquer parse) |
| JSON.parse ocorre depois do HMAC | PASS | `route.ts:41` — `JSON.parse(rawBody)` dentro do try/catch após validação HMAC |
| `createServiceClient` exclusivo em webhook | PASS | grep `createServiceClient` → apenas em `route.ts` e `service.ts` (definição). Nenhum Server Action de usuário importa service.ts |
| RLS não duplicada na app | PASS | `actions.ts` — `insertPendingPurchase()` faz INSERT direto, trata erro 42501 com mensagem amigável sem re-checar doctrine_accepted_at |
| Webhook duplicado retorna 200 | PASS | `route.ts:69` — `return NextResponse.json({ received: true })` sempre no final; 4xx apenas para HMAC/Zod inválidos |
| Email não-bloqueante | PASS | `route.ts:103` — `void sendConfirmationSafely(...)` + `sendConfirmationSafely` usa try/catch isolado (linhas 110-119) |
| Secrets não hardcoded | PASS | Todos acessados via `requireServerEnv()` ou `process.env` |

---

## 5. Build Gates

| Gate | Resultado |
|------|-----------|
| `pnpm typecheck` | PASS — exit 0 (0 erros) |
| `pnpm lint` | PASS — exit 0 (0 warnings) |
| `pnpm build` | PASS — 13 rotas compiladas sem erros |

**Rotas compiladas:**
- `/` (static)
- `/_not-found` (static)
- `/api/webhooks/abacatepay` (dynamic — webhook handler)
- `/auth/callback` (dynamic)
- `/banned` (dynamic)
- `/checkout/[packageId]` (dynamic — rota Phase 2)
- `/codigo-de-conduta` (static)
- `/login` (dynamic)
- `/onboarding/doutrina` (dynamic)
- `/pacotes` (dynamic — rota Phase 2)
- `/partidas` (dynamic — rota Phase 2)
- `/perfil` (dynamic)
- `/suspended` (dynamic)

---

## 6. Data-Flow Trace (Level 4)

### /pacotes — dados reais do DB

`pacotes/page.tsx` → `supabase.from("packages").select("*").eq("ativo", true).order("display_order")` → `PackageGrid({ packages })` → `PackageCard({ pkg })` renderiza todos os campos.

Status: FLOWING — query real com filtro e ordem.

### /partidas — saldo agregado de purchases pagas

`partidas/page.tsx` → `supabase.from("purchases").select(...).eq("status", "pago")` → `.reduce()` soma `partidas_compradas - partidas_usadas` → `SaldoCard({ partidasDisponiveis, sessoesDisponiveis })`.

Status: FLOWING — 2-query approach tipado com `Pick<Tables<T>, keys>`, sem cast, sem dados hardcoded.

### /checkout — QR Code da AbacatePay

`CheckoutClient` → `createCheckout(packageId)` → `createTransparentPix()` → POST real para `api.abacatepay.com/v2/transparents/create` → `brCodeBase64` → `<img src={brCodeBase64}>`.

Status: FLOWING no código — depende de API key configurada (sandbox). Nenhum dado hardcoded.

---

## 7. Anti-Patterns

| Arquivo | Linha | Pattern | Severidade | Avaliação |
|---------|-------|---------|------------|-----------|
| `actions.ts` | 41-94 | `createCheckout()` com 54 linhas | Aviso | C2 leve — funcão já usa helpers; não é stub |
| `route.ts` | 103 | `updated as ProcessedPurchase` | Info | Cast necessário por limitação de inferência do Supabase TS v2 com `.maybeSingle()` após select parcial. Não é `any`, campo `ProcessedPurchase` espelha exatamente o `.select()` string |
| `env.ts` | 60 | `NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder"` | Info | Placeholder de fallback em env public — intencionalmente para `publicEnv` (não-secret); não vaza ao cliente se vazio |

**Nenhum blocker encontrado.** Todos os stubs potenciais inspecionados são padrões defensivos, não implementações incompletas.

---

## 8. Decisões CONTEXT.md — Conformidade

| Decisão | Status |
|---------|--------|
| Transparent PIX (`/v2/transparents/create`) — não Checkout | PASS — `abacatepay.ts:49` |
| Eventos `transparent.*` (não `checkout.*`) | PASS — `abacatepay.ts` e `types/abacatepay.ts` enum |
| smee.io documentado em README + .env.example | PASS — seção "Webhook Local Dev" no README + bloco DEV ONLY em .env.example |
| `/checkout/[packageId]` page dedicada (não modal) | PASS — `app/checkout/[packageId]/page.tsx` existe |
| Email disparado no webhook, não no checkout | PASS — `route.ts:103` via `sendConfirmationSafely` |
| RLS não duplicada na app | PASS — `actions.ts` trata erro 42501, não faz checagem própria |
| `createServiceClient` apenas em webhooks | PASS — grep confirma uso exclusivo em `route.ts` |

---

## 9. Human Verification Items

### 1. Fluxo E2E Compra PIX Sandbox

**Test:** `pnpm dev` + Terminal 2: `pnpm dlx smee-client --url https://smee.io/SEU-CANAL --target http://localhost:3000/api/webhooks/abacatepay`. Login com Discord → aceitar doutrina → `/pacotes` → click "Comprar" → verificar QR Code na tela.

**Expected:** QR Code PNG visível, código `brCode` copiável, expiração formatada em PT-BR.

**Why human:** Requer AbacatePay sandbox key real + smee.io tunnel + Supabase conectado.

---

### 2. Simulate-Payment + Verificação DB

**Test:** Com QR Code na tela, copiar o `pix_char_id` do Network tab. Executar:
```bash
curl -X POST "https://api.abacatepay.com/v2/transparents/simulate-payment?id=PIX_ID_AQUI" \
  -H "Authorization: Bearer ${ABACATEPAY_API_KEY}" -d '{}'
```
Em seguida verificar no Supabase Studio: `SELECT status FROM purchases WHERE id = 'PURCHASE_ID'`.

**Expected:** `status = 'pago'`, `/partidas` mostra saldo correspondente.

**Why human:** Requer API AbacatePay sandbox + acesso ao Supabase Studio.

---

### 3. Idempotência — Simulate-Payment 2x

**Test:** Disparar o mesmo `simulate-payment` duas vezes. Verificar:
- `SELECT count(*) FROM purchases WHERE external_payment_id = 'pix_char_id'` → deve ser 1
- `SELECT partidas_compradas FROM purchases WHERE external_payment_id = 'pix_char_id'` → deve ser o qtd_partidas do pacote (não dobrado)

**Expected:** Segundo webhook processado silenciosamente, saldo inalterado.

**Why human:** Requer sandbox + SQL.

---

### 4. Email de Confirmação (F3.5)

**Test:** Após pagamento confirmado, verificar Resend dashboard → seção Emails → buscar subject "Pagamento confirmado".

**Expected:** Email entregue com template cyberpunk, subject correto, lista de partidas/sessões.

**Why human:** Requer conta Resend + pagamento E2E.

---

### 5. RLS Suspensão

**Test:** No Supabase Studio: `UPDATE profiles SET behavior_status = 'suspended' WHERE id = 'SEU_USER_ID'`. Tentar comprar em `/pacotes`.

**Expected:** Erro amigável "Você precisa aceitar o código de conduta ou seu acesso está suspenso."

**Why human:** Requer SQL + teste manual de UX.

---

### 6. HMAC inválido → 401

**Test:**
```bash
curl -X POST http://localhost:3000/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalida" \
  -d '{"event":"transparent.completed"}'
```

**Expected:** `{"error":"Assinatura inválida"}` HTTP 401.

**Why human:** Requer dev server rodando (fácil de testar, mas requer terminal).

---

### 7. Acessibilidade Visual (C5)

**Test:** `pnpm build && pnpm start` → Chrome DevTools → Lighthouse audit em `/pacotes` e `/checkout/[id]`.

**Expected:** Accessibility score >= 90.

**Why human:** Análise visual e de contraste em browser.

---

## 10. Gaps Summary

Nenhum gap bloqueador identificado. Todos os artifacts existem, são substantivos (sem stubs), estão corretamente conectados e com dados fluindo do banco de dados real.

**Items de aviso (não bloqueadores):**

1. **C2 warning** — `createCheckout()` tem 54 linhas (4 acima do limite de 50). A função já usa helpers, o excesso é marginal. Não afeta funcionalidade.

2. **F3.5 parcial** — O requisito inclui "notificação Discord" além do email Resend. A notificação Discord está explicitamente adiada para Phase 4 (CONTEXT.md linha 24: "Notificação Discord do bot (Phase 4 — bot ainda não rodando)"). O email Resend foi entregue integralmente.

3. **`updated as ProcessedPurchase` cast** — Necessário por limitação de inferência de tipos do Supabase JS v2 com `.maybeSingle()` após select parcial. Não é `any` — `ProcessedPurchase` é uma interface concreta que espelha exatamente o `.select()` string usado. Aceitável.

---

## 11. Behavioral Spot-Checks

| Comportamento | Resultado |
|---------------|-----------|
| `pnpm typecheck` exit 0 | PASS |
| `pnpm lint` exit 0 | PASS |
| `pnpm build` produz 13 rotas sem erros | PASS |
| `/pacotes` renderizada como `ƒ Dynamic` | PASS |
| `/checkout/[packageId]` renderizada como `ƒ Dynamic` | PASS |
| `/partidas` renderizada como `ƒ Dynamic` | PASS |
| `/api/webhooks/abacatepay` renderizada como `ƒ Dynamic` | PASS |
| grep `timingSafeEqual` → encontrado em abacatepay.ts | PASS |
| grep `await request.text()` → encontrado em route.ts:30 | PASS |
| grep `.eq("status", "pendente")` → encontrado em route.ts:87 | PASS |
| grep `idempotencyKey` → encontrado em resend.ts:53 | PASS |
| grep `void sendConfirmationSafely` → encontrado em route.ts:103 | PASS |
| `createServiceClient` não importado em Server Actions de usuário | PASS |
| Zero `any` em todo src/ | PASS |
| Zero `.then()/.catch()` chains em src/ | PASS |
| Zero emojis Unicode nos 8 arquivos Phase 2 | PASS |

---

_Verified: 2026-04-30T23:59:00Z_
_Verifier: gsd-verifier (claude-sonnet-4-6)_
