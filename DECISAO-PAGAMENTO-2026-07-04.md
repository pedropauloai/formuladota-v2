# Decisão de pagamento — FORMULADOTA (2026-07-04)

## TL;DR
**Stripe vira o gateway primário das 3 regiões. Mercado Pago fica vivo atrás de uma feature flag (`PAYMENTS_MP_ENABLED`) como rede de segurança do Pix brasileiro.** Nada de MP é deletado. A migração é reversível com um toggle.

## Por que não é um "corta o MP e pronto"
A página oficial da Stripe (stripe.com/br/payment-method/pix, verificada 04/07/2026) diz textual: *"Para empresas sediadas no Brasil, no momento, o Pix é apenas para convidados."* Ou seja: **o Pix da Stripe é invite-only pra conta BR.** A sessão anterior (Fable 5) tinha assumido que era "disponibilidade geral" — estava errado.

Consequência: se cortar o MP hoje e a sua conta Stripe ainda não tiver o convite do Pix liberado, o checkout brasileiro fica **só cartão** — e o seu público BR é Pix-first. Por isso: Stripe vira o padrão, mas o MP continua ligado no BR (via flag) até você confirmar o Pix da Stripe no dashboard. Aí é só desligar a flag.

Como você tem **zero assinantes ativos**, é a hora certa de consolidar: não existe migração de dados nem cliente no meio da troca.

## Como funciona o pagamento FORA do Brasil (sem Pix)
Pix é sistema doméstico do Banco Central — só existe no Brasil. Europa e LatAm:

- **Europa (EN):** cartão em **EUR** (Plus €6,99 / Premium €19,99), assinatura recorrente automática via **Stripe Billing** (retry automático quando o cartão falha + portal de gerenciamento).
- **LatAm (ES):** cartão em **USD** (Plus US$4,99 / Premium US$17,99), mesmo esquema.
- **Checkout embutido:** Stripe Payment Element renderiza o cartão **dentro do FORMULADOTA** — sem aquele redirect que te incomodou.

## Taxas — Mercado Pago vs Stripe (2026)
| Método | Mercado Pago | Stripe |
|---|---|---|
| Pix (BR) | **0,99%** (na hora)¹ | 1,19% — **invite-only p/ conta BR** |
| Cartão crédito (BR) | 3,98%–4,98%² | 3,99% + R$0,39 |
| Cartão internacional numa conta BR | — | +2% (≈5,99% + R$0,39) |
| Cartão EEA (só com entidade europeia) | — | 1,5% + €0,25 |
| Recorrência (assinatura) | inclusa | +~0,5% (Stripe Billing) |
| Boleto | R$3,49 | n/d |

¹ 0,49% só p/ CNPJ faturando >R$15 mil/mês. ² conforme prazo de recebimento (na hora = mais caro).

**Leitura financeira:** no Pix, o MP (0,99%) é mais barato que o Stripe (1,19%), mas a diferença é ~R$0,05 por venda de R$27,90 — irrelevante. No cartão, empatam. O ponto que importa de verdade: **cartão europeu numa conta Stripe brasileira é cobrado como internacional (~6%)** — só cai pra ~2% (1,5%+€0,25) se um dia você abrir entidade na Europa. Fica no radar pra quando a Europa escalar, não agora.

## Abacate Pay — resquícios encontrados
Não existe código vivo do Abacate. Sobrou:
- `src/lib/env.ts`: vars mortas `ABACATEPAY_API_KEY` e `ABACATEPAY_WEBHOOK_SECRET`.
- `.env.example`: blocos de doc do AbacatePay.
- Comentários "vs AbacatePay" em arquivos do MP (explicativos, inofensivos).
- Docs em `.planning/phases/_deprecated/` (histórico — pode deixar).

O comando abaixo limpa as vars e os comentários.

## Antes de testar hoje — 2 portões
1. **Chaves Stripe na Vercel:** o Stripe está codado mas *inerte* (sem chave live). Cole na Vercel `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e os 6 price IDs — **nunca no chat**.
2. **Pix da Stripe:** confira no dashboard Stripe se o Pix está liberado na conta. Se não estiver, deixe `PAYMENTS_MP_ENABLED=true` e o Pix-BR segue no MP (que já funciona) — teste o Pix por lá hoje mesmo. Cartão (Stripe) você testa assim que colar as chaves.

Também: resolver as **2 tarefas de ativação** pendentes no Stripe (banner rosa).

---

## COMANDO PARA O CLAUDE CODE

```
Você está no repo formuladota-v2 (Next.js + Supabase). Decisão de negócio já tomada: consolidar pagamentos no STRIPE como gateway primário das 3 regiões, mantendo o Mercado Pago vivo atrás de uma feature flag como rede de segurança do Pix brasileiro. NÃO delete código do MP. NÃO altere os valores de preço em src/lib/subscriptions/tiers.ts. Trabalhe numa branch nova (feat/pagamento-stripe-primario) e rode typecheck/lint/testes no final.

