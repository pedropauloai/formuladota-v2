# formuladota v2 — Roadmap

> Reflete pivô estratégico 2026-05-01: formuladota = HUB Dota 2 (não loja de mentoria 1-1).
> Milestone V1 cumprido (Foundation + Doutrina + Pagamento Avulso).
> Milestone V2 em execução = HUB.
> Milestone V2.5 INSERIDO (2026-05-23): Design Foundations AAA Game Client Experience.

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

## Milestone V2 — HUB Dota 2 ◆ PARCIALMENTE EM PAUSA (V2.5 tem prioridade)

### Phase 3 — Steam OAuth + Roles + Multi-coach Refactor ✓ COMPLETED
**Goal:** Steam OAuth obrigatório (vinculado ao Discord). Sistema de roles (admin/coach/player). Refator schema `packages` pra `coach_id` FK + `coaches` table com Pedro como coach #1.
**Requirements:** H1.1, H1.2, H1.3, H1.4

Plans:
- [x] 03-01-migration-005-PLAN.md
- [x] 03-02-steam-client-env-PLAN.md
- [x] 03-03-vincular-steam-page-PLAN.md
- [x] 03-04-middleware-steam-gate-PLAN.md
- [x] 03-05-multicoach-refactor-PLAN.md

### Phase 3.5 — Rebrand & Design System Refresh ⚠ DEPRECATED 2026-05-23
> Absorvida e expandida pelo Milestone V2.5 Design Foundations com qualidade AAA-grade.
> Research preservado em `.planning/phases/_deprecated/03.5-rebrand-dota2-visual-superseded-by-v2.5-design-foundations/`.
> Requirements B1-B6 re-entregues dentro de V2.5 (DF2, DF6, DF7, DF8).

### Phase 4 — Subscription Mensal Mercado Pago Pix Automático ⏸ PAUSED
> Pausada em 2026-05-23. Retoma após V2.5-F2 (Token Layer) e V2.5-F8 (Templates) entregarem.
> Plans e contexto em `.planning/phases/_paused/04-mercadopago-migration/`.
**Requirements:** H2.1, H2.2, H2.3, H2.4

### Phase 5 — Bot Steam Lobby Creator ⏸ PAUSED
**Requirements:** H3.1, H3.2, H3.3, H3.4, H3.5, H3.6

### Phase 6 — Sistema de Ligas + MMR + Temporadas ⏸ PAUSED
**Requirements:** H4.1, H4.2, H4.3, H4.4

### Phase 7 — Badges + Ranking + Perfil Expandido ⏸ PAUSED
**Requirements:** H5.1, H5.2, H5.3, H5.4

### Phase 8 — Painel Admin + Painel Player + Polish + Deploy ⏸ PAUSED
**Requirements:** H6.1-H6.5, H7.1-H7.6

---

## Milestone V2.5 — Design Foundations: AAA Game Client Experience ◆ ATIVO 2026-05-23

> **Inserido entre V2 e V3.** Pausa todo trabalho de produto pra construir fundação visual/UX permanente
> que transforma FormulaDota de web app cyberpunk genérico em verdadeiro game client AAA.
>
> **Régua de qualidade:** "Isso existe no Riot Client?" — se não, é anti-feature.
> **Cultura proibida:** SaaS startup, vibecoding, landing-page vibe, excesso cards/grid.
>
> **Estimativa:** 7-10 dias.

### Decisão de numeração

Phases V2.5 usam prefixo `V2.5-F1` até `V2.5-F8` (não numeração linear Phase 9-16).
**Justificativa:** V2 já ocupa Phase 1-8 com tracking próprio. O prefixo `V2.5-F` mantém
rastreabilidade explícita milestone→phase (ex: "F2 = token gate" documentado em SUMMARY.md
e REQUIREMENTS.md), evita ambiguidade ao retomar V2 Phase 4-8 pós-V2.5, e a legibilidade
para dev humano supera a consistência GSD de numeração linear neste contexto multi-milestone.
Diretórios: `.planning/phases/V2.5-F{N}-{slug}/`.

### Phases V2.5

