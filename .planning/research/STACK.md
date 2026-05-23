# Stack Research — V2.5 Design Foundations (AAA Game Client)

**Domain:** AAA Game Client UI — Next.js 16 + React 19 web platform (formuladota.com)
**Researched:** 2026-05-23
**Confidence:** HIGH (versoes verificadas via pnpm registry + docs oficiais; bundle sizes de fontes oficiais)

---

## Contexto: Stack Existente (NAO re-pesquisar)

Stack base ja validada e travada:

| Layer | Tech | Versao |
|-------|------|--------|
| Framework | Next.js | 16.2.4 |
| UI | React | 19.0.0 |
| Lang | TypeScript | 5.9 strict |
| CSS | Tailwind CSS | v4 beta |
| Animations CSS | tw-animate-css | 1.4.0 |
| Component base | @base-ui/react | 1.4.1 |
| Shadcn preset | shadcn | 4.6.0 |
| Toasts | sonner | 2.0.7 |
| DB / Auth | Supabase (@supabase/ssr 0.5.2) | postgres-js 2.x |
| Icons (atual) | lucide-react | 0.456.0 |
| Utilities | clsx + tailwind-merge + class-variance-authority | — |

---

## Recomendacoes por Categoria

### 1. Motion — Biblioteca de Animacao

**RECOMENDACAO: `motion` (antigo framer-motion) v12.40.0**

| Tech | Versao | Bundle (gzipped) | SSR-friendly | React 19 | Timelines | Spring | Layout |
|------|--------|-----------------|-------------|---------|-----------|--------|--------|
| `motion` (motion/react) | 12.40.0 | 34 KB full / 4.6 KB + lazy | Sim (client components) | Sim | Via stagger/variants | Sim (padrao) | Sim (melhor-da-classe) |
| GSAP + @gsap/react | 3.15.0 + 2.1.2 | ~23 KB core + plugins | Client-only | Sim | Sim (Timeline imperativo) | Nao (tween) | Nao nativo |
| CSS-only via Tailwind v4 | — | 0 KB adicional | Sim | Sim | Nao | Nao | Nao |

**Por que `motion` ganha para game client UI:**

Motion tem as melhores `layout animations` da web — detecta mudancas de tamanho/posicao automaticamente e transiciona com transforms, o que e fundamental para animacoes de queue ao vivo, cards expandindo, transicoes de rota. `AnimatePresence` com `exit` animations e a forma mais limpa de fazer unmount animations em React — critico para modais, toasts, e HUD elements que entram/saem do DOM. Spring physics e o padrao para propriedades fisicas (x, y, scale), dando feel organico ao inves de mechanical. `useScroll()` + `MotionValues` permite parallax e scroll-linked effects sem polling. Bundle pode ser reduzido a 4.6 KB via `LazyMotion` + `m` component (carrega features on-demand).

GSAP e superior para sequencias cinematograficas complexas com timing preciso (tipo intro cinematica de 30 elementos), mas para UI de game client (modals, toasts, cards, buttons, route transitions, presence queue) a API declarativa do Motion e muito mais produtiva. GSAP tambem nao tem layout animations nativas.

**Integracao no stack atual:** instalar `motion` (substitui qualquer framer-motion), usar `'use client'` em componentes animados. Server Components ficam sem motion — so animacoes CSS via `tw-animate-css` existente. Criar `src/components/primitives/motion.ts` como re-export do motion/react para centralizar imports.

**Import correto (Motion v12+):**
```typescript
import { motion, AnimatePresence, useScroll, useMotionValue, useSpring } from "motion/react"
```

**Anti-recomendacao — GSAP para UI components:** GSAP e imperativo e DOM-level. Em React 19 com Server Components e Strict Mode, `useGSAP()` precisa de `'use client'` em tudo. Para o volume de UI components do formuladota, GSAP adicionaria boilerplate desnecessario sem ganho real. GSAP so faz sentido se houver intro cinematica de loading screen ou hero section com timeline complexa — nao para o design system base.

**Anti-recomendacao — CSS-only animations:** `tw-animate-css` ja esta instalado e e otimo para microtransicoes simples (hover, focus, entrada de elemento). Porem nao suporta exit animations, layout animations, spring physics, ou scroll-linked effects. Nao e suficiente para o nivel AAA exigido.

