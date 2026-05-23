# DESIGN_LANGUAGE.md — FormulaDota V2.5

> Versao: 2026-05-23
> Status: ATIVO — lei permanente para todas as decisoes downstream de UI/UX.
> Dependencia: ler VISUAL_PHILOSOPHY, UX_PRINCIPLES, MOTION_SYSTEM, SOUND_SYSTEM, PRODUCT_CORE antes de consumir este documento.

---

## 1. Preambulo — DESIGN_LANGUAGE como ponte

Os cinco documentos fundacionais operam em camadas distintas:

- `VISUAL_PHILOSOPHY.md` define os principios de atmosfericidade, profundidade e identidade visual do produto.
- `UX_PRINCIPLES.md` define os 11 mandamentos de experiencia AAA — o que o produto faz e como o usuario experimenta.
- `MOTION_SYSTEM.md` define hierarquia de duracao, easings e coreografia de movimento.
- `SOUND_SYSTEM.md` define categorias de sons, acoplamento visual+som e gerenciamento de volume.
- `PRODUCT_CORE.md` define identidade de marca, arquetipo (Mestre, nao vendedor) e voz.

`DESIGN_LANGUAGE.md` e a camada de traducao. Pega decisoes filosoficas e as converte em **tokens conceituais** com valores numericos exatos, que por sua vez viram variaveis CSS em `src/styles/tokens/*`.

Exemplos de traducao direta:

| Conceito (filosofia) | Token conceitual | Implementacao CSS |
|---------------------|-----------------|------------------|
| "Atmosfericidade" | glow vermelho ambiente | `--glow-brand: 0 0 24px var(--color-brand-primary-glow)` |
| "Hierarquia cinematografica" | escala display-2xl (72px) >> heading-md (18px) | tokens de tipo em `semantic.css` |
| "Arquetipo Mestre" | fonte inscricional | `--font-display: 'Cinzel Variable', Georgia, serif` |
| "Peso visual do CTA primario" | verde play reservado | `--color-play: #5b8e3a` (nao reutilizar em outros elementos) |
| "Profundidade de layers" | z-layer nomeado | `--z-atmosphere: -10` ate `--z-takeover: 200` |
| "Feedback acoplado" | motion + som obrigatorio | C20: componente interativo sem sound = bug |

A regra de ouro: **nenhum valor de cor, espacamento, duracao ou z-index aparece em componente sem passar por um token semantic**. Componentes consomem `var(--color-brand-primary)`, nunca `#ac1d0e`.

---

## 2. Paleta Cromatica

### 2.1 Vermelho — Familia completa (nao single accent)

O vermelho da FormulaDota nao e um unico valor. E uma familia de seis paradas mais um glow. Usar o vermelho certo no contexto certo e parte da linguagem visual.

| Token semantico | Valor hex | Uso prescrito |
|----------------|-----------|---------------|
| `--color-brand-primary` | `#ac1d0e` | Cor canonica da marca. CTAs primarios, bordas de destaque, logotipo. |
| `--color-brand-primary-hover` | `#c4210f` | Estado hover de elementos brand-primary. Nunca usar como cor base. |
| `--color-brand-primary-glow` | `#ac1d0e40` | Transparencia 25% para ambient glow, shadows, halos. |
| `--color-brand-primary-deep` | `#7a140a` | Versao escura para backgrounds de elementos pressionados ou disabled. |
| `--color-brand-primary-subtle` | `#3d0a05` | Background de alerts/banners relacionados a marca (sem saturacao visual). |
| `--color-brand-primary-muted` | `#1f0503` | Background de superficies de baixissima prominencia (rodapes de card). |

Raw tokens correspondentes em `raw.css`:
```css
--fd-raw-red-50:  #fef2f2;
--fd-raw-red-300: #fca5a5;
--fd-raw-red-500: #ac1d0e;
--fd-raw-red-700: #7a140a;
--fd-raw-red-900: #3d0a05;
--fd-raw-red-glow: #ac1d0e40;
```

### 2.2 Verde Play — Reservado exclusivo para CTA "PLAY / Entrar Fila"