- [ ] **V2.5-F1: Foundation Docs** — 6 documentos fundacionais em `docs/foundations/` (paralelo a F2-F8)
- [ ] **V2.5-F2: Token Layer** — Sistema completo de tokens CSS (GATE ABSOLUTO — bloqueia F3-F8)
- [ ] **V2.5-F3: Atmospheric Layer** — `<AmbientLayer>` tsParticles no root layout (paralelo a F4/F5)
- [ ] **V2.5-F4: Motion Primitives** — variants nomeados + wrappers `<FadeIn>/<Stagger>/<PageTransition>` (paralelo a F3/F5)
- [ ] **V2.5-F5: Sound Infrastructure** — Howler singleton + sprite WebM+MP3 + 6 SFX CC0 (paralelo a F3/F4)
- [ ] **V2.5-F6: Component Primitives AAA-Grade** — Button, Card, Dialog, Toast, Badge, PresenceDot, EmptyState, LoadingScreen
- [ ] **V2.5-F7: Pattern Components** — MatchCard, ProCard, QueuePanel, HeroVideo, HeroState refatorados
- [ ] **V2.5-F8: Templates & Pages** — ClientShell top-bar + Landing reformulada + páginas migradas

### Phase Details

#### Phase V2.5-F1: Foundation Docs
**Goal:** Constituição visual permanente existe em `docs/foundations/` e vira lei para todas as decisões downstream de UX e código.
**Depends on:** Nada (pode rodar em paralelo com F2-F8)
**Requirements:** DF1.1, DF1.2, DF1.3, DF1.4, DF1.5, DF1.6
**Success Criteria** (what must be TRUE):
  1. `ls docs/foundations/` lista 6 arquivos: VISUAL_PHILOSOPHY.md, UX_PRINCIPLES.md, MOTION_SYSTEM.md, SOUND_SYSTEM.md, PRODUCT_CORE.md, DESIGN_LANGUAGE.md — todos com conteúdo não-vazio (>200 linhas cada).
  2. VISUAL_PHILOSOPHY.md contém galeria curada de pelo menos 8 refs AAA nomeadas com análise por dimensão (não lista vazia).
  3. UX_PRINCIPLES.md lista os 11 mandamentos AAA da pesquisa com exemplo positivo + negativo por princípio.
  4. MOTION_SYSTEM.md especifica hierarquia de durations (micro/standard/hero/cinematic) com valores numéricos em ms e nomes de easing por contexto.
  5. SOUND_SYSTEM.md especifica as 8 categorias de SFX UI com critérios de curadoria e volume hierarchy numericamente definida.
**Plans:** TBD
**Estimated effort:** ~1 dia

#### Phase V2.5-F2: Token Layer
**Goal:** Todo estilo no codebase flui de tokens CSS canônicos — zero hex hardcoded, zero ad-hoc z-index, zero inline duration.
**Depends on:** Nada (mas deve completar antes de F3, F4, F5 finalizarem)
**Requirements:** DF2.1, DF2.2, DF2.3, DF2.4, DF2.5, DF2.6, DF2.7, DF2.8
**Success Criteria** (what must be TRUE):
  1. `grep -rE "#[0-9A-Fa-f]{3,6}" src/components/` retorna zero matches (zero hex hardcoded em componentes).
  2. `grep -rE "z-\[?[0-9]" src/components/` retorna zero matches (zero z-index ad-hoc numérico).
  3. `grep -rE "duration-[0-9]|transition-duration:\s*[0-9]" src/components/` retorna zero matches (zero duration inline).
  4. Tailwind `@theme` em `src/styles/tokens/semantic.css` reconhece todos os 8 grupos de token: `--color-brand-*`, `--color-bg-*`, `--color-text-*`, `--font-*`, `--space-*`, `--motion-*`, `--z-*`, `--volume-*`.
  5. Componente de teste com `data-theme="fd-dark"` no `<html>` renderiza cores corretas sem re-render JavaScript.
**Plans:** TBD
**Estimated effort:** ~1 dia
**UI hint**: yes

#### Phase V2.5-F3: Atmospheric Layer
**Goal:** Toda page da aplicação nasce com profundidade visual atmosférica — partículas sutis e gradiente animado no background sem impacto perceptível em hardware-alvo.
**Depends on:** V2.5-F2 (usa tokens `--z-atmosphere`, `--motion-duration-*`)
**Requirements:** DF3.1, DF3.2, DF3.3, DF3.4, DF3.5
**Success Criteria** (what must be TRUE):
  1. `src/components/layout/AmbientLayer.tsx` existe e está montado no root layout com `position: fixed` e `z-index: var(--z-atmosphere)` (verificável via DevTools).
  2. FPS no Chrome DevTools Performance tab permanece >= 55fps em hardware-alvo com preset "dust" ativo (medição manual).
  3. Alternar aba (Page Visibility hidden) pausa as partículas — verificável via Performance tab (zero paint/composite frames quando aba oculta).
  4. Com `prefers-reduced-motion: reduce` ativado no SO, `<AmbientLayer>` renderiza gradient estático (não animado) sem partículas.
  5. Page com `data-ambient="off"` (ou prop equivalente) não renderiza partículas — canvas ausente no DOM.
