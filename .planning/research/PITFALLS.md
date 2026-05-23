# Pitfalls Research — AAA Game Client Feel

**Domain:** Web game client / hub gaming platform (Next.js/React)
**Researched:** 2026-05-23
**Confidence:** HIGH (baseado em análise do codebase atual + fontes externas verificadas)
**Scope:** 10 categorias específicas de armadilhas que destroem feel AAA e entregam "web app SaaS genérico"

---

## Contexto do Codebase Atual

Análise do estado real antes das recomendações:

- `globals.css` usa tokens bem definidos (`--color-brand-red`, `--color-card`, etc.) — base sólida
- `button.tsx` usa shadcn/base-ui vanilla com variantes genéricas (default, outline, secondary, ghost) — sem personalidade AAA
- `card.tsx` usa `rounded-xl bg-card ring-1 ring-foreground/10` — pattern padrão shadcn, 1px border de SaaS
- `skeleton.tsx` usa `animate-pulse rounded-md bg-muted` — spinner/skeleton genérico sem contexto narrativo
- `page.tsx` Hero tem `max-w-4xl` + `flex flex-col items-start` + grid 3 colunas em HowItWorks — assinatura landing page
- Screenshot dashboard atual: sidebar 256px + content area + cards em grid regular — template SaaS dashboard clássico
- Motion: zero motion declarado no CSS, sem easing customizado, sem duração hierárquica
- Sound: completamente ausente
- Z-index: não documentado, ad-hoc via Tailwind (`z-10`, `z-50` inline)

---

## PITFALL 1: Visual Hierarchy Collapse

### O que vai errado

Cards iguais empilhados sem peso diferenciado. Tudo em grid 2-3 colunas iguais. Botões primário/secundário/terciário com mesma height e visual weight. Typography sem escala dramática — todos os H2 aparecem no mesmo tamanho independente de importância.

**Sintoma no codebase atual:** HowItWorks em `page.tsx` usa `grid gap-6 md:grid-cols-3` com 3 `<article>` idênticos. Nenhum card tem peso diferente dos outros. O card "1. Compre sua ficha" deveria ter 3x o peso do card "3. Jogue + Aprenda" se o objetivo é conversão, mas hoje são visualmente equivalentes.

### Por que destrói feel AAA

O olho humano precisa de um ponto de entrada. Sem hierarquia, o usuário faz varredura e não encontra onde focar — sensação de "onde começo?". Game clients AAA (Dota 2, Battle.net, Riot Client) têm sempre 1 elemento dominante que comanda 60-70% da atenção visual (hero image, queue button, season banner). O restante existe em hierarquia subordinada.

No estado atual: a landing tem 6 seções com peso visual quase igual, o dashboard tem 4 cards admin em grid 3 colunas com o mesmo `padding-8 border rounded-md` — visualmente democráticos demais.

### Como evitar

**Regra 60-30-10 aplicada a layout:**
- 60% da tela: elemento primário (hero, CTA principal, queue ativa)
- 30%: contexto de suporte (stats, manifesto, como funciona)
- 10%: metainformação (badges, timestamps, links secundários)

**Escala tipográfica com ratio 1.5 (não 1.25):**
```css
/* ANTI-PATTERN — escala flat, todos parecem igual */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-4xl: 2.25rem;   /* 36px */

/* CORRETO — ratio 1.5 cria drama visual */
--text-xs: 0.75rem;    /* 12px — metadado */
--text-sm: 0.875rem;   /* 14px — body */
--text-base: 1rem;     /* 16px — body prominente */
--text-lg: 1.25rem;    /* 20px — label */
--text-xl: 1.5rem;     /* 24px — subheadline */
--text-2xl: 2rem;      /* 32px — headline */
--text-3xl: 3rem;      /* 48px — display */
--text-4xl: 4.5rem;    /* 72px — hero/cinematic */
```

**Hierarquia de botões com visual weight real:**
```tsx
/* ANTI-PATTERN — mesma altura, mesma weight, diferem só em cor */
<Button variant="default">Comprar</Button>      /* h-8 */
<Button variant="outline">Ver mais</Button>      /* h-8 */
<Button variant="ghost">Cancelar</Button>        /* h-8 */

/* CORRETO — hierarquia física (tamanho + material + glow) */
<ButtonPrimary size="hero">               /* h-14, padding-x-10, glow effect */
  JOGAR DOTA
</ButtonPrimary>
<ButtonSecondary size="md">              /* h-10, padding-x-6, borda visível */
  Ver como funciona
</ButtonSecondary>
<ButtonGhost size="sm">                  /* h-8, padding-x-4, sem borda */
  Cancelar
</ButtonGhost>
```

### Sintomas de aviso

- Você consegue trocar a ordem de 3 seções/cards sem impacto visual perceptível
- Todos os CTAs têm o mesmo font-size e padding
- O scroll "escorrega" sem ponto de pausa natural

### Phase de endereçamento

**F2 (Design Tokens)** — escala tipográfica e hierarquia de botões devem ser definidos antes de qualquer componente. Revisar durante **F3 (Componentes Base)** com checklist de hierarquia.

**Bad examples:** Linear.app landing, Vercel dashboard, shadcn UI demos — todos têm escala tipográfica plana (18-24-32px sem drama).

**Good examples:** dota2.com (hero ocupa 80vh com 1 CTA dominante), Battle.net (banner de jogo dominante + sidebar subordinada), FACEIT (queue button com peso 5x maior que qualquer outro elemento).

---

## PITFALL 2: Motion Misuse

### O que vai errado

**Animação em tudo o tempo todo** — ruído visual que cansa. **Easing `ease-in-out` em tudo** — genérico, sem intenção por contexto. **Duration uniforme 200ms** — destrói hierarquia temporal. **Anima entrada, esquece saída** — assimetria de desconforto. **Ignora `prefers-reduced-motion`** — inacessível e potencialmente danoso.

**Sintoma no codebase atual:** `tw-animate-css` importado, mas zero uso declarado de easing customizado ou duração hierárquica. Transições existem apenas via Tailwind `transition-colors` inline em botões e cards — sem sistema.

### Por que destrói feel AAA

Motion em game clients AAA não é decoração — é comunicação. No Dota 2 client:
- Hover num hero card: escala 1.02 em 80ms com spring (micro-feedback)
- Abrir modal de compra: slide-up + fade em 320ms com ease-out (standard)
- Hero banner de temporada: parallax + particle drift contínuo (ambient, não triggered)
- Transição de tela (lobby → match): 600ms com wipe cinematográfico (hero transition)

Quando tudo usa a mesma curva e duração, o usuário não consegue inferir importância. Um tooltip aparecendo com o mesmo timing de um modal é ruído.

### Como evitar