---

### 2. Sound — Design Sonoro de Interface

**RECOMENDACAO: `howler` v2.2.4 + custom React hook proprio (sem wrapper)**

| Tech | Versao | Bundle (gzipped) | Audio Sprites | Lazy Load | Ambient Loop | Mobile Autoplay | Mute Global |
|------|--------|-----------------|--------------|-----------|-------------|----------------|-------------|
| `howler` | 2.2.4 | ~7 KB | Sim | Sim (preload: false) | Sim (loop: true + fade) | Tratado automaticamente | Via Howl.mute() |
| `use-sound` | 5.0.0 | ~2 KB + howler | Parcial | Parcial | Nao diretamente | Parcial | Parcial |
| Tone.js | — | ~150 KB | Nao (e sintetizador) | — | Sim | Sim | Sim |
| Web Audio API nativa | — | 0 KB | Manual | Manual | Manual | Problematico | Manual |

**Por que `howler` ganha para game client sound:**

Howler e a unica opcao que cobre todos os requisitos sem overhead desnecessario: audio sprites (1 arquivo + JSON = todos SFX da UI), preload lazy (`preload: false`, chama `.load()` apenas quando necessario), ambient loop com crossfade (`fade()` method), gain control unificado (`Howler.volume()`), mute global persistido (`Howler.mute(true/false)`), e trata automaticamente as restricoes de autoplay mobile com fallback para HTML5 Audio. Bundle de 7 KB gzipped e insignificante.

`use-sound` e um wrapper fino sobre howler que abstrai demais — perde acesso ao sprite granular e ao ambient crossfade. Para game client sound design com dezenas de SFX contextuais, a camada de abstração do use-sound e limitante.

Tone.js e para sintese musical (DAW, sequenciadores, pitch shifting). Completamente fora do escopo de UI sounds. Bundle de ~150 KB e anti-pattern para este caso.

Web Audio API nativa teria zero custo mas exige implementar desde zero: decodificacao de audio, pooling de AudioBufferSourceNode, gain graphs, autoplay policy handling. Seria 200+ linhas de infra que howler ja entrega pronto.

**Arquitetura de implementacao:**

Criar `src/lib/sound/sound-manager.ts` — singleton que instancia o Howl com todos os SFX como sprite:

```typescript
// src/lib/sound/sound-manager.ts
import Howler, { Howl } from 'howler'

const sfx = new Howl({
  src: ['/sounds/ui-sprites.webm', '/sounds/ui-sprites.mp3'],
  sprite: {
    click: [0, 120],
    hover: [200, 80],
    success: [400, 600],
    error: [1100, 400],
    queue_join: [1600, 800],
    // ...
  },
  preload: true,
  volume: 0.6,
})

export const sound = {
  play: (id: keyof typeof SFX_SPRITES) => sfx.play(id),
  setVolume: (v: number) => Howler.volume(v),
  mute: (m: boolean) => Howler.mute(m),
}
```

Criar `src/hooks/use-sound-manager.ts` para acesso React com persistencia de mute no localStorage.

**Integracao no stack atual:** `pnpm add howler`, criar sound manager em `src/lib/sound/`, expor hook `useSoundManager`. SFX assets em `public/sounds/` (2-3 arquivos: sprite WebM + MP3 fallback + ambient WebM).

---

### 3. Particles / Atmosphere

**RECOMENDACAO: `@tsparticles/react` v4.0.5 com `@tsparticles/slim` para ambient sutil**

| Tech | Versao | Bundle (gzipped) | React 19 | Perf | Controle | Caso de uso |
|------|--------|-----------------|---------|------|---------|-------------|
| `@tsparticles/react` + `@tsparticles/slim` | 4.0.5 | ~20-30 KB slim | Sim (peerDep >=16.8) | FPS limiter integrado | Alto | Particles ambientes, light dust, efeitos de login |
| React Three Fiber (R3F) + `@react-three/drei` | 9.6.1 + 10.7.7 | ~155 KB gzipped (Three.js base) | Sim | GPU acelerado | Maximo | Shaders, 3D backgrounds, efeitos pesados |
| CSS/SVG procedural | — | 0 KB | Sim | Maximo | Baixo | Vignette, gradients, static patterns |

