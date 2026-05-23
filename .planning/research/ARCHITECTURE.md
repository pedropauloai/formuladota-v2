# Architecture Research — FormulaDota Design System

**Domain:** AAA Game Client Design System — Next.js 16 App Router
**Researched:** 2026-05-23
**Confidence:** HIGH (token/CSS, motion), MEDIUM (sound/Tauri), HIGH (composition)

---

## Visão Geral

Este documento define a arquitetura do design system FormulaDota V2.5 em 10 áreas. O objetivo é uma estrutura que escale por anos sem refactor major — tokens, primitivos, componentes, motion, sound, atmosfera, composição, documentação, multi-platform e build order.

A arquitetura parte do que já existe (Tailwind v4 com `@theme`, Base UI + CVA, shadcn compound components, shell imersivo) e formaliza camadas claras acima dessa base.

---

## 1. Camadas do Design System

### Hierarquia canônica

```
Nível 0 — Raw Tokens (primitivos)
    valores brutos sem semântica: red-800, space-4, 16px

Nível 1 — Semantic Tokens (aliases)
    significado sem componente: color-brand-primary, radius-card

Nível 2 — Component Tokens (overrides pontuais)
    exceções de component: button-border-radius, modal-backdrop-blur

Nível 3 — Primitives (headless)
    Base UI + wrappers: <Button />, <Dialog />, <Toast />

Nível 4 — Components (presentational)
    CVA + Tailwind classes sobre primitives: variantes brand, sizes

Nível 5 — Patterns (compostos)
    combinações de components: <MatchCard />, <QueuePanel />, <ProCard />

Nível 6 — Templates (layout)
    ClientShell, DashboardLayout — estrutura de page

Nível 7 — Pages
    App Router routes — apenas composição de templates + data fetching
```

Padrão validado por IBM Carbon, Material 3, Radix Themes, Adobe Spectrum — todos usam essa separação de 3 camadas de tokens (raw → semantic → component).

### Onde cada camada vive no repo

```
src/
├── styles/
│   ├── globals.css          # @theme (tokens Nível 0 e 1) — JÁ EXISTE
│   ├── tokens/
│   │   ├── colors.css       # raw palette: --fd-raw-red-800: #ac1d0e
│   │   ├── typography.css   # raw type scale: --fd-raw-size-sm: 0.875rem
│   │   ├── spacing.css      # raw spacing: --fd-raw-space-4: 1rem
│   │   ├── motion.css       # raw durations/easings: --fd-motion-fast: 120ms
│   │   └── sound.css        # volume defaults: --fd-sound-ui-volume: 0.6
│   └── semantic.css         # aliases Nível 1: --color-brand-primary: var(--fd-raw-red-800)
│
├── components/
│   ├── ui/                  # Nível 3+4: primitivos + presentational (shadcn/Base UI)
│   │   ├── button.tsx       # JÁ EXISTE — CVA over Base UI
│   │   ├── card.tsx         # JÁ EXISTE — compound pattern
│   │   ├── dialog.tsx       # a criar
│   │   ├── toast.tsx        # a criar (Sonner wrapper)
│   │   └── badge.tsx        # JÁ EXISTE
│   ├── patterns/            # Nível 5: compostos específicos do domínio
│   │   ├── match-card.tsx   # QueueCard + metadata Dota
│   │   ├── pro-card.tsx     # ProCard com status online
│   │   ├── hero-state.tsx   # estado principal CTA (já existe em queue/)
│   │   └── queue-panel.tsx  # painel de fila inline
│   └── layout/              # Nível 6: templates
│       ├── client-shell.tsx # JÁ EXISTE em client-shell/
│       ├── dota-backdrop.tsx# JÁ EXISTE em dota/
│       └── ambient-layer.tsx# a criar — layer atmosférico separado
│
├── lib/
│   ├── motion/              # NOVO — presets de animação
│   │   ├── presets.ts       # variantes Framer Motion reutilizáveis
│   │   ├── choreography.ts  # sequences compostas (loading → main menu)
│   │   └── hooks.ts         # useReducedMotion, useMotionPreset
│   └── sound/               # NOVO — sound manager
│       ├── manager.ts       # singleton SoundManager (Howler)
│       ├── sprites.ts       # mapa de offsets do sprite sheet
│       ├── hooks.ts         # useSound, useSoundLayer
│       └── types.ts         # SoundLayer, SoundEvent enums
```