**Hierarquia de duração com propósito:**
```typescript
// tokens/motion.ts

export const duration = {
  // Micro: feedback imediato de input (hover, focus, press)
  micro: 80,      // ms — hover state, focus ring, active press
  fast: 120,      // ms — icon swap, badge update

  // Standard: transições de estado (show/hide, expand/collapse)
  standard: 200,  // ms — dropdown open, tooltip show
  comfort: 280,   // ms — drawer slide, accordion expand

  // Hero: transições de tela, modais principais, narrativa
  enter: 400,     // ms — modal aparecer, page transition enter
  cinematic: 600, // ms — hero banner, season reveal
} as const

export const easing = {
  // Elementos que entram na tela: deceleram ao chegar
  enter: [0.0, 0.0, 0.2, 1.0],      // cubic-bezier — ease-out forte
  // Elementos que saem da tela: aceleram ao sair
  exit: [0.4, 0.0, 1.0, 1.0],       // cubic-bezier — ease-in forte
  // Elementos que se movem dentro da tela (reorder, resize)
  move: [0.4, 0.0, 0.2, 1.0],       // cubic-bezier — ease-in-out suave
  // Elementos com física spring (hover cards, drag)
  spring: { type: "spring", stiffness: 400, damping: 30 },
  // Ambient: loops contínuos (particle drift, pulse glow)
  ambient: "linear",
} as const
```

**Entrada E saída simétricas:**
```tsx
/* ANTI-PATTERN — anima entrada, saída é instantânea */
const variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
  // exit: ausente — saída é corte abrupto
}

/* CORRETO — entrada e saída têm curvas opostas */
const variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: duration.standard / 1000, ease: easing.enter }
  },
  exit: {
    opacity: 0, y: -4,
    transition: { duration: duration.fast / 1000, ease: easing.exit }
  }
}
```

**Reduced-motion obrigatório:**
```tsx
/* CORRETO — hook que respeita preferência do sistema */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    mq.addEventListener('change', (e) => setReduced(e.matches))
  }, [])
  return reduced
}

// Nos componentes:
const reducedMotion = useReducedMotion()
const transition = reducedMotion
  ? { duration: 0 }
  : { duration: duration.standard / 1000, ease: easing.enter }
```

### Sintomas de aviso

- `transition-all duration-200 ease-in-out` aparece mais de 5x no codebase
- Modais e tooltips têm o mesmo timing
- Nenhum componente usa `AnimatePresence` com `exit` variant definido
- Zero menção a `prefers-reduced-motion`

### Phase de endereçamento

**F2 (Design Tokens)** — `tokens/motion.ts` criado antes de qualquer componente animado. **F3 (Componentes Base)** — todos usam tokens de motion, nenhum define duration inline.

**Bad examples:** Qualquer template shadcn dashboard — `transition-colors duration-200` copia-cola em todos os elementos. Linear.app — motion existe mas easing é idêntico em tudo.

**Good examples:** Riot Client (duração e easing variam por contexto: micro-feedback vs. tela de carregamento de partida). Diablo IV web — transições de hero 600ms+, hover items 80ms spring.

---

## PITFALL 3: Color & Contrast Pitfalls

### O que vai errado

**Paleta SaaS (slate/zinc/neutral + accent azul)** assina "shadcn untouched". **Saturação baixa demais** parece profissional mas resulta em interface morta. **Saturação alta demais** parece cyberpunk barato de template gratuito. **Falta de tensão warm vs. cool** deixa paleta plana. **Contrast ratio WCAG cumprido por mínimo** — textos cinza em fundo cinza que passam no checker mas são ilegíveis na prática. **Single accent color** (sem família: glow, ambient, highlight).

**Sintoma no codebase atual:**
- `--color-muted-foreground: #a1a1aa` sobre `--color-card: #0a0a0a` — ratio ~7.5:1, passa WCAG, mas é text cinza frio em fundo quase-preto com zero temperatura, resultado: "apagado"
- `--color-brand-red: #ac1d0e` é o único accent. Não existe `--color-brand-red-light` (para text em dark bg), `--color-brand-red-glow` é definido mas não usado sistematicamente
- Sem warm neutral. `#0a0a0a` é neutro puro — sem temperatura que remeta a "brasas", "sangue", "guerra" (contexto Dota 2)

### Por que destrói feel AAA

O Dota 2 client não é preto neutro — é preto com temperatura marrom-quente nas áreas de conteúdo (remetendo a couro, bronze, ruínas antigas). O vermelho de brand é complementado por glow laranja-quente nos estados ativos. Riot Games usa azul-petróleo, não azul-cinza — a temperatura define o "universo". Quando o único accent é uma cor sem família (glow variant, light variant, dark variant), o UI parece pobremente executado mesmo que a cor base seja boa.

O erro do `#a1a1aa` não é o ratio — é a temperatura fria demais para um contexto épico/agressivo de Dota 2. Off-white ligeiramente quente (`#f0ece6`) sobre preto ligeiramente quente (`#0c0a09`) cria a tensão certa sem quebrar WCAG.

### Como evitar

**Família de accent (não single color):**
```css
/* ANTI-PATTERN — single accent, sem família */
--color-brand-red: #ac1d0e;
--color-brand-red-glow: #ac1d0e33; /* definido mas não usado */

/* CORRETO — família completa */
--color-brand-red: #ac1d0e;          /* base — botões, borders ativos */
--color-brand-red-hover: #c4220f;    /* 10% mais claro — hover states */
--color-brand-red-light: #e84030;    /* texto em dark bg — ratio 4.5:1+ */
--color-brand-red-glow: #ac1d0e40;  /* box-shadow, ambient glow */
--color-brand-red-subtle: #ac1d0e15; /* backgrounds de highlight */
```

**Temperatura nos neutros:**
```css
/* ANTI-PATTERN — neutros sem temperatura (parecem mortos) */
--color-background: #000000;     /* preto puro, frio */
--color-card: #0a0a0a;           /* cinza neutro */
--color-muted-foreground: #a1a1aa; /* cinza frio */

/* CORRETO — temperatura quente consistente (Dota 2 palette) */
--color-background: #0a0804;     /* preto com toque marrom-quente */
--color-card: #120e0b;           /* marrom muito escuro */
--color-card-raised: #1a1410;    /* camada elevada */
--color-muted-foreground: #9a8f82; /* warm gray, não zinc */
--color-foreground: #f0ece6;     /* off-white quente */
```

**Verificação de contrast com ferramenta:**
- Não confiar no "preenche 4.5:1 mínimo" — testar com Sim Daltonism ou Chrome DevTools Accessibility
- Color contrast é o #1 problema de acessibilidade (83.6% de sites falham — WebAIM Million 2024)
- Para textos de interface de jogo (scores, MMR, rankings) — usar 7:1 (AAA), não 4.5:1 (AA)

### Sintomas de aviso

- Paleta tem menos de 3 tons de cinza com temperatura distinta
- O único accent é usado raw (sem hover, glow, subtle variants)
- Textos de metadado usam `text-muted-foreground` direto sem verificar ratio no contexto
- Código tem `text-zinc-*`, `text-slate-*`, `text-gray-*` (paleta genérica SaaS)

### Phase de endereçamento

**F2 (Design Tokens)** — paleta expandida com família de accent e neutros com temperatura. Contrast ratio documentado como token comment. Nenhum token aprovado sem ratio verificado.

