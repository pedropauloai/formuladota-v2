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

### B — Brand & Design System (Phase 3.5) ⚠ DEPRECATED 2026-05-23

> **Phase 3.5 absorvida e expandida pelo Milestone V2.5 Design Foundations.** Requirements B1-B6 abaixo permanecem válidos como subset da nova categoria DF mas serão re-entregues com qualidade AAA-grade (não rebrand tático). Research original preservado em `.planning/phases/_deprecated/03.5-rebrand-dota2-visual-superseded-by-v2.5-design-foundations/`.

### B — Brand & Design System (Phase 3.5 — original spec) ◆ NEW 2026-05-02

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

---

## Milestone V2.5 — Design Foundations (AAA Game Client Experience) ◆ ACTIVE 2026-05-23

> **Pivô estratégico (memory project_pivot_design_foundations.md):** parar todo trabalho de produto, construir fundação visual/UX permanente que transforma FormulaDota em verdadeiro game client AAA antes de qualquer nova UI. Pausa MVP fichas e Phase 4 MP até pelo menos DF2 (Token Layer) entregar.
>
> Régua AAA: *"isso existe no Riot Client?"* — se não, é anti-feature. Cultura proibida: SaaS startup, vibecoding, landing-page vibe, excesso cards/grid.
>
> Stack winners (research V2.5): `motion` v12.40.0 + `howler` v2.2.4 + `@tsparticles/slim` + `@fontsource-variable/cinzel` v5.2.8 + `geist` v1.7.1 + Tailwind v4 `@theme`.

### DF1 — Foundation Docs (Phase F1)

> Constituição visual permanente em `docs/foundations/`. Documentos viram lei pra todas as decisões downstream. Independem de código (paralelo a DF2-DF8).

- **DF1.1** `docs/foundations/VISUAL_PHILOSOPHY.md` — princípios de atmosfericidade, layering, profundidade visual, anti-vibecoding. Inclui galeria curada de refs AAA (Dota 2, Steam, Battle.net, Riot Client, FACEIT, CS2 UI, Discord, PoE, D4) com análise por dimensão.
- **DF1.2** `docs/foundations/UX_PRINCIPLES.md` — 11 mandamentos AAA (table stakes do research FEATURES.md): onboarding, navigation, primary CTA, live state, feedback acoplado, loading cinematográfico, empty states narrativos, profile premium, presence rich, sound feedback obrigatório, atmospheric ambient. Cada princípio com exemplo bom + ruim.
- **DF1.3** `docs/foundations/MOTION_SYSTEM.md` — motion philosophy, hierarquia de durations (micro 80-120ms, standard 200-280ms, hero 400-600ms+), easings nomeados por contexto, choreography patterns, reduced-motion strategy.
- **DF1.4** `docs/foundations/SOUND_SYSTEM.md` — sound design philosophy, 8 categorias de sons UI (hover/click/confirm/error/ambient/reward/deny/alert), coupling obrigatório visual+sound, layers (interaction vs ambient), volume hierarchy, mute persistence.
- **DF1.5** `docs/foundations/PRODUCT_CORE.md` — identidade do produto codificada: NÃO é coaching, é "jogar junto"; doutrina como cola UX; hierarquia de feedback (crítico/importante/informativo/erro); 3 estados do botão primário; voz de marca; arquétipo (mestre, não vendedor).
- **DF1.6** `docs/foundations/DESIGN_LANGUAGE.md` — síntese visual + tokens conceituais (família de accent vermelho Dota, neutros warm, typography Cinzel+Geist, spacing scale 4px-base, z-layer system). Aponta pra `src/styles/tokens/*` como implementação canônica.

### DF2 — Token Layer (Phase F2) ⚠ GATE ABSOLUTO

> Sem tokens, qualquer componente construído gera dívida exponencial. Bloqueia DF3-DF8.