### Decisão: token format

**Usar CSS variables nativas via Tailwind v4 `@theme`** — não Style Dictionary, não JSON separado.

Custo: sem export automático para Figma ou outros.
Benefício: zero overhead de build extra, Tailwind v4 transforma `@theme` em utilities automaticamente, CSS variables ficam disponíveis globalmente (browser, JS, third-party), performance incremental 8x+ mais rápida.

O projeto é dark-only, single-dev, sem Figma vars ativos — Style Dictionary seria complexidade sem retorno agora. Quando/se Figma sync for necessário (V3+), adicionar Style Dictionary como camada de export sem mudar a fonte (CSS vars continuam sendo o master).

### Naming convention

Usar prefixo `--fd-` para tokens raw (evita colisão com Tailwind ou shadcn):

```css
/* Nível 0 — Raw (nunca usar diretamente em componentes) */
--fd-raw-red-900: #7a140a;
--fd-raw-red-800: #ac1d0e;
--fd-raw-space-4: 1rem;
--fd-raw-motion-fast: 120ms;

/* Nível 1 — Semantic (usar em componentes) */
--color-brand-primary: var(--fd-raw-red-800);
--color-brand-glow: #ac1d0e33;
--motion-duration-fast: var(--fd-raw-motion-fast);
```

Tokens Tailwind (`--color-*`, `--radius-*`) continuam mapeados via `@theme inline` para shadcn/ui — não mudar esse padrão, já funciona.

---

## 2. Theme Switching Arquitetural

### Decisão: `data-[theme]` attribute no `<html>`

**Usar atributo `data-theme` no elemento `<html>`, com tokens CSS variables redefinidos por seletor.**

```css
/* globals.css */
:root, [data-theme="formuladota"] {
  --color-brand-primary: #ac1d0e;   /* vermelho FORMULADOTA */
  --color-brand-accent: #5b8e3a;    /* verde play */
}

[data-theme="radiant"] {           /* V3+ — tema fação Radiant */
  --color-brand-primary: #4a9eff;  /* azul Radiant */
  --color-brand-accent: #22c55e;
}

[data-theme="dire"] {              /* V3+ — tema fação Dire */
  --color-brand-primary: #8b0000;  /* vermelho Dire dark */
  --color-brand-accent: #f59e0b;
}
```

Custo: tokens precisam ser 100% semantic (nenhum componente usa valor raw hardcoded).
Benefício: theme switch é CSS puro — zero JS, zero re-render, sem flash. Componentes não sabem de themes. Escala pra quantas fações quiser.

**Por que não className switch nem Context Provider:**
- `className` no html exige React hydration antes de aplicar — flash garantido.
- Context Provider causa re-render de toda a árvore — inaceitável para game client com animações.
- `data-theme` + CSS variables = browser aplica instantaneamente, antes de qualquer JS.

Referência: pattern usado por next-themes, Radix Themes, e documentado como best practice para Tailwind v4 + Next.js 2025.

### Como aplicar em V2.5

V2.5 = single theme `formuladota` (default em `:root`). Nenhum switcher de UI necessário. Estrutura de `data-theme` é arquitetada agora para não quebrar componentes depois.

Regra obrigatória: **nenhum componente usa valor de cor hardcoded** — sempre via token semantic. Violação = dívida técnica de theme switching.

---

## 3. Motion Architecture

### Onde vivem os presets

`src/lib/motion/` — não `src/components/motion/`. Razão: presets são **configurações** (objetos de dados), não componentes React. Componentes de motion (FadeIn, Stagger etc.) ficam em `src/components/ui/motion/`.