**Bad examples:** Qualquer shadcn dashboard default — slate/zinc palette. Twitch antes do rebrand 2022 — roxo saturado demais sem família, parecia poster 2012.

**Good examples:** dota2.com — preto quente marrom-amarelo, vermelho com glow dourado nos estados ativos. Path of Exile — neutros com temperatura âmbar, família de accent completa (orange-red com 5 variants).

---

## PITFALL 4: Typography Flatness

### O que vai errado

**Single font family** — mesma fonte para display e body (perde dramaturgia). **Sem variable font features** — kerning manual ausente, `font-variant-numeric: tabular-nums` ausente em scores e MMR. **Tracking padrão em títulos grandes** — deveria ser `letter-spacing: -0.03em` a `-0.05em` em fontes grandes display. **Leading uniforme** — `line-height: 1.5` em tudo, em vez de variar por escala (display pode ser `line-height: 0.95`).

**Sintoma no codebase atual:**
- `globals.css` define `--font-display: "Cinzel"` e `--font-sans: "Inter"` e `--font-serif: "Marcellus"` — 3 famílias, mas em `page.tsx` os títulos de seção (Manifesto, HowItWorks, Honesty) usam o mesmo `font-display text-4xl font-bold uppercase leading-tight` sem variação de tracking ou size relativo à importância
- Heading H1 hero: `text-5xl md:text-7xl leading-[0.95] tracking-tight` — boa instância, mas não sistematizado como token
- Corpo: `font-sans text-sm leading-relaxed` — genérico

### Por que destrói feel AAA

Cinzel em 72px com `letter-spacing: normal` parece logotipo escolar — espaçamento pensado pra 12px. Display fonts em tamanho grande precisam de tracking apertado (`-0.04em`) para parecer "foundry-level craft". Battle.net usa Beaufort Pro com tracking tão apertado em display que as letras quase se tocam — transmite peso, importância, épico. Linear usa seu próprio font system variável com configurações distintas por escala.

`font-variant-numeric: tabular-nums` é obrigatório em qualquer número que muda dinamicamente (MMR: `2847`, tickets, scores) — sem ele, os algarismos "pulam" de largura quando atualizam em tempo real, quebrando o alinhamento visual.

### Como evitar

```css
/* ANTI-PATTERN — tracking e leading uniformes em tudo */
h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: normal; /* padrão da fonte — errado pra display grande */
}

/* CORRETO — tokens tipográficos por escala */
@theme {
  /* Display: títulos heroicos, season reveals */
  --type-display-size: clamp(3rem, 8vw, 5rem);
  --type-display-tracking: -0.04em;    /* tight — parece "forjado" */
  --type-display-leading: 0.95;        /* comprimido — épico */
  --type-display-weight: 700;

  /* Heading: títulos de seção */
  --type-heading-size: clamp(1.5rem, 4vw, 2.5rem);
  --type-heading-tracking: -0.02em;
  --type-heading-leading: 1.1;
  --type-heading-weight: 700;

  /* Label: badges, metadados, nav */
  --type-label-size: 0.75rem;
  --type-label-tracking: 0.12em;      /* wide — leiturabilidade em uppercase */
  --type-label-leading: 1;
  --type-label-weight: 600;

  /* Body: parágrafos */
  --type-body-size: 1rem;
  --type-body-tracking: 0;
  --type-body-leading: 1.6;
  --type-body-weight: 400;

  /* Mono: scores, MMR, tickets — TABULAR obrigatório */
  --type-mono-numeric: "tnum";         /* font-variant-numeric: tabular-nums */
}
```

**Números dinâmicos com tabular-nums:**
```tsx
/* ANTI-PATTERN — número "pula" de largura ao atualizar */
<span className="font-mono text-2xl">
  {mmr}
</span>

/* CORRETO — largura de dígito fixa */
<span className="font-mono text-2xl [font-variant-numeric:tabular-nums]">
  {mmr}
</span>
```

### Sintomas de aviso

- Títulos de seção em `text-4xl` não têm `tracking-tight` ou tracking customizado
- Scores/MMR/números mudam e o texto "mexe" horizontalmente
- `line-height: 1.5` aparece em heading acima de 32px
- Mesma fonte família em hero display e corpo de texto

### Phase de endereçamento

**F2 (Design Tokens)** — sistema tipográfico por escala com tokens CSS. **F3 (Componentes Base)** — todos os componentes de texto usam tokens, nunca classes Tailwind raw em escalas sem token correspondente.

**Bad examples:** Qualquer site gerado por Vercel v0 — Inter em tudo, tracking default, leading 1.5 universal.

**Good examples:** dota2.com — Radiance (custom), tracking comprimido em display, tabular nums em todos os counters. Riot Games client — Beaufort (custom) com tracking -0.03em em 40px+, body separado em Noto Sans.

---

## PITFALL 5: Layout Uniformity (Vibe SaaS)

### O que vai errado

**`max-width: 1280px` container central com padding lateral** — assina "Tailwind tutorial YouTube video". **Cards com `border-1px rounded-lg padding-6`** — literal shadcn untouched. **Sidebar `256px` + content** — literal SaaS dashboard template. **Hero centralizado com `headline + subheadline + CTA`** — landing page template. **Grid 3 colunas igualzinho** — SaaS features section.

**Sintoma no codebase atual:**
- `page.tsx` Hero: `max-w-4xl mx-auto flex flex-col items-start gap-6 px-6` — container centralizado padrão
- HowItWorks: `max-w-6xl mx-auto px-6 py-24` + `grid gap-6 md:grid-cols-3` — features section clássica
- card.tsx: `rounded-xl bg-card ring-1 ring-foreground/10` — borda 1px SaaS
- Dashboard screenshot: sidebar esquerda + content area com cards em grid — template SaaS admin

### Por que destrói feel AAA

O Dota 2 client não tem "container centralizado" — tem **zonas de conteúdo** que sangram pelas bordas da tela, sobrepostas, em camadas. O hero da página inicial do Dota 2 ocupa 100vw sem padding. Os cards de hero são de tamanhos diferentes — o hero em destaque ocupa 2x o espaço dos secundários. A sidebar do client Dota não é "256px fixo" — é uma strip orgânica de perfil que respira com o conteúdo.

"Max-width + padding lateral" comunica inconscientemente: "sou uma página de texto de blog/SaaS". Game clients comunicam: "sou um sistema operacional pra jogos — o espaço é meu".

### Como evitar

**Substituir container por zonas de conteúdo:**
```tsx
/* ANTI-PATTERN — container centralizado padrão */
<div className="mx-auto max-w-6xl px-6 py-24">
  <div className="grid gap-6 md:grid-cols-3">
    {items.map(item => <Card key={item.id} />)}
  </div>
</div>

/* CORRETO — layout assimétrico, zonas com intenção */
<section className="relative">
  {/* Background sangra 100vw */}
  <div className="absolute inset-0 bg-[url('/season-bg.jpg')] bg-cover opacity-30" />

  <div className="relative z-10 grid grid-cols-[1fr_400px] min-h-screen">
    {/* Zona principal: item em destaque, maior */}
    <div className="p-12 flex items-end">
      <FeaturedQueueCard className="w-full max-w-2xl" />
    </div>

    {/* Zona lateral: itens subordinados, strip */}
    <aside className="border-l border-white/10 p-6 flex flex-col gap-4 overflow-y-auto">
      {sideQueues.map(q => <QueueStrip key={q.id} queue={q} />)}
    </aside>
  </div>
</section>
```