**Plans:** TBD
**Estimated effort:** ~0.5 dia
**UI hint**: yes

#### Phase V2.5-F4: Motion Primitives
**Goal:** Toda animação no produto usa variants nomeados de um vocabulário central — zero reimplementação de stagger ou easing por componente.
**Depends on:** V2.5-F2 (variants consomem tokens `--motion-duration-*`, `--motion-ease-*`)
**Requirements:** DF4.1, DF4.2, DF4.3, DF4.4, DF4.5
**Success Criteria** (what must be TRUE):
  1. `src/lib/motion/presets.ts` exporta ao menos 7 variants nomeados: `fadeIn`, `fadeInUp`, `scaleIn`, `slideInRight`, `staggerChildren`, `pageEnter`, `pageExit` — cada um com `duration` referenciando token CSS var, não número hardcoded.
  2. `src/components/ui/motion/` contém 4 wrappers: `<FadeIn>`, `<Stagger>`, `<ScaleEnter>`, `<PageTransition>` — cada um aceita prop `as` polimórfica (testável via TypeScript).
  3. `useMotionSafe()` retorna `false` quando `prefers-reduced-motion: reduce` está ativo (testável com mídia emulada no DevTools).
  4. `LazyMotion` com `domAnimation` está no root layout — bundle inicial não carrega layout animations (verificável via Network tab: `framer-motion` ou `motion` chunk não inclui `dom-max`).
**Plans:** TBD
**Estimated effort:** ~1 dia
**UI hint**: yes

#### Phase V2.5-F5: Sound Infrastructure
**Goal:** Som UI está disponível em toda a aplicação via hook singleton — 6 SFX curados tocam corretamente, mute persiste entre sessões, mobile não quebra.
**Depends on:** V2.5-F2 (consome tokens `--volume-*`)
**Requirements:** DF5.1, DF5.2, DF5.3, DF5.4, DF5.5, DF5.6
**Success Criteria** (what must be TRUE):
  1. `public/sounds/ui-sprite.webm` e `public/sounds/ui-sprite.mp3` existem — Network tab confirma único request de áudio na inicialização (não múltiplos arquivos separados).
  2. `useSound()` chamado em qualquer componente executa `hover`, `click`, `confirm`, `error`, `notification`, `reward` sem erro de console — verificável em browser DevTools.
  3. `useMuteToggle()` persiste estado em `localStorage` key `fd-sound-muted` — refresh da página mantém estado mute (verificável via Application > Storage no DevTools).
  4. Em mobile (simulado via DevTools), nenhum som dispara antes do primeiro gesto do usuário — console não exibe erros `AudioContext not allowed`.
  5. `src/lib/sound/manager.ts` exporta interface `ISoundManager` tipada (não implementação Howler exposta diretamente) — TypeScript confirma via `tsc --noEmit`.
**Plans:** TBD
**Estimated effort:** ~1.5 dias (inclui ~3h curadoria SFX com Pedro)

#### Phase V2.5-F6: Component Primitives AAA-Grade
**Goal:** 8 componentes base consomem tokens + motion + sound e provam que a fundação funciona — nenhum deles é shadcn vanilla.
**Depends on:** V2.5-F2 (tokens) + V2.5-F4 (motion) + V2.5-F5 (sound)
**Requirements:** DF6.1, DF6.2, DF6.3, DF6.4, DF6.5, DF6.6, DF6.7, DF6.8
**Success Criteria** (what must be TRUE):
  1. `<Button variant="primary">` tem weight visual MUITO maior que `variant="secondary"` — diferença visível sem zoom (teste manual em browser).
  2. Qualquer `<Button>` dispara som `hover` ao mouseenter e `click` ao pressionar — verificável via Network tab de áudio ou `console.log` temporário no SoundManager.
  3. `<Toast>` aparece bottom-center com slide-up — `grep -rE "top-right|top-0.*right-0" src/components/ui/toast` retorna zero matches.
  4. `<LoadingScreen>` renderiza princípio doutrinário (texto não-vazio) e NÃO contém elemento `animate-spin` no DOM.
  5. `<EmptyState>` exibe citação de um dos 14 princípios — prop `principle` aceita string (TypeScript confirma).
  6. `grep -rE "#[0-9A-Fa-f]{3,6}|z-\[?[0-9]|duration-[0-9]" src/components/ui/` retorna zero matches (compliance cross-cutting C14/C15/C17).
