# Project Research Summary — FormulaDota V2.5 Design Foundations

**Project:** FormulaDota (Hub Dota 2 BR com cultura doutrinada)
**Domain:** AAA Game Client Experience (web-first, Tauri-ready V3+)
**Researched:** 2026-05-23
**Confidence:** HIGH (stack/architecture/pitfalls), MEDIUM (sound assets, Tauri compat)

## Executive Summary

FormulaDota não é SaaS — é game client web. Hoje o produto carrega 7 de 10 pitfalls AAA ativos no código (zero motion system, zero sound infrastructure, layout container-SaaS, skeleton shadcn vanilla, hierarquia visual colapsada, paleta single-accent sem família). O milestone V2.5 substitui essa base por uma fundação token-first cascateada: tokens completos PRIMEIRO, depois primitives, depois componentes — invertendo a ordem natural de "construir UI primeiro, sistematizar depois" que produziria refactor exponencial.

A pesquisa convergiu em winners claros: **Motion v12.40.0** (ex-framer-motion, import `motion/react`) + **Howler v2.2.4** (sprite sheets de SFX, singleton com interface `ISoundManager` Tauri-ready) + **@tsparticles/slim** (atmospheric layer leve, Tauri-safe sem WebGL) + **Cinzel Variable** display + **Geist** body + **Tailwind v4 `@theme`** como home dos tokens. Nada de Style Dictionary / Panda CSS / Vanilla Extract por enquanto (overkill enquanto não houver Figma sync ou app mobile nativo). Supabase Realtime existente cobre 100% de presence/broadcast.

O risco maior é **pular F2 (Token Layer) e ir direto a componentes** — multiplicaria a dívida de refactor por cada componente construído. Risco menor: Howler+Tauri tem issues documentadas mas a interface `ISoundManager` isola o blast radius. A régua para qualquer decisão de UX é: *"isso existe no Riot Client?"* — se não, é anti-feature por definição.

## Key Findings

### Recommended Stack

**Core technologies (versões verificadas via pnpm view + Context7):**

| Tech | Versão | Purpose | Why |
|------|--------|---------|-----|
| `motion` | v12.40.0 | Motion library | Ex-framer-motion (renomeado). React 19 compat. AnimatePresence + layout + variants cobrem 100% do escopo AAA. Spring physics nativos. Bundle ~45kb gzipped aceitável. |
| `howler` | v2.2.4 | Sound manager | Sprite sheets (1 HTTP request), ambient looping com crossfade, mute global persistido, fallback HTML5 Audio. ~7kb gzipped. |
| `@tsparticles/react` + `@tsparticles/slim` | v4.0.5 | Atmospheric layer | Particles ambientes (dust, fog sutil). Slim version Tauri-safe (sem WebGL). FPS limiter, pausa em tab hidden, low-end fallback. |
| `@fontsource-variable/cinzel` | v5.2.8 | Display typography | Variable font (wght 400-900). Similar a Reaver Valve (Dota 2). Self-hosted (sem flash Google Fonts). |
| `geist` | v1.7.1 | Body typography | Vercel. Geométrica tecnológica. Tabular nums pra MMR/scores. Substitui Inter. |

**Tokens:** Tailwind v4 `@theme` é suficiente. CSS variables nativas em 3 camadas (raw → semantic → component). Sem libs adicionais.

**Realtime:** Supabase Realtime existente (Presence + Broadcast). Não precisa Liveblocks/PartyKit.

**Native desktop (V3+):** Tauri winner sobre Electron (bundle ~10MB vs ~120MB, perf nativa). Decisão deferida pra V3.

**Anti-recomendações:**
- ❌ Style Dictionary / Panda CSS / Vanilla Extract — overkill enquanto Tailwind v4 `@theme` resolver
- ❌ Three.js / R3F pra atmospheric — pesa 155kb gzipped, overkill, anti-Tauri (WebGL)
- ❌ `use-sound` — abstrai demais pra game sound design
- ❌ Tone.js — é sintetizador, não player
- ❌ Storybook — overhead em projeto solo dev, usar rota `/(dev)/components`

### Expected Features (UX Patterns AAA)

**Must have (table stakes — 11 padrões obrigatórios):**