```
src/lib/motion/
├── presets.ts          # MotionVariants exportadas: fadeIn, scaleIn, slideUp, stagger
├── choreography.ts     # sequences: loadingToMain(), menuOpen(), modalEnter()
└── hooks.ts            # useReducedMotion(), useMotionSafe()

src/components/ui/motion/
├── fade-in.tsx         # <FadeIn> wrapper sobre motion.div + preset fadeIn
├── stagger.tsx         # <Stagger> wrapper com staggerChildren
├── scale-enter.tsx     # <ScaleEnter> para cards e modais
└── page-transition.tsx # wrapper de transição de página App Router
```

### Choreography pattern

**Usar Framer Motion variants com staggerChildren** — não sequences manuais de setTimeout.

```typescript
// src/lib/motion/presets.ts
export const motionPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }  // easeOutExpo
  },
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.06 } }
  },
  staggerItem: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 }
  }
} as const
```

Custo: Framer Motion é ~45kb gzipped — bundle considerável.
Benefício: staggerChildren heranças automáticas, layout animations, shared element transitions (page transitions entre rotas) — features que CSS puro não tem.

**Anti-pattern:** cada componente reimplementar `staggerChildren` com valores diferentes. Toda stagger usa `motionPresets.staggerContainer` — padronizado.

### Reduced motion handling

```typescript
// src/lib/motion/hooks.ts
export function useMotionSafe<T>(full: T, reduced: T): T {
  const prefersReduced = useReducedMotion()  // Framer Motion hook
  return prefersReduced ? reduced : full
}
```

Todo preset tem variante reduced: `fadeIn` reduced = `{ opacity: 1 }` imediato. Nunca remover animação completamente — substituir por transition instantâneo.

Regra: componentes **nunca** verificam `prefers-reduced-motion` diretamente. Usam `useMotionSafe` ou o preset que já tem fallback embutido.

---

## 4. Sound Architecture

### Onde vivem os assets

`public/sounds/` — **não** `src/assets/`. Razão: Next.js serve `public/` com cache headers estáticos sem processamento — ideal para assets binários grandes. Vite/webpack não precisam processar `.ogg`/`.webp` de áudio.

```
public/
└── sounds/
    ├── ui-sprites.webm     # sprite sheet principal — interações UI
    ├── ui-sprites.mp3      # fallback MP3 (Howler dual-format)
    ├── ambient/
    │   ├── match-found.webm
    │   └── queue-idle.webm
    └── sfx/
        └── level-up.webm
```

### Sound Manager: singleton module, não Provider

```typescript
// src/lib/sound/manager.ts
// Singleton — instanciado uma vez, acessado via import direto

let _manager: SoundManager | null = null

export function getSoundManager(): SoundManager {
  if (!_manager) _manager = new SoundManager()
  return _manager
}

class SoundManager {
  private layers: Record<SoundLayer, Howl> = {} as any
  private volumes: Record<SoundLayer, number> = {
    ui: 0.6,
    ambient: 0.3,
    sfx: 0.8,
  }
  // ...
}
```

Custo: singleton = estado global, mais difícil de testar.
Benefício: zero overhead de Provider/Context. Som é infraestrutura global (como logger) — não depende de componente. Hook `useSound` consome o singleton.

**Por que não Provider:** som precisa funcionar de Server Components (impossível) e em callbacks de eventos que não têm acesso a Context. Provider causaria re-render ao mudar volume.

**Por que não window event bus:** difícil de tipar, sem tree-shaking, acoplamento implícito.

### Sprite sheet vs arquivos separados

**Usar sprite sheet para sons de UI** — um arquivo `.webm` + `.mp3` com múltiplos sons como offsets.

```typescript
// src/lib/sound/sprites.ts
export const UI_SPRITES = {
  src: ['/sounds/ui-sprites.webm', '/sounds/ui-sprites.mp3'],
  sprite: {
    buttonClick:  [0, 120],      // offset ms, duração ms
    buttonHover:  [200, 80],
    modalOpen:    [400, 300],
    modalClose:   [800, 200],
    notification: [1100, 500],
    error:        [1700, 400],
  }
} as const
```

