# Phase 4 Mercado Pago — Pausada (Não Deprecada)

**Data pausa:** 2026-05-23
**Decisão:** Pedro Paulo
**Estado ao pausar:** Researcher rodando, sem PLAN.md ainda

## Por quê

Pedro criou Milestone V2.5 Design Foundations AAA que precede tudo. Phase 4 MP retoma DEPOIS porque:

1. Telas de assinatura (`/assinatura`, fluxo Pix Automático) precisam nascer com design system AAA aplicado — refazê-las depois seria desperdício.
2. Webhook handler MP é trabalho server-side puro — independe de design — mas o fluxo de checkout é UX crítica.

## O que preservar ao retomar

- `04-RESEARCH.md` — research Mercado Pago Pix Automático ainda válido. API `/v1/preapproval` lançada Bacen jun/2025, MCP MP já configurado (precisa autenticação OAuth).
- Decisão arquitetural: descartado AbacatePay PIX Manual via Cron (que era fallback) em favor do Pix Automático nativo.

## Quando retomar

Após Milestone V2.5 completo (6 docs fundacionais + design system + componentes base). Re-rodar `/gsd:plan-phase` pra regenerar PLAN.md com design system disponível.
