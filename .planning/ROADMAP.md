# formuladota v2 — Roadmap

> Roadmap derivado do PRD.md §6 + §7.1. Phases numeradas; phase 1.5 é especial (inserida entre 1 e 2 pra cultura/doutrina).

## Milestone V1 — MVP em produção (Day 1-7)

### Phase 1 — Foundation ✓ COMPLETED
**Goal:** Auth Discord + schema base + login funcional.
**Requirements:** F1.1, F1.2, F1.3, F1.4

### Phase 1.5 — Onboarding Doutrinário ✓ COMPLETED
**Goal:** Aceite obrigatório dos 14 princípios + 10 anti-padrões da Fórmula do Dota de Corrida + sistema progressivo de moderação. Bloqueia rotas privadas até user aceitar.
**Requirements:** F1.5 (cultura), §11 (moderação)

### Phase 2 — Catalog & Checkout ◆ CURRENT
**Goal:** User aceito consegue comprar pacote via PIX (AbacatePay V2 Transparent). Webhook valida pagamento (HMAC SHA-256 base64), atualiza purchase com idempotência (UPDATE conditional + UNIQUE external_payment_id), libera saldo, dispara email confirmação Resend. RLS já bloqueia compra sem aceite/status ativo (migration 004).
**Requirements:** F2.1, F2.2, F3.1, F3.2, F3.3, F3.4, F3.5, C1, C3, C5, C6, C7, C8, C9
**Plans:** 1/8 plans executed
**Acceptance:**
- Comprar pacote PIX end-to-end funciona em sandbox
- Saldo aparece em "minhas partidas" após pagamento
- Webhook duplicado NÃO duplica saldo (idempotência via `external_payment_id`)

Plans:
- [x] 02-01-shadcn-setup-PLAN.md — shadcn/ui init + Button/Card/Badge/Skeleton/Sonner + Toaster global
- [x] 02-02-abacatepay-client-PLAN.md — AbacatePay client (createTransparentPix + verifyAbacatepayWebhookSignature) + service-role Supabase client + Zod schemas
- [x] 02-03-resend-client-PLAN.md — sendPurchaseConfirmationEmail helper com idempotencyKey + template HTML cyberpunk PT-BR
- [x] 02-04-smee-tunnel-docs-PLAN.md — .env.example completo + seção "Webhook Local Dev" no README
- [x] 02-05-pacotes-page-PLAN.md — /pacotes Server Component + PackageCard + PackageGrid responsivo
- [x] 02-06-checkout-page-PLAN.md — Server Action createCheckout + /checkout/[packageId] + QRCodeDisplay + CheckoutClient
- [x] 02-07-webhook-handler-PLAN.md — POST /api/webhooks/abacatepay (HMAC + idempotência + email)
- [x] 02-08-partidas-page-PLAN.md — /partidas Server Component + SaldoCard + lista compras pagas

### Phase 3 — Profile & Scheduling ○ PENDING
**Goal:** User edita perfil (steam_id, role), Pedro define janelas, user agenda partida com saldo. Cancelamento +24h restitui.
**Requirements:** F1 (perfil completo), F4.1-F4.6 (agendamento)

### Phase 4 — Discord Bot ○ PENDING
**Goal:** Bot Discord.js com `/perfil`, `/saldo`, `/agendar`. Notifica Pedro 30min antes via DM. Hospedado em Railway free tier.
**Requirements:** F6.1-F6.5

### Phase 5 — Admin Panel ○ PENDING
**Goal:** Pedro gerencia tudo via `/admin/*` (dashboard, partidas, pacotes, clientes, agenda). Marca partida como realizada → puxa OpenDota → atualiza user_stats.
**Requirements:** F5.1-F5.5, F7.1-F7.6, F8.1-F8.4

### Phase 6 — Polish & Deploy ○ PENDING
**Goal:** Responsivo, loading/empty/error states, deploy Vercel produção, domínio configurado.
**Requirements:** F8 polish + deploy

---

## Milestone V1.5 — Pós-launch (semanas 4-8 se MVP validar)

### Phase 7 — Steam OAuth complementar ○ FUTURE
**Goal:** Tabela paralela `steam_links` + Server Action que valida Steam OpenID 2.0. Discord segue auth primário.

### Phase 8 — Anti-smurf via Discord Connections ○ FUTURE
**Goal:** Score de confiança usando endpoint `/users/@me/connections` do Discord cruzado com Steam.

### Phase 9 — Stats automatizados via OpenDota ○ FUTURE
**Goal:** Substitui input manual de match_id; sistema puxa partidas com Pedro automaticamente.

---

## Milestone V2 — Sistema próprio (mês 3-4)

### Phase 10 — Ligas internas ○ FUTURE
**Goal:** "Liga Livre" + "Mentoria Mensal" como ligas separadas com MMR isolado.

### Phase 11 — Ranking + Badges Dota 2 reskinned ○ FUTURE
**Goal:** Sistema Elo K=25 base 1000, 8 tiers Herald→Immortal × 5 estrelas, badges cyan/purple identidade Fórmula.

### Phase 12 — Histórico de temporadas + Lista de Picks via Sheets ○ FUTURE
**Goal:** Reset MMR -30% por temporada. Draft Board do Pedro vem de Google Sheets publicado (admin-friendly).

---

## Milestone V3 — Bot lobby + Multi-conta (mês 6+)

Phases 13-16 reservadas — ver `.planning/research/integrations.md`.