**Hierarquia de cards por importância:**
```tsx
/* ANTI-PATTERN — todos os cards iguais */
<div className="grid grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id} className="rounded-xl bg-card p-8 border border-border">
      ...
    </div>
  ))}
</div>

/* CORRETO — card featured domina, subordinados suportam */
<div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
  <FeaturedCard item={items[0]} /> {/* ocupa 2 colunas, height 2x */}
  <div className="flex flex-col gap-4">
    <SecondaryCard item={items[1]} />
    <SecondaryCard item={items[2]} />
  </div>
</div>
```

**Sidebar como zona orgânica, não template:**
```tsx
/* ANTI-PATTERN — sidebar 256px fixo, template SaaS */
<div className="flex">
  <aside className="w-64 border-r bg-card">
    <nav>...</nav>
  </aside>
  <main className="flex-1">...</main>
</div>

/* CORRETO — strip de navegação vertical integrada ao layout */
<div className="grid grid-cols-[72px_1fr]"> {/* icônico, compacto */}
  <nav className="flex flex-col items-center gap-2 py-6 border-r border-white/5">
    <NavIcon icon={Home} />
    <NavIcon icon={Trophy} />
    <NavIcon icon={Users} />
  </nav>
  <main>{/* conteúdo sem max-width artificial */}</main>
</div>
```

### Sintomas de aviso

- `max-w-*xl mx-auto px-6` aparece mais de 3x no codebase
- `grid gap-6 md:grid-cols-3` para conteúdo editorial (não tabelas)
- `w-64 border-r` em sidebar
- Qualquer `<section>` com `py-24` e subtitle + title + divider + grid (template landing)

### Phase de endereçamento

**F2 (Design Tokens)** — definir layout system (zonas, não containers). **F3 (Componentes Base)** — componentes de layout sem max-width hardcoded. **F4 em diante** — cada nova tela revisada contra este padrão.

**Bad examples:** shadcn blocks landing page, Vercel templates, Linear landing — todos usam max-width container com padding bilateral simétrico.

**Good examples:** Dota 2 client web — bleeding edges, overlapping zones. Steam home — asymmetric hero + secondary strip. FACEIT dashboard — featured match card dominante, side stats strip.

---

## PITFALL 6: Sound Silence (e Overuse)

### O que vai errado

**Zero sound** — todo client AAA tem pelo menos: stinger de login, click sutil em navegação, hover hint, success/error feedback sonoro. **Sound em tudo** — irritante, vira "site barulhento". **Sound sem mute persistido** — usuário silencia na sessão, volta no próximo acesso e enfrenta o mesmo som. **Sound sem granularidade** — interaction mais alto que ambient loop destruindo o mix.

**Sintoma no codebase atual:** Zero implementação de audio. Nenhum `useAudio`, nenhum `Howler`, nenhuma referência a Web Audio API.

### Por que destrói feel AAA

Sound no Dota 2 client tem 4 camadas:
1. **Ambient:** trilha ambiente do menu (Dota theme, low volume, loop)
2. **Interaction:** click em botão, hover em hero card (sutil, 200-300ms, frequência 2-5kHz)
3. **Feedback:** sucesso de compra de ficha (stinger positivo, 500ms), erro de pagamento (tom grave)
4. **Cinematic:** transição de tela (sweep, 800ms), reveal de temporada (crescendo)

O problema não é "ter ou não ter" — é **ter sem sistema de controle**. Um site que bipa a cada hover é pior do que silêncio. Um site com ambient loop sem volume independente de interaction vai irritar em 30 segundos.

### Como evitar

**Sound Manager centralizado:**
```typescript
// lib/sound-manager.ts — CORRETO

type SoundLayer = 'ambient' | 'interaction' | 'feedback' | 'cinematic'

interface SoundConfig {
  src: string
  volume: number
  loop?: boolean
  layer: SoundLayer
}

class SoundManager {
  private volumes: Record<SoundLayer, number> = {
    ambient: 0.3,
    interaction: 0.6,
    feedback: 0.8,
    cinematic: 1.0,
  }
  private muted = false

  // Persiste preferência
  constructor() {
    this.muted = localStorage.getItem('fd-sound-muted') === 'true'
    const savedVol = localStorage.getItem('fd-sound-volume')
    if (savedVol) this.volumes = JSON.parse(savedVol)
  }

  play(sound: SoundConfig) {
    if (this.muted) return
    const audio = new Audio(sound.src)
    audio.volume = sound.volume * this.volumes[sound.layer]
    audio.play().catch(() => {}) // silencia autoplay policy errors
  }

  setMuted(muted: boolean) {
    this.muted = muted
    localStorage.setItem('fd-sound-muted', String(muted))
  }
}

export const soundManager = new SoundManager()

// Uso em componentes — ANTI-PATTERN:
// <button onClick={() => new Audio('/sounds/click.mp3').play()}>
//   sem controle de volume, sem mute, sem layer

// Uso em componentes — CORRETO:
// <button onClick={() => soundManager.play(sounds.buttonClick)}>
```

**Hierarquia de sons por tipo:**
```typescript
// lib/sounds.ts
export const sounds = {
  // Interaction — curtos, sutis
  buttonClick: { src: '/sounds/ui-click.ogg', volume: 0.5, layer: 'interaction' },
  navHover: { src: '/sounds/ui-hover.ogg', volume: 0.3, layer: 'interaction' },
  tabSwitch: { src: '/sounds/ui-tab.ogg', volume: 0.4, layer: 'interaction' },

  // Feedback — comunicam resultado
  purchaseSuccess: { src: '/sounds/success.ogg', volume: 0.7, layer: 'feedback' },
  purchaseError: { src: '/sounds/error.ogg', volume: 0.6, layer: 'feedback' },
  queueJoin: { src: '/sounds/queue-join.ogg', volume: 0.8, layer: 'feedback' },
  matchFound: { src: '/sounds/match-found.ogg', volume: 0.9, layer: 'feedback' },

  // Cinematic — momentos de impacto
  loginStinger: { src: '/sounds/login-stinger.ogg', volume: 0.8, layer: 'cinematic' },
  seasonReveal: { src: '/sounds/season-reveal.ogg', volume: 1.0, layer: 'cinematic' },
} as const
```

**Regra mínima para MVP:** Implementar pelo menos 3 sons de feedback (sucesso de compra, entrada na fila, partida encontrada) com SoundManager que persiste mute. Ambient é opcional em V1.

### Sintomas de aviso

- Nenhum arquivo `.ogg` ou `.mp3` em `/public/sounds/`
- Botão de login não tem nenhum feedback sonoro
- Entrada na fila (ação principal) é silenciosa