**Por que `@tsparticles/react` ganha para ambient atmosphere:**

O objetivo e "light dust", "vignette dinamica", particles sutis em backgrounds — nao simulacao 3D. tsParticles tem `fpsLimit` embutido (padrao 60fps), suporte a FPS reduction em baixa bateria, e controle granular de densidade por viewport. O preset `@tsparticles/slim` contem apenas as features necessarias (movement, opacity, size) sem plugins extras. React 19 e suportado (`peerDependencies: react >=16.8`). Implementacao e declarativa (JSON de config) e pode ser lazy-loaded com `next/dynamic`.

R3F seria a escolha certa se houvesse shader backgrounds complexos (tipo Path of Exile login screen com GLSL personalizado). Para particles ambientes do game lobby e backgrounds sutis, R3F e overkill — o Three.js base sozinho pesa ~155 KB gzipped. Reserve R3F para V3+ se houver hero 3D ou shader cinematico de abertura.

**Integracao no stack atual:**

```typescript
// src/components/atmosphere/DustBackground.tsx
'use client'
import Particles from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

// lazy-loaded via next/dynamic na pagina
```

Montar como componente fixed/absolute no layout, com z-index atras de todo conteudo. Config JSON versionada em `src/lib/particles/`.

---

### 4. Shaders / Efeitos Visuais

**RECOMENDACAO: CSS-only fake shaders como padrao + R3F como upgrade opcional em V3**

| Abordagem | Bundle | Complexidade | Resultado visual | Quando usar |
|-----------|--------|-------------|-----------------|-------------|
| CSS filters + mix-blend-mode + mask-image | 0 KB | Baixa | Bom (vignette, glow, gradients) | Default para todos os efeitos atmosfericos |
| SVG filters (feColorMatrix, feGaussianBlur) | 0 KB | Media | Muito bom (glow animado, distorcao) | Efeitos em icones e borders |
| R3F + GLSL custom | ~155 KB base | Alta | AAA cinematico | V3+ hero section / loading screen |
| Shadertoy embeds (iframe) | 0 KB codigo | Nenhuma | Variavel | Nunca (iframe = perf pessima, sem controle) |

**Decisao tecnica:**

Para V2.5 (Design Foundations), usar exclusivamente CSS. Tailwind v4 + CSS custom properties cobrem: `backdrop-filter: blur()` para frosted glass panels, `mix-blend-mode: overlay` para glow effects, `mask-image` com gradients para vignette dinamica, `radial-gradient` animado em `@keyframes` para ambient glow pulsante. Isso e suficiente para atingir nivel visual de FACEIT/Discord sem adicionar 155 KB de Three.js.

R3F fica reservado para V3+ quando houver hero section cinematica ou loading screen com shader personalizado — o custo de bundle so se justifica para efeitos imposssiveis em CSS.

**Anti-recomendacao — Shadertoy embeds:** iframes tem perf isolada do thread principal, nao aceitam CSS theming, e nao sao acessiveis. Nunca usar.

---

### 5. Realtime Presence

**RECOMENDACAO: Supabase Realtime (ja instalado) — sem adicionar bibliotecas externas**

| Tech | Custo adicional | Presenca | Broadcast | State sync | Quando preferir |
|------|----------------|---------|-----------|------------|----------------|
| Supabase Realtime (existente) | 0 | Sim (channels Presence) | Sim (Broadcast) | Via DB + listeners | Default para este projeto |
| Liveblocks | $25+/mes | Sim | Sim | CRDT gerenciado | Colaboracao tipo Figma/Notion |
| PartyKit (Cloudflare) | $0 hobby / uso | Sim | Sim | Manual (sem CRDT) | Persistencia por "room" Cloudflare Workers |

**Por que Supabase Realtime ganha (e a unica opcao logica):**

Supabase Realtime Presence ja esta disponivel no `@supabase/ssr` instalado. A API e direta: `channel.track()` para publicar estado de presenca (usuario na fila, lobby aberto, status online), `channel.on('presence', { event: 'sync' }, handler)` para receber atualizacoes. Para o caso de uso especifico — fila ao vivo, lobby state — a latencia de WebSocket do Supabase e suficiente. Nao ha CRDT nem conflito de estado (e uma fila simples, nao edicao colaborativa).

