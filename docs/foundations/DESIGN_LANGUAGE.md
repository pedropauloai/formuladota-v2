# DESIGN_LANGUAGE.md — FormulaDota V2.5

> Versao: 2026-06-11 (revisao 2 — reconciliado com tokens implementados)
> Status: ATIVO — lei permanente para todas as decisoes downstream de UI/UX.
> Dependencia: ler VISUAL_PHILOSOPHY, UX_PRINCIPLES, MOTION_SYSTEM, SOUND_SYSTEM, PRODUCT_CORE antes de consumir este documento.

> **REGRA DE PRECEDENCIA (2026-06-11):** os VALORES canonicos de cor, fonte, radius e
> espacamento vivem em `src/styles/tokens/raw.css` e `semantic.css` — NAO neste documento.
> Entre 23/05 e 27/05 Pedro evoluiu a identidade direto nos tokens (vermelho ExitLag
> `#C42121`, verde GamersClub `#00C466`, neutros ExitLag, Ubuntu+Teko, radius 2px) e a
> versao anterior deste doc (Cinzel, neutros marrons, radius ate 16px) ficou OBSOLETA.
> Este doc define INTENCAO e REGRAS DE USO; os arquivos de token definem os valores.
> Se este doc contradisser os tokens, os tokens vencem — e este doc deve ser corrigido.

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
| "Arquetipo Mestre" | display condensed esports | `--font-display-condensed: 'Teko Variable', ...` |
| "Peso visual do CTA primario" | verde play reservado | `--color-play-primary: #00C466` (nao reutilizar em outros elementos) |
| "Profundidade de layers" | z-layer nomeado | `--z-atmosphere: -10` ate `--z-takeover: 200` |
| "Feedback acoplado" | motion + som obrigatorio | C20: componente interativo sem sound = bug |

A regra de ouro: **nenhum valor de cor, espacamento, duracao ou z-index aparece em componente sem passar por um token semantic**. Componentes consomem `var(--color-brand-primary)`, nunca `#ac1d0e`.

---

## 2. Paleta Cromatica

### 2.1 Vermelho — Familia completa (nao single accent)

O vermelho da FormulaDota e uma FAMILIA, nao um valor unico. Desde 2026-05-23 a cor canonica e o **vermelho ExitLag `#C42121`** (`--fd-raw-red-600`), escolha intencional de Pedro — mais punchy que o `#ac1d0e` original (preservado como `red-700` legacy). Valores completos da familia (50→900 + glows): ver `src/styles/tokens/raw.css`.

Regras de uso (estas sim sao lei deste doc):
- `--color-brand-primary` em CTAs primarios de marca, bordas de destaque, logotipo.
- Hover sempre via `--color-brand-primary-hover`, nunca clareando na mao.
- Glow vermelho APENAS nos contextos do inventario §7.3 — vermelho como chrome generalizado (scrollbar, bordas de tudo) dilui a marca.
- Vermelho de FEEDBACK (`--color-error`) e diferente de vermelho de MARCA — nunca trocar um pelo outro.

### 2.2 Verde Play/Success — `#00C466` GamersClub (unificado)

Desde 2026-05-23 (decisao Pedro): play e success usam a MESMA cor — verde GamersClub vibrante `#00C466` (`--fd-raw-green-500`), semantica unica de "acao positiva". Substituiu o `#5b8e3a` do client Dota.

- `--color-play-primary`: botao "JOGAR DOTA / Entrar na Fila" — o CTA de maior peso visual da plataforma (estrutura herdada do Dota 2: bottom-bar, canto direito, gigante).
- `--color-success`: confirmacoes, pagamentos ok, slots aceitos.
- Nao usar o verde em badges decorativas ou links — ele significa "ação positiva disponivel agora".

### 2.3 Dourado — Familia Gold (ADICIONADA 2026-06-11, decisao Pedro)

O dourado e o sinal visual mais forte de "isto e Dota" no client real: nivel, medalha, MMR, moeda, bordas de destaque. Pedro decidiu adicionar a familia gold com uso AMPLO:

| Token semantico (a criar em Fase 1) | Valor base sugerido | Uso prescrito |
|----------------|-----------|---------------|
| `--color-gold` | `~#c8aa6e` (amostrar das refs) | Numeros importantes: nivel, MMR, medalha, moeda/fichas. |
| `--color-gold-bright` | derivar | Hover/estado ativo de elementos gold. |
| `--color-gold-glow` | derivar (alpha 20%) | Glow de bordas de destaque e cards importantes em hover. |
| `--color-gold-muted` | derivar | Labels/captions associados a numeros gold. |