### Phase de endereçamento

**F3 (Componentes Base)** — SoundManager e hooks criados. Sons de interaction nos botões. **F4+ (Features)** — sons de feedback em cada ação crítica (compra, fila, match). Ambient em F5 (Polish).

**Bad examples:** A maioria dos dashboards SaaS — silêncio total. Sites com `alert('ding.mp3')` no onClick — sem sistema.

**Good examples:** Dota 2 client — 4 camadas de audio bem balanceadas. Riot Client — cada interação tem som, volume calibrado por layer. Discord — sons de notification com controle granular.

---

## PITFALL 7: Loading & Empty State Laziness

### O que vai errado

**Spinner genérico** (`animate-spin` de um SVG circular) — SaaS sign universal. **Skeleton `animate-pulse bg-muted rounded-md`** aplicado em tudo da mesma forma — outro SaaS sign. **"No data yet" texto cinza centralizado** — SaaS sign. **Loading sem contexto** — o que está carregando? por quê? quanto tempo? **Skeleton para tudo indiscriminadamente** — perde oportunidade de criar narrativa enquanto carrega.

**Sintoma no codebase atual:**
- `skeleton.tsx`: `animate-pulse rounded-md bg-muted` — literal shadcn default, sem customização
- Nenhum componente de empty state customizado encontrado no codebase
- Dashboard screenshot mostra áreas de loading padrão

### Por que destrói feel AAA

No Dota 2 client, a tela de carregamento de partida é **a cena mais cinematográfica de todo o produto** — progress bar com glow, nome dos herois revelados progressivamente, trilha musical de entrada. O "loading" é parte da experiência, não obstáculo a ela.

Empty states no FACEIT não são "No matches yet" — são calls-to-action narrativos: "Você ainda não jogou nenhuma partida ranked. Crie um lobby agora e comece a subir."

O skeleton genérico comunica: "Esse componente foi feito com pressa e o dev não pensou no estado intermediário." O skeleton contextual comunica: "O sistema sabe o que vai carregar e já preparou o espaço."

### Como evitar

**Skeleton contextual com forma real:**
```tsx
/* ANTI-PATTERN — skeleton genérico */
function QueueCardSkeleton() {
  return (
    <div className="rounded-md bg-muted animate-pulse h-32 w-full" />
  )
}

/* CORRETO — skeleton que espelha a forma real do card */
function QueueCardSkeleton() {
  return (
    <div className="rounded-md bg-card/50 border border-border/50 p-4">
      <div className="flex items-center gap-3">
        {/* Avatar placeholder */}
        <div className="size-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          {/* Nome do PRO */}
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          {/* Status */}
          <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
        </div>
        {/* Vagas */}
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
```

**Empty state com narrativa e CTA:**
```tsx
/* ANTI-PATTERN — mensagem genérica */
function EmptyMatchHistory() {
  return (
    <div className="text-center text-muted-foreground py-12">
      <p>No matches yet</p>
    </div>
  )
}

/* CORRETO — contexto, narrativa, próximo passo */
function EmptyMatchHistory() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-6">
      {/* Icon com contexto */}
      <div className="size-16 rounded-full bg-brand-red/10 flex items-center justify-center">
        <Swords className="size-8 text-brand-red/60" />
      </div>
      {/* Título narrativo */}
      <p className="font-display text-xl font-bold uppercase tracking-tight text-white">
        NENHUMA PT AINDA
      </p>
      {/* Contexto + call-to-action */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Sua história começa na primeira partida. Compre uma ficha e entre na
        fila de um PRO disponível agora.
      </p>
      <Button variant="primary" size="md">
        Ver PROs disponíveis
      </Button>
    </div>
  )
}
```

**Progress contextual (não spinner genérico):**
```tsx
/* ANTI-PATTERN — spinner sem contexto */
{isLoading && <Loader2 className="animate-spin" />}

/* CORRETO — loading com contexto e expectativa */
{isLoading && (
  <div className="flex items-center gap-3 text-sm text-muted-foreground">
    <div className="size-2 rounded-full bg-brand-red animate-pulse" />
    <span>Verificando vagas disponíveis...</span>
  </div>
)}
```

### Sintomas de aviso

- `animate-pulse h-32 w-full rounded-md bg-muted` sem shape estruturada
- Qualquer string "No data", "Empty", "Nothing here" sem CTA
- `<Loader2 className="animate-spin" />` sem mensagem contextual

### Phase de endereçamento

**F3 (Componentes Base)** — definir padrão de skeleton contextual e empty state com narrativa. Criar biblioteca de `*Skeleton` components que espelham cada componente real. **Cada feature nova** entrega `EmptyState` próprio com CTA contextual.

**Bad examples:** shadcn skeleton demo — retângulos cinzas sem forma. GitHub Pages defaults — "There aren't any releases." sem mais nada.

**Good examples:** Dota 2 match loading — cinematográfico. Spotify empty playlists — artwork + contexto narrativo + CTA. FACEIT empty match history — narrativa + link pra criar match.

---

## PITFALL 8: Iconography Inconsistency

### O que vai errado

**Mix de icon sets** (Lucide + Heroicons + custom SVGs inline) — caos visual. **Icons sem weight matching** com o font-weight do texto adjacente (ícone stroke 1.5px ao lado de texto bold 700 — descompasso). **Decorative icons em ações funcionais** (ícone de "estrela" em botão de ação principal confunde com "favoritar"). **Sizing ad-hoc** (16/18/20/24px misturados sem sistema).

**Sintoma no codebase atual:**
- `page.tsx` importa `ArrowRight, ShoppingCart, Users, GraduationCap, AlertTriangle` do Lucide — ok, consistente
- Mas sem sistema de sizing (ícone `28` no HowItWorks, `18` no botão, `14` no AlertTriangle, `20` no FinalCTA) — 4 tamanhos diferentes sem sistema
- Nenhum token de icon size definido em `globals.css`

### Por que destrói feel AAA

O Lucide vs. Heroicons tem stroke de 1.5px no mesmo grid 24px — mas o estilo visual é detectavelmente diferente (Heroicons é mais conservador/arredondado, Lucide é mais geométrico/sharp). Misturar cria "visual noise" subconsciente que o usuário não identifica explicitamente mas percebe como "parece malfeito".

Sizing ad-hoc (`size={14}`, `size={18}`, `size={20}`, `size={24}`, `size={28}`) sem sistema cria inconsistência que acumula. Game clients AAA usam sizing sistemático: 16px (inline text), 20px (button), 24px (nav), 32px (feature icon), 48px+ (illustrative).

### Como evitar

**Sistema de icon size como token:**
```typescript
// tokens/icons.ts — CORRETO
export const iconSize = {
  xs: 12,    // indicadores inline, badges
  sm: 16,    // inline com texto body
  md: 20,    // botões, inputs, nav items
  lg: 24,    // feature icons, headings
  xl: 32,    // section icons, cards de destaque
  '2xl': 48, // illustrative, empty states
} as const

// Uso — ANTI-PATTERN:
// <ArrowRight size={18} />  ← número mágico
// <Users size={28} />       ← número mágico diferente

// Uso — CORRETO:
// <ArrowRight size={iconSize.md} />
// <Users size={iconSize.xl} />
```