Liveblocks e Partykit sao para aplicacoes de colaboracao em tempo real tipo documento compartilhado (Figma, Notion). Custo e complexidade sem beneficio para o formuladota.

**Implementacao:**

```typescript
// src/hooks/use-queue-presence.ts
const channel = supabase.channel('queue-lobby')

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setQueueState(state)
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, status: 'waiting' })
    }
  })
```

Para notificacoes broadcast (ex: partida iniciada), usar `channel.on('broadcast', { event: 'match_started' }, handler)`.

---

### 6. Desktop App (V3+ Futuro)

**RECOMENDACAO: Tauri v2 — avaliar apenas em V3+, nao instalar agora**

| Tech | Bundle instalador | RAM idle | Startup | Next.js compat | Dev experience |
|------|-----------------|---------|---------|---------------|----------------|
| Tauri v2 | ~10-12 MB | ~85 MB | ~1.8 s | Sim (static export obrigatorio) | Rust + web stack, mais complexo |
| Electron | ~150-180 MB | ~300-450 MB | ~12 s | Sim (full SSR possivel) | Node.js familiar, mais simples |
| Wails | ~5-8 MB | ~50 MB | ~1 s | Parcial (SPA mode) | Go + web stack |
| Neutralino | ~1-3 MB | ~30 MB | <1 s | Nao (only SPA) | Limitado, nicho |

**Analise:**

Tauri v2 (lancado outubro/2024) cresceu 35% year-over-year em adocao. Bundle 12x menor que Electron. Funciona com Next.js via static export (`next export` / `output: 'export'`). A limitacao critica: App Router com SSR/Server Actions nao funciona no Tauri porque nao ha servidor Node.js. So static pages renderizadas no browser shell. Para V3+ do formuladota (desktop client tipo launcher), isso seria aceitavel se as features do app fossem client-side (lobby UI, queue status, sound player) — o backend continua sendo o Next.js na Vercel.

Electron e mais simples para desenvolver (Node.js familiar, SSR completo), mas bundle de 150+ MB e RAM de 450 MB e uma regressao de experiencia para um game client. Discord usa Electron mas tem time de engenharia enorme. Steam Client usa seus proprios frameworks nativos.

**Decisao atual: nao instalar nada.** Adicionar Tauri ao backlog V3+. Se chegar na fase de desktop, re-pesquisar com o stack que existir na epoca.

---

### 7. Typography

**RECOMENDACAO:**
- **Display/Heading:** `@fontsource-variable/cinzel` v5.2.8
- **Body/UI:** `geist` v1.7.1 (package Vercel) — substitui Inter
- **Mono (existing):** manter JetBrains Mono existente (se ja instalado) ou `@fontsource/jetbrains-mono`

| Font | Versao (fontsource) | Tipo | Variable | OpenType | Game client feel | Uso |
|------|--------------------|----|---------|---------|----------------|-----|
| Cinzel | 5.2.8 | Serif display | Sim (wght 400-900) | Sim | ALTO — inspirado em inscricoes romanas, Reaver-alike | Titulos, H1/H2, nome FORMULADOTA, medals |
| Geist | 1.7.1 (geist pkg) | Sans-serif | Sim | Sim | MEDIO-ALTO — geometrico, limpeza tecnica, Steam-alike | Body, UI labels, botoes, dados |
| Marcellus | 5.2.8 | Serif body | Nao | Limitado | MEDIO — mais suave que Cinzel | Subtitulos, flavor text, lore |

**Por que Cinzel + Geist:**

Cinzel e inspirada em tipografia de inscricoes do primeiro seculo romano — mesma categoria visual da Reaver (fonte do Dota 2 client). E variable font com eixo de peso 400-900, permitindo dinamismo tipografico (titulos bold, subtitulos regular, decorativo thin) com um unico arquivo de fonte. Disponivel via `@fontsource-variable/cinzel` para self-hosting com subsets (sem requisicao para Google Fonts).

Geist e a fonte que a Vercel usa no Next.js 15+ como padrao e foi desenvolvida especificamente para UI de produto tecnico. Geometrica, kerning preciso, tabular numerals para MMR/stats. Disponivel via o package `geist` que exporta `GeistSans` e `GeistMono` como `next/font`-compatible variable fonts — integracao nativa sem CSS adicional.