**Plans:** TBD
**Estimated effort:** ~2 dias
**UI hint**: yes

#### Phase V2.5-F7: Pattern Components
**Goal:** 5 componentes compostos sobre primitives existem e estão prontos para uso nas pages — ProCard, QueuePanel e HeroState substituem versões atuais do MVP fichas pausado.
**Depends on:** V2.5-F6 (compõe primitives)
**Requirements:** DF7.1, DF7.2, DF7.3, DF7.4, DF7.5
**Success Criteria** (what must be TRUE):
  1. `<MatchCard>` renderiza hero portraits, score, MMR delta e tier badge — verificável via rota `/(dev)/components` em dev mode.
  2. `<ProCard>` substituiu o componente atual em `src/components/dashboard/` — `git diff` mostra remoção do card anterior (sem duplicata).
  3. `<QueuePanel>` exibe counter "X/10 jogadores" e timer "Searching... 0:00" com Supabase Realtime Presence — console confirma subscription ativa sem erros.
  4. `<HeroVideo heroSlug="antimage">` renderiza video CDN Steam sem erro CORS em browser (ou fallback CSS animation sem erro de console quando CDN indisponível).
  5. `<HeroState>` da branch `feat/hero-state-refactor` reescrito consumindo `<FadeIn>`, `<Card>` e `useSound()` — nenhum style prop hardcoded.
**Plans:** TBD
**Estimated effort:** ~1.5 dias
**UI hint**: yes

#### Phase V2.5-F8: Templates & Pages (REVERTIDO 2026-05-24)
**Goal:** Toda a aplicação usa o ClientShell canônico (Sistema A — 3 colunas fiel ao Dota 2 client real): top-bar central + sidebar esquerda (identidade+amigos) + sidebar direita contextual (matchmaking) + bottom-bar [JOGAR DOTA] verde. Landing é fullscreen cinematográfica. Developer browser de componentes existe. Sidebar SaaS genérica de rotas e shell minimalista sem sidebars (estilo Riot) são anti-patterns proibidos (M2 reformulado).
**Depends on:** V2.5-F7 (templates consomem patterns)
**Requirements:** DF8.1, DF8.2, DF8.3, DF8.4, DF8.5
**Success Criteria** (what must be TRUE):
  1. `grep -rE "DashboardLeftSidebar|DashboardRightSidebar|DashboardBottomBar" src/` retorna matches — sidebars 3-col Dota 2 são obrigatórias (M2 reformulado 2026-05-24). Anti-pattern `<aside .*w-64.*<nav` (sidebar SaaS de rotas) deve retornar zero.
  2. `<ClientShell>` canônico (`src/components/client-shell/shell.tsx`) renderiza 3 colunas + bottom-bar — verificável via browser em qualquer rota autenticada. Template simplificado (`templates/client-shell.tsx`) é @deprecated e tem zero callsites.
  3. Landing `/` não contém `max-w-` container SaaS — `grep "max-w-" src/app/page.tsx` retorna zero matches; fullscreen wash verificável via DevTools (html/body 100vw).
  4. `http://localhost:3000/components` retorna 200 em dev mode e 404 em production build (`NODE_ENV=production`) — gating de rota funciona.
  5. Todas as rotas existentes (`/pacotes`, `/me`, `/admin/*`, `/codigo-de-conduta`, `/metodologia`, `/partidas`, `/perfil`) carregam sem erro 500 após migração pro `<ClientShell>` Sistema A.
**Plans:** TBD
**Estimated effort:** ~1.5-2 dias
**UI hint**: yes

---

### Progress V2.5

**Execution Order:**
F1 (pode iniciar imediatamente, paralelo) → F2 (gate absoluto) → F3 + F4 + F5 (paralelos entre si, dependem de F2) → F6 (depende de F2 + F4 + F5) → F7 (depende de F6) → F8 (depende de F7)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| V2.5-F1. Foundation Docs | 0/TBD | Not started | - |
| V2.5-F2. Token Layer | 0/TBD | Not started | - |
| V2.5-F3. Atmospheric Layer | 0/TBD | Not started | - |
| V2.5-F4. Motion Primitives | 0/TBD | Not started | - |
| V2.5-F5. Sound Infrastructure | 0/TBD | Not started | - |
| V2.5-F6. Component Primitives | 0/TBD | Not started | - |
| V2.5-F7. Pattern Components | 0/TBD | Not started | - |
| V2.5-F8. Templates & Pages | 0/TBD | Not started | - |