- **Onboarding** — splash com logo animado + sound stinger; login screen cinematográfica fullscreen (não centered card)
- **Navigation** — top bar horizontal estilo Dota 2 (decisão Pedro 2026-05-23) com tabs principais + CTA primário massivo central
- **Primary CTA** — botão "PLAY/Entrar Fila" massive, glow pulse sutil, weight visual MUITO maior que secundárias
- **Live state** — queue counters live, "Searching... 0:32" timer, presence dots (Discord 4-color), pulse animations
- **Feedback acoplado visual+sound** — toda interação tem sound + visual pareados (não toast SaaS-style)
- **Loading cinematográfico** — não spinner; usar contexto (princípios doutrina rotativos, hero portraits)
- **Empty states narrativos** — não "no data yet"; usar voz de marca alinhada à doutrina
- **Profile premium** — hero portrait grande, MMR/tier badge proeminente, recent matches grid, NÃO LinkedIn-style
- **Presence rich** — friends, voice indicators, "in-game", "in-queue" status
- **Sound feedback obrigatório** — mínimo 6 sons UI (hover, click, confirm, error, ambient, reward/deny)
- **Atmospheric ambient** — particles sutis no background, vignette dinâmica, light dust

**Should have (differentiators):**

- **Doutrina como cola UX** — 14 princípios rotativos em loading screens; aceite doutrinário cinematográfico em Cinzel; empty states citam princípios. NENHUM concorrente explora isso.
- **Hero idle videos oficiais Dota 2** — CDN Steam (`cdn.steamstatic.com`) renderiza videos idle em cards/perfis
- **Match accept screen estilo Dota 2** — fullscreen takeover quando partida pronta, countdown + accept button
- **Queue timer no header** — sempre visível quando em fila, não enterrado em página /fila

**Defer (v3+):**

- Discord Rich Presence SDK
- Friends list + chat in-app
- Custom voice indicators
- Achievement showcase com particles
- Multi-faction theme (Radiant/Dire mode)

**Anti-features (PROIBIDAS — destroem feel AAA):**

- ❌ Toast genérico SaaS (top-right slide-in)
- ❌ Hamburger menu mobile-first
- ❌ Breadcrumbs
- ❌ Avatar pequeno + lista de campos LinkedIn-style no perfil
- ❌ Pagination numerada
- ❌ Spinner genérico (animate-spin)
- ❌ Skeleton shadcn vanilla
- ❌ Modal genérico centralizado com X no canto
- ❌ Sidebar 256px + content area SaaS template (atual)
- ❌ Hero centralizado headline + subheadline + CTA landing-page template
- ❌ Gradients lavender→pink, aurora gradient, neumorphism, glassmorphism misturados

### Architecture Approach

3-tier tokens em CSS variables nativas via Tailwind v4 `@theme`; `data-theme` no `<html>` pra theme switching (zero re-render); motion variants em `src/lib/motion/presets.ts` com `useMotionSafe()` hook centralizando reduced-motion; Howler singleton em `src/lib/sound/manager.ts` com interface `ISoundManager` Tauri-ready; `<AmbientLayer>` único no root layout z-index -10; composição via Base UI primitives (já existente) + CVA pra variants; documentação live em rota interna `/(dev)/components` em vez de Storybook.

**Major components:**

1. **Token Layer (`src/styles/`)** — raw tokens (`--fd-raw-*`), semantic tokens (`--color-brand-*`), component tokens. Atomic em Tailwind v4 `@theme`. Inclui motion-duration, motion-easing, z-layers, sound-volumes, spacing scale, typography scale.
2. **Atmospheric Layer (`src/components/layout/AmbientLayer.tsx`)** — root-level absolute z-index -10. tsParticles config + Page Visibility pause. Opt-out por page via prop.
3. **Motion Layer (`src/lib/motion/`)** — `presets.ts` (variants nomeados), `choreography.ts` (sequences), `hooks.ts` (useMotionSafe, useStaggerChildren). Wrappers `<FadeIn>/<Stagger>/<ScaleEnter>/<PageTransition>` em `src/components/ui/motion/`.
4. **Sound Layer (`src/lib/sound/`)** — `manager.ts` (Howler singleton + ISoundManager interface), `sprite-map.ts` (offset definitions), `hooks.ts` (useSound, useAmbient, useMute). Sprite WebM+MP3 em `public/sounds/`.
5. **Primitive Components (`src/components/ui/`)** — Button, Card, Dialog, Toast (custom não-SaaS), Badge, PresenceDot, EmptyState, LoadingScreen. Cada um acopla sound + motion + tokens via convenções.
6. **Pattern Components (`src/components/patterns/`)** — MatchCard, ProCard, QueuePanel, HeroVideo, HeroState. Compostos sobre primitives.
7. **Templates (`src/components/templates/`)** — ClientShell (top bar Dota 2 style + AmbientLayer wrapper), pages refactored.
8. **Dev Discoverability (`src/app/(dev)/components/`)** — rota interna gated em dev mode pra browsing live de componentes/tokens.