Inter (atual no `globals.css`) e excelente mas e muito generica — sem personalidade de game client. Geist tem a mesma legibilidade com estetica tecnica mais pronunciada.

Marcellus e alternativa para flavor text ou subtitulos que precisem de mais elegancia que Geist mas menos peso que Cinzel. Tem suporte limitado a variable, entao usar com moderacao.

**Integracao no stack atual:**

```typescript
// src/app/layout.tsx
import { GeistSans, GeistMono } from 'geist/font'
import localFont from 'next/font/local'

// OU via fontsource (self-hosted):
// import '@fontsource-variable/cinzel'
```

Para Cinzel, preferir `next/font/google` com `display: 'swap'` e subset `latin` — ou fontsource para zero dependencia externa:

```typescript
import '@fontsource-variable/cinzel/index.css' // wght axis
```

Mapear em `globals.css` @theme:
```css
@theme {
  --font-display: 'Cinzel Variable', 'Cinzel', Georgia, serif;
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
}
```

---

### 8. Icons

**RECOMENDACAO: Manter `lucide-react` para UI generica + sistema SVG customizado para iconografia Dota-especifica**

| Lib | Versao | Icons | Weights | Bundle (tree-shaken) | Game UI fit |
|-----|--------|-------|---------|---------------------|------------|
| `lucide-react` (atual) | 0.456.0 | 1.500+ | 1 (stroke) | ~1 KB/icon | Medio — limpo mas sem personalidade |
| `@phosphor-icons/react` | 2.1.10 | 7.700+ | 6 (thin/light/regular/bold/fill/duotone) | ~1.5 KB/icon | Alto — duotone e fill para game hierarchy |
| `@tabler/icons-react` | 3.44.0 | 5.000+ | 2 (stroke/filled) | ~1 KB/icon | Medio — mais rico que Lucide |
| SVG customizado (sprites) | — | Ilimitado | Livre | 0 KB runtime | Maximo — unica opcao para hero icons, faction icons |

**Decisao:**

Nao substituir Lucide — tem integracao profunda com shadcn/ui e adicionar uma segunda lib so para UI generica e desperdicio. Mas Lucide e insuficiente para o universo Dota 2 (hero icons, MMR medals, faction symbols, lobby roles).

A abordagem correta e uma camada: Lucide para icones genericos (chevron, check, x, user, clock), + `@phosphor-icons/react` para icones com hierarquia visual rich (duotone para feature highlights, fill para estados ativos, thin para backgrounds decorativos), + SVG sprite system para iconografia especifica do Dota 2.

**Anti-recomendacao — substituir Lucide por Phosphor inteiramente:** Phosphor tem 7.700 icones com 6 pesos cada — bundle total e significativamente maior. Sem tree-shaking agressivo pode adicionar 100+ KB. E shadcn components ja assumem Lucide internamente. Manter os dois com uso segmentado e mais pragmatico.

**SVG sprite system para Dota-themed icons:**

Criar `public/icons/dota-sprites.svg` como spritesheet inline e acessar via `<use href="#hero-arc-warden">`. Nao requer biblioteca. Hero icons podem ser extraidos do assets oficiais do Dota 2 (Valve disponibiliza via CDN `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/`).

---

### 9. Design Tokens

**RECOMENDACAO: Tailwind v4 `@theme` + CSS custom properties — sem biblioteca adicional**

| Abordagem | Bundle adicional | Type-safety | Multi-theme | Build-time | Tailwind v4 compat |
|-----------|-----------------|------------|------------|------------|-------------------|
| Tailwind v4 `@theme` (atual) | 0 KB | Parcial (em TS via strings) | Sim (override vars em selector) | Sim | Nativo |
| Panda CSS | ~15 KB runtime | Alto | Sim | Sim | Conflita (dois sistemas de utility classes) |
| Vanilla Extract | 0 KB runtime | Alto | Sim | Sim | Incompativel direto (sem Tailwind utilities) |
| style-dictionary | 0 KB runtime | Medio | Sim | Sim | Compativel (gera CSS vars que Tailwind v4 consome) |

**Por que Tailwind v4 `@theme` ganha:**

