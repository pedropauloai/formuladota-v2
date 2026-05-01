---
phase: 02
phase_slug: catalog-checkout
created: 2026-05-01
strategy: manual_mvp
test_framework: none_yet
notes: Wave 0 gap formalizado. Sem framework de testes instalado. Validação manual via dev server + sandbox AbacatePay + smee.io tunnel + curl HMAC. Para fase futura, considerar vitest.
---

# Phase 2 — Validation Strategy

> Estratégia de validação para Phase 2 (Catalog & Checkout). Extraída da seção "Validation Architecture" do `02-RESEARCH.md` linhas 869-901. Documenta o approach manual aceito como MVP conforme PRD ("Validar manualmente fluxo end-to-end antes de deploy").

## Contexto

- **`workflow.nyquist_validation`**: `true` (default GSD)
- **Test framework instalado**: nenhum (Wave 0 gap conhecido — ver `02-RESEARCH.md`)
- **Decisão MVP**: validação manual via fluxo end-to-end + grep nos plans + comandos `pnpm`. Adicionar vitest fica como tarefa futura (não bloqueia Phase 2).
- **Quick run**: `pnpm typecheck && pnpm lint && pnpm build`

## Phase Requirements → Test Map

| Req ID | Comportamento esperado | Tipo de teste | Comando / passo | Quem executa | Quando |
|---|---|---|---|---|---|
| F2.1 | Pacotes têm campos: nome, descricao, tipo, qtd_partidas, qtd_sessoes, preco_brl, ativo | DB introspection | `select * from packages` no Supabase Studio (nyvbfdsxjpiwgdroptdi) | Pedro/Claude | Após Wave 2 (verificação plan 02-05) |
| F2.2 | `/pacotes` lista somente pacotes `ativo=true`, ordenados por `display_order` | Visual + DB cross-check | Browser: `pnpm dev` → login Discord → `/onboarding/doutrina` → aceitar → `/pacotes` → comparar com `select * from packages where ativo` | Pedro | Após Wave 2 |
| F3.1 | Click em PackageCard navega pra `/checkout/[packageId]` | Manual UX | Browser: `/pacotes` → click "Comprar" → URL muda pra `/checkout/{uuid}` | Pedro | Após Wave 2 |
| F3.2 | Click cria registro `purchases` com status `pendente` | DB check | `select * from purchases where user_id = '{pedro-id}' order by created_at desc limit 1` — confirmar `status='pendente'` e `external_payment_id IS NULL` (até task 1 do Server Action retornar) | Pedro/Claude | Após Wave 2 |
| F3.3 | QR Code PIX (`brCode` + `brCodeBase64`) aparece inline na tela `/checkout/[packageId]` | Visual + Network | Browser DevTools → Network → ver POST `/v2/transparents/create` retornando `success:true` + `data.brCodeBase64` carregado em `<img src="data:image/png;base64,...">` | Pedro | Após Wave 2 |
| F3.4 | Webhook `transparent.completed` libera saldo (atualiza purchase.status='pago') | E2E sandbox | (1) Iniciar smee-client + pnpm dev. (2) Fazer compra teste. (3) Disparar simulate-payment via curl: `curl -X POST "https://api.abacatepay.com/v2/transparents/simulate-payment?id={pix_char_id}" -H "Authorization: Bearer ${ABACATEPAY_API_KEY}" -d '{}'`. (4) Validar webhook log no Vercel/console + `select status from purchases where id='{purchase}'` retorna `'pago'` | Pedro/Claude | Após Wave 2 |
| F3.4 (idempotência) | Webhook duplicado NÃO duplica saldo | E2E negativo | Disparar simulate-payment 2x. `select count(*) from purchases where external_payment_id = '{pix_char_id}'` deve ser 1. `select status, partidas_compradas from purchases where id = '{purchase}'` deve estar `pago` (não dobrado). Webhook segundo retorna 200 sem efeito. | Pedro/Claude | Após Wave 2 |
| F3.5 | Email confirmação enviado pós-pagamento via Resend | Visual + provider check | (1) Após simulate-payment. (2) Verificar Resend dashboard → Emails → ver entrada com subject "Pagamento confirmado — FormulaDota" e status "delivered" (ou "sent" se sandbox). | Pedro | Após Wave 2 |
| C1 (TS strict / zero any) | Build TypeScript passa sem `any` | Static check | `pnpm typecheck` exit 0; `! grep -rn ': any\b' src/lib/abacatepay.ts src/lib/resend.ts src/lib/supabase/service.ts src/app/checkout src/app/api/webhooks src/app/pacotes src/app/partidas` retorna empty | Claude (auto) | Após cada plan |
| C3 (Zod inputs) | Server Actions e API routes validam inputs com Zod | Code review | `grep -l 'safeParse\|.parse(' src/app/checkout/[packageId]/actions.ts src/app/api/webhooks/abacatepay/route.ts` retorna ambos arquivos | Claude (auto) | Após plans 02-06, 02-07 |
| C5 (acessibilidade) | Componentes shadcn renderizam com WCAG 2.1 AA | Manual + Lighthouse | (1) `pnpm build && pnpm start`. (2) Lighthouse audit em `/pacotes` e `/checkout/[id]` — Accessibility score >= 90. | Pedro | Pós-deploy local |
| C6 (Lucide, sem emojis) | UI usa Lucide icons, zero emojis | Code review | `! grep -rn '[\u{1F600}-\u{1F64F}]\|[\u{2600}-\u{26FF}]' src/app src/components` (busca emojis Unicode) — apenas resultados do `❗` literal do doc canônico em src/lib/doctrine.ts | Claude (auto) | Após cada plan UI |
| C7 (cyberpunk theme) | Cores #00F0FF, #A855F7, #050505 aplicadas | Code review | `grep -l '#00F0FF\|var(--color-cyan)' src/components/ui src/app/pacotes src/app/checkout src/app/partidas` retorna múltiplos arquivos | Claude (auto) | Após cada plan UI |
| C8 (HMAC) | Webhook valida HMAC com `crypto.timingSafeEqual`; raw body lido antes de parse | E2E negativo + code grep | (1) `grep -q 'crypto.timingSafeEqual' src/lib/abacatepay.ts` exit 0. (2) `grep -q 'await request.text()' src/app/api/webhooks/abacatepay/route.ts` exit 0. (3) E2E: `curl -X POST localhost:3000/api/webhooks/abacatepay -H 'Content-Type: application/json' -H 'X-Webhook-Signature: invalid' -d '{}'` retorna **401** | Claude (auto) + Pedro | Após plan 02-07 |
| C9 (idempotência) | UPDATE conditional `WHERE external_payment_id=? AND status='pendente'` no webhook | Code grep + E2E | (1) `grep -q "eq.*status.*pendente" src/app/api/webhooks/abacatepay/route.ts` ou via lookup do query. (2) E2E acima (F3.4 idempotência). | Claude (auto) | Após plan 02-07 |