- **DF2.1** Raw tokens em `src/styles/tokens/raw.css` — `--fd-raw-red-{50..900}`, `--fd-raw-neutral-warm-{50..950}`, `--fd-raw-accent-glow`, etc. Camada zero, sem semântica.
- **DF2.2** Semantic tokens em `src/styles/tokens/semantic.css` consumidos via Tailwind v4 `@theme` — `--color-brand-primary`, `--color-brand-primary-hover`, `--color-brand-primary-glow`, `--color-bg-deep`, `--color-bg-elevated`, `--color-surface`, `--color-text-display`, `--color-text-body`, `--color-text-muted`. Família de accent (não single color) pra suportar glow/hover/subtle.
- **DF2.3** Typography tokens — `--font-display` (Cinzel Variable wght 400-900), `--font-body` (Geist), `--font-mono` (Geist Mono ou JetBrains). Type scale com tracking + leading por nível (display tighter, body relaxed). Tabular nums tokens pra MMR/scores.
- **DF2.4** Spacing scale 4px-base — tokens `--space-0` a `--space-32` mapeados em Tailwind. PROIBIDO hardcoded `px-6` em componentes (sempre via token).
- **DF2.5** Motion tokens — `--motion-duration-micro` (80-120ms), `--motion-duration-standard` (200-280ms), `--motion-duration-hero` (400-600ms), `--motion-duration-cinematic` (800-1200ms). Easings nomeados: `--motion-ease-snappy`, `--motion-ease-soft-landing`, `--motion-ease-cinematic`, `--motion-ease-spring`.
- **DF2.6** Z-layer system — `--z-atmosphere` (-10), `--z-content` (0), `--z-elevated` (10), `--z-overlay` (20), `--z-modal` (50), `--z-system` (100). PROIBIDO z-index ad-hoc.
- **DF2.7** Sound volume tokens — `--volume-interaction` (0.6), `--volume-ambient` (0.3), `--volume-reward` (0.8). Consumidos pelo SoundManager.
- **DF2.8** Theme switching via `data-theme` no `<html>` — V2.5 = single theme "fd-dark" mas arquitetura suporta `data-theme="radiant"` / `data-theme="dire"` futuros sem refactor de componentes.

### DF3 — Atmospheric Layer (Phase F3)

> Camada de profundidade root-level. Pages futuras nascem com atmosfericidade. Paralelo a DF4/DF5.

- **DF3.1** `<AmbientLayer>` em `src/components/layout/AmbientLayer.tsx` montado no root layout, `position: fixed`, `z-index: var(--z-atmosphere)`. Aceita prop `density` (off/low/medium/high).
- **DF3.2** Config tsParticles slim em `src/lib/particles/presets.ts` — preset "dust" (partículas sutis flutuantes), preset "fog" (gradiente animado lento).
- **DF3.3** Pause via Page Visibility API quando aba escondida. Throttle automático se FPS cair abaixo de 30 (low-end fallback).
- **DF3.4** Respeita `prefers-reduced-motion: reduce` — desliga particles completamente, mantém estética (gradient estático em vez de animado).
- **DF3.5** Opt-out per-page via prop ou data attribute (alguns templates podem querer black canvas puro).

### DF4 — Motion Primitives (Phase F4)

> Motion variants exportados + wrappers reutilizáveis. Mata "cada componente reimplementa stagger".

- **DF4.1** `src/lib/motion/presets.ts` — variants nomeados (`fadeIn`, `fadeInUp`, `scaleIn`, `slideInRight`, `staggerChildren`, `pageEnter`, `pageExit`). Cada variant usa tokens de DF2.5.
- **DF4.2** `src/lib/motion/choreography.ts` — sequences compostas (`loginToMenu`, `queueEnterToMatchFound`, `cardHoverChoreography`). Coordenam múltiplos elementos.
- **DF4.3** `src/lib/motion/hooks.ts` — `useMotionSafe()` (detecta prefers-reduced-motion), `useStaggerChildren(delay)`, `useInViewport(ref)`.
- **DF4.4** Wrappers em `src/components/ui/motion/` — `<FadeIn>`, `<Stagger>`, `<ScaleEnter>`, `<PageTransition>`. Cada um aceita `as` prop pra polymorphic. Internamente usam `motion` v12 + presets.
- **DF4.5** `LazyMotion domAnimation` no root layout pra reduzir bundle inicial (~10kb em vez de ~45kb). Componentes que precisam layout animations declaram explicitamente.

### DF5 — Sound Infrastructure (Phase F5)

> Sound manager singleton Tauri-ready + 6-8 SFX curados Freesound CC0.