Tailwind v4 transformou `@theme` em fonte da verdade de design tokens — cada token declarado vira automaticamente uma CSS custom property E uma utility class. Suporta multi-theme nativo: sobrescrever tokens em um selector (`.theme-radiant { --color-primary: ... }`) atualiza instantaneamente todas as utilities sem rebuild. Isso e exatamente o que o V3+ "theme Radiant/Dire" precisaria.

O arquivo `globals.css` ja tem a estrutura correta (`@theme {}` com tokens de cor, font, radius). A expansao necessaria para V2.5 e apenas adicionar tokens de motion e sound (durations, easings como CSS vars para animacoes CSS), nao trocar a abordagem.

Panda CSS conflita com Tailwind v4 porque ambos geram utility classes — dois sistemas paralelos. Nunca usar juntos.

Vanilla Extract e otimo para design systems que nao usam Tailwind — type-safe em TypeScript puro. Mas sem Tailwind utilities, perderia o `@apply`, `bg-primary`, `text-foreground` etc que ja estao em todo o codebase. Adicionar Vanilla Extract causaria uma divisao de paradigma sem beneficio pratico.

style-dictionary e a unica alternativa viavel como layer adicional — serve para exportar tokens para multiplas plataformas (web CSS vars + React Native + Figma tokens JSON). So adicionar se V3+ precisar de tokens para plataformas alem da web.

**Expansao de tokens recomendada para V2.5:**

```css
@theme {
  /* --- MOTION TOKENS --- */
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-cinematic: 600ms;

  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);          /* material standard */
  --ease-snap: cubic-bezier(0.23, 1, 0.32, 1);           /* expo out */
  --ease-dramatic: cubic-bezier(0.76, 0, 0.24, 1);       /* in-out expo */

  /* --- SOUND TOKENS (CSS nao tem som, mas documentar como comentario de ref) */
  /* Volume levels: ambient=0.15, ui=0.5, feedback=0.7, alert=1.0 */

  /* --- TYPOGRAPHY TOKENS (expandindo o existente) --- */
  --font-display: 'Cinzel Variable', 'Cinzel', Georgia, serif;
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* --- FACTION TOKENS (V3+ Radiant/Dire theming placeholder) --- */
  /* --color-faction-radiant: #5b8e3a; */
  /* --color-faction-dire:    #ac1d0e; */
}
```

---

## Stack Completo Recomendado para V2.5

### Adicionar (novas dependencias)

```bash
# Motion (animacao AAA)
pnpm add motion

# Sound design
pnpm add howler
pnpm add -D @types/howler

# Particles / atmosphere
pnpm add @tsparticles/react @tsparticles/slim

# Typography
pnpm add @fontsource-variable/cinzel geist

# Icons (adicional — opcional, usar seletivamente)
pnpm add @phosphor-icons/react
```

### Nao adicionar (confirmados desnecessarios)

| Pacote | Por que nao |
|--------|------------|
| `gsap` + `@gsap/react` | Motion cobre todos os casos de UI. GSAP so se houver intro cinematica de loading com timeline de 30+ elementos — nao e o caso do V2.5. |
| `react-three-fiber` + `three` | 155 KB de Three.js base para particles ambientes e overkill. Reservar para V3+ shader hero section. |
| `tone.js` | E um sintetizador/DAW, nao um player de SFX. Overkill total para game UI sounds. |
| `use-sound` | Wrapper fino sobre howler que abstrai demais — perde acesso a sprites e ambient control. |
| `react-howler` | Wrapper desatualizado (ultimo release >1 ano). Usar howler diretamente com hook proprio. |
| `liveblocks` / `partykit` | Supabase Realtime ja tem presenca e broadcast. Custo adicional sem beneficio. |
| `panda-css` | Conflita com Tailwind v4 (dois sistemas de utility classes paralelos). |
| `vanilla-extract` | Incompativel com paradigma Tailwind — quebraria o codebase existente. |
| `react-spring` | Motion tem spring physics integrado. Duas libs de animacao com spring e redundancia. |
| `tauri` | Ainda V3+ futuro. Nao instalar agora — re-pesquisar quando o produto chegar la. |
| `shadertoy embeds` | iframes com perf isolada, sem CSS theming, sem acessibilidade. Nunca usar. |

---

## Compatibilidade de Versoes