**Stroke weight matching com type:**
```tsx
/* ANTI-PATTERN — ícone thin com texto bold */
<button className="font-bold text-sm">
  <Star size={16} strokeWidth={1.5} /> {/* thin icon, bold text — descompasso */}
  Favoritar
</button>

/* CORRETO — strokeWidth proporcional ao font-weight */
<button className="font-bold text-sm">
  <Star size={16} strokeWidth={2} /> {/* bolder stroke com bold text */}
  Favoritar
</button>

/* Para texto normal (400): strokeWidth={1.5} */
/* Para texto médio (500-600): strokeWidth={2} */
/* Para texto bold (700+): strokeWidth={2.5} */
```

**Manter single icon library:**
- Lucide é o correto para este projeto (já em uso, CLAUDE.md confirma)
- Se precisar de ícones de jogos/Dota específicos, criar custom SVG components com stroke compatível
- Nunca importar de heroicons, phosphor, ou outro set simultaneamente

### Sintomas de aviso

- Múltiplos `import` de icon libraries diferentes no mesmo arquivo
- `size={14}`, `size={18}`, `size={20}`, `size={24}`, `size={28}` todos aparecem sem padrão
- Icons com `strokeWidth` não mencionado (usa default que pode diferir)

### Phase de endereçamento

**F2 (Design Tokens)** — `iconSize` tokens definidos. **F3 (Componentes Base)** — todos os componentes usam `iconSize.*`, nunca número literal. Code review rejeita qualquer `size={N}` que não seja um token.

**Bad examples:** Sites que misturam Heroicons nas features e Lucide nos botões — caos. Projetos com SVGs inline no corpo do HTML + Lucide nos componentes + emojis como ícones decorativos.

**Good examples:** Linear — icon system próprio com peso perfeitamente calibrado com body type. Discord — Clyde icon system, stroke weight consistente com font system.

---

## PITFALL 9: AI Vibecoding Tells

### O que vai errado

Patterns concretos que entregam "isso foi gerado por IA sem revisão humana":

1. **Gradients lavender→pink em CTAs** — ChatGPT/Claude default quando pede "modern CTA button"
2. **Aurora gradient background animado** — `bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900` + CSS keyframe animation rotativo
3. **Hero section com 3D shape rotativo aleatório** — Three.js sphere/torus ou CSS 3D cube sem relação com o produto
4. **Pricing 3 colunas com "Most Popular" badge no plano do meio** — template literal de pricing page
5. **Marquee de logos de parceiros fictícios** — "Trusted by 10,000+ companies" sem evidência
6. **Testimonials com headshots stock photo** — avatares de bancos de imagem free com nomes genéricos
7. **"Built with ❤️ using TypeScript"** no footer
8. **"Powered by Next.js" no footer** — nenhum game client faz isso
9. **Comentários em inglês em código que deveria ser português** (para este projeto)
10. **Tema neumorphism + glassmorphism misturados** — tendências de 2019 e 2021 que o Claude ainda sugere por padrão
11. **Botão primário roxo com `rounded-full`** — padrão SaaS 2023 que todo AI gera
12. **`text-gradient` em headline** com `bg-clip-text bg-gradient-to-r` — overused em 2022-2024

**Sintoma no codebase atual:**
- `page.tsx` tem `Hero centralizado + subheadline + CTA + seções em sequência` — estrutura landing page padrão (não necessariamente AI, mas assina template)
- `globals.css` tem `@import "tw-animate-css"` — biblioteca de animações CSS que facilita adicionar motion genérico
- Nenhum vibecoding tell ativo encontrado — código está relativamente limpo

### Por que destrói feel AAA

Vibecoding tells são **imediatamente reconhecíveis** por qualquer usuário exposto a tech products. O usuário não sabe nomear o problema, mas sente "parece um template" — e templates não têm alma. Game clients têm alma porque cada detalhe foi decisão intencional: por que esse ícone aqui, por que esse timing, por que essa cor exata.

O problema não é usar IA para gerar código. O problema é aceitar os defaults sem questionar. Claude, GPT e Gemini todos aprenderam a partir de templates populares — seus defaults são médias estatísticas de "o que funciona na média", não "o que é correto para este produto específico".

### Como evitar sistematicamente

**Checklist de revisão para cada componente gerado por IA:**

```markdown
## Vibecoding Review Checklist

Antes de aceitar qualquer componente gerado por AI, verificar:

[ ] Gradients: são todos justificados? Removido qualquer lavender/pink/aurora sem motivo?
[ ] Shapes decorativas: existe alguma forma 3D/abstrata sem relação com Dota 2?
[ ] Footer: menciona "Built with" ou "Powered by"? Remover.
[ ] Pricing: tem "Most Popular" badge genérico? Customizar ou remover.
[ ] Testimonials: são de pessoas reais identificadas? Se não, remover.
[ ] Border-radius: tem `rounded-full` em botão primário sem motivo brand? Corrigir.
[ ] Text gradient headline: `bg-clip-text bg-gradient-to-r` sem justificativa? Remover.
[ ] Comentários: estão em português (para este projeto)? Traduzir.
[ ] Glassmorphism: tem `backdrop-blur + bg-white/10` em elemento funcional? Justificar ou remover.
[ ] Neumorphism: tem sombras internas com `box-shadow` simétricas? Remover.
[ ] Font: usa Inter em tudo? Aplicar hierarquia de família (Cinzel display, Marcellus serif, Inter sans).
```

**Regra para gradients:**
```tsx
/* VIBECODING — gradiente lavender→pink sem razão */
className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"

/* CORRETO — gradiente com razão brand (brand-red escurecendo pra preto) */
className="bg-gradient-to-b from-brand-red/20 to-transparent"

/* REGRA: todo gradient precisa ter justificativa brand.
   Se não der pra explicar "por que este gradient aqui",
   substituir por cor sólida ou remover. */
```

**Regra para footer:**
```tsx
/* VIBECODING */
<footer>
  <p>Built with ❤️ using Next.js and TypeScript</p>
  <p>Powered by Vercel</p>
</footer>

/* CORRETO — footer de game client tem identidade, não créditos de tech */
<footer>
  <span className="font-display text-xs tracking-widest uppercase">FORMULADOTA</span>
  <span className="text-xs text-muted-foreground">© 2026 — Todos os direitos reservados</span>
</footer>
```

### Sintomas de aviso

- Qualquer `from-purple-* via-pink-*` no código
- `backdrop-blur` + `bg-white/10` em componente de navegação (glassmorphism)
- `box-shadow: inset` com valores simétricos (neumorphism)
- Comentários em inglês em arquivos novos
- Footer com atribuição de tecnologia

### Phase de endereçamento

**F3 (Componentes Base)** — aplicar checklist a cada componente criado. **Contínuo** — todo code review inclui verificação de vibecoding tells. Criar regra de lint customizada para gradients proibidos se recorrente.