Custo: editar sprites requer regenerar o arquivo.
Benefício: 1 request HTTP para todos os sons de UI — crítico em mobile onde latência de rede é alta. Howler caches automaticamente após primeiro load.

Sons ambient (queue, match found) ficam em arquivos separados — são longos, carregados sob demanda, não antecipáveis.

### Volume control por layer + persistência

```typescript
// src/lib/sound/hooks.ts
export function useSoundLayer(layer: SoundLayer) {
  return {
    play: (event: SoundEvent) => getSoundManager().play(layer, event),
    setVolume: (v: number) => {
      getSoundManager().setVolume(layer, v)
      localStorage.setItem(`fd-sound-${layer}-vol`, String(v))
    },
    mute: () => getSoundManager().mute(layer),
  }
}
```

### Mobile autoplay constraint

O `AudioContext` começa em estado `suspended` em mobile até o primeiro gesto do usuário. O SoundManager **não tenta autoplay** — registra listener no primeiro `click`/`touchstart` para fazer `resume()`.

```typescript
// SoundManager.constructor()
const resumeOnGesture = () => {
  Howler.ctx?.resume()
  document.removeEventListener('click', resumeOnGesture)
  document.removeEventListener('touchstart', resumeOnGesture)
}
document.addEventListener('click', resumeOnGesture)
document.addEventListener('touchstart', resumeOnGesture)
```

Sons são silenciosamente enfileirados antes do gesto, reproduzidos após. Não exibir nenhuma UI de "clique para ativar som" — game clients não fazem isso.

---

## 5. Atmospheric Layer Architecture

### Onde fica: `<AmbientLayer>` no root layout, não por page

```typescript
// src/app/layout.tsx (root layout)
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AmbientLayer />        {/* z-index: -10, pointer-events: none */}
        {children}              {/* z-index: 0 */}
        <PortalRoot />          {/* modais, tooltips — z-index: 50+ */}
      </body>
    </html>
  )
}
```

Custo: layer sempre ativo mesmo em pages que não precisam de atmosfera.
Benefício: centralizado, sem duplicação, pages não carregam/descarregam canvas (evita flash de partículas ao navegar). Pages controlam intensidade via `AmbientLayerContext`.

### AmbientLayer implementation

```typescript
// src/components/layout/ambient-layer.tsx — CLIENT COMPONENT
'use client'
// Canvas 2D ou tsParticles com z-index negativo
// Pausa quando document.hidden (Page Visibility API)
// Throttle em requestAnimationFrame quando fps < 30
// Respeita prefers-reduced-motion: remove partículas, mantém gradiente estático
```

**Usar tsParticles `@tsparticles/slim`** (bundle menor que full) ou canvas 2D manual para máximo controle. tsParticles tem `zIndex: -1` nativo e pause automático quando fora de viewport.

### Z-layer system

```css
/* Sistema de z-index com layers nomeados */
/* Nunca usar valores numéricos arbitrários em componentes */

/* src/styles/tokens/layers.css */
--z-atmosphere: -10;    /* partículas, gradientes de fundo */
--z-base: 0;            /* conteúdo de página */
--z-float: 10;          /* sidebars floating, tooltips hover */
--z-overlay: 20;        /* sidebars imersivas, drawers */
--z-topbar: 30;         /* top-bar, bottom-bar fixas */
--z-modal: 50;          /* modais, dialogs */
--z-toast: 70;          /* notificações */
--z-system: 100;        /* alertas críticos de sistema */
```

Componentes usam `z-[var(--z-modal)]` via Tailwind arbitrary value — nunca `z-50` hardcoded.

### Performance

- `Page Visibility API`: `document.addEventListener('visibilitychange', ...)` — pausa animações quando aba em background (economia de bateria, CPU).
- `prefers-reduced-motion`: AmbientLayer renderiza apenas gradiente estático, sem canvas/partículas.
- Low-end detection: `navigator.hardwareConcurrency <= 2` ou `deviceMemory <= 2` → reduz particle count para 20% do normal.