Escopo aprovado: numeros importantes + bordas de destaque + hover de cards importantes + estados ativos. NAO substituir o vermelho como cor de marca — gold e a cor de VALOR/PROGRESSO, vermelho e a cor de MARCA/ACAO, verde e a cor de PLAY/SUCESSO.

### 2.4 Neutros — paleta ExitLag (escuro frio sutil)

Desde 2026-05-23 os neutros sao a paleta ExitLag: body `#0B0C0F`, surfaces `#111317`/`#191D24`, texto off-white `#f5f5f5`. Escolha intencional de Pedro (identidade da marca) — substitui a prescricao anterior de neutros marrons-quentes deste doc. Valores completos: `src/styles/tokens/raw.css` (`--fd-raw-neutral-*`).

Regras de uso:
- Proibido preto puro `#000000` como background (exceto `neutral-999` em takeover) e branco puro `#ffffff` em texto.
- Proibido introduzir `slate-*`/`zinc-*` default do Tailwind — os neutros vem SEMPRE dos tokens.
- A profundidade vem do escalonamento das superficies (deep → base → elevated → surface), padrao Discord/Dota de tres niveis de escuro — nao de glassmorphism.

### 2.5 Estados de Feedback

Estados de feedback usam cores semanticamente distintas do vermelho da marca para evitar ambiguidade. Vermelho de feedback (`--color-error`) e diferente de vermelho de marca (`--color-brand-primary`).

| Token semantico | Valor hex | Uso |
|----------------|-----------|-----|
| `--color-success` | `#00C466` (= play, unificado 2026-05-23) | Confirmacoes, pagamentos ok, partida concluida. |
| `--color-warning` | `#f59e0b` | Avisos, prazos proximos, status "overdue". |
| `--color-error` | `#ef4444` | Erros, falhas criticas, banimento. |
| `--color-info` | `#3b82f6` | Informativos neutros. |

### 2.6 Anti-paletas Proibidas

Cores e estilos que destroem o feel AAA do produto:

- `slate-*`, `zinc-*`, `neutral-*` (default Tailwind) — vibe SaaS sem curadoria (os neutros do projeto vem dos tokens ExitLag).
- **Cyberpunk cyan `#00F0FF` / roxo `#A855F7`** — paleta do portfolio pedropauloai que vazou pra versoes antigas do CLAUDE.md. NAO pertence a este projeto. Encontrou em componente = migrar pra tokens.
- Gradiente lavender para pink (`#a855f7` → `#ec4899`) — paleta de landing-page startup.
- Aurora gradient (verde neon + azul + roxo) — vibe NFT/metaverso, contrario a identidade Dota.
- Cores cruas de brand sem familia (usar apenas `#ac1d0e` sem hover/glow/deep e um erro de sistema).
- Branco puro `#ffffff` em texto principal — temperatura fria demais para backgrounds quentes.

---

## 3. Tipografia — Ubuntu + Teko (revisado 2026-06-11)

> Historico: a versao original deste doc prescrevia Cinzel (display) + Geist (body).
> Em 2026-05-25 Pedro substituiu por **Ubuntu** (mesma fonte do ExitLag.com) em todo o
> produto, com **Teko** condensed reservada pra momentos epicos. Em 2026-06-11 Pedro
> LIBEROU a Teko pra navegacao e titulos — aproximando o feel do cliente Dota 2
> (tipografia condensed uppercase em nav/titulos) sem perder a identidade Ubuntu no corpo.

### 3.1 Condensed (Display + Nav): Teko

`Teko Variable` — self-hosted, estilo condensed esports (GamersClub usa Teko/Oswald; o Dota 2 client usa Radiance, condensed proprietaria da Valve).

- Uso prescrito (ESCOPO AMPLIADO 2026-06-11): navegacao da topbar (tabs uppercase), titulos de pagina e secao, botoes grandes ([JOGAR DOTA]), numeros grandes (MMR, score, online counts, countdown), Hall of Fame, momentos epicos.
- Sempre UPPERCASE em nav e botoes. Tracking levemente positivo em tamanhos pequenos de nav (+0.02em a +0.05em) pra legibilidade condensed.
- Proibido: Teko em body text, paragrafos, labels de formulario, captions longas.

Token: `--font-display-condensed: "Teko Variable", "Teko", "Oswald", "Bebas Neue", sans-serif;`

### 3.2 Tela (Body): Ubuntu

Ubuntu (Canonical, Google Fonts) — fonte do ExitLag.com, escolha de identidade de Pedro (2026-05-25). Character forte natural, peso visivel em todos os pesos.

