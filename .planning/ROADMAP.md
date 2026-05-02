# formuladota v2 — Roadmap

> Reflete pivô estratégico 2026-05-01: formuladota = HUB Dota 2 (não loja de mentoria 1-1).
> Milestone V1 cumprido (Foundation + Doutrina + Pagamento Avulso).
> Milestone V2 em execução = HUB.

---

## Milestone V1 — Foundation, Doutrina, Pagamento Avulso ✓ COMPLETED

### Phase 1 — Foundation ✓ COMPLETED
**Goal:** Auth Discord + schema base + login funcional.
**Requirements:** F1.1, F1.2, F1.3, F1.4

### Phase 1.5 — Onboarding Doutrinário ✓ COMPLETED
**Goal:** Aceite obrigatório dos 14 princípios + 10 anti-padrões + sistema progressivo de moderação.
**Requirements:** F1.5 (cultura), §11 (moderação)

### Phase 2 — Catalog & Checkout ✓ COMPLETED
**Goal:** Checkout PIX avulso end-to-end (AbacatePay Transparent + idempotência + webhook HMAC + email).
**Requirements:** F2.1, F2.2, F3.1, F3.2, F3.3, F3.4, F3.5, C1, C3, C5, C6, C7, C8, C9
**Status pós-pivô:** Funcional. Vira "loja de coaches" no refator de Phase 3 (multi-coach schema). UI atual `/pacotes` continua válida — só ganha campo coach.

Plans:
- [x] 02-01-shadcn-setup
- [x] 02-02-abacatepay-client
- [x] 02-03-resend-client
- [x] 02-04-smee-tunnel-docs
- [x] 02-05-pacotes-page
- [x] 02-06-checkout-page
- [x] 02-07-webhook-handler
- [x] 02-08-partidas-page

---

## Milestone V2 — HUB Dota 2 ◆ CURRENT

### Phase 3 — Steam OAuth + Roles + Multi-coach Refactor ◆ IN PROGRESS
**Goal:** Steam OAuth obrigatório (vinculado ao Discord). Sistema de roles (admin/coach/player). Refator schema `packages` pra `coach_id` FK + `coaches` table com Pedro como coach #1.
**Requirements:** H1.1, H1.2, H1.3, H1.4
**Plans:** 5 plans em 2 waves (1/5 completed)
**Acceptance:**
- User loga Discord → vê página vincular Steam → autoriza OpenID 2.0 → `steam_links` populada com SteamID 64
- Tabela `coaches` com Pedro inserido (FK profiles.id)
- `packages` ganha `coach_id NOT NULL`, todos os 4 pacotes ligados ao Pedro
- `/pacotes` mostra "Por: Pedro Paulo (Immortal)" no PackageCard
- `profiles.role` ('admin','coach','player') default 'player' — Pedro = admin AND coach

Plans:
- [x] 03-01-migration-005-PLAN.md — Migration 005 (coaches, steam_links, profiles.role, packages.coach_id, helpers RLS, seed Pedro) + types regen
- [x] 03-02-steam-client-env-PLAN.md — Install node-steam-openid + STEAM_WEB_API_KEY env + src/lib/steam.ts (3 helpers tipados)
- [x] 03-03-vincular-steam-page-PLAN.md — Server Action signInWithSteam + callback /auth/steam/callback + página /vincular/steam
- [x] 03-04-middleware-steam-gate-PLAN.md — Middleware update com STEAM_REQUIRED_PATHS layer (após doutrina)
- [x] 03-05-multicoach-refactor-PLAN.md — Refator PackageCard + /pacotes/page.tsx (2-query JOIN coaches+profiles)

