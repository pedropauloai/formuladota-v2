---
status: partial
phase: 02-catalog-checkout
source: [02-VERIFICATION.md]
started: 2026-05-01T22:00:00Z
updated: 2026-05-01T22:00:00Z
---

## Current Test

[awaiting human testing — 7 items que requerem browser/DB live]

## Tests

### 1. Login Discord end-to-end (Phase 1.5 carry-over + Phase 2 unlock)
expected: Login com Discord → trigger handle_new_user cria profile → /onboarding/doutrina aparece → aceitar → redirect /perfil. Após aceitar, /pacotes acessível.
result: [pending]
how_to: |
  pnpm dev
  Browser: localhost:3000 → Login com Discord → autorizar
  DB check: select id, doctrine_accepted_at from profiles where id=auth.uid()
how_to_fix_if_fails: |
  - Bot Discord não instalado? checar task #12
  - Callback URL no Discord Dev Portal aponta pra Supabase callback?
  - RLS profiles policy de SELECT permite user ver próprio?

### 2. Comprar pacote PIX end-to-end (sandbox)
expected: /pacotes → click "Comprar" em qualquer pacote → /checkout/[uuid] → QR Code (PNG inline brCodeBase64 + texto brCode copiável) aparece. DB: purchases criada com status='pendente' + external_payment_id preenchido.
result: [pending]
how_to: |
  Browser: localhost:3000/pacotes → click Avulsa
  Network tab: POST /v2/transparents/create retorna success:true
  DB: select id, status, external_payment_id from purchases where user_id=auth.uid() order by created_at desc limit 1

### 3. Webhook simulate-payment + saldo libera
expected: Após simulate-payment AbacatePay sandbox, webhook recebe transparent.completed → purchase.status='pago' → /partidas mostra saldo agregado correto.
result: [pending]
how_to: |
  Terminal 1: pnpm dlx smee-client --url https://smee.io/SEU-CANAL --target http://localhost:3000/api/webhooks/abacatepay
  Terminal 2: pnpm dev
  Terminal 3: curl -X POST "https://api.abacatepay.com/v2/transparents/simulate-payment?id=PIX_ID" -H "Authorization: Bearer $ABACATEPAY_API_KEY"
  DB: select status, partidas_compradas from purchases where external_payment_id='PIX_ID'  → 'pago'
  Browser: /partidas → SaldoCard mostra X partidas disponíveis

### 4. Idempotência — webhook duplicado NÃO duplica saldo
expected: Disparar simulate-payment 2x. Primeira chamada: purchase.status='pago' (libera saldo). Segunda chamada: webhook retorna 200 mas SQL UPDATE afeta 0 rows (status já era 'pago'). Saldo permanece igual.
result: [pending]
how_to: |
  curl POST simulate-payment 2x consecutivos
  DB count: select count(*) from purchases where external_payment_id='PIX_ID'  → 1 (não duplica row)
  DB amount: select partidas_compradas from purchases where external_payment_id='PIX_ID'  → mesmo valor (não dobra)
  Logs Vercel/console: 2º webhook log "purchase já processada" (esperado)

### 5. Email confirmação Resend
expected: Após simulate-payment success, email "Pagamento confirmado — {pacote}" enviado para email do user (auth.users.email). idempotencyKey previne duplicação.
result: [pending]
how_to: |
  Resend dashboard → Emails → ver entrada com subject "Pagamento confirmado — Avulsa" status delivered
  Disparar simulate-payment 2x → Resend mostra apenas 1 envio (idempotencyKey)

### 6. RLS bloqueia compra sem aceite/status ativo
expected: User sem aceite OU com behavior_status='suspended' tenta /pacotes → click → /checkout/[id] → Server Action createCheckout retorna error com mensagem amigável (nunca permite INSERT).
result: [pending]
how_to: |
  Sim suspended via SQL: update profiles set behavior_status='suspended', suspended_until=now()+'7 days' where id='{pedro-id}'
  Browser: /pacotes → comprar → ver erro amigável
  Reverter: update profiles set behavior_status='ok', suspended_until=null where id='{pedro-id}'

### 7. HMAC inválido → 401
expected: curl POST /api/webhooks/abacatepay com X-Webhook-Signature inválida retorna 401.
result: [pending]
how_to: |
  curl -X POST http://localhost:3000/api/webhooks/abacatepay \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Signature: invalid" \
    -d '{"event":"transparent.completed","data":{"transparent":{"id":"x","amount":1000,"status":"PAID"}}}'
  → HTTP 401

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none — todos automated must-haves passaram, items abaixo são manual gates]

## Notes

- Phase 2 verification COMPLETE per gsd-verifier. Status `human_needed` significa: code está pronto, falta Pedro confirmar comportamento real em browser/DB live.
- Pedro pode rodar `/gsd:verify-work 02` quando tiver tempo, daí marcar pass/issue em cada test.
- Aviso menor: `createCheckout()` em src/app/checkout/[packageId]/actions.ts tem 54 linhas (4 acima do C2 limit). Pode ser refatorado oportunisticamente extraindo helper `cleanupOnPaymentFailure()`. Não bloqueia.