---

## 6. Component Composition Philosophy

### Stack atual: Base UI + CVA — manter

Base UI alcançou estável v1.0 em dezembro 2025. shadcn/ui adicionou suporte oficial a Base UI como alternativa ao Radix em 2025. O projeto já usa Base UI — não mudar.

**Base UI não tem `asChild`** — usa `useRender` hook e render props. Para o nosso caso isso é vantagem: sem `cloneElement` implícito, type errors em compile time.

### Pattern de composição: compound components com dot notation

Usar `Card.Root`, `Card.Header`, `Card.Footer` para componentes com mais de 3 partes. Usar props flat para componentes simples (<3 partes).

```typescript
// Compound — Card tem Root+Header+Content+Footer
<Card.Root>
  <Card.Header>...</Card.Header>
  <Card.Content>...</Card.Content>
  <Card.Footer>...</Card.Footer>
</Card.Root>

// Flat — Badge tem só variant+size
<Badge variant="tier-immortal" size="sm" />
```

O `card.tsx` atual já usa compound pattern (CardHeader, CardContent etc.) mas exporta como named exports separados, não como `Card.Header`. Manter compatibilidade — não refatorar agora, documentar como anti-pattern pra novos componentes.

### Variant API: CVA — manter

CVA é framework-agnostic, funciona perfeitamente com Tailwind v4. Tailwind Variants oferece `slots` (útil para componentes com múltiplas partes) mas adiciona complexidade desnecessária para o nosso escopo.

Regra: usar CVA para variants de um único elemento. Para compound components com múltiplas partes, CVA por parte, não TV slots.

```typescript
// CVA para Button (1 elemento)
const buttonVariants = cva(baseClasses, { variants: { variant, size } })

// CVA separado por parte em compound (não TV slots)
const cardRootVariants = cva(rootBase, { variants: { elevation } })
const cardHeaderVariants = cva(headerBase, {})
```

### Headless → Presentational separation

Todo componente em `src/components/ui/` segue:
1. Importar primitive de Base UI
2. Aplicar CVA classes
3. Exportar com `data-slot` para CSS targeting (padrão shadcn)
4. Zero lógica de negócio — `onClick` handlers são props, nunca internos

---

## 7. Multi-Platform Readiness (Tauri Futuro)

### Avaliação honesta: Howler.js em Tauri é PROBLEMÁTICO

Evidência: issues reportados no GitHub do Tauri (`#4624`) e do Howler (`#432`) confirmam que áudio via JS (incluindo Howler) pode não funcionar em Tauri webview dependendo da plataforma. Problemas documentados incluem: sem áudio no Windows, velocidade incorreta no Safari/WebKit.

**Decisão para V2.5:** implementar Howler para web, mas **isolar o SoundManager atrás de uma abstraction interface**.

```typescript
// src/lib/sound/types.ts
export interface ISoundManager {
  play(layer: SoundLayer, event: SoundEvent): void
  setVolume(layer: SoundLayer, volume: number): void
  mute(layer: SoundLayer): void
}

// src/lib/sound/manager.ts — implementação web (Howler)
// src/lib/sound/manager-tauri.ts — implementação desktop (Tauri Plugin Audio ou noop)
```

Se/quando Tauri for implementado, só trocar a implementação concreta — interface permanece.

### CSS tokens e motion: seguros para Tauri

CSS variables, Tailwind classes, Framer Motion: todos funcionam em qualquer webview moderno. Sem quebras esperadas.

### tsParticles em Tauri

Canvas 2D funciona em Tauri webview. WebGL pode ter problemas em algumas configs. Usar canvas 2D (não WebGL) para AmbientLayer — já compatível.

### Monorepo readiness (Turborepo)

O projeto tem estrutura `bot/` separada (Discord.js). Quando desktop app (Tauri) for necessário:

```
formuladota/
├── apps/
│   ├── web/              # Next.js atual (mover src/ pra cá)
│   ├── desktop/          # Tauri wrapper (V3+)
│   └── bot/              # Discord.js (já existe)
├── packages/
│   ├── design-tokens/    # CSS vars exportados pra uso no desktop
│   ├── ui/               # componentes compartilhados (se Tauri usar React)
│   └── config/           # TypeScript, ESLint configs compartilhados
└── turbo.json
```

Não migrar para monorepo agora — overhead alto, ganho zero em V2.5. Preparar: manter `bot/` com `package.json` próprio (já está assim), manter `src/lib/` sem imports de `next/` (portável). Migrar quando desktop app for iniciado.

---

## 8. Documentation & Discoverability

### Decisão: sem Storybook em V2.5

Storybook 8/10 é setup pesado, cold start lento mesmo com Vitest integration. Para um dev solo (Pedro não-dev), o custo de manutenção de stories é proibitivo.

Custo de não ter: sem playground visual isolado, sem visual regression automatizado.
Benefício: zero overhead, componentes documentados em `docs/foundations/` como MDX, testados diretamente no app.

**Abordagem alternativa:** criar uma rota interna de desenvolvimento `src/app/(dev)/components/page.tsx` — acessível apenas em `NODE_ENV=development`, lista todos os componentes com todas as variantes, visual ao vivo no contexto real do app.

```typescript
// src/app/(dev)/components/page.tsx — NÃO indexada em produção
// Mostra: Button em todas variantes, Card em todas elevações, Badge por tier
// Zero setup externo, hot reload automático via Next.js dev server
```

### Onde vivem ADRs e documentação filosófica

Já decidido: `docs/foundations/` na raiz do repo.

```
docs/
└── foundations/
    ├── VISUAL_PHILOSOPHY.md
    ├── UX_PRINCIPLES.md
    ├── MOTION_SYSTEM.md       # referencia src/lib/motion/presets.ts
    ├── SOUND_SYSTEM.md        # referencia src/lib/sound/manager.ts
    ├── PRODUCT_CORE.md
    └── DESIGN_LANGUAGE.md     # fonte de verdade de constraints permanentes
```

ADRs (Architecture Decision Records) ficam em `docs/adr/` — um arquivo por decisão, formato `YYYY-MM-DD-titulo.md`.

---

## 9. Token Export Pipeline

### V2.5: CSS variables são fonte de verdade — sem Style Dictionary

Style Dictionary v4 é ESM-native e browser-compatible, adequado para projetos que precisam exportar tokens para iOS, Android, Figma. Para V2.5: zero necessidade.

**Quando adicionar Style Dictionary:** se/quando Pedro contratar designer com Figma, ou quando houver app mobile nativo. Não antes.

**Naming convention que sobrevive a futuro export:**

Tokens seguem hierarquia `categoria-variante-estado`:
- `--fd-color-brand-primary` (não `--fd-red-800`)
- `--fd-motion-duration-fast` (não `--fd-120ms`)
- `--fd-radius-card` (não `--fd-8px`)

Semantic > literal em nomes. Valores mudam, significados não.

**Export manual para desktop (V3+):** como tokens são CSS vars, um script simples lê `globals.css` e gera um arquivo `tokens.json` — não precisa de Style Dictionary para esse caso.

---

## 10. Build Order com Dependencies entre Camadas

### Sequência obrigatória (dependências em cascata)