O verde `#5b8e3a` e a cor do Dota 2 client oficial para o botao "PLAY". E reservado com peso visual MUITO maior que qualquer elemento secundario. Nao reutilizar para badges, links ou outros estados.

| Token semantico | Valor hex | Uso prescrito |
|----------------|-----------|---------------|
| `--color-play` | `#5b8e3a` | Botao "PLAY / Entrar Fila" — unico uso. |
| `--color-play-hover` | `#6da344` | Hover do botao play. |
| `--color-play-glow` | `#5b8e3a40` | Halo ambient do botao play (glow pulse sutil). |
| `--color-play-deep` | `#3d6127` | Estado pressed do botao play. |

### 2.3 Neutros Warm (nao slate frio)

Todos os neutros devem ter leve tendencia quente (red/brown undertone). Proibido usar valores default do Tailwind `slate`, `zinc` ou `neutral` sem ajuste de temperatura.

| Token semantico | Valor hex | Uso prescrito |
|----------------|-----------|---------------|
| `--color-bg-deep` | `#080503` | Background root mais escuro (AmbientLayer base). |
| `--color-bg-base` | `#0d0906` | Background padrao de paginas. |
| `--color-bg-elevated` | `#15100b` | Cards, panels — superficie acima do background. |
| `--color-bg-surface` | `#1e1611` | Superficies interativas (hover de card, dropdowns). |
| `--color-text-display` | `#f5f0eb` | Titulos principais — off-white quente (nao branco puro). |
| `--color-text-body` | `#d4cdc7` | Corpo de texto, paragrafos. |
| `--color-text-muted` | `#8a8078` | Labels secundarios, captions, metadados. |
| `--color-text-faded` | `#56504a` | Placeholders, texto desabilitado. |
| `--color-border` | `#2a201a` | Bordas de cards, separadores. |
| `--color-border-subtle` | `#1a1410` | Bordas de baixa prominencia (dentro de cards). |

Off-white canonica: `#f5f0eb` (quente, alinhada com Dota 2 client). Nao usar `#ffffff` puro em texto sobre backgrounds escuros.

### 2.4 Estados de Feedback

Estados de feedback usam cores semanticamente distintas do vermelho da marca para evitar ambiguidade. Vermelho de feedback (`--color-error`) e diferente de vermelho de marca (`--color-brand-primary`).

| Token semantico | Valor hex | Uso |
|----------------|-----------|-----|
| `--color-success` | `#22c55e` | Confirmacoes, pagamentos ok, partida concluida. |
| `--color-warning` | `#f59e0b` | Avisos, prazos proximos, status "overdue". |
| `--color-error` | `#ef4444` | Erros, falhas criticas, banimento. |
| `--color-info` | `#3b82f6` | Informativos neutros. |

### 2.5 Anti-paletas Proibidas

Cores e estilos que destroem o feel AAA do produto:

- `slate-*`, `zinc-*`, `neutral-*` (default Tailwind) — temperatura fria, vibe SaaS.
- Gradiente lavender para pink (`#a855f7` → `#ec4899`) — paleta de landing-page startup.
- Aurora gradient (verde neon + azul + roxo) — vibe NFT/metaverso, contrario a identidade Dota.
- Cores cruas de brand sem familia (usar apenas `#ac1d0e` sem hover/glow/deep e um erro de sistema).
- Branco puro `#ffffff` em texto principal — temperatura fria demais para backgrounds quentes.

---

## 3. Tipografia — Estrategia "Inscricao vs Tela"

A tipografia da FormulaDota opera em dois modos semanticamente distintos.

### 3.1 Inscricao (Display): Cinzel Variable

`@fontsource-variable/cinzel` v5.2.8 — self-hosted, sem requisicao Google Fonts.

- Caracter: fonte de inscricao romana. Evoca gravidade, ritual, permanencia. Equivalente visual da Reaver (fonte oficial Dota 2 client) que a Valve nao distribui.
- Eixo: `wght 400-900`. Variable font = um arquivo, qualquer peso.
- Uso prescrito: H1 hero, H2 secoes principais, texto "FORMULADOTA" logotipo, CTAs primarios com peso extremo, principios da doutrina em loading screens, aceite doutrinario.
- Tracking (letter-spacing): `-0.03em` a `-0.05em` em tamanhos >= 48px. Nunca tracking positivo em display.
- Leading (line-height): `1.0` a `1.2` para titulos. Titulos comprimidos, nao aerados.
- Proibido: usar Cinzel em body text, labels de formulario, metadados, navegacao padrao.