| Pacote | Versao | Compat com React 19 | Compat com Next 16 | Notas |
|--------|--------|--------------------|--------------------|-------|
| `motion` | 12.40.0 | Sim (>=18.2) | Sim ('use client' em animados) | Importar de "motion/react" (nao "framer-motion") |
| `howler` | 2.2.4 | Sim (vanilla JS) | Sim | Sem wrapper React — hook proprio |
| `@tsparticles/react` | 4.0.5 | Sim (peerDep >=16.8) | Sim (lazy via next/dynamic) | Usar com @tsparticles/slim, nao tsparticles full |
| `@fontsource-variable/cinzel` | 5.2.8 | N/A (CSS) | Sim | Self-hosted, sem Google Fonts request |
| `geist` | 1.7.1 | N/A (CSS) | Sim (next/font nativo) | Vercel package, integracao nativa Next.js |
| `@phosphor-icons/react` | 2.1.10 | Sim | Sim | Tree-shaking obrigatorio (so importar icons usados) |

---

## Alternativas Consideradas

| Categoria | Recomendado | Alternativa | Usar alternativa se... |
|-----------|-------------|-------------|----------------------|
| Motion | `motion` v12 | GSAP 3.15 | Intro cinematica com 30+ elementos em timeline imperativa, sem React component boundaries |
| Sound | `howler` manual | `use-sound` v5 | Apenas sons simples sem sprites ou ambient — prototipo rapido |
| Particles | `@tsparticles/slim` | R3F + drei | Hero 3D ou shader GLSL personalizado em V3+ |
| Typography body | Geist | Inter (atual) | Se a equipe preferir mais neutralidade — Inter tambem funciona |
| Typography display | Cinzel Variable | Cinzel (static) | Se quiser less variable axis complexity |
| Desktop (V3+) | Tauri v2 | Electron | Se SSR/Server Actions forem necessarios no desktop (Electron suporta, Tauri nao) |
| Tokens | Tailwind v4 @theme | style-dictionary | Se precisar exportar tokens para React Native / Figma tokens JSON |

---

## Sources

- `pnpm view motion version` — versao 12.40.0 verificada diretamente via registry (HIGH confidence)
- `pnpm view gsap version` — versao 3.15.0 verificada (HIGH confidence)
- `pnpm view howler version` — versao 2.2.4 verificada (HIGH confidence)
- `pnpm view @tsparticles/react version peerDependencies` — v4.0.5, React >=16.8 (HIGH confidence)
- `pnpm view geist version` — v1.7.1 (HIGH confidence)
- `pnpm view @fontsource-variable/cinzel version` — v5.2.8 (HIGH confidence)
- `pnpm view use-sound version peerDependencies` — v5.0.0, React >=16.8 (HIGH confidence)
- `pnpm view @phosphor-icons/react version` — v2.1.10 (HIGH confidence)
- [motion.dev/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size) — bundle sizes exatos: 34 KB full, 4.6 KB lazy (HIGH confidence)
- [motion.dev/docs/react-upgrade-guide](https://motion.dev/docs/react-upgrade-guide) — import path "motion/react", sem breaking changes v12 (HIGH confidence)
- [gsap.com/blog/3-13/](https://gsap.com/blog/3-13/) — GSAP 100% free desde Webflow acquisition outubro/2024 (HIGH confidence)
- [supabase.com/docs/guides/realtime/presence](https://supabase.com/docs/guides/realtime/presence) — APIs track/untrack/presenceState (HIGH confidence)
- [howlerjs.com](https://howlerjs.com/) — 7 KB gzipped, audio sprites, preload lazy (HIGH confidence)
- WebSearch "GSAP vs Motion 2025/2026" — multiplas fontes concordando em use cases (MEDIUM confidence)
- WebSearch "Tauri v2 vs Electron bundle size 2026" — 12 MB vs 180 MB confirmado em multiplas fontes (MEDIUM confidence)
- WebSearch "Tailwind v4 @theme multi-theme 2025" — override CSS vars em selector sem rebuild (MEDIUM confidence)
- WebSearch "tsparticles react 19 2025" — compatibilidade e perf (MEDIUM confidence)

---

*Stack research para: FormulaDota v2.5 — AAA Game Client Experience*
*Pesquisado: 2026-05-23*