```
F1 — Foundations Docs (sem deps de código)
     VISUAL_PHILOSOPHY, UX_PRINCIPLES, MOTION_SYSTEM, SOUND_SYSTEM,
     PRODUCT_CORE, DESIGN_LANGUAGE
     → Output: constraints que guiam todas as decisões de F2+

F2 — Token Layer (sem deps de código, apenas design decisions)
     CSS variables raw + semantic em globals.css
     Motion tokens: --fd-motion-fast/medium/slow, easings
     Sound tokens: --fd-sound-*-volume defaults
     Z-layer tokens: --z-atmosphere/-base/-float/-overlay/-topbar/-modal
     → Output: globals.css completo

F3 — AmbientLayer + Z-system (depende de: F2 z-tokens)
     ambient-layer.tsx, Page Visibility pause, reduced-motion fallback
     → Output: background atmosférico funcional

F4 — Motion Primitives (depende de: F2 motion-tokens)
     src/lib/motion/presets.ts, hooks.ts, choreography.ts
     src/components/ui/motion/ (FadeIn, Stagger, ScaleEnter)
     → Output: sistema de animação reutilizável

F5 — Sound Infrastructure (depende de: F2 sound-tokens, public/sounds/)
     sprite sheet de SFX, SoundManager singleton, useSound hook
     → Output: sons de UI funcionando

F6 — Component Primitives (depende de: F2 tokens, F4 motion)
     Button AAA, Card AAA, Dialog/Modal, Toast, Badge tiers
     Cada componente usa motion presets de F4, tokens de F2
     → Output: componentes base prontos

F7 — Pattern Components (depende de: F6 primitives, F5 sound)
     MatchCard, ProCard, QueuePanel, HeroState redesign
     Sons de interação via F5, animações via F4
     → Output: patterns específicos do domínio

F8 — Templates & Pages (depende de: F3 atmosphere, F6, F7)
     ClientShell update com novo design, Landing redesign
     → Output: páginas com AAA experience completa
```

### Regras de dependency entre camadas