### Critical Pitfalls (Top 5)

1. **Pular F2 Token Layer e construir componentes primeiro** — multiplica dívida exponencialmente. F2 é gate absoluto.
2. **Motion duration uniforme + easing genérico** — entrega "site SaaS animado" em vez de "client AAA cinematográfico". Tokens de duration hierárquicos (micro 80-120ms, standard 200-280ms, hero 400-600ms+) com easings nomeados por contexto.
3. **Sound silence completo** — atual estado. Game clients AAA SEMPRE têm sound, mesmo sutil. Não adicionar = não-AAA. Mas overdoing também irrita.
4. **Layout container-SaaS** (`max-w-7xl mx-auto px-6`) — assina "Tailwind tutorial". Layout AAA usa fullscreen wash, bleed-to-edge, content offset assimétrico.
5. **Skeleton + Spinner shadcn vanilla** — destrói feel cinematográfico. Substituir por loading com narrativa (princípios doutrina rotativos, hero portraits, contextual feedback).

## Implications for Roadmap

Suggested phase structure (8 phases, dependencies estritas):

### Phase F1: Foundation Docs
**Rationale:** Filosofia precede código. Documentos viram lei pra todas as decisões downstream. Pode rodar em paralelo com F2.
**Delivers:** `docs/foundations/{VISUAL_PHILOSOPHY, UX_PRINCIPLES, MOTION_SYSTEM, SOUND_SYSTEM, PRODUCT_CORE, DESIGN_LANGUAGE}.md`
**Addresses:** Princípios de UX (FEATURES) + pitfalls a evitar (PITFALLS)
**Avoids:** Vibecoding por ausência de constituição visual

### Phase F2: Token Layer
**Rationale:** Gate absoluto. Tudo depende de tokens. Sem isso, qualquer componente construído gera dívida.
**Delivers:** `src/styles/tokens/*.css` com raw + semantic + component tokens (cores família, typography escala, spacing scale, motion duration/easing, z-layers, sound volumes)
**Uses:** Tailwind v4 `@theme` + CSS variables nativas
**Avoids:** Pitfall #1 (pular tokens), pitfall #2 (motion uniforme), pitfall #4 (layout SaaS)

### Phase F3: Atmospheric Layer
**Rationale:** Camada de profundidade vem cedo pra que pages futuras já nasçam com atmosfericidade. Independe de motion/sound (paralelo a F4/F5).
**Delivers:** `<AmbientLayer>` no root layout com tsParticles slim, Page Visibility pause, low-end FPS fallback, prefers-reduced-motion respect
**Uses:** `@tsparticles/slim`
**Validation:** Medir FPS em hardware target antes de finalizar config

### Phase F4: Motion Primitives
**Rationale:** Motion é a base mais visível de AAA feel. Precisa preceder componentes.
**Delivers:** `src/lib/motion/{presets, choreography, hooks}.ts` + wrappers `<FadeIn>/<Stagger>/<ScaleEnter>/<PageTransition>` em `src/components/ui/motion/`
**Uses:** `motion` v12 (import `motion/react`)
**Validation:** `LazyMotion domAnimation` vs `domMax` — decidir bundle target

### Phase F5: Sound Infrastructure
**Rationale:** Sound layer paralelo a motion. Inclui curadoria CC0 dos 6-8 SFX iniciais (decisão Pedro: Freesound CC0 + curadoria manual).
**Delivers:** `src/lib/sound/{manager, sprite-map, hooks}.ts` + sprite WebM+MP3 em `public/sounds/` + SFX curados + interface `ISoundManager` (Tauri-ready)
**Uses:** Howler v2.2.4
**Risks:** Howler+Tauri compat (mitigado pela interface), licenciamento SFX (decisão tomada: Freesound CC0)

### Phase F6: Component Primitives AAA-Grade
**Rationale:** Primeiros componentes que CONSOMEM tokens + motion + sound. Provam que a fundação funciona.
**Delivers:** Button, Card, Dialog, Toast (custom não-SaaS), Badge, PresenceDot, EmptyState (narrativos), LoadingScreen (cinematográfico com princípios doutrina rotativos)
**Uses:** Base UI primitives + CVA + tokens + motion + sound de F2/F4/F5
**Addresses:** Pitfalls #3 (sound silence), #5 (skeleton vanilla)