**Bad examples:** Qualquer resultado de "make me a gaming website" no v0.dev, bolt.new, ou lovable.dev sem curadoria — todos entregam aurora gradient + 3D sphere + pricing cards.

**Good examples:** dota2.com (cada elemento justificado pelo universo do jogo), Steam (sem tells de template, sente como sistema próprio), Riot Client web (identidade consistente com o game universe).

---

## PITFALL 10: Architectural Pitfalls que Viram Visual Debt

### O que vai errado

**Tokens hardcoded em componentes** — rebrand exige refactor de 200 arquivos. **Motion duration inline** — cada componente decide próprio, inconsistência inevitable. **Sound chamado direto em `onClick`** — sem layer gerenciável. **Theme hardcoded dark** — bloqueia future light/faction themes. **Z-index ad-hoc** — `z-50`, `z-40`, `z-100` chaos. **Spacing inconsistente** — `px-4`, `px-6`, `px-8` misturados sem escala.

**Sintoma no codebase atual:**
- `card.tsx`: `px-4 group-data-[size=sm]/card:px-3` — spacing hardcoded no componente
- `button.tsx`: `h-8 gap-1.5 px-2.5` — sizing hardcoded sem token
- `globals.css`: `--radius: 0.5rem` → `--radius-sm: calc(var(--radius) * 0.6)` — bom, mas motion completamente ausente de tokens
- Z-index: zero tokens declarados, `z-10` inline em `page.tsx` (relative z-10 no hero content)
- Color scheme: `color-scheme: dark` hardcoded em `html` — dark-only correto agora, mas bloqueia future theming

### Por que destrói feel AAA

Visual debt é invisível no código mas acumula visualmente. Quando cada componente define seu próprio `duration-200`, inevitavelmente alguns viram `duration-150`, outros `duration-300` — não porque alguém decidiu, mas porque quem escreveu não estava olhando pros outros. O usuário percebe como "parece descosturado" sem saber por quê.

Z-index chaos é o mais perigoso: modal com `z-50`, dropdown com `z-40`, tooltip com `z-100`, toast com `z-[9999]` — cria hierarquia de overlays que quebra silenciosamente quando qualquer pai cria stacking context novo (por `transform`, `filter`, `opacity` parcial).

### Como evitar

**Design tokens para tudo que varia:**
```css
/* ANTI-PATTERN — valores hardcoded que criam debt */
/* button.tsx: h-8 gap-1.5 px-2.5 */
/* card.tsx: px-4 py-4 gap-4 rounded-xl */
/* hero: px-6 pt-24 pb-20 */

/* CORRETO — tokens em globals.css */
@theme {
  /* Spacing scale */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-24: 6rem;    /* 96px */

  /* Component spacing tokens */
  --card-padding: var(--space-6);
  --card-padding-sm: var(--space-4);
  --section-padding-y: var(--space-24);
  --container-padding-x: var(--space-6);

  /* Motion tokens */
  --duration-micro: 80ms;
  --duration-fast: 120ms;
  --duration-standard: 200ms;
  --duration-comfort: 280ms;
  --duration-enter: 400ms;
  --duration-cinematic: 600ms;

  --ease-enter: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-exit: cubic-bezier(0.4, 0.0, 1.0, 1.0);
  --ease-move: cubic-bezier(0.4, 0.0, 0.2, 1.0);

  /* Z-index scale (nomeado, não numérico) */
  --z-base: 0;
  --z-raised: 10;       /* cards em hover */
  --z-dropdown: 100;    /* menus, popvers */
  --z-sticky: 200;      /* header sticky */
  --z-overlay: 300;     /* drawer backdrop */
  --z-modal: 400;       /* modais */
  --z-toast: 500;       /* notificações */
  --z-tooltip: 600;     /* tooltips */
}
```

**Z-index via tokens, nunca literais:**
```tsx
/* ANTI-PATTERN — z-index ad-hoc, chaos garantido */
<div className="z-50">modal</div>
<div className="z-40">dropdown</div>
<div className="z-[9999]">toast</div>
<div className="z-100">tooltip</div>

/* CORRETO — tokens nomeados, hierarquia documentada */
<div style={{ zIndex: 'var(--z-modal)' }}>modal</div>
<div style={{ zIndex: 'var(--z-dropdown)' }}>dropdown</div>
<div style={{ zIndex: 'var(--z-toast)' }}>toast</div>
<div style={{ zIndex: 'var(--z-tooltip)' }}>tooltip</div>

/* OU com CSS variables no Tailwind v4: */
<div className="z-[--z-modal]">modal</div>
```

**Motion inline vs. tokens:**
```tsx
/* ANTI-PATTERN — duration inline */
<motion.div transition={{ duration: 0.2, ease: "easeInOut" }}>

/* CORRETO — tokens importados */
import { duration, easing } from '@/tokens/motion'
<motion.div transition={{
  duration: duration.standard / 1000,
  ease: easing.enter
}}>
```

**Theme via tokens, não hardcoded:**
```css
/* ANTI-PATTERN — dark hardcoded impossibilita faction themes */
html {
  color-scheme: dark;
  background: #000000;
  color: #f5f5f5;
}

/* CORRETO — tokens permitem themes futuros sem refactor */
:root {
  /* default: dark theme */
  --bg: #0a0804;
  --fg: #f0ece6;
  --accent: #ac1d0e;
}

/* Future: [data-theme="light"] ou [data-theme="radiant"] faction */
[data-theme="faction-radiant"] {
  --bg: #0a1a0e;
  --fg: #e8f0e0;
  --accent: #5b8e3a; /* --color-play-green */
}
```

### Sintomas de aviso

- `z-50`, `z-40`, `z-[9999]` em componentes diferentes sem referência a sistema
- `duration-200` aparece em mais de 5 componentes diferentes sem token central
- `px-4`, `px-6`, `px-8` em componentes do mesmo nível hierárquico
- `color-scheme: dark` hardcoded impossibilita theming (aceitável em V1, **documenar como debt**)
- `new Audio('/sound.mp3').play()` em qualquer onClick handler

### Phase de endereçamento

**F2 (Design Tokens)** — este é o trabalho central. Tokens para: cores (com família), tipografia (por escala), spacing (escala 4px-base), motion (duration + easing), z-index (nomeado), sound (via SoundManager). **Nenhum componente** em F3+ é aceito sem usar tokens.

**Recovery cost:** se tokens não forem definidos em F2, cada fase seguinte adiciona debt. Refactor de 20 componentes com valores hardcoded = 2-3 dias de trabalho perdido em vez de 2h em F2.

**Bad examples:** Qualquer codebase que cresceu organicamente sem design system — Bootstrap era o pattern até ~2018, hoje é Tailwind ad-hoc. Linear antes de ter design system próprio (reportado em post da equipe deles).

**Good examples:** Stripe Elements — tokens para tudo, theming via CSS variables, extensível. Discord design system (Pluto) — motion tokens, z-index tokens, spacing tokens centralizados.

---

## Technical Debt Patterns

Shortcuts com custo futuro documentado.