1) LIMPEZA DO ABACATE PAY (resquício morto, sem código vivo)
   - Remova ABACATEPAY_API_KEY e ABACATEPAY_WEBHOOK_SECRET de src/lib/env.ts.
   - Remova os blocos AbacatePay do .env.example.
   - Limpe os comentários que citam AbacatePay em src/lib/mercadopago/client.ts, src/app/api/webhooks/mercadopago/route.ts, src/app/checkout/[packageId]/actions.ts e src/components/checkout/qr-code-display.tsx (só o comentário, não mude lógica).
   - Confirme com `grep -ri abacate src/` que ficou vazio. Deixe os docs em .planning/phases/_deprecated/ como estão.

2) FEATURE FLAG DO MERCADO PAGO
   - Crie a env server-side PAYMENTS_MP_ENABLED (default "true") em src/lib/env.ts e documente no .env.example.
   - Crie um resolvedor server-side resolvePaymentProvider(region) que retorna "mp" só se region === "BR" && PAYMENTS_MP_ENABLED === true; senão "stripe". Use-o nos call sites de criação de checkout/assinatura (src/app/actions/subscription.ts, src/app/checkout/[packageId]/actions.ts, src/components/plans/subscription-panel.tsx). Refatore providerForRegion() em tiers.ts para delegar a esse resolvedor onde fizer sentido.
   - CRÍTICO: os dois webhooks (/api/webhooks/mercadopago e /api/webhooks/stripe) devem continuar processando SEMPRE, independente da flag — não perder pagamento em andamento.

3) STRIPE COMO PRIMÁRIO (inclusive BR quando a flag do MP estiver off)
   - Adicione envs de preço BRL: STRIPE_PRICE_PLUS_BRL e STRIPE_PRICE_PREMIUM_BRL em env.ts e .env.example.
   - Atualize scripts/stripe-setup.ts para criar os Products/Prices recorrentes em BRL, USD e EUR (Plus e Premium) e imprimir os price IDs pra eu colar na Vercel.
   - No fluxo Stripe do BR, inclua "card" e "pix" em payment_method_types, com um comentário avisando que o Pix da Stripe é invite-only p/ conta BR e pode não aparecer até liberação — o código NÃO pode quebrar se o Pix não estiver ativo.
   - Modelo de cobrança: cartão = assinatura recorrente via Stripe Billing (usa os price IDs); Pix = pagamento avulso que concede 30 dias e exige renovação manual. Reaproveite a lógica de "conceder 30 dias" que já existe pro MP.

4) CHECKOUT EMBUTIDO (sem redirect)
   - Implemente o checkout com Stripe Payment Element embutido em /planos (e /checkout), renderizando cartão (e Pix QR, se disponível) DENTRO do FORMULADOTA — nada de redirect externo.
   - Pro MP (quando a flag estiver on), mantenha o fluxo atual funcionando; embutir o cartão via Bricks é bônus, não prioridade.

5) AMBIENTE / PENDÊNCIAS
   - No final, liste EXATAMENTE os nomes das envs que eu preciso setar na Vercel (só os nomes; eu colo os valores lá): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_{PLUS,PREMIUM}_{BRL,USD,EUR} e mantenha PAYMENTS_MP_ENABLED=true por enquanto.
   - Me lembre de: resolver as 2 tarefas de ativação no dashboard Stripe (banner rosa) e conferir se o Pix está liberado na conta antes de desligar o MP no BR.

6) QUALIDADE
   - Rode `pnpm tsc --noEmit`, `pnpm lint` e `pnpm vitest run`. Corrija o que quebrar. Adicione testes do resolvePaymentProvider e do gating da flag.
   - Commits pequenos; me mostre um resumo do diff no final.

CRITÉRIOS DE ACEITE
   - `grep -ri abacate src/` = vazio.
   - PAYMENTS_MP_ENABLED=true → BR segue no MP (Pix funciona hoje). =false → BR roteia pro Stripe (cartão + Pix se liberado). Europa/LatAm sempre Stripe cartão, checkout embutido.
   - Build, typecheck, lint e testes verdes.
```
