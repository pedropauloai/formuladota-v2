# formuladota v2 — Requirements

> Atualizado pós-pivô 2026-05-01. Requirements do Milestone V1 (F1-F8) ficam como histórico cumprido. Milestone V2 (HUB) usa prefixo H.

---

## Milestone V1 — Foundation ✓ COMPLETED

### F1 — Auth & Profile (Phase 1)
- **F1.1** Discord OAuth via Supabase Auth (único método V1)
- **F1.2** Profile salva: discord_id, email, username, avatar_url
- **F1.3** User edita profile próprio
- **F1.4** Pedro tem flag `is_admin = true`
- **F1.5** Aceite doutrinário versionado, obrigatório antes de checkout (Phase 1.5)

### F2 — Pacotes / F3 — Compra & Pagamento (Phase 2 — vira "loja de coaches" pós-Phase 3)
- **F2.1** Pacotes têm: nome, descricao, tipo (avulso|mensal), qtd_partidas, qtd_sessoes, preco_brl, ativo
- **F2.2** Catálogo público
- **F3.1-F3.5** Checkout PIX avulso end-to-end (idempotência, HMAC, Resend email)

---

## Milestone V2 — HUB Dota 2 (em execução) ◆ CURRENT

### H1 — Steam OAuth + Roles + Multi-coach Schema (Phase 3)

- **H1.1** Steam OAuth via OpenID 2.0 — flow integrado com Supabase Auth (tabela paralela `steam_links` com SteamID 64, persona, avatar). NÃO substitui Discord — adiciona.
- **H1.2** Multi-redes sociais vinculadas (Discord obrigatório, Steam obrigatório, YouTube/Twitch/X opcionais V2). Estrutura pronta pra todas, UI mostra Steam-only inicial.
- **H1.3** Sistema de roles: `profiles.role` enum check ('admin','coach','player') default 'player'. Permissões diferenciadas via RLS.
- **H1.4** Multi-coach schema: tabela `coaches` (FK profiles.id, slug, bio, ativo). Refator `packages.coach_id NOT NULL`. Pedro = coach #1 desde o seed.

### H2 — Subscription Mensal (Phase 4)

> **⚠ MUDANÇA pós-research 2026-05-02:** AbacatePay subscription nativa suporta APENAS CARD (não PIX). Pedro escolheu Opção 2 — **PIX Manual Mensal via Vercel Cron + Transparent PIX** (mantém alinhamento mercado BR PIX-first). H2.1-H2.4 atualizados refletindo nova arquitetura.

- **H2.1** Mensalidade R$ 47/mês via **PIX Manual Mensal**: Vercel Cron (`/api/cron/subscriptions/charge-due`, schedule `0 9 * * *` UTC) gera Transparent PIX (`POST /v2/transparents/create`) pra cada subscription ativa próximo do vencimento (5 dias antes), persiste em `subscription_charges` (FK `purchases` reusa idempotência Phase 2), envia email Resend com QR Code. Cron também faz sweep de inadimplência: `subscriptions WHERE next_due_at < now() - 5d AND status='active'` → status `overdue`.
- **H2.2** ~~Trial 7 dias grátis~~ — REMOVIDO em discuss-phase 2026-05-02. Coluna `profiles.trial_ends_at` permanece null em V1 (preservada pra possível reintrodução V2).
- **H2.3** RLS gate via helper SQL `public.has_active_subscription()` retorna true quando `subscriptions.status IN ('active','cancelled') AND next_due_at > now()` (cancel híbrido — acesso até fim do período pago). Phase 4 cria APENAS o helper; Phase 5 consome em policy `lobbies.insert WITH CHECK (public.has_active_subscription())` quando `lobbies` existir.
- **H2.4** Página `/assinatura` minimal: card status (Pendente/Ativa/Cancelada/Overdue/Expirada), `next_due_at` formatado PT-BR, QR Code embed quando status pendente, botões contextuais (Iniciar/Cancelar/Reativar/Pagar agora). Webhook reusa `transparent.completed` Phase 2 (lookup `subscription_charges WHERE purchase_id=?` diferencia renewal de purchase avulsa). Email aviso 5 dias ANTES do vencimento — DEFERIDO PHASE 8; Phase 4 envia: `subscription_charge_created` (com QR), `subscription_charge_paid` (renovação ok), `subscription_overdue` (5 dias após não-pagamento).

### H3 — Bot Steam Lobby (Phase 5)