Token: `--font-display: 'Cinzel Variable', 'Cinzel', Georgia, serif;`

### 3.2 Tela (Body): Geist

`geist` v1.7.1 — package Vercel, next/font nativo.

- Caracter: geometrica tecnica. Legibilidade maxima em tamanhos pequenos. Tabular numerals para MMR, scores e timers.
- Substitui Inter (atual) — mesma legibilidade, estetica tecnica mais pronunciada.
- Uso prescrito: body text, navegacao, captions, labels de formulario, metadados, botoes secundarios.
- Leading: `1.5` em body. Texto aerado, confortavel para leitura prolongada.
- Tabular nums: obrigatorio em qualquer sequencia numerica (MMR, rank, contador de fila, timer). Usar `font-variant-numeric: tabular-nums` ou classe Tailwind `tabular-nums`.

Token: `--font-body: 'Geist', ui-sans-serif, system-ui, sans-serif;`

### 3.3 Mono (uso raro)

`Geist Mono` (incluido no package `geist`) ou JetBrains Mono existente.

- Uso: IDs tecnicos, code blocks, valores de debug na rota `/(dev)/components`. Nao usar em UI principal.

Token: `--font-mono: 'Geist Mono', ui-monospace, monospace;`

### 3.4 Escala Tipografica

Valores exatos para cada nivel da escala. Tracking e leading sao tokens obrigatorios — nao inventar valores por componente.

| Token de nivel | Tamanho | Tracking | Leading | Fonte padrao | Peso tipico |
|---------------|---------|---------|---------|-------------|-------------|
| `--text-display-2xl` | 72px | -0.04em | 1.00 | Cinzel | 700-900 |
| `--text-display-xl` | 56px | -0.03em | 1.05 | Cinzel | 700-900 |
| `--text-display-lg` | 40px | -0.03em | 1.10 | Cinzel | 600-800 |
| `--text-heading-xl` | 32px | -0.01em | 1.15 | Cinzel ou Geist | 600-700 |
| `--text-heading-lg` | 24px | 0em | 1.20 | Geist | 600 |
| `--text-heading-md` | 18px | 0em | 1.30 | Geist | 500-600 |
| `--text-body-lg` | 16px | 0em | 1.50 | Geist | 400 |
| `--text-body-md` | 14px | 0em | 1.50 | Geist | 400 |
| `--text-body-sm` | 12px | +0.01em | 1.40 | Geist | 400 |
| `--text-caption` | 10px | +0.05em | 1.30 | Geist | 400 |

---

## 4. Espacamento — Escala 4px-base

Todo espacamento do produto deriva de multiplos de 4px. Valores intermediarios (como 6px, 10px, 14px) sao proibidos em componentes.

### 4.1 Tabela de tokens

| Token | Valor px | Classe Tailwind equivalente |
|-------|----------|---------------------------|
| `--space-0` | 0px | `p-0`, `gap-0` |
| `--space-1` | 4px | `p-1`, `gap-1` |
| `--space-2` | 8px | `p-2`, `gap-2` |
| `--space-3` | 12px | `p-3`, `gap-3` |
| `--space-4` | 16px | `p-4`, `gap-4` |
| `--space-5` | 20px | `p-5`, `gap-5` |
| `--space-6` | 24px | `p-6`, `gap-6` |
| `--space-8` | 32px | `p-8`, `gap-8` |
| `--space-10` | 40px | `p-10`, `gap-10` |
| `--space-12` | 48px | `p-12`, `gap-12` |
| `--space-16` | 64px | `p-16`, `gap-16` |
| `--space-20` | 80px | `p-20`, `gap-20` |
| `--space-24` | 96px | `p-24`, `gap-24` |
| `--space-32` | 128px | `p-32`, `gap-32` |