- **DF5.1** `src/lib/sound/manager.ts` — Howler singleton com interface `ISoundManager` (Tauri-ready). Métodos: `play(id, opts)`, `setMuted(bool)`, `setVolume(layer, value)`, `loadSprite(url)`.
- **DF5.2** Sprite sheet WebM+MP3 em `public/sounds/ui-sprite.{webm,mp3}` — 6 SFX mínimos: `hover`, `click`, `confirm`, `error`, `notification`, `reward`. Sprite map em `src/lib/sound/sprite-map.ts` (offset em ms por id).
- **DF5.3** 6 SFX curados Freesound CC0 — sessão dedicada Pedro ~3h. Critérios curadoria documentados (no `docs/foundations/SOUND_SYSTEM.md`): coesos timbralmente, não "stock", duração 50-500ms.
- **DF5.4** Hooks em `src/lib/sound/hooks.ts` — `useSound()` (retorna `play(id)` callback), `useAmbient(track)` (background looping com fade), `useMuteToggle()`.
- **DF5.5** Mute persistido em `localStorage` (`fd-sound-muted`, `fd-sound-volume-{layer}`). Restaurado on mount.
- **DF5.6** Mobile autoplay gate — primeiro user gesture (click anywhere) inicializa AudioContext. Gracefully sem som até gesto.

### DF6 — Component Primitives AAA-Grade (Phase F6)

> Primeiros componentes consumindo tokens + motion + sound. Prova que fundação funciona.

- **DF6.1** `<Button>` em `src/components/ui/button.tsx` — 5 variantes (`primary`, `secondary`, `ghost`, `destructive`, `cinematic`), 5 estados (default/hover/pressed/disabled/loading). Primary tem weight visual MUITO maior (não h-8 igual aos outros). Sound acoplado (hover + click via hook). Motion (scale 0.97 on press) via DF4 preset. CVA pra variants.
- **DF6.2** `<Card>` — variantes (`flat`, `elevated`, `interactive`, `hero`). Hero tem treatment cinematográfico (ambient glow, hover lift). NÃO usa rounded-lg border 1px shadcn default.
- **DF6.3** `<Dialog>` — fullscreen takeover variant (não modal centralizado SaaS). Base UI primitives + motion entrance/exit (scale + fade) + sound stinger.
- **DF6.4** `<Toast>` custom — bottom-center, slide-up + fade, ícone + título + descrição. NÃO top-right slide-in SaaS. Sound feedback por type. Substituir Sonner atual.
- **DF6.5** `<Badge>` — variantes incluindo `tier-{1..8}` pra MMR. Glow sutil em tiers altos. Tabular nums.
- **DF6.6** `<PresenceDot>` — 4 cores Discord pattern (online/away/dnd/offline) + estado `in-queue` + `in-match`. Pulse animation em estados ativos.
- **DF6.7** `<EmptyState>` narrativo — aceita prop `principle` (referência aos 14 princípios doutrina). Renderiza ícone temático + título Cinzel + corpo Geist + cita princípio relevante. NÃO "no data yet" genérico.
- **DF6.8** `<LoadingScreen>` cinematográfico — fullscreen takeover, exibe princípio doutrina rotativo (a cada 4s), AmbientLayer reforçada, hero portrait opcional. NÃO spinner genérico.

### DF7 — Pattern Components (Phase F7)

> Composições sobre primitives. Reescreve componentes do MVP fichas pausado pra nascerem AAA-grade.

- **DF7.1** `<MatchCard>` em `src/components/patterns/match-card.tsx` — display de partida com hero portraits + score + MMR delta + tier badges + relative time. Hover effect cinematográfico.
- **DF7.2** `<ProCard>` refatorado — substitui card atual em `src/components/dashboard/`. Hero portrait grande + tier badge proeminente + recent matches inline + presence dot.
- **DF7.3** `<QueuePanel>` refatorado — fila ao vivo via Supabase Realtime Presence. Counter "5/10 jogadores", timer "Searching... 0:32", primary CTA "Entrar na Fila" massive central.
- **DF7.4** `<HeroVideo>` refatorado — videos idle Dota 2 CDN Steam com fallback CSS animation se CDN indisponível. Aceita `heroSlug` prop. Lazy load + intersection observer.
- **DF7.5** `<HeroState>` refatorado — componente da branch atual `feat/hero-state-refactor` reescrito consumindo primitives AAA.

### DF8 — Templates & Pages (Phase F8)