- **H3.1** Bot Steam autentica via refresh JWT (200d). Setup inicial gera token via TOTP (`steam-totp`). Token persistido em volume Docker.
- **H3.2** Pasta `bot/` separada com Dockerfile + Railway config. Comunicação com app via API interna (HTTP key-auth).
- **H3.3** Endpoint `bot.createLobby(matchOptions)` cria lobby Dota customizado, retorna lobby_id + password. Bot fica como espectador até fim do jogo.
- **H3.4** Captura `dota_match_id` ao fim → webhook interno → app atualiza `matches.status='completed'`.
- **H3.5** Conta Steam dedicada (não Pedro). Maturação 30+ dias antes de uso. Volume Docker isolado.
- **H3.6** Failure handling: bot offline = match status `bot_unavailable`, retry após 5min, alert admin via Discord webhook.

### H4 — Sistema de Ligas + MMR + Temporadas (Phase 6)

- **H4.1** Matchmaking interno simples (ordena fila por MMR, agrupa 10 mais próximos). V1 sem ranqueamento avançado por hero/role.
- **H4.2** MMR Elo: base 1000, K=25, calc baseado em MMR médio do time vs adversário.
- **H4.3** Tabela `seasons` com `started_at`, `ended_at`, `prize_pool` (placeholder), `active`. Reset MMR -30% ao iniciar nova season. Histórico imutável em `player_season_mmr`.
- **H4.4** Trigger `on_match_completed`: atualiza MMR dos 10 jogadores + `wins/losses` do season. `last_match_at` em profile.

### H5 — Badges + Ranking + Perfil (Phase 7)

- **H5.1** Função SQL `mmr_to_tier(mmr)` retorna tier (1-8) + estrelas (0-5). Mapeia MMR interno pra tier visual Herald-Immortal.
- **H5.2** Badges PNG/SVG cyberpunk reskinned (cyan/purple sobrepostos a referência Dota oficial). Componente `<TierBadge tier={n} stars={s} />`.
- **H5.3** Página `/ranking` com top 3 cards destacados + lista paginada com busca (nickname OU SteamID).
- **H5.4** Página `/perfil/[steamid64]` pública (ou `/me`): cards de stats agregados, top heróis (via Stratz GraphQL), identidades vinculadas (Discord/Steam), histórico de temporadas.

### H6 — Painel Admin + Painel Player (Phase 8 parte 1)

- **H6.1** `/admin/dashboard`: KPIs (receita mês, assinantes ativos, lobbies criados, novos users), filtros por período.
- **H6.2** `/admin/users`: tabela com filtros (role, status assinatura, behavior_status). Botão conceder/revogar role coach.
- **H6.3** `/admin/temporadas`: CRUD seasons, configurar prize_pool, encerrar season manualmente.
- **H6.4** `/admin/lobbies`: lista lobbies ativos com bot status, intervir manualmente se preciso.
- **H6.5** `/me`: status assinatura, próximas partidas, ranking atual, histórico, identidades vinculadas. Editar bio.

### H7 — Polish + Deploy (Phase 8 parte 2)

- **H7.1** Header global (`<Header />`): logo Fórmula Dota → /, nav (Pacotes, Ranking, Lobbies, Código de Conduta), dropdown auth state (login OU avatar+menu).
- **H7.2** Footer global (`<Footer />`): código de conduta, Discord oficial, copyright, créditos.
- **H7.3** Landing reformulada: hero CTA primário "Entrar com Discord" + secundário "Ver Pacotes". Sections: "Como funciona" (3 passos), "Cultura" (link código de conduta). ~~Section "Mentor" (Pedro Immortal)~~ — REMOVIDA pós-pivot 2026-05-02 (sem menção Pedro). Mobile responsive. **Substituída por requisito B5 — landing redesign Phase 3.5.**
- **H7.4** ~~Bug fix textual `sessãoões → sessões`~~ — JÁ FEITO em Phase 3.1 (commit 2906e78).
- **H7.5** Error boundary em todas rotas (já tem `src/app/error.tsx` global, validar abrangência).
- **H7.6** Deploy Vercel produção + domínio `formuladota.com` via Route 53. ~~Webhooks AbacatePay~~ → **Webhooks Mercado Pago** reapontados pra produção pós-Phase 4 migration.

---

### B — Brand & Design System (Phase 3.5) ◆ NEW 2026-05-02