### Phase 4 — Subscription Mensal (PIX Manual Mensal) ○ PENDING
**Goal:** Mensalidade R$47/mês via **PIX Manual Mensal** (Vercel Cron + Transparent PIX existente Phase 2). Sem trial. RLS gate via helper SQL pra Phase 5 consumir. **Mudança pós-research 2026-05-02:** AbacatePay subscription nativa suporta apenas CARD; Pedro escolheu PIX Manual pra manter alinhamento com mercado BR PIX-first.
**Requirements:** H2.1, H2.2, H2.3, H2.4
**Acceptance:**
- Migration 008 cria 2 tabelas: `subscriptions` (id, user_id, status, started_at, next_due_at, cancelled_at) + `subscription_charges` (id, subscription_id, purchase_id FK reusa Phase 2 idempotência, period_start, period_end, status) + helper `public.has_active_subscription()` SQL + RLS (user vê próprias subscriptions/charges, INSERT subscriptions cookie client, INSERT charges service-role only)
- `src/lib/abacatepay.ts` SEM mudanças (reusa `createTransparentPix()` existente)
- `src/lib/resend.ts` extendido com 3 builders email: `sendSubscriptionChargeCreatedEmail` (QR Code embed), `sendSubscriptionChargePaidEmail`, `sendSubscriptionOverdueEmail`
- `src/lib/env.ts` adiciona `HUB_PRICE_BRL=47` + `CRON_SECRET` (32+ chars)
- Webhook handler `/api/webhooks/abacatepay/route.ts` ganha lookup `subscription_charges WHERE purchase_id=?` no `handlePaymentCompleted` — se existe, chama `processSubscriptionRenewal()` (UPDATE next_due_at += 30d, status='active', email charge_paid). Caso contrário, fluxo Phase 2 normal (libera saldo)
- NOVO endpoint `/api/cron/subscriptions/charge-due/route.ts` — Vercel Cron diário (`0 9 * * *` UTC = 06:00 BRT). Valida `Authorization: Bearer ${CRON_SECRET}` via timingSafeEqual. Service-role client. Faz: (a) charge-due — busca subscriptions com `next_due_at <= now() + 5d` sem charge pending → cria Transparent PIX + INSERT charge + email. (b) sweep-overdue — `next_due_at < now() - 5d AND status='active'` → status='overdue' + email overdue. Retorna `{ ok: true, charged: N, overdue: M }`
- Server Actions `createInitialSubscription()`, `cancelSubscription()`, `reactivateSubscription()` em `src/app/assinatura/actions.ts` — cookie client (per C13)
- Página `/assinatura` Server Component cyberpunk minimal: card status (Pendente/Ativa/Cancelada/Overdue/Expirada), QR Code embed quando pendente, `next_due_at` formatado PT-BR, botões contextuais
- Cancel flow híbrido: `cancelled_at` set + status `cancelled` mas helper retorna true até `next_due_at`. Cron NÃO cria PIX pra subscriptions cancelled
- `vercel.json` cria com `{ "crons": [{ "path": "/api/cron/subscriptions/charge-due", "schedule": "0 9 * * *" }] }`
- Email aviso 5d ANTES vencimento → DEFERIDO PHASE 8 (Phase 4 só envia AFTER overdue)
- Subscription gate no middleware → DEFERIDO PHASE 5 (lobbies não existe)

### Phase 5 — Bot Steam Lobby Creator ○ PENDING
**Goal:** Bot `node-dota2` rodando 24/7 em Railway Hobby (~$3/mês). Cria lobby Dota 2 customizado, captura match_id ao final.
**Requirements:** H3.1, H3.2, H3.3, H3.4, H3.5, H3.6
**Acceptance:**
- Pasta `bot/` com Dockerfile + Railway config
- Bot autentica via refresh JWT (`steam-user` v5 + `steam-totp`), persiste em volume
- Endpoint internal API: criar lobby retorna `{lobby_id, password}`
- Bot fica como espectador, captura `dota_match_id` ao fim → webhook interno → app
- Conta Steam dedicada (não Pedro), maturação 30+ dias antes de uso

### Phase 6 — Sistema de Ligas + MMR + Temporadas ○ PENDING
**Goal:** Matchmaking interno (mesmo MMR alvo). MMR Elo K=25 base 1000. Temporadas 3 meses com decay -30%.
**Requirements:** H4.1, H4.2, H4.3, H4.4
**Acceptance:**
- Tabela `seasons` com temporada inicial criada
- `player_season_mmr` com base 1000
- Trigger `on_match_completed` aplica delta MMR Elo
- Página `/criar-lobby` (estilo meta-liga.ggarena.pro) com filtros liga/modo/senha

### Phase 7 — Badges + Ranking + Perfil Expandido ○ PENDING
**Goal:** Tiers Herald→Immortal × 5 estrelas (badges cyberpunk reskinned). Página /ranking espelhando meta-liga. Perfil com identidades vinculadas + Stratz GraphQL.
**Requirements:** H5.1, H5.2, H5.3, H5.4
**Acceptance:**
- Função SQL `mmr_to_tier(mmr)` retorna tier+stars
- Página `/ranking` com top 3 + lista paginada + busca
- Página `/perfil/[steamid64]` com cards de stats + identidades + histórico temporadas
- Componente `<TierBadge>` reusável

### Phase 8 — Painel Admin + Painel Player + Polish + Deploy ○ PENDING
**Goal:** `/admin/*` (Pedro gerencia tudo). `/me` (player). Header/footer global. Landing reformulada. Deploy Vercel + DNS formuladota.com.
**Requirements:** H6.1-H6.5, H7.1-H7.6
**Acceptance:**
- `/admin/dashboard` com KPIs, `/admin/users`, `/admin/temporadas`, `/admin/lobbies`
- `/me` com status assinatura + matches + ranking + identidades + bio editável
- Header global com logo + nav + auth dropdown
- Landing reformulada com hero CTA primário "Entrar com Discord"
- Deploy Vercel produção + DNS Route 53

---

## Milestone V3 — Multi-Coach Marketplace (futuro) ○ PLANNED

- Coach onboarding (KYC fiscal CPF/CNPJ)
- Split de payment plataforma 20% / coach 80% (AbacatePay split ou manual)
- Coach dashboard (vendas, agendamentos, histórico)
- Reviews e avaliações de coaches

---

## Milestone V4 — Comunidade Avançada (futuro) ○ PLANNED

- Multi-redes vinculadas (YouTube, Twitch, X) — anti-smurf cross-validation
- Forum próprio
- Sistema de amigos + chat real-time WebSocket
- Notificações push
- Premium mobile responsive
