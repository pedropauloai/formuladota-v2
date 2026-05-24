# Phase 4 — Mercado Pago Pix Automático Subscription

**Data replan:** 2026-05-23 (pós V2.5 Design Foundations)
**Goal:** R$ 47/mês subscription mensal via PIX Automático Mercado Pago (`/preapproval`). Acesso HUB premium.
**Branch:** `feat/hero-state-refactor`
**Status:** In Progress

---

## Escopo

### Entregáveis desta phase

| # | Entregável | Arquivo |
|---|---|---|
| 1 | Migration 008 — tabela `subscriptions` + helper `has_active_subscription()` | `supabase/migrations/008_subscriptions_mercadopago.sql` |
| 2 | Migration 010 — `purchases.payment_provider` default → mercadopago | `supabase/migrations/010_purchases_payment_provider.sql` |
| 3 | Remoção AbacatePay — lib, types, webhook route, env vars | `src/lib/abacatepay.ts`, `src/types/abacatepay.ts`, `src/app/api/webhooks/abacatepay/` |
| 4 | Mercado Pago client unificado | `src/lib/mercadopago/client.ts` |
| 5 | Mercado Pago types (Zod schemas) | `src/lib/mercadopago/types.ts` |
| 6 | Webhook handler MP | `src/app/api/webhooks/mercadopago/route.ts` |
| 7 | Server Action checkout PIX avulso (migrar de AbacatePay → MP) | `src/app/checkout/[packageId]/actions.ts` (update) |
| 8 | Server Actions subscription | `src/app/actions/subscription.ts` |
| 9 | Página `/assinatura` | `src/app/assinatura/page.tsx` + `src/app/assinatura/assinatura-client.tsx` |
| 10 | Emails Resend subscription | `src/lib/resend.ts` (extend) |
| 11 | `.env.example` atualizado | `.env.example` |

### Fora do escopo (deferred)

- Trial 7 dias grátis (V2)
- Email aviso 5 dias antes vencimento (Phase 8)
- Histórico cobranças + recibo PDF (Phase 7)
- Multi-plano (V2)
- Cupons / desconto (V2)
- Subscription gate no middleware (Phase 5 — quando lobbies existir)
- Discord bot notification renewal (Phase 5+)
- Auto-retry overdue (V2)

---

## Modelo de Negócio

- **R$ 47/mês** via MP `/preapproval` (modelo pending-payment, sem card_token_id)
- User redireciona para `init_point` URL → escolhe PIX no checkout MP → autoriza Pix Automático no app do banco
- MP dispara webhook `subscription_preapproval` com `status: "authorized"` → acesso liberado
- Cancel híbrido: cancela imediato no MP, acesso mantido até `next_payment_date`
- PIX avulso (fichas R$ 10 Agent D) usa AbacatePay separado — coexistem

---

## Stack

- `fetch` nativo (sem SDK MP server-side — thin wrapper, zero benefício)
- `node:crypto` HMAC-SHA256 hex (diferente de AbacatePay que usava base64)
- `zod` (já instalado)
- `@supabase/ssr` (já instalado)

---

## Decisões Chave (herdadas do CONTEXT + RESEARCH)

| Decisão | Valor |
|---|---|
| Modelo preapproval | `pending` sem `card_token_id` (PIX) |
| Webhook HMAC | `x-signature: ts=...,v1=...` → manifest `id:{id};request-id:{req};ts:{ts};` → HMAC-SHA256 **hex** |
| Diferença AbacatePay | AbacatePay: digest base64, assina raw body; MP: digest hex, assina manifest |
| Amount format | MP usa reais float (47.00) — AbacatePay usava centavos (4700) |
| qr_code_base64 | MP não inclui prefixo `data:image/png;base64,` — concatenar no render |
| Sandbox vs prod | Se `MP_ACCESS_TOKEN` começa com `TEST-` → usar `sandbox_init_point` |
| Migration 010 | ALTER COLUMN (coluna já existe em 001) — não ADD COLUMN |
| Helper SQL | `has_active_subscription()` retorna true para status `authorized` OR `cancelled` com `next_payment_date > now()` |

---

## UAT (Critérios de Aceitação)

- [ ] H2.1 — `POST /preapproval` cria entry na tabela `subscriptions` + redireciona para `init_point` (sandbox: `sandbox_init_point`)
- [ ] H2.2 — trial_ends_at permanece null (coluna existe, sem uso)
- [ ] H2.3 — `has_active_subscription()` retorna `true` para user com `status='authorized'` e `next_payment_date > now()`; retorna `true` para user cancelado dentro do período; retorna `false` para user sem assinatura
- [ ] H2.4 — Página `/assinatura` renderiza sem erro TypeScript em 4 estados (sem assinatura, authorized, cancelled+ativo, cancelled+expirado)
- [ ] Zero referências `AbacatePay/abacatepay/ABACATEPAY` em `src/` após migração
- [ ] `pnpm typecheck` → zero erros
- [ ] `pnpm lint` → zero novos warnings
- [ ] Webhook `/api/webhooks/mercadopago` acessível e retorna 401 para assinatura inválida

---

## TODOs Pedro (pós-deploy)

1. **Criar conta Mercado Pago Developer:** https://www.mercadopago.com.br/developers
2. **Gerar Access Token** (sandbox `TEST-...` ou produção `APP_USR-...`) em "Suas credenciais"
3. **Configurar webhook URL** no painel MP: Integrações → Webhooks → URL: `https://formuladota.com/api/webhooks/mercadopago` — evento: `payment`, `subscription_preapproval`, `subscription_authorized_payment`
4. **Copiar MP_WEBHOOK_SECRET** gerado automaticamente ao salvar webhook
5. **Adicionar em `.env.local`:**
   ```
   MP_ACCESS_TOKEN=TEST-xxxxxxxx (sandbox) ou APP_USR-... (produção)
   MP_PUBLIC_KEY=TEST-xxxxxxxx (ou APP_USR-...)
   MP_WEBHOOK_SECRET=xxxxxxxx
   HUB_PRICE_BRL=47
   ```
6. **Testar webhook local** via smee.io: `pnpm dlx smee-client --url https://smee.io/SEU-CANAL --target http://localhost:3000/api/webhooks/mercadopago`
7. **MCP Mercado Pago** (opcional): autenticar via OAuth em sessão Claude Code para usar tools `mp__mercadopago__*` (criar test users, simular notificações, registrar webhook automaticamente)

---

## Coordenação com Agent D

- Agent D implementa: fichas R$ 10 avulso AbacatePay + queue/dashboard
- Esta phase (Agent F) implementa: assinatura R$ 47/mês MP
- Coexistência: AbacatePay permanece APENAS para fichas avulsas — não tocar em `src/lib/abacatepay.ts` nem `src/app/api/webhooks/abacatepay/`
- REVISÃO DE ESCOPO: dado que Agent D usa AbacatePay em paralelo, esta phase NÃO apaga AbacatePay — apenas adiciona MP. Apagar AbacatePay só quando Agent D terminar e confirmar.

---

*Criado: 2026-05-23 | Agent F | Phase 4 replan pós V2.5*