### Phase F7: Pattern Components
**Rationale:** Composições sobre primitives. Reescreve componentes já existentes do MVP fichas pausado pra nascerem AAA-grade.
**Delivers:** MatchCard, ProCard (refatorado), QueuePanel (refatorado), HeroVideo (refatorado), HeroState (refatorado da branch atual)
**Uses:** Primitives de F6
**Validation:** Verificar CDN Steam pra hero idle video loop disponibilidade

### Phase F8: Templates & Pages
**Rationale:** Templates por último porque consomem tudo. Aqui mata a sidebar SaaS atual e implementa top bar Dota 2 client (decisão Pedro).
**Delivers:** ClientShell (top bar Dota 2 style + AmbientLayer wrapper), landing reformulada (sem container SaaS), `/(dev)/components` rota dev, pages refactored
**Uses:** Patterns de F7
**Avoids:** Pitfall #4 (layout SaaS completo)

### Phase Ordering Rationale

- **F1 paralelo a F2-F8** (docs filosóficos não bloqueiam código)
- **F2 gate absoluto** — bloqueia F3-F8
- **F3, F4, F5 paralelos** entre si (independentes, dependem só de F2)
- **F6 depende de F2 + F4 + F5** (consome tokens + motion + sound)
- **F7 depende de F6** (compõe primitives)
- **F8 depende de F7** (templates consomem patterns)

### Research Flags

Phases likely needing deeper research during planning:
- **F3 Atmospheric Layer** — benchmark FPS tsParticles em hardware Pedro antes de finalizar config
- **F5 Sound Infrastructure** — sessão dedicada de curadoria Freesound CC0 (~3h) pra encontrar SFX coesos
- **F7 Pattern Components** — verificar disponibilidade pública CDN Steam pra hero idle videos (fallback CSS animation se quebrar)

Phases with standard patterns (skip research-phase):
- F1 Foundation Docs (escrita, conhecimento já está em research/)
- F2 Token Layer (decisões já tomadas: Tailwind v4 @theme + 3 camadas)
- F4 Motion Primitives (Motion v12 docs cobertas)
- F6 Component Primitives (Base UI + CVA conhecidos)
- F8 Templates & Pages (top bar Dota 2 style já decidido)

## Open Questions (Resolvidas pelo Pedro 2026-05-23)

- ✅ **SFX Licensing:** Freesound CC0 + curadoria manual (R$ 0, ~3h dedicadas)
- ⚠️ **Nav Layout (REVERTIDO 2026-05-24):** Top bar horizontal era a decisão original (Wave 7-8 baseada em Riot Client v6). Reformulado para "Navigation 3-col Dota 2 client real" — sidebar esquerda persistente (identidade+amigos) + top-bar central + sidebar direita contextual (matchmaking) + bottom-bar [JOGAR DOTA] verde. Ver UX_PRINCIPLES.md M2.

## Critical Risks

- **Howler+Tauri compat** — issues documentadas. Mitigado pela interface `ISoundManager` desde F5. Validar quando Tauri for iniciado V3+.
- **Framer Motion bundle** (~45kb gzipped) — verificar Core Web Vitals impacto em F4. Alternativa `LazyMotion domAnimation` reduz pra ~10kb.
- **SFX curadoria fraca** — risco de "soar genérico CC0" se curadoria for apressada. Mitigation: budget de tempo dedicado (~3h) + Pedro valida.
- **Hero idle video CDN Steam** — disponibilidade pública não confirmada. Mitigation: fallback arte estática + CSS animation.

## Confidence

**Overall: HIGH**

| Area | Confidence | Justificativa |
|------|-----------|---------------|
| Stack versions | HIGH | Verificado via pnpm view |
| Architecture decisions | HIGH | Padrões industry-validated (Tailwind v4, motion variants, Howler singleton) |
| UX patterns AAA | HIGH | 14 fontes externas + análise direta de clients |
| Pitfalls identification | HIGH | 7/10 já visíveis no código atual |
| Sound asset pipeline | MEDIUM | Decisão tomada mas execução depende de curadoria manual |
| Tauri compat | MEDIUM | Documentação ok, sem teste em produção |

**Ready for roadmapper:** sim, com 8 phases sugeridas e dependencies travadas.