> Pedro entregou logos reais + escolheu paleta vermelho/preto + decidiu rebrand seguindo design oficial site Dota 2 (https://www.dota2.com/home).

- **B1** Brand string **FORMULADOTA** (maiúsculo, sem acento, sem espaço) em **toda user-facing string**: title metadata, header logo text, footer, emails, todas pages. Internal docs (`.planning/`, `CLAUDE.md`, `PRD.md`) podem manter "formuladota v2" como nome técnico do projeto. Grep audit `grep -rE "Fórmula Dota|FormulaDota|Formula Dota|formuladota" src/app src/components src/lib/resend.ts public README.md` retorna zero matches em strings JSX/literais user-facing.
- **B2** Paleta visual **Dota 2 oficial** (substitui cyberpunk cyan+purple). Tokens em `src/styles/globals.css` `@theme` block: `--color-bg: #000000` (preto puro Dota), `--color-bg-elevated: #0A0A0A`, `--color-border: #1F1F1F`, `--color-brand-red: #B91C1C` (Tailwind red-700, alinha com vermelho do logo), `--color-brand-red-dark: #7F1D1D` (red-900 hover), `--color-text: #F5F5F5` (off-white igual Dota), `--color-text-muted: #A1A1AA`, `--color-text-faded: #71717A`. Grep `grep -rE "00F0FF|A855F7" src/` retorna zero pós-implementação.
- **B3** Logos servidos via `public/brand/`: `logo-horizontal.png` (wordmark FORMULA**DOTA**) + `logo-icon.jpg/png` (ícone "F"). Header usa `<Image src="/brand/logo-horizontal.png" />` via `next/image`. Favicon (`src/app/favicon.ico` ou `app/icon.tsx`) usa logo-icon. Disclaimer footer: "Dota e o logotipo do Dota são marcas e/ou marcas registradas da Valve Corporation."
- **B4** Tipografia (Google Fonts via `next/font/google` em `src/app/layout.tsx`): **Cinzel** (weights 600/700/900, `--font-display`) substitui Space Grotesk em headings de impacto; **Marcellus** (400, `--font-serif`) em subheadings/quotes; **Inter** (400/500/600/700, `--font-sans`) substitui sans-serif default em body/nav/buttons. JetBrains Mono REMOVIDO do UI (sem font-mono em pages). Tailwind `font-display`, `font-serif`, `font-sans` mapeados via `@theme` CSS variables.
- **B5** Landing `/` REFEITA do zero (não rebrand incremental) com hero video oficial Dota 2 (`https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm` + mp4 fallback) via `<HeroVideo />` componente reutilizável + sections inspiradas dota2.com/home (Hero CAPS Cinzel + Manifesto + Como Funciona 3 steps + Cultura callout + Final CTA). Componente `src/components/dota/hero-video.tsx` aceita `heroSlug` prop pra renderizar video idle de qualquer hero (estrutura URL `cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{slug}.webm`). Quando aparecer estatística/perfil de hero específico em qualquer page → usar `<HeroVideo heroSlug="..." />` (regra universal).
- **B6** ZERO menção a "Pedro Paulo" / "PPA" / "peterppa" / "Pedro" em **user-facing strings** (UI/emails/metadata). Grep `grep -rE "Pedro Paulo|PPA|peterppa|\\bPedro\\b" src/app src/components src/lib/resend.ts public` retorna zero. Bio coach em DB atualizada via Migration 009 (UPDATE coaches SET bio sem nome próprio, mantendo credenciais "Coach Immortal — Top 0.5% / 7000 MMR / 15+ anos / metodologia FORMULADOTA"). PackageCard substitui "Por: peterppa" + "Immortal" badge por "Coach Immortal" + "Top 0.5%" badge. Email assinatura "FORMULADOTA — HUB Dota 2 Brasil" (sem nome próprio). Internal docs (`.planning/`, `CLAUDE.md`, `PRD.md`) OK manter referências a Pedro (são técnicas).

---

## Cross-cutting Requirements (todas phases)

- **C1** TypeScript strict, zero `any` e `unknown` casts
- **C2** Functions max 50 linhas, files max 300 linhas
- **C3** Zod em todos os inputs (Server Actions, API routes)
- **C4** RLS policies em todas as tables Supabase. Confiar no schema, não duplicar checagem na app.
- **C5** WCAG 2.1 AA
- **C6** Lucide icons (não emojis em UI)
- **C7** ~~Cyberpunk theme: cyan #00F0FF, purple #A855F7, dark #050505~~ → **SUBSTITUÍDO 2026-05-02 por B2 (paleta Dota 2 oficial: preto #000000 + vermelho #B91C1C + off-white #F5F5F5)**. Cyberpunk theme está em uso até Phase 3.5 concluir; após Phase 3.5, classes `text-[#00F0FF]` / `border-[#A855F7]` etc. são banidas (grep audit zero matches).
- **C8** Webhooks externos validam HMAC com `crypto.timingSafeEqual`
- **C9** Idempotência em handlers de eventos externos
- **C10** ~~Limite hardcoded 3 partidas/dia~~ — REMOVIDO 2026-05-01 a pedido do Pedro (sem proteção burnout)
- **C11** Async/await sempre — NUNCA `.then().catch()` chains nem `.catch()` solto. Use try/catch blocks ou wrapper async com void call
- **C12** Comentários PT-BR onde não-óbvio (Pedro é beginner em código)
- **C13** Service-role Supabase **APENAS** em `/api/webhooks/*` ou jobs sistêmicos. Server Components/Actions de usuário usam cookie client.