1. Tokens não importam nada de `src/` — só CSS puro
2. Primitivos (F6) importam `src/lib/motion/` mas não `src/lib/sound/`
3. Patterns (F7) podem importar motion E sound
4. Templates nunca importam sound diretamente — passam como prop ou usam Context mínimo
5. Pages são Server Components — sem motion/sound direto, delegam pra Client Components filhos

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAGES (App Router — Server Components)                             │
│  src/app/(app)/**                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  TEMPLATES (Layout — Client/Server mix)                             │
│  src/components/layout/client-shell.tsx                             │
│  src/components/layout/dota-backdrop.tsx                            │
├─────────────────────────────────────────────────────────────────────┤
│  PATTERNS (Compostos de domínio — Client Components)                │
│  src/components/patterns/match-card | pro-card | queue-panel        │
├─────────────────────────────────────────────────────────────────────┤
│  COMPONENTS (Presentational — Client Components)                    │
│  src/components/ui/button | card | dialog | badge | toast           │
├─────────────────────────────────────────────────────────────────────┤
│  PRIMITIVES (Headless — Base UI)                                    │
│  @base-ui/react/button | dialog | tooltip | menu                    │
├──────────────┬──────────────────────────────┬───────────────────────┤
│  MOTION      │  SOUND                       │  ATMOSPHERE           │
│  lib/motion/ │  lib/sound/manager.ts        │  layout/ambient-layer │
│  presets.ts  │  public/sounds/sprites.webm  │  tsParticles/canvas2D │
│  Framer Mot. │  Howler.js singleton         │  z-index: -10         │
├──────────────┴──────────────────────────────┴───────────────────────┤
│  DESIGN TOKENS (CSS Variables — globals.css)                        │
│  Raw: --fd-raw-*   Semantic: --color-brand-*   Z: --z-*            │
│  Motion: --fd-motion-*   Sound: --fd-sound-*-volume                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Anti-Patterns — O Que NÃO Fazer

### Anti-Pattern 1: Valores hardcoded em componentes

**O que fazem:** `className="text-[#ac1d0e]"` ou `style={{ color: '#ac1d0e' }}` diretamente em componente.
**Por que é errado:** bloqueia theme switching (V3+ Radiant/Dire), cria inconsistência entre tokens documentados e implementação real.
**Faça isso:** `className="text-brand-primary"` via token semantic.

### Anti-Pattern 2: cada componente re-implementar stagger

**O que fazem:** `variants={{ animate: { transition: { staggerChildren: 0.05 } } }}` repetido em cada lista, card grid, etc.
**Por que é errado:** valores inconsistentes, difícil de ajustar globalmente, não respeita reduced-motion.
**Faça isso:** `<Stagger>` wrapper de `src/components/ui/motion/stagger.tsx`.

### Anti-Pattern 3: `z-index` numérico arbitrário

**O que fazem:** `z-[9999]` ou `z-50` para "garantir que aparece na frente".
**Por que é errado:** colisões entre layers, impossível manter hierarquia visual consistente.
**Faça isso:** `z-[var(--z-modal)]` usando o z-layer system documentado.

### Anti-Pattern 4: sound chamado diretamente em Server Components

**O que fazem:** importar `getSoundManager()` em Server Component ou em `page.tsx`.
**Por que é errado:** SoundManager usa Web Audio API — browser-only. Server Components não têm DOM.
**Faça isso:** sons apenas em Client Components com `'use client'`. Se um pattern precisa de som, ele é Client Component.

### Anti-Pattern 5: AmbientLayer por page

**O que fazem:** `<Particles />` ou `<AmbientCanvas />` dentro de cada page que quer atmosfera.
**Por que é errado:** canvas recriado a cada navegação (flash), múltiplas instâncias concorrentes, impossível pausar globalmente.
**Faça isso:** `<AmbientLayer />` uma vez no root layout, pages controlam intensidade via Context/store.

### Anti-Pattern 6: theme via Context Provider React

**O que fazem:** `ThemeProvider` wrappando app, `useTheme()` em cada componente que precisa de cor.
**Por que é errado:** re-render de toda a árvore ao trocar tema, flash de tema no SSR antes de hydration.
**Faça isso:** `data-theme` no `<html>`, CSS variables resolvem no browser antes de qualquer JS.

### Anti-Pattern 7: Storybook antes de ter sistema de tokens estável

**O que fazem:** configurar Storybook como primeira coisa, criar stories antes de ter tokens definidos.
**Por que é errado:** stories re-trabalho constante enquanto tokens evoluem, setup overhead sem retorno.
**Faça isso:** rota `/(dev)/components` no app enquanto tokens são finalizados. Storybook apenas se houver time de design.

---

## Integração com Stack Existente

| Camada | Integração com existente | Notas |
|--------|--------------------------|-------|
| Tokens | `globals.css @theme` — já existe base, expandir | Não quebrar tokens shadcn mapeados |
| Motion | Adicionar Framer Motion — não existe ainda | `npm install framer-motion` necessário |
| Sound | Adicionar Howler — não existe ainda | `npm install howler @types/howler` |
| Atmosphere | Novo componente, no root layout | Não impacta rotas existentes |
| Components | Manter Base UI + CVA — já funcionam | Migrar card.tsx para compound com dot notation em novo |
| Theme | `data-theme` no html — adicionar sem quebrar `:root` atual | Testar com shadcn tokens |

---

## Referências de Pesquisa

- Tailwind v4 `@theme` design tokens: https://tailwindcss.com/blog/tailwindcss-v4
- Tokens em 3 camadas (raw/semantic/component): https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025
- Style Dictionary v4: https://styledictionary.com/versions/v4/statement/
- Base UI v1.0 e useRender: https://base-ui.com/react/utils/use-render
- Howler.js sprites: https://howlerjs.com/
- Howler + Tauri issues: https://github.com/tauri-apps/tauri/issues/4624
- tsParticles React: https://github.com/tsparticles/react
- Framer Motion accessibility: https://motion.dev/docs/react-accessibility
- next-themes data-theme pattern: https://github.com/pacocoursey/next-themes
- Compound components 2025: https://vercel.com/academy/shadcn-ui/compound-components-and-advanced-composition
- Riot Client architecture: https://technology.riotgames.com/news/under-hood-league-client%E2%80%99s-hextech-ui
- Mobile autoplay policy: https://developer.chrome.com/blog/autoplay
- Turborepo monorepo: https://turborepo.dev/docs/guides/frameworks/nextjs
- CVA vs Tailwind Variants: https://dev.to/webdevlapani/cva-vs-tailwind-variants-choosing-the-right-tool-for-your-design-system-12am

---

*Architecture research for: FormulaDota Design System — AAA Game Client Experience*
*Researched: 2026-05-23*