## Gaps Conhecidos (Wave 0)

- ❌ **Nenhum framework de testes automatizados** instalado (vitest/jest/playwright). Para MVP, validação manual é aceitável conforme PRD.
- ❌ **Sem script `scripts/test-webhook.sh`** com HMAC pré-computado. Recomendado para iteração rápida em dev — fica como minor improvement futuro.
- ❌ **Sem CI/CD configurado**. Vercel deploy automatiza build mas não roda testes.

## Sinais de Falha (Detective Controls)

Quando rodar a validação manual:

| Sinal | Significa | Ação |
|---|---|---|
| QR Code não renderiza | `brCodeBase64` não chegou ou prefix `data:image/png;base64,` ausente | Inspecionar resposta AbacatePay no Network tab |
| Webhook retorna 401 com signature válida | HMAC parse incorreto (raw body parseado antes ou prefix de header wrong) | Confirmar `request.text()` + secret correto + algoritmo SHA-256 base64 |
| Saldo dobrado após simulate-payment 2x | UPDATE não-conditional, race condition | Rever `WHERE status='pendente'` no plan 02-07 |
| Email não chega | Resend API key inválida ou domínio não verificado | Verificar Resend dashboard — usar `onboarding@resend.dev` MVP |
| User com `behavior_status='suspended'` consegue criar checkout | RLS bypass (Server Action usando service-role indevidamente) | Confirmar 02-06 usa `createClient()` normal, não `createServiceClient()` |
| Server Action retorna sem mensagem amigável quando RLS rejeita | Faltou tratamento do erro 42501 | Confirmar plan 02-06 catch específico |

## Validation Schedule

**Wave 1 (após plans 02-01 a 02-04)**:
- [ ] `pnpm typecheck` verde após cada plan
- [ ] `pnpm lint` verde após cada plan
- [ ] `pnpm build` verde após Wave 1 completa
- [ ] `grep -q 'tailwindcss-animate' package.json` retorna empty (lib deprecada NÃO presente)
- [ ] `grep -q 'crypto.timingSafeEqual' src/lib/abacatepay.ts` exit 0
- [ ] `grep -q 'idempotencyKey' src/lib/resend.ts` exit 0

**Wave 2 (após plans 02-05 a 02-08)**:
- [ ] Smoke routes (curl): `/pacotes` 200, `/checkout/{uuid}` 200, `/partidas` 200, `/api/webhooks/abacatepay` 401 sem signature
- [ ] DB query: `select * from packages where ativo=true` retorna 4 pacotes
- [ ] Browser flow: login → onboarding → pacotes → checkout → QR Code visível
- [ ] curl simulate-payment + DB check: `purchase.status='pago'` após
- [ ] curl simulate-payment 2x + DB check: 1 row apenas, status `pago`, partidas_compradas igual ao pacote (não dobrado)
- [ ] Resend dashboard: email enviado

**Quando passar**: registrar resultados em `02-UAT.md` (formato GSD verify-work) e seguir pra `/gsd:execute-phase` ou `/gsd:plan-phase 3`.