- Uso prescrito: body text, labels de formulario, metadados, captions, botoes pequenos/medios, qualquer texto de leitura.
- Leading: `1.5` em body.
- Tabular nums: obrigatorio em qualquer sequencia numerica (MMR, rank, contador de fila, timer) — `font-variant-numeric: tabular-nums` ou classe `tabular-nums`.
- O body tem `font-weight: 600` GLOBAL por decisao explicita de Pedro (2026-05-25, "remova todas fonte anemica") — e intencional, NAO "corrigir". A densidade Dota vem de tamanho/leading/espacamento, nao de afinar o peso.

Tokens: `--font-display` e `--font-body` resolvem ambos pra Ubuntu (ver `semantic.css`).

### 3.3 Mono (uso raro)

- Uso: IDs tecnicos, code blocks, valores de debug na rota `/(dev)/components`. Nao usar em UI principal.

### 3.4 Escala Tipografica

Valores exatos para cada nivel da escala. Tracking e leading sao tokens obrigatorios — nao inventar valores por componente.

| Token de nivel | Tamanho | Tracking | Leading | Fonte padrao | Peso tipico |
|---------------|---------|---------|---------|-------------|-------------|
| `--text-display-2xl` | 72px | -0.04em | 1.00 | Teko | 600-700 |
| `--text-display-xl` | 56px | -0.03em | 1.05 | Teko | 600-700 |
| `--text-display-lg` | 40px | -0.03em | 1.10 | Teko | 500-600 |
| `--text-heading-xl` | 32px | -0.01em | 1.15 | Teko ou Ubuntu | 500-700 |
| `--text-heading-lg` | 24px | 0em | 1.20 | Ubuntu | 600 |
| `--text-heading-md` | 18px | 0em | 1.30 | Ubuntu | 500-600 |
| `--text-body-lg` | 16px | 0em | 1.50 | Ubuntu | 400 |
| `--text-body-md` | 14px | 0em | 1.50 | Ubuntu | 400 |
| `--text-body-sm` | 12px | +0.01em | 1.40 | Ubuntu | 400 |
| `--text-caption` | 10px | +0.05em | 1.30 | Ubuntu | 400 |

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

### 4.2 Principio de densidade Dota 2 (INVERTIDO 2026-06-11)

> A versao anterior desta regra ("na duvida, preferir o espacamento MAIOR") foi escrita
> com benchmark Riot/Battle.net e produzia telas vazias estilo landing page — o oposto
> do cliente Dota 2, que e DENSO: friends list com linhas de ~24px, texto de nav 11-13px,
> dezenas de itens visiveis por viewport, chrome fino. Pedro confirmou o benchmark Dota.

Regra pratica nova: **quando em duvida entre `--space-6` (24px) e `--space-4` (16px) DENTRO de paineis, listas e chrome (sidebars, topbar, bottom-bar), preferir o MENOR.** Densidade de informacao e o que faz parecer game client.

White-space generoso continua correto em UM contexto: separacao entre o elemento de 60% de atencao (regra 60-30-10) e o resto — heros, CTAs gigantes, momentos cinematograficos. Densidade no chrome, respiro no palco.

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

## 6. Radius (Cantos) — ACHATADO 2026-05-27

Decisao Pedro 2026-05-27: bordas arredondadas tinham vibe SaaS/Notion ("amador"). O padrao Dota 2 / Steam / GamersClub e arredondamento sutil de **2px (quase reto)** — e foi pra isso que TODOS os tokens de radius foram achatados.

| Token | Valor real | Uso prescrito |
|-------|-------|---------------|
| `--radius-none` | 0px | Hero sections, overlays fullscreen, elementos de impacto maximo. |
| `--radius-sm/md/lg/xl` | **2px (todos)** | Os sufixos existem so por compat com codigo legado — todo elemento retangular usa 2px. |
| `--radius-full` | 9999px | APENAS dots de presenca, pings e medalhas circulares. **NUNCA em avatar de usuario** — avatar e quadrado `rounded-sm` (padrao Steam/Dota). |

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

> Os valores NAO sao duplicados aqui de proposito — duplicacao doc/codigo foi a causa
> da deriva visual diagnosticada em 2026-06-11 (este doc dizia `#ac1d0e`/Cinzel enquanto
> o codigo implementava `#C42121`/Ubuntu). **Abrir `src/styles/tokens/raw.css`** — os
> comentarios inline do arquivo documentam origem e data de cada decisao de valor.

### 12.3 `semantic.css` — Camada Semantica

Mapeia raw em significado. Componentes consomem apenas desta camada.

> Mesma regra do 12.2: valores canonicos vivem em `src/styles/tokens/semantic.css`, nao
> aqui. O arquivo real esta organizado em 14 grupos comentados (brand → play → bg →
> texto → borda → feedback → fonts → spacing → motion → easings → z-layers → volume →
> radius → shadows), com data e motivo de cada decisao nos comentarios.

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