> Templates por último porque consomem tudo. Mata sidebar SaaS atual.

- **DF8.1** `<ClientShell>` em `src/components/templates/client-shell.tsx` — top bar horizontal estilo Dota 2 client (decisão Pedro 2026-05-23): logo esquerda + tabs centrais (Jogar / Perfil / Comunidade / Loja) + auth dropdown direita. CTA primário "PLAY" massivo destacado quando dentro da tab Jogar. KILL sidebar 256px atual.
- **DF8.2** Landing `/` reformulada — sem `max-w-*` container SaaS. Fullscreen wash + bleed-to-edge + content offset assimétrico. AmbientLayer + hero video oficial Dota 2 + manifest cinematográfico em Cinzel. Sections inspiradas em dota2.com/home mas com voz FormulaDota (cita doutrina).
- **DF8.3** Rota `/(dev)/components` em dev mode apenas — live browser de tokens + primitives + patterns. Substitui Storybook (overhead pra solo dev).
- **DF8.4** Pages atuais (`/pacotes`, `/me`, `/admin/*`, `/codigo-de-conduta`, `/onboarding/doutrina`, etc.) refactored consumindo novo `<ClientShell>` e primitives DF6/DF7.
- **DF8.5** Disclaimer footer mantém spec B3 (Valve trademark) + adiciona crédito SFX Freesound CC0.

---

## Cross-cutting Requirements V2.5 (todas phases DF)

- **C14** Cores **NUNCA** hardcoded em componentes — sempre via token CSS var (`var(--color-brand-primary)`) ou Tailwind class mapeada (`bg-brand-primary`). Grep audit zero matches de hex colors em `src/components/`.
- **C15** Motion duration **NUNCA** inline — sempre via token (`--motion-duration-standard`) ou preset DF4.1. Grep zero matches de `transition-duration: \d` ou `duration: \d` em components.
- **C16** Sound calls **NUNCA** direto em onClick — sempre via hook `useSound()` ou wrapper component. Manageable via mute global.
- **C17** Z-index **NUNCA** ad-hoc — sempre via token `--z-*`. Grep audit zero matches de `z-\[?\d` numérico em components (apenas tokens nomeados).
- **C18** Container `max-w-*` SaaS pattern **PROIBIDO** em templates principais. Layouts AAA usam fullscreen wash, bleed-to-edge ou offset assimétrico. Exceções (forms longos) documentadas inline.
- **C19** Toast genérico SaaS (top-right slide-in) **PROIBIDO**. Skeleton shadcn vanilla **PROIBIDO**. Spinner genérico (`animate-spin`) **PROIBIDO**. Use primitives DF6.4/DF6.7/DF6.8.
- **C20** Cada componente que renderiza interação visível **DEVE** acoplar sound + motion. Botão sem sound de hover/click = bug. Empty state sem motion entrance = bug.

---

## Traceability V2.5