---

## Milestone V2.6 — Player Identity + Social Layer ◆ ATIVO 2026-05-26

> **Inserido entre V2.5 e V3.** Após V2.5 entregar a fundação visual AAA, V2.6 entrega
> a camada de IDENTIDADE PESSOAL do player: perfil estilo Dota 2 client real, sidebar
> expansível persistida globalmente, sistema de edição completo (status/heróis/portrait/avatar)
> e camada social de friendships com presença online em tempo real.
>
> **Régua de qualidade:** "Isso parece o client do Dota 2 real?" — fidelidade extrema
> baseada em `perfil-dota.png` e `perfil-dota-miniperfil+amigos-expandido.png` na raiz.
>
> **Estimativa:** 2-4 dias.

### Decisão de numeração (correção 2026-05-26)

Phases V2.6 usam **numeração linear GSD** (Phase 9, Phase 10, ...) — não prefixo `V2.6-F*`.
Motivo: CLI `gsd-tools` espera regex `^(\d+[A-Z]?(?:\.\d+)*)` em nomes de diretório.
A convenção `V2.5-F*` no roadmap V2.5 era tracking manual de Pedro — as phases V2.5 nunca
tiveram diretórios GSD reais (executadas em worktrees paralelas). Pra V2.6 em diante, milestone
V2.6 vira agrupamento conceitual mas as phases têm número linear (Phase 9, 10, 11...).
Diretórios: `.planning/phases/{NN}-{slug}/`.

### Phase 9 — Perfil Dota 2 + Social (Milestone V2.6)

**Goal:** Player tem identidade visual canônica estilo Dota 2 client: sidebar esquerda expansível/retrátil com preferência persistida em qualquer rota, click no mini-perfil leva pra /me, página /me visual 100% fiel ao Dota 2 (3 colunas, hero portrait gigante de background, tabs Perfil/Histórico/Conquistas/Conduta, stats à esquerda, status message + heróis favoritos no centro, botão Editar Perfil), sistema de edição completo (status message, heróis favoritos até 3, hero portrait de fundo, avatar custom) via Server Actions + Zod, e sistema social de friendships (tabela com RLS, add/remove/accept, presença online em tempo real via Supabase Realtime channel).
**Depends on:** V2.5 completo (tokens, primitives, patterns, ClientShell já entregues)
**Requirements:** D-01 a D-40 (decisões CONTEXT) + cross-cutting C14/C17/C18/C19/B6
**Plans:** 3/9 plans executed
- [x] 09-01-config-heroes-catalog-PLAN.md — next.config Valve CDN + dota-heroes.json (10 campos D-24 incluindo complexity) + helpers (autonomous)
- [ ] 09-02-migration-034-profile-extended-PLAN.md — 5 colunas em profiles (REQUER APROVAÇÃO PEDRO) — serial Wave 1
- [ ] 09-03-migration-035-friendships-PLAN.md — tabela friendships + RLS + indexes (REQUER APROVAÇÃO PEDRO) — serial Wave 1 (depende de 09-02)
- [ ] 09-04-migration-036-storage-avatars-PLAN.md — bucket profile-avatars + storage policies + gen-types único (REQUER APROVAÇÃO PEDRO) — serial Wave 1 (depende de 09-03)
- [x] 09-05a-backend-profile-sidebar-actions-PLAN.md — toggleSidebar + edit profile/avatar Server Actions (3 arquivos)
- [x] 09-05b-backend-friends-presence-PLAN.md — 5 Server Actions friends (D-31 incluindo blockUser) + presence hook + queries (4 arquivos)
- [x] 09-06-sidebar-collapsible-friends-PLAN.md — shell.tsx + left-sidebar.tsx refactor + FriendsList realtime (zero console.* compliance)
- [x] 09-07-me-page-3col-tabs-PLAN.md — /me reescrita usando ClientShell IMMERSIVE + centerHero (hero portrait fullscreen via shell) + 4 tabs
- [x] 09-08-edit-profile-modal-PLAN.md — Dialog takeover 4 abas + HeroPicker + AvatarUpload + toast feedback em cada save
**UI hint**: yes (high fidelity — UI-SPEC.md APPROVED revision 1)
**Estimated effort:** 2-4 dias

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

---

## Backlog

Ideias registradas sem construir, com data e condição para entrar: ver [BACKLOG.md](BACKLOG.md).
