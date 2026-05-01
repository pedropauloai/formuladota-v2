---
phase: 02-catalog-checkout
plan: 04
status: complete
completed_at: 2026-05-01
commits:
  - 180bc6e docs(02-04): .env.example com vars Phase 2 + setup smee.io
  - 608f090 docs(02-04): seção Webhook Local Dev no README (smee.io + ngrok fallback)
key-files:
  modified:
    - .env.example
    - README.md
---

# Plan 02-04: smee.io tunnel docs — SUMMARY

## What was built

Plano de documentação puro — zero código de aplicação:

1. **`.env.example`** — Template completo de env vars Phase 2 com:
   - 4 seções organizadas por phase (Supabase, Discord, AbacatePay, Resend, App)
   - Comentários explicativos PT-BR em cada seção
   - Bloco "DEV ONLY — Tunnel webhook local com smee.io" com 5 passos numerados
   - Comando exato `pnpm dlx smee-client --url ... --target ...`
   - Referência ao endpoint AbacatePay `simulate-payment` (sandbox)
   - Linha `SMEE_CHANNEL_DEV=https://smee.io/_______` como referência manual (não env var)

2. **`README.md`** — Nova seção `## Webhook Local Dev (Phase 2 — AbacatePay PIX)`, posicionada antes da seção "Stack":
   - Setup (uma vez): criar canal smee.io + cadastrar webhook AbacatePay com 3 eventos `transparent.*`
   - Rodar (toda vez): 3 terminais com comandos exatos (smee-client, pnpm dev, curl simulate-payment)
   - Fallback: ngrok com nota sobre conta agora obrigatória
   - Debug 401: 2 sinais para investigar (secret bate? `request.text()` antes de parse?)

## Decisions

- **smee.io recomendado**: sem conta, sem rate limit em dev. ngrok fica como fallback explícito.
- **Comando inline em README**: Pedro (beginner) deve achar comando sem ler RESEARCH.md (44k linhas). README é primeiro lugar.
- **Eventos webhook listados explicitamente**: `transparent.completed`, `transparent.disputed`, `transparent.refunded` — evita erro de cadastrar `checkout.*` por hábito.
- **Pitfall debug em README**: reduz tickets de support — Pedro mesmo descobre se HMAC falhar.

## Validation gates

- ✓ `.env.example` contém: `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✓ `.env.example` tem `smee` e `smee-client`
- ✓ `EMAIL_FROM=onboarding@resend.dev` como default
- ✓ `NEXT_PUBLIC_SITE_URL=http://localhost:3000` como default
- ✓ README contém heading `## Webhook Local Dev`
- ✓ README contém `pnpm dlx smee-client`, `https://smee.io`, `/api/webhooks/abacatepay`, `transparent.completed`, `ABACATEPAY_WEBHOOK_SECRET`, `ngrok`, `simulate-payment`
- ✓ Conteúdo existente do README NÃO removido (file size cresceu)

## Requirements satisfied

- F3.4 (webhook validation HMAC) — docs de setup operacional
- C8 (HMAC validation) — debug section orienta Pedro a checar secret + raw body

## Next up

Plan 02-07 (webhook handler) usa essa infra documentada. Quando Pedro for testar end-to-end, segue só o README — sem caçar em RESEARCH.md.
