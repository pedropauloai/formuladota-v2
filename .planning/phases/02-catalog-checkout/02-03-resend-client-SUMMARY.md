---
phase: 02-catalog-checkout
plan: 03
status: complete
completed_at: 2026-05-01
commits:
  - 11b3f1e chore(02-03): instalar dependência resend@6.12.2
  - f32ea8d feat(02-03): sendPurchaseConfirmationEmail com idempotencyKey (Resend SDK v6)
key-files:
  created:
    - src/lib/resend.ts
  modified:
    - package.json
    - pnpm-lock.yaml
---

# Plan 02-03: Resend client — SUMMARY

## What was built

Helper único `sendPurchaseConfirmationEmail` em `src/lib/resend.ts` (95 linhas):
- Lazy init `getResend()` — `RESEND_API_KEY` só validada no primeiro envio (evita falha em build)
- Função pública `sendPurchaseConfirmationEmail(input): Promise<void>` — falhas viram `console.error` mas não propagam (email é side-effect não-crítico do webhook conforme CONTEXT.md)
- Template HTML inline em PT-BR com tema cyberpunk (#050505 bg + #00F0FF cyan + #0a0a1a card + tipografia Space Grotesk)
- `idempotencyKey: \`purchase-confirmed-${purchaseId}\`` — previne envios duplicados se webhook rodar 2x (Pitfall 5 do RESEARCH)

## Decisions

- **Resend SDK v6 mudou API**: `idempotencyKey` agora vai no SEGUNDO argumento `options` de `resend.emails.send(payload, options)`, não no body do email. Detectado via `pnpm typecheck` durante implementação — corrigido inline.
- **`process.env.EMAIL_FROM` direto** em vez de `requireServerEnv` — `EMAIL_FROM` é opcional (default `onboarding@resend.dev`), `requireServerEnv` é só pra obrigatórias.
- **Template HTML inline string**: rejeitada lib React Email (deferred per CONTEXT.md "minor improvement futuro"). Template manual vai gerar boa entrega em Resend mesmo simples.
- **Try/catch interno** ao redor de `resend.emails.send()`: defensivo. Resend SDK não deveria throw mas isolar é mais seguro — webhook já liberou saldo, não pode quebrar por email.

## Validation gates

- ✓ `pnpm typecheck` exit 0 (zero `any`)
- ✓ `pnpm lint` exit 0
- ✓ `resend@6.12.2` em deps
- ✓ `idempotencyKey` em `src/lib/resend.ts`
- ✓ Cores cyberpunk (`#00F0FF`, `#050505`) no template
- ✓ Zero `.then(` ou `.catch(` em chains (try/catch block puro)

## Requirements satisfied

- F3.5 (Email confirmação via Resend) — pronto pra invocação em Plan 02-07
- C1 (TypeScript strict zero any) ✓
- C3 (Zod inputs) — não aplicável (input vem do próprio webhook validado em Plan 02-02)

## Next up

Plan 02-07 (webhook handler) vai importar e chamar via wrapper async fire-and-forget:
```ts
async function sendConfirmationSafely(...) { try { await sendPurchaseConfirmationEmail(...) } catch (err) { console.error(...) } }
void sendConfirmationSafely(...);
```
(Pattern definido na revisão 1/3 do plan-checker — sem `.catch()` chains.)
