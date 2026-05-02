# Phase 4: Subscription Mensal — Discussion Log

> **Audit trail only.** Não usado por agentes downstream (researcher, planner, executor).
> Decisões em CONTEXT.md — este log preserva alternativas consideradas.

**Date:** 2026-05-02
**Phase:** 04-subscription-mensal
**Areas discussed:** Trial trigger, Cancel flow, RLS gate scope, Email aviso vencimento, Webhook handler, Plan flexibilidade, Trial activation, Página /assinatura escopo

---

## Trial trigger

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Ao linkar Steam | Trial 7d ativa quando user faz Steam OpenID callback success | |
| Primeiro login Discord | Trial ativa no signup Discord | |
| Primeiro clique "assinar" | User decide quando ativar trial via UI | |
| **SEM TRIAL** | Não ter trial nenhum em V1 | ✓ |

**User's choice:** "1 nao vai ter teste grátis."
**Notes:** Pedro decidiu simplificar V1. Coluna `profiles.trial_ends_at` (criada Migration 005) permanece preparada pra V2 caso reintroduzam.

---

## Cancel flow

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Imediato | User cancela → perde acesso na hora | |
| Fim do período | Acesso até `next_billing_at` (último dia pago) | |
| **Híbrido** | `cancelled_at` set + `status='cancelled'` mas helper RLS retorna true até `next_billing_at` | ✓ |

**User's choice:** "2 híbrido."
**Notes:** Padrão SaaS justo. User pagou mês, deve ter acesso até fim do período. Reduz disputa.

---

## RLS gate scope

| Opção | Descrição | Selected |
|-------|-----------|----------|
| **Helper SQL only + doc Phase 5** | `has_active_subscription()` SQL helper agora; Phase 5 cria policy quando `lobbies` existir | ✓ (decisão Claude) |
| Policy stub em tabela placeholder | Criar tabela `lobbies` vazia agora só pra ter policy | |
| Documentar e Phase 5 implementa tudo | Phase 4 não toca em RLS gate | |

**User's choice:** "3. nao sei, voce pode deicidir o mais ideal."
**Claude's decision:** Helper SQL only + doc Phase 5 → tabela `lobbies` não existe ainda; criar stub é over-engineering. Helper é função pura testável. Pattern documentado em CONTEXT pra Phase 5 referenciar.

---

## Email aviso 5 dias antes vencimento

| Opção | Descrição | Selected |
|-------|-----------|----------|
| Vercel Cron | Schedule via vercel.json | |
| pg_cron Supabase | Postgres extension dentro do DB | |
| Supabase Edge Function | TypeScript scheduled deno runtime | |
| **Adiar pra Phase 8** | Phase 4 não envia aviso 5d; só dispara emails reativos a webhook | ✓ |

**User's choice:** "4 adia pra phase 8"
**Notes:** Phase 4 dispara apenas emails reativos a webhook (subscription.completed/renewed/cancelled). Email proativo de aviso fica polish.

---

## Webhook handler

| Opção | Descrição | Selected |
|-------|-----------|----------|
| **Roteador único** | Estender `/api/webhooks/abacatepay/route.ts` com branches `subscription.*` no switch `payload.event` | ✓ (decisão Claude) |
| Endpoint separado | Novo `/api/webhooks/abacatepay/subscriptions/route.ts` | |

**User's choice:** "5. entender o melhor e mais ideal possível."
**Claude's decision:** Roteador único → AbacatePay dashboard configura 1 endpoint pra todos eventos; mesma HMAC secret; pattern Phase 2 já é roteador por event; menos config externa = menos pontos de falha.

---

## Plan flexibilidade

| Opção | Descrição | Selected |
|-------|-----------|----------|
| **Hardcode env vars** | `ABACATEPAY_HUB_PRODUCT_ID` + `HUB_PRICE_BRL=47` em `.env.local`. Sem tabela | ✓ |
| Tabela `subscription_plans` | Schema flexível pra V2 multi-plano | |

**User's choice:** "6. inicialmente teremos apenas 1 plano. futuramente quem sabe pode haver uma variação de um plano mais premium."
**Notes:** V2 quando lançar plano premium adiciona tabela com migration própria. Sem custo agora.

---

## Trial activation

| Opção | Descrição | Selected |
|-------|-----------|----------|
| **N/A — sem trial** | Decisão #1 cancela esta categoria | ✓ |
| Trigger SQL ON INSERT steam_links | Auto-set `trial_ends_at` no DB | |
| Server Action explícita | "Iniciar trial" no flow `/vincular/steam` | |

**User's choice:** "7. nao vai ter trial."
**Notes:** Confirmação explícita de #1. Trigger SQL não criado.

---

## Página /assinatura escopo

| Opção | Descrição | Selected |
|-------|-----------|----------|
| **Minimal** | Card status + próxima cobrança + botão cancelar/iniciar | ✓ (decisão Claude) |
| Hub completo | Inclui histórico cobranças + download recibo PDF | |

**User's choice:** "8. Voce pode decidir o mais ideal tambem."
**Claude's decision:** Minimal → ship MVP faster. Histórico cobranças + recibo PDF expandem na Phase 7 (perfil expandido). Phase 4 entrega ciclo completo (assinar → cobrar → cancelar) sem feature creep.

---

## Auto-Resolved (Claude decisions)

- **D-03** (RLS gate scope): Helper SQL only + doc Phase 5
- **D-04** (Webhook handler): Roteador único existente
- **D-06** (Página /assinatura escopo): Minimal Phase 4

## Deferred Ideas

- Trial 7 dias grátis (V2 — possível reintrodução)
- Email aviso 5d antes vencimento (Phase 8)
- Tabela `subscription_plans` multi-tier (V2)
- Histórico cobranças + download recibo PDF (Phase 7)
- Cupons/desconto (V2)
- Subscription gate no middleware (Phase 5 quando `lobbies` existir)