### 4.2 Principio cinematografico de espacamento

Produtos AAA (Steam, Riot Client, Battle.net) usam mais white-space que produtos SaaS. Isso nao e desperdicio — e hierarquia visual. Regra pratica: quando em duvida entre `--space-8` (32px) e `--space-6` (24px), preferir o maior. Densidade alta = vibe dashboard SaaS.

Proibido: `px-6` hardcoded em componente. Usar sempre via token ou classe Tailwind mapeada ao token.

---

## 5. Z-Layer System

Z-index numerico ad-hoc e causa raiz de colisoes visuais em produtos complexos. Todo z-index no codebase usa tokens nomeados.

| Token | Valor | Contexto de uso |
|-------|-------|----------------|
| `--z-atmosphere` | -10 | AmbientLayer — particles e gradientes de fundo. Nunca aparece na frente de conteudo. |
| `--z-content` | 0 | Conteudo padrao de pagina. Default implicito de todos os elementos. |
| `--z-elevated` | 10 | Cards em hover, dropdowns, tooltips de baixa prioridade. |
| `--z-overlay` | 20 | Popovers, paineis flutuantes, sidebars imersivas. |
| `--z-modal` | 50 | Dialogs, modais. Acima de todo conteudo de pagina. |
| `--z-system` | 100 | Toasts, notificacoes de sistema, alertas nao-bloqueantes. |
| `--z-takeover` | 200 | Match Found cinematico, banimento critico — fullscreen. Maximo da hierarquia. |

Uso em Tailwind: `z-[var(--z-modal)]` via arbitrary value. Nunca `z-50`, `z-[9999]` ou qualquer numero magico.

Regra: se um componente precisa de z-index acima de `--z-system` (100) para aparecer na frente de outro, o problema e de estrutura do DOM, nao de z-index. Investigar antes de escalar.

---

## 6. Radius (Cantos)

Arredondamento excessivo e assinatura visual de produto SaaS. FormulaDota usa raios menores e reserva `--radius-none` para elementos de peso cinematografico.

| Token | Valor | Uso prescrito |
|-------|-------|---------------|
| `--radius-none` | 0px | Hero sections, overlays fullscreen, elementos de impacto maximo. |
| `--radius-sm` | 4px | Badges, chips, tags, counters pequenos. |
| `--radius-md` | 8px | Botoes, inputs, tooltips. |
| `--radius-lg` | 12px | Cards padrao, paineis. |
| `--radius-xl` | 16px | Modais, drawers, panels grandes. |
| `--radius-full` | 9999px | Avatares circulares, presence dots, indicadores de status. |

Principio: quanto maior e mais imponente o elemento, menor o raio. Um modal de "Match Found" que toma a tela inteira usa `--radius-none`. Um avatar de perfil usa `--radius-full`. Um card de historico usa `--radius-lg`.

---

## 7. Shadows e Glows

Shadows definem profundidade. Glows definem identidade e intensidade AAA. Usar com intencao — glow em tudo e igual a glow em nada.

### 7.1 Shadows de profundidade

| Token | Valor CSS | Contexto |
|-------|-----------|----------|
| `--shadow-elevated` | `0 2px 8px rgba(0, 0, 0, 0.20)` | Cards em estado normal, elementos flutuantes sutis. |
| `--shadow-cinematic` | `0 8px 32px rgba(0, 0, 0, 0.60)` | Modais, dialogs, takeover screens. Sombra dramatica. |

### 7.2 Glows de identidade

| Token | Valor CSS | Contexto |
|-------|-----------|----------|
| `--glow-brand` | `0 0 24px var(--color-brand-primary-glow)` | CTAs primarios de marca em hover/focus. |
| `--glow-play` | `0 0 24px var(--color-play-glow)` | Botao PLAY/Entrar Fila — ambient pulse sutil. |
| `--glow-tier-immortal` | `0 0 16px rgba(172, 29, 14, 0.60)` | Badge de tier Immortal. Reservado. |

### 7.3 Regra de uso de glow

Glow e assinatura AAA — usada com criterio. Inventario de uso permitido:

1. CTA primario de marca (vermelho) em hover ou focus.
2. Botao PLAY/Entrar Fila em estado idle (pulse sutil) e hover.
3. Tier badge Immortal no perfil.
4. Ambient do AmbientLayer (nao em elementos de UI direta).

Proibido: glow em todos os botoes, glow em texto ordinario, glow em bordas de cards comuns.

---

## 8. Theme Switching Arquitetural

### 8.1 Situacao V2.5

Single theme `fd-dark` implementado via `:root` em `globals.css`. Nenhum switcher de UI necessario em V2.5. A estrutura ja esta arquitetada para escalar para temas adicionais.

Aplicar no HTML root:
```html
<html data-theme="fd-dark">
```

### 8.2 Mecanismo CSS (nao Context Provider)

Tokens semanticos sao redefinidos por seletor de data-attribute. Zero JS, zero re-render, sem flash de hidratacao.

```css
/* Tema padrao — fd-dark */
:root,
[data-theme="fd-dark"] {
  --color-brand-primary: var(--fd-raw-red-500);
  --color-bg-base: var(--fd-raw-neutral-warm-950);
  /* ... */
}

/* V3+ — tema Radiant (placeholder, nao implementar em V2.5) */
[data-theme="radiant"] {
  --color-brand-primary: #4a9eff;
  --color-bg-base: #030d1a;
}

/* V3+ — tema Dire (placeholder) */
[data-theme="dire"] {
  --color-brand-primary: var(--fd-raw-red-500);
  --color-bg-base: #0d0305;
}
```

### 8.3 Regra de componentes

Componentes NUNCA referenciam tokens raw (`--fd-raw-*`) nem valores hardcoded. Apenas tokens semanticos (`--color-brand-primary`, `--color-bg-elevated`). Quando o seletor de tema redefine o token semantico, todos os componentes atualizam automaticamente — sem modificacao de componente.

Violacao desta regra = divida tecnica de theme switching com custo exponencial.

---

## 9. Iconografia

### 9.1 Sistema primario: lucide-react

`lucide-react` v0.456.0 — manter como sistema unico de icones genericos. Proibido misturar com heroicons, Phosphor ou qualquer outra lib de icones genericos.

Tokens de tamanho de icone:

| Token | Valor px | Uso tipico |
|-------|----------|------------|
| `--icon-xs` | 12px | Indicadores inline, bullets, badges |
| `--icon-sm` | 16px | Labels, itens de lista, botoes pequenos |
| `--icon-md` | 20px | Botoes padrao, navegacao |
| `--icon-lg` | 24px | Destaques, acoes principais |
| `--icon-xl` | 32px | Heroes visuais, empty states |

Stroke padrao: `1.5px` (default Lucide). Nao alterar para icones de UI comum.

### 9.2 Icones customizados Dota 2: SVG sprite

Tier badges (Herald, Guardian, Crusader, Archon, Legend, Ancient, Divine, Immortal) e iconografia especifica Dota 2 vivem como SVGs em `public/icons/tiers/`. Nao dependem de biblioteca externa. Acessados via tag `<img>` ou componente `<TierBadge />`.

Convencao de nomes: `public/icons/tiers/herald-{1..5}.svg`, `immortal.svg`.

Proibido: emojis em qualquer elemento de UI. Todo estado visual comunicado por icone SVG ou texto.

---

## 10. Motion Tokens

Este documento espelha os tokens definidos com precisao em `MOTION_SYSTEM.md`. O mapeamento abaixo define os nomes canonicos usados em `src/styles/tokens/raw.css` e consumidos pelo SoundManager e por `src/lib/motion/presets.ts`.

| Token | Valor | Uso tipico |
|-------|-------|-----------|
| `--motion-duration-micro` | 100ms | Hover states, focus rings, ripples. |
| `--motion-duration-standard` | 240ms | Transicoes de estado de componentes (botoes, cards). |
| `--motion-duration-hero` | 500ms | Entradas de elementos de destaque (modal open, pro card). |
| `--motion-duration-cinematic` | 1000ms | Sequencias de tela completa (match found, takeover). |

Easings nomeados:

| Token | Valor cubic-bezier | Caracter |
|-------|-------------------|---------|
| `--motion-ease-snappy` | `cubic-bezier(0.23, 1, 0.32, 1)` | Expo out — saida rapida, ideal para menus e dropdowns. |
| `--motion-ease-soft-landing` | `cubic-bezier(0.16, 1, 0.3, 1)` | Quint out — entrada suave, para cards e paineis. |
| `--motion-ease-cinematic` | `cubic-bezier(0.76, 0, 0.24, 1)` | In-out expo — cinematico, para takeover e transicoes de rota. |
| `--motion-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Com overshoot — para botoes e elementos que "saltam". |

Proibido: `transition-duration` ou `animation-duration` com valor inline em componente. Sempre via `var(--motion-duration-*)`.

Proibido: `linear` como easing em qualquer animacao de UI. Linear e mecanico, sem personalidade.

---

## 11. Sound Volume Tokens

Este documento espelha os valores canonicos definidos em `SOUND_SYSTEM.md`. Os tokens abaixo sao consumidos pelo `SoundManager` singleton em `src/lib/sound/manager.ts`.

| Token | Valor | Camada de som |
|-------|-------|--------------|
| `--volume-interaction` | 0.6 | Sons de interacao UI (click, hover, confirm, error). |
| `--volume-ambient` | 0.3 | Sons ambientes de loop (idle da fila, musica de lobby). |
| `--volume-reward` | 0.8 | Feedback positivo de alto impacto (match found, nivel up). |
| `--volume-master` | 1.0 | Multiplicador master — persistido em localStorage. |

Os tokens de volume nao sao variaveis CSS (audio nao tem representacao CSS). Sao constantes TypeScript exportadas de `src/lib/sound/manager.ts` que referenciam os mesmos nomes para consistencia de nomenclatura com o restante do sistema de tokens.

```typescript
// src/lib/sound/manager.ts
export const VOLUME_TOKENS = {
  interaction: 0.6,
  ambient:     0.3,
  reward:      0.8,
  master:      1.0,
} as const
```

---

## 12. Implementacao Canonica — `src/styles/tokens/*`

### 12.1 Estrutura de arquivos

```
src/styles/
├── tokens/
│   ├── raw.css       # Camada 0 — valores brutos absolutos, sem semantica
│   └── semantic.css  # Camada 1 — aliases semanticos que mapeiam raw
├── globals.css        # Importa tokens + Tailwind v4 @theme + base layer
└── (nao ha component.css — tokens de componente ficam inline via CVA)
```

### 12.2 `raw.css` — Camada Zero

Contem apenas valores absolutos. Nenhum componente referencia tokens raw diretamente.

```css
/* src/styles/tokens/raw.css */

/* --- Familia vermelha --- */
--fd-raw-red-50:  #fff1f0;
--fd-raw-red-300: #fca5a5;
--fd-raw-red-500: #ac1d0e;
--fd-raw-red-700: #7a140a;
--fd-raw-red-900: #3d0a05;
--fd-raw-red-glow: #ac1d0e40;

/* --- Verde play --- */
--fd-raw-green-500: #5b8e3a;
--fd-raw-green-glow: #5b8e3a40;

/* --- Neutros warm --- */
--fd-raw-neutral-warm-50:  #f5f0eb;
--fd-raw-neutral-warm-300: #c8bfb6;
--fd-raw-neutral-warm-500: #8a8078;
--fd-raw-neutral-warm-700: #56504a;
--fd-raw-neutral-warm-800: #2a201a;
--fd-raw-neutral-warm-900: #1e1611;
--fd-raw-neutral-warm-950: #0d0906;

/* --- Motion --- */
--fd-raw-motion-micro:     100ms;
--fd-raw-motion-standard:  240ms;
--fd-raw-motion-hero:      500ms;
--fd-raw-motion-cinematic: 1000ms;