| Requirement | Phase (V2.5) | Status |
|-------------|--------------|--------|
| DF1.1 -- VISUAL_PHILOSOPHY.md | V2.5-F1 | Pending |
| DF1.2 -- UX_PRINCIPLES.md | V2.5-F1 | Pending |
| DF1.3 -- MOTION_SYSTEM.md | V2.5-F1 | Pending |
| DF1.4 -- SOUND_SYSTEM.md | V2.5-F1 | Pending |
| DF1.5 -- PRODUCT_CORE.md | V2.5-F1 | Pending |
| DF1.6 -- DESIGN_LANGUAGE.md | V2.5-F1 | Pending |
| DF2.1 -- Raw tokens raw.css | V2.5-F2 | Pending |
| DF2.2 -- Semantic tokens @theme | V2.5-F2 | Pending |
| DF2.3 -- Typography tokens | V2.5-F2 | Pending |
| DF2.4 -- Spacing scale 4px-base | V2.5-F2 | Pending |
| DF2.5 -- Motion tokens duration+easing | V2.5-F2 | Pending |
| DF2.6 -- Z-layer system | V2.5-F2 | Pending |
| DF2.7 -- Sound volume tokens | V2.5-F2 | Pending |
| DF2.8 -- Theme switching data-theme | V2.5-F2 | Pending |
| DF3.1 -- AmbientLayer component | V2.5-F3 | Pending |
| DF3.2 -- tsParticles presets dust+fog | V2.5-F3 | Pending |
| DF3.3 -- Page Visibility pause + FPS fallback | V2.5-F3 | Pending |
| DF3.4 -- prefers-reduced-motion support | V2.5-F3 | Pending |
| DF3.5 -- Per-page opt-out | V2.5-F3 | Pending |
| DF4.1 -- Motion presets.ts (7 variants) | V2.5-F4 | Pending |
| DF4.2 -- Choreography sequences | V2.5-F4 | Pending |
| DF4.3 -- Motion hooks (useMotionSafe etc.) | V2.5-F4 | Pending |
| DF4.4 -- Motion wrapper components | V2.5-F4 | Pending |
| DF4.5 -- LazyMotion domAnimation root | V2.5-F4 | Pending |
| DF5.1 -- Howler singleton ISoundManager | V2.5-F5 | Pending |
| DF5.2 -- SFX sprite sheet WebM+MP3 | V2.5-F5 | Pending |
| DF5.3 -- 6 SFX curados Freesound CC0 | V2.5-F5 | Pending |
| DF5.4 -- Sound hooks (useSound, useAmbient, useMuteToggle) | V2.5-F5 | Pending |
| DF5.5 -- Mute persistido localStorage | V2.5-F5 | Pending |
| DF5.6 -- Mobile autoplay gate | V2.5-F5 | Pending |
| DF6.1 -- Button (5 variantes, sound+motion) | V2.5-F6 | Pending |
| DF6.2 -- Card (flat/elevated/interactive/hero) | V2.5-F6 | Pending |
| DF6.3 -- Dialog (fullscreen takeover) | V2.5-F6 | Pending |
| DF6.4 -- Toast custom (bottom-center, nao SaaS) | V2.5-F6 | Pending |
| DF6.5 -- Badge (tier-1..8 variants) | V2.5-F6 | Pending |
| DF6.6 -- PresenceDot (6 estados) | V2.5-F6 | Pending |
| DF6.7 -- EmptyState narrativo (principios doutrina) | V2.5-F6 | Pending |
| DF6.8 -- LoadingScreen cinematografico | V2.5-F6 | Pending |
| DF7.1 -- MatchCard pattern | V2.5-F7 | Pending |
| DF7.2 -- ProCard refatorado | V2.5-F7 | Pending |
| DF7.3 -- QueuePanel refatorado | V2.5-F7 | Pending |
| DF7.4 -- HeroVideo refatorado | V2.5-F7 | Pending |
| DF7.5 -- HeroState refatorado | V2.5-F7 | Pending |
| DF8.1 -- ClientShell top-bar Dota 2 style | V2.5-F8 | Pending |
| DF8.2 -- Landing reformulada fullscreen | V2.5-F8 | Pending |
| DF8.3 -- Rota /(dev)/components dev-only | V2.5-F8 | Pending |
| DF8.4 -- Pages migradas para ClientShell | V2.5-F8 | Pending |
| DF8.5 -- Footer disclaimer Valve + Freesound CC0 | V2.5-F8 | Pending |
| C14 -- Zero hex hardcoded em componentes | Todas F1-F8 | Pending |
| C15 -- Zero motion duration inline | Todas F2-F8 | Pending |
| C16 -- Sound via hook (nao direto onClick) | Todas F5-F8 | Pending |
| C17 -- Zero z-index ad-hoc numerico | Todas F2-F8 | Pending |
| C18 -- Container max-w-* proibido em templates | V2.5-F8 | Pending |
| C19 -- Toast/skeleton/spinner SaaS proibidos | V2.5-F6, F7, F8 | Pending |
| C20 -- Sound+motion acoplados em toda interacao | V2.5-F6, F7, F8 | Pending |

**Coverage V2.5:**
- Total requirements DF: 47 (DF1.1-1.6 + DF2.1-2.8 + DF3.1-3.5 + DF4.1-4.5 + DF5.1-5.6 + DF6.1-6.8 + DF7.1-7.5 + DF8.1-8.5)
- Cross-cutting V2.5: 7 (C14-C20) -- aplicam a todas as phases relevantes
- Mapped to phases V2.5-F1 through V2.5-F8: 47 (100%) [OK]
- Orphaned requirements: 0 [OK]

---

*Last updated: 2026-05-23 -- traceability expandida (requirement por requirement) pelo roadmapper*