| Shortcut | Benefício Imediato | Custo de Longo Prazo | Quando Aceitável |
|----------|-------------------|----------------------|------------------|
| Color hardcoded em componente | Rápido de implementar | Rebrand = refactor de 200 arquivos | Nunca |
| Motion duration inline | Sem dependência de token | Inconsistência acumulada, revisão cara | Nunca |
| Z-index ad-hoc (`z-50`) | Funciona imediatamente | Chaos garantido em 10+ overlapping components | Nunca |
| Dark-only hardcoded | Simples agora | Bloqueia faction themes futuros | Aceitável em V1 SE documentado |
| Single font sem escala | Menos complexity | Typography flatness perceptível | Nunca |
| Sound direto no onClick | Implementação trivial | Sem mute, sem volume, sem sistema | Nunca |
| Skeleton genérico `bg-muted animate-pulse` | Rápido | Parece SaaS, perde narrativa | Nunca em tela principal |
| Grid 3-col igual para features | Layout rápido | Visual hierarchy collapse | Nunca pra conteúdo com peso diferente |

---

## UX Pitfalls

| Pitfall | Impacto no Usuário | Abordagem Correta |
|---------|-------------------|-------------------|
| Loading sem contexto (spinner puro) | Ansiedade, não sabe o que esperar | Mensagem contextual + progress visual |
| Empty state sem CTA | Usuário não sabe o próximo passo | Narrativa + botão de ação direta |
| Hover sem feedback (sound/visual) | Interface parece "morta" | Visual feedback + sound hint sutil |
| Botão primário igual ao secundário | Indecisão, duvida onde clicar | Hierarquia física clara (tamanho + material) |
| Skeleton que não mapeia o conteúdo real | Shift de layout ao carregar (CLS) | Skeleton com forma exata do componente real |
| Motion ignorando saída | Corte abrupto, desorientação | AnimatePresence com exit variant |
| Menu sem estado ativo visual | Usuário perde onde está | Active state com indicator (glow, border, fill) |
| Texto `muted-foreground` em info crítica | Leitura difícil, erro ignorado | Reservar muted para metadado verdadeiro |

---

## "Looks Done But Isn't" Checklist

- [ ] **Motion system:** `duration` e `easing` declarados como tokens? Exit variants definidos? `prefers-reduced-motion` implementado?
- [ ] **Sound system:** SoundManager com persistência de mute? Pelo menos 3 sons de feedback crítico?
- [ ] **Z-index:** todos os overlaps usam tokens nomeados? Nenhum `z-[9999]` ad-hoc?
- [ ] **Typography:** `tabular-nums` em todos os números dinâmicos (MMR, score, tickets)?
- [ ] **Color family:** accent tem pelo menos 5 variants (base, hover, light, glow, subtle)?
- [ ] **Empty states:** cada feature com dados tem empty state com narrativa + CTA?
- [ ] **Skeletons:** cada componente com loading tem skeleton que espelha sua forma real?
- [ ] **Icon sizes:** todos usam tokens `iconSize.*`, nenhum `size={N}` literal?
- [ ] **Vibecoding check:** gradient sem justificativa brand? "Built with" no footer? Glassmorphism sem razão?
- [ ] **Layout:** algum `max-w-*xl mx-auto px-6` onde deveria ser zona de conteúdo?

---

## Pitfall-to-Phase Mapping

| Pitfall | Phase de Prevenção | Verificação |
|---------|-------------------|-------------|
| Visual Hierarchy Collapse | F2 (Tokens) — escala tipográfica e button hierarchy | Revisar todo H2/H3 e todo Button antes de F3 |
| Motion Misuse | F2 (Tokens) — `tokens/motion.ts` criado | Nenhum componente F3+ usa duration inline |
| Color Pitfalls | F2 (Tokens) — família de accent + neutros com temperatura | Contrast ratio documentado em cada token |
| Typography Flatness | F2 (Tokens) — type scale por escala | `tabular-nums` em todos os números no F3+ |
| Layout Uniformity | F3 (Layout System) — zonas vs containers | Code review: nenhum `grid-cols-3` igual sem peso diferenciado |
| Sound Silence | F3 (Componentes Base) — SoundManager + hooks | Pelo menos 3 sons de feedback em F3 |
| Loading Laziness | F3 (Componentes Base) — skeleton e empty state padrão | Cada componente tem skeleton contextual |
| Iconography Inconsistency | F2 (Tokens) — `iconSize` tokens | `size={N}` literal rejeitado em code review |
| Vibecoding Tells | F3 (Componentes Base) — checklist pré-merge | Checklist aplicado em cada componente |
| Architectural Debt | F2 (Tokens) — tokens para spacing, z-index, motion | Audit de tokens antes de F4 |

---

## Sources

- Análise direta do codebase formuladota-v2 (globals.css, button.tsx, card.tsx, skeleton.tsx, page.tsx, dashboard-current.png) — 2026-05-23
- [Game UI Design: Complete Interface Guide 2025](https://generalistprogrammer.com/tutorials/game-ui-design-complete-interface-guide-2025) — hierarquia visual, motion principles
- [20 Motion Design Principles with Examples for UI/UX Designers](https://www.mockplus.com/blog/post/20-motion-design-principles-with-examples) — easing, timing, feedback
- [Best Practices for Game UI Sounds: A Practical Guide to Immersive UI Audio](https://sfxengine.com/blog/best-practices-for-game-ui-sounds) — frequências, camadas, não-fatigante
- [CSS Variables Guide: Design Tokens & Theming](https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025) — arquitetura de tokens
- [Systems for z-index — CSS-Tricks](https://css-tricks.com/systems-for-z-index/) — token-based z-index
- [WCAG Contrast Ratio 4.5:1 Guide 2025](https://testparty.ai/blog/wcag-contrast-ratio-guide-2025) — contrast em dark themes
- [Skeleton Screens 101 — Nielsen Norman Group](https://www.nngroup.com/articles/skeleton-screens/) — when to use skeleton vs other patterns
- [Icon Design Guide — Lucide](https://lucide.dev/contribute/icon-design-guide) — stroke weight, grid system
- [Lucide vs Heroicons comparison](https://allsvgicons.com/compare/lucide-vs-heroicons/) — diferenças de stroke e grid
- [GenUI vs. Vibe Coding — NN/G](https://www.nngroup.com/articles/genui-vs-vibe/) — vibecoding quality concerns
- [Easing functions — Motion.dev](https://motion.dev/docs/easing-functions) — curvas de easing corretas por contexto
- [Web Animation Best Practices — GitHub Gist](https://gist.github.com/uxderrick/07b81ca63932865ef1a7dc94fbe07838) — timing hierarchy
- Observação direta de: dota2.com, store.steampowered.com, Battle.net client, FACEIT.com, riot.com, pathofexile.com, diablo.blizzard.com — patterns AAA identificados

---

*Pitfalls research para: FormulaDota v2.5 Design Foundations — AAA Game Client Experience*
*Researched: 2026-05-23*
*Confidence: HIGH — baseado em análise de codebase real + múltiplas fontes verificadas*