/* --- Z-layers --- */
--fd-raw-z-atmosphere: -10;
--fd-raw-z-content:      0;
--fd-raw-z-elevated:    10;
--fd-raw-z-overlay:     20;
--fd-raw-z-modal:       50;
--fd-raw-z-system:     100;
--fd-raw-z-takeover:   200;
```

### 12.3 `semantic.css` — Camada Semantica

Mapeia raw em significado. Componentes consomem apenas desta camada.

```css
/* src/styles/tokens/semantic.css */

:root,
[data-theme="fd-dark"] {
  /* Marca */
  --color-brand-primary:       var(--fd-raw-red-500);
  --color-brand-primary-hover: #c4210f;
  --color-brand-primary-glow:  var(--fd-raw-red-glow);
  --color-brand-primary-deep:  var(--fd-raw-red-700);

  /* Play CTA */
  --color-play:       var(--fd-raw-green-500);
  --color-play-hover: #6da344;
  --color-play-glow:  var(--fd-raw-green-glow);

  /* Backgrounds */
  --color-bg-deep:     #080503;
  --color-bg-base:     var(--fd-raw-neutral-warm-950);
  --color-bg-elevated: var(--fd-raw-neutral-warm-900);
  --color-bg-surface:  var(--fd-raw-neutral-warm-800);

  /* Texto */
  --color-text-display: var(--fd-raw-neutral-warm-50);
  --color-text-body:    #d4cdc7;
  --color-text-muted:   var(--fd-raw-neutral-warm-500);
  --color-text-faded:   var(--fd-raw-neutral-warm-700);

  /* Bordas */
  --color-border:        var(--fd-raw-neutral-warm-800);
  --color-border-subtle: var(--fd-raw-neutral-warm-900);

  /* Feedback */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error:   #ef4444;
  --color-info:    #3b82f6;

  /* Tipografia */
  --font-display: 'Cinzel Variable', 'Cinzel', Georgia, serif;
  --font-body:    'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono:    'Geist Mono', ui-monospace, monospace;

  /* Motion */
  --motion-duration-micro:     var(--fd-raw-motion-micro);
  --motion-duration-standard:  var(--fd-raw-motion-standard);
  --motion-duration-hero:      var(--fd-raw-motion-hero);
  --motion-duration-cinematic: var(--fd-raw-motion-cinematic);
  --motion-ease-snappy:        cubic-bezier(0.23, 1, 0.32, 1);
  --motion-ease-soft-landing:  cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-cinematic:     cubic-bezier(0.76, 0, 0.24, 1);
  --motion-ease-spring:        cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Z-layers */
  --z-atmosphere: var(--fd-raw-z-atmosphere);
  --z-content:    var(--fd-raw-z-content);
  --z-elevated:   var(--fd-raw-z-elevated);
  --z-overlay:    var(--fd-raw-z-overlay);
  --z-modal:      var(--fd-raw-z-modal);
  --z-system:     var(--fd-raw-z-system);
  --z-takeover:   var(--fd-raw-z-takeover);

  /* Radius */
  --radius-none: 0px;
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* Shadows e Glows */
  --shadow-elevated:    0 2px 8px rgba(0, 0, 0, 0.20);
  --shadow-cinematic:   0 8px 32px rgba(0, 0, 0, 0.60);
  --glow-brand:         0 0 24px var(--color-brand-primary-glow);
  --glow-play:          0 0 24px var(--fd-raw-green-glow);
  --glow-tier-immortal: 0 0 16px rgba(172, 29, 14, 0.60);

  /* Icones */
  --icon-xs: 12px;
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 32px;
}
```

### 12.4 `globals.css` — Ponto de entrada

Importa tokens e configura Tailwind v4 `@theme`:

```css
/* src/styles/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "./tokens/raw.css";
@import "./tokens/semantic.css";

@theme {
  /* Mapear tokens semanticos para utilities Tailwind */
  --color-brand-primary:      var(--color-brand-primary);
  --color-brand-primary-glow: var(--color-brand-primary-glow);
  --color-play:               var(--color-play);
  --color-bg-base:            var(--color-bg-base);
  --color-bg-elevated:        var(--color-bg-elevated);
  --color-text-display:       var(--color-text-display);
  --color-text-body:          var(--color-text-body);
  --color-text-muted:         var(--color-text-muted);

  --font-display: var(--font-display);
  --font-body:    var(--font-body);
  --font-mono:    var(--font-mono);

  --radius-none: var(--radius-none);
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);
  --radius-full: var(--radius-full);
}
```

### 12.5 Regra de consumo em componentes

Componentes usam classes Tailwind mapeadas aos tokens (`bg-brand-primary`, `text-text-display`) ou CSS vars semanticos (`background: var(--color-brand-primary)`).

NUNCA em componente:
- `className="text-[#ac1d0e]"` — valor raw hardcoded.
- `style={{ color: '#ac1d0e' }}` — inline style com raw value.
- `var(--fd-raw-red-500)` — referencia direta a token raw.
- `z-50`, `z-[9999]` — z-index numerico arbitrario.
- `duration-[240ms]` — duracao inline sem token.

---

## 13. Validacao Cross-Cutting — Regras C14 a C20

Estas regras se somam as C1-C13 do REQUIREMENTS.md e tem o mesmo peso de lei.

| Codigo | Regra | Violacao |
|--------|-------|---------|
| C14 | Cores hardcoded em componentes sao PROIBIDAS. Usar tokens semanticos. | `className="text-[#ac1d0e]"` = bug. |
| C15 | Motion duration inline e PROIBIDO. Usar `var(--motion-duration-*)`. | `transition: all 240ms` = bug. |
| C16 | Chamar sound diretamente em `onClick` e PROIBIDO. Usar hook `useSound`. | `onClick={() => sfx.play('click')}` = bug. |
| C17 | Z-index ad-hoc e PROIBIDO. Usar `var(--z-*)` via arbitrary value Tailwind. | `z-[40]`, `z-50` = bug. |
| C18 | `max-w-*` container SaaS e PROIBIDO em templates principais. Layout AAA usa fullscreen wash. | `max-w-7xl mx-auto` no ClientShell = bug. |
| C19 | Toast SaaS (Sonner vanilla), Skeleton shadcn vanilla e Spinner generico sao PROIBIDOS. Usar primitivos AAA customizados. | `<Spinner className="animate-spin" />` = bug. |
| C20 | Componente interativo DEVE acoplar motion + sound. Botao sem sound ao pressionar = bug de integracao. | `<Button onClick={fn}>` sem `useSound('click')` no handler = bug. |

### Auditoria de conformidade

Para validar conformidade das regras C14-C20, executar grep audit antes de cada PR:

```bash
# C14 — cores hardcoded
grep -rE 'text-\[#|bg-\[#|border-\[#' src/components/ src/app/

# C15 — duration inline
grep -rE 'duration:\s*[0-9]+ms|transition:.*[0-9]+ms' src/components/

# C17 — z-index numerico
grep -rE 'z-\[(?!var)[0-9]' src/components/ src/app/

# C18 — max-w SaaS em layout
grep -rE 'max-w-[0-9xl]+.*mx-auto' src/components/layout/ src/components/templates/
```

Resultado esperado: zero matches em todos os greps. Qualquer match = PR bloqueado ate correcao.

---

## Referencias Cruzadas

| Decisao aqui documentada | Implementada em |
|--------------------------|----------------|
| Familia de tokens raw | `src/styles/tokens/raw.css` |
| Tokens semanticos | `src/styles/tokens/semantic.css` |
| Tailwind @theme mapping | `src/styles/globals.css` |
| Presets de motion | `src/lib/motion/presets.ts` |
| Volume tokens | `src/lib/sound/manager.ts` (constante `VOLUME_TOKENS`) |
| Z-layer system | `src/styles/tokens/semantic.css` + `--z-*` vars |
| AmbientLayer z=-10 | `src/components/layout/ambient-layer.tsx` |
| data-theme no html | `src/app/layout.tsx` |
| Cinzel Variable import | `src/app/layout.tsx` (fontsource ou next/font) |
| Icones customizados tiers | `public/icons/tiers/*.svg` |
| Rota dev de componentes | `src/app/(dev)/components/page.tsx` |

---

*Documento encerrado. Proxima acao: implementar `src/styles/tokens/raw.css` e `semantic.css` (Phase DF2 — gate absoluto).*
