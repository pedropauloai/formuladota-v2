# MOTION_SYSTEM.md — FormulaDota V2.5

**Status:** Lei permanente — qualquer divergencia no codigo e bug, nao preferencia.
**Implementacao canonica:** `src/lib/motion/presets.ts`, `src/lib/motion/choreography.ts`, `src/lib/motion/hooks.ts`
**Tokens de referencia:** `src/styles/tokens/motion.css` (DF2.5)
**Versao Motion:** `motion` v12.40.0 (import de `motion/react` — nao `framer-motion`)

---

## 1. Filosofia Motion

### Motion como linguagem, nao decoracao

Motion no FormulaDota nao existe pra "deixar bonito". Existe pra comunicar tres coisas:

1. **Urgencia** — o que precisa da atencao do usuario agora?
2. **Hierarquia** — o que e mais importante do que aquilo?
3. **Emocao** — o que o usuario deve sentir neste momento?

Quando motion nao responde a nenhuma dessas tres perguntas, ele nao deveria existir.

### Game client cinematografico != SaaS animado

Um dashboard SaaS usa `transition-all duration-200 ease-in-out` em tudo porque parece "mais polido". O resultado e ruido visual uniforme — o usuario aprende a ignorar as animacoes porque elas nao dizem nada.

O Riot Client tem uma animacao de 800ms pra revelar uma nova season. E outra de 80ms pra registrar que voce clicou num botao. A diferenca e intencional e perceptivel. O usuario sente "esse momento importa" vs "confirmo que voce clicou". Essas sao emocoes diferentes servidas por timing diferente.

FormulaDota e um game client, nao um painel administrativo. O padrao de referencia e o Dota 2 client, nao o Vercel dashboard. A pergunta correta antes de qualquer animacao nova e: **"isso existe no Riot Client?"** — se a resposta for nao, provavelmente e anti-feature.

### As tres perguntas antes de qualquer animacao

Antes de adicionar qualquer motion a um componente, responder:

- **Qual urgencia?** Micro-feedback de input nao pode demorar mais que 120ms. Revelacao de tela pode e deve ser mais lenta.
- **Qual hierarquia?** Uma partida encontrada e mais importante que um hover num card. O timing deve refletir isso.
- **Qual emocao?** Entrar na fila e expectativa. Partida encontrada e excitacao. Erro de pagamento e frustacao clara (nao escondida por animacao longa).

### Animar tudo e ruido

Cada elemento que se move compete pela atencao do usuario. Quando tudo se move, nada se move — o usuario aprende a ignorar o sistema inteiro. A economia de movimento e a regra: reserve animacoes complexas pra momentos que merecem.

### Assimetria como desconforto

Animar entrada sem animar saida e uma das formas mais comuns de fazer motion parecer amador. O modal aparece suavemente em 300ms e desaparece em corte instantaneo — o usuario percebe como descosturado, mesmo sem saber nomear o problema. Toda animacao de entrada exige variante de saida correspondente.

A saida tipicamente usa timing mais curto (exit mais rapido que enter) e curva inversa (ease-in ao sair, ease-out ao entrar). Isso e intencional — o usuario ja processou o elemento, a saida e transicao, nao revelacao.

### Respeito a reduced-motion

`prefers-reduced-motion: reduce` existe porque animacoes podem causar nausea, tontura ou convulsoes em usuarios com condicoes vestibulares ou epilepsia fotossensivel. Nunca e opcional.

A estrategia nao e "remover animacoes". E "reduzir intensidade":
- Durations colapsam para micro ou zero
- Scale e translate viram opacity-only
- Particles e loops ambientes ficam off
- Springs viram linear instantaneo

**Nenhuma feature pode quebrar** quando reduced-motion esta ativo — apenas a intensidade visual diminui.

---

## 2. Hierarquia de Durations

A hierarquia de durations e a lei mais importante do sistema de motion. Cada nivel resolve um tipo diferente de comunicacao.

**Regra central:** subir um nivel aproximadamente dobra o tempo. A diferenca entre niveis deve ser perceptivel ao usuario sem precisar de instrumentacao.

### Nivel 1 — Micro

```css
--motion-duration-micro: 80ms;      /* hover state, focus ring */
--motion-duration-micro-max: 120ms; /* click feedback, icon swap, badge update */
```

**Quando usar:** qualquer resposta a input direto do usuario. Hover state, focus ring, active/press state, badge counter update, icon swap.

**Por que tao rapido:** o usuario acabou de fazer um gesto. A resposta precisa parecer instantanea — como pressionar uma tecla fisica. Qualquer coisa acima de 120ms nessa categoria parece "lento" e o usuario perde a sensacao de controle direto.

**Easing obrigatorio:** `--motion-ease-snappy`

**Exemplos FormulaDota:**
- Hover num hero card: escala 1.02 em 90ms
- Foco no input de busca: ring de foco aparece em 80ms
- Click no botao primario: scale 0.97 em 90ms (press feedback)

### Nivel 2 — Standard

```css
--motion-duration-standard: 200ms;      /* modal open, dropdown, card expand */
--motion-duration-standard-max: 280ms;  /* drawer slide, accordion expand */
```

**Quando usar:** transicoes de estado de componentes — modal abrindo, dropdown aparecendo, card expandindo, accordion abrindo. Estado muda mas o contexto de pagina permanece.

**Por que esse range:** 200-280ms e o range onde o usuario percebe que algo aconteceu mas nao tem tempo de se frustrar com a espera. Abaixo de 200ms parece abrupto pra elementos grandes. Acima de 280ms o usuario começa a aguardar em vez de interagir.

**Easing obrigatorio:** `--motion-ease-soft-landing`

**Exemplos FormulaDota:**
- Modal de confirmacao de compra: fade + scale-up em 240ms
- Dropdown de opcoes: slide-down em 220ms
- Card de PRO expandindo detalhes: altura expand em 260ms
- Queue card mostrando fila completa: max-height expand em 280ms

### Nivel 3 — Hero

```css
--motion-duration-hero: 400ms;      /* page enter, primary CTA pulse */
--motion-duration-hero-max: 600ms;  /* page exit, success burst, season reveal */
```

**Quando usar:** transicoes de pagina, momentos de CTA primario, feedback de acoes de alto valor (sucesso de compra, entrada na fila confirmada), reveals de conteudo importante.

**Por que mais lento:** esses momentos merecem orcamento atencional do usuario. Uma transicao de pagina em 80ms parece um corte — o usuario perde o senso de onde esta espacialmente. Em 400-600ms o usuario processa a mudanca de contexto e chega orientado.

**Easing obrigatorio:** `--motion-ease-soft-landing` para enters; `--motion-ease-cinematic` para exits e narrativa.

**Exemplos FormulaDota:**
- Page transition entre rotas: exit 350ms + enter 500ms
- Botao "ENTRAR NA FILA" pulsando (loop): 600ms por ciclo
- Success burst apos compra confirmada: 400ms
- Cards staggering ao entrar na pagina principal: 480ms (total de sequence, nao por item)

### Nivel 4 — Cinematic

```css
--motion-duration-cinematic: 800ms;       /* login->main menu, loading transitions */
--motion-duration-cinematic-max: 1200ms;  /* match found takeover, season reveal */
```

**Quando usar:** momentos cinematograficos de alto impacto — transicao de login para menu principal, match found takeover fullscreen, loading screens narrativos. Sao raros por design.

**Por que tao longo:** esses momentos **sao** a experiencia, nao um obstaculo a ela. A transicao de login para menu e a primeira impressao do produto. A tela de partida encontrada e o pico emocional de uma sessao de uso. Eles merecem tempo de palco.

**Frequencia:** maximo 2-3 desses momentos por sessao de uso. Se aparecerem com mais frequencia, perdem impacto.

**Easing obrigatorio:** `--motion-ease-cinematic`

**Exemplos FormulaDota:**
- loginToMenu: logo fade in 1000ms + cards stagger 800ms total + ambient particles 1200ms
- Match found takeover: scale full-screen 900ms + overlay 800ms
- Loading screen narrativo: fade in princípio da doutrina 1000ms

---

## 3. Easings Nomeados por Contexto

FormulaDota usa exatamente quatro easings. Nao tres, nao cinco — quatro. Cada um tem nome, valor e contexto de uso exclusivo.

**Regra absoluta:** `ease-in-out` generico e `ease` generico sao PROIBIDOS em V2.5+. Todo uso de easing deve referenciar um dos quatro nomes abaixo.

### `--motion-ease-snappy`

```css
--motion-ease-snappy: cubic-bezier(0.32, 0.72, 0, 1);
```

**Sensacao:** "click solido" — resposta fisica imediata, como pressionar uma tecla mecanica. Deceleracao agressiva no final.

**Contexto:** feedback instantaneo de input. Hover state, press/active state, focus ring. Sempre em nivel Micro (80-120ms).

**Por que essa curva:** o inicio e rapido (0.32 de control point 1), fica rapido por mais tempo, e freia bruscamente no final. O usuario percebe como "snap" — a animacao chega ao destino sem hesitacao.

**Nunca usar em:** modais, page transitions, elementos grandes. A brusquidao que parece "solida" em um hover parece "violenta" numa transicao de tela.

### `--motion-ease-soft-landing`

```css
--motion-ease-soft-landing: cubic-bezier(0.4, 0, 0.2, 1);
```

**Sensacao:** calmo, controlado. Entra rapido e pousa suavemente. Material Design standard easing.

**Contexto:** modal open, dropdown reveal, card expand, qualquer elemento que revela conteudo novo para o usuario. Nivel Standard (200-280ms).

**Por que essa curva:** e a curva mais "natural" para revelar informacao — o usuario ja sabe que algo vai aparecer (agiu para isso), entao o inicio pode ser rapido. O final suave da ao usuario tempo de orientacao antes do elemento se estabilizar.

**Nunca usar em:** micro-interactions (muito lento pra sentir "snap") ou page transitions cinematograficas (muito gentil pra criar impacto narrativo).

### `--motion-ease-cinematic`

```css
--motion-ease-cinematic: cubic-bezier(0.65, 0, 0.35, 1);
```

**Sensacao:** narrativo, pesado, com peso. Começa lento, acelera no meio, pousa lento. Symmetric ease-in-out, mas com curva muito mais pronunciada que o generico.

**Contexto:** page transitions, narrativa beats, momentos cinematograficos. Nivel Hero e Cinematic (400ms+).

**Por que essa curva:** a lentidao inicial cria antecipacao. O usuario percebe que algo importante esta prestes a acontecer. A lentidao final e o "pouso" — o novo contexto se estabiliza deliberadamente, dando tempo pro usuario se orientar.

**Nunca usar em:** micro-interactions ou qualquer elemento que precisa de resposta rapida. A lentidao inicial destruiria o senso de responsividade.

### `--motion-ease-spring`

```ts
// Nao e uma cubic-bezier — e uma configuracao de spring physics do Motion v12
const springConfig = { stiffness: 320, damping: 30 }
```

**Sensacao:** organico, fisico, levemente underdamped. O elemento overshoot ligeiramente e volta — como um objeto com massa real.

**Contexto:** drag interactions, hover scale em cards, lift effect, qualquer coisa que simula objeto fisico. Nao tem "nivel de duration" fixo — o spring calcula seu proprio timing baseado nas propriedades fisicas.

**Quando usar:** sempre que propriedades de transform forem animadas em resposta a interacao direta do usuario (hover, drag, press). O spring cria sensacao de peso real sem parecer "animacao CSS".

**Nunca usar em:** opacity-only transitions, color transitions, ou qualquer propriedade que nao seja transform/layout. Springs em opacity parecem glitchy.

**Implementacao em Motion v12:**

```ts
import { motion } from "motion/react"

// Hover card com spring
<motion.div
  whileHover={{ scale: 1.03, y: -4 }}
  transition={{ type: "spring", stiffness: 320, damping: 30 }}
/>
```

---

## 4. Choreography Patterns

Sequences nomeadas que coordenam multiplos elementos. Nenhuma sequence pode ser reimplementada inline — todas devem referenciar as sequences em `src/lib/motion/choreography.ts`.

### `loginToMenu`

**Trigger:** usuario autentica com sucesso e e redirecionado para o menu principal.

**Objetivo:** primeira impressao do produto. Deve comunicar "bem-vindo ao seu game client".

**Sequence:**
1. Logo FormulaDota fade in — `--motion-duration-cinematic` (1000ms) + `--motion-ease-cinematic`
2. Cards de nav stagger up — `--motion-duration-hero` (500ms cada) + 60ms delay entre items + `--motion-ease-soft-landing`
3. Ambient particles fade in — `--motion-duration-hero` (600ms) linear (nao eased)

**Regra de reducao (reduced-motion):** logo fade in 0ms (instantaneo), cards aparecem sem translate (apenas opacity 200ms), particles off.

### `queueEnterToMatchFound`

**Trigger:** usuario entra na fila e eventualmente e notificado de partida encontrada.

**Objetivo:** manter tensao/expectativa durante fila; pico emocional no match found.

**Sequence:**
1. Queue card pulse — loop standard (280ms por ciclo) + `--motion-ease-snappy` 0.6->1.0 opacity sutil
2. Timer incrementando — sem animacao (numero muda instantaneamente, apenas tabular-nums previne layout shift)
3. Match found: overlay escurece tela — `--motion-duration-cinematic` (800ms) fade
4. Match found card escala de 0.8 pra 1.0 — `--motion-duration-cinematic` (900ms) + `--motion-ease-cinematic`
5. Countdown comeca — cada tick: micro flash 80ms + `--motion-ease-snappy`

**Regra de reducao:** pulse loop off; match found overlay: corte instantaneo; card: fade only sem scale.

### `cardHoverChoreography`

**Trigger:** usuario passa o mouse sobre um card interativo (Hero card, PRO card, Match card).

**Objetivo:** comunicar "isso e clicavel e responsivo" sem ruido excessivo.

**Sequence (enter):**
1. Scale 1.0 -> 1.03 e y 0 -> -4px — `--motion-ease-spring` (instantaneo, spring calcula)
2. Glow border intensifica — `--motion-duration-micro` (90ms) + `--motion-ease-snappy`
3. Sound hover hint (opcional, volume 0.3) — sincrono com step 1

**Sequence (leave/release):**
- Reversal completo usando as MESMAS curvas na direcao inversa. Nao definir curva separada pra exit do hover — spring naturalmente reverte.

**Regra de reducao:** scale e translate off; apenas glow border intensifica (opacity-only).

### `errorRecovery`

**Trigger:** usuario submete acao que falha (pagamento recusado, validacao de input, acao proibida).

**Objetivo:** comunicar claramente que algo deu errado sem ser dramatico demais.

**Sequence:**
1. Elemento alvo shake horizontal — 3 ciclos de 80ms cada (total ~240ms) + `--motion-ease-snappy` (translate x: 0 -> -8px -> 8px -> 0)
2. Sound erro (obrigatorio) — sincrono com step 1
3. Mensagem de erro inline fade in — `--motion-duration-standard` (220ms) + `--motion-ease-soft-landing`
4. Border/outline do elemento muda pra cor de erro — `--motion-duration-micro` (100ms)

**Regra de reducao:** shake off (substitui por border flash 120ms); som e mensagem inline mantidos.

---

## 5. Wrappers Reutilizaveis

Implementados em F4 (Phase DF4). Regra absoluta: **nunca reimplementar stagger inline**. Se precisar de stagger, usar `<Stagger>`. Se precisar de fade, usar `<FadeIn>`. Se reimplementar esses patterns inline, e bug de arquitetura.

### `<FadeIn>`

```tsx
// src/components/ui/motion/fade-in.tsx
// Props: as (polymorphic), delay (ms), className
// Internamente: motion[as] + fadeIn preset de presets.ts
// Suporta AnimatePresence para exit animations
```

**Quando usar:** qualquer elemento que entra no DOM e precisa aparecer gradualmente. Conteudo carregado via data fetching, mensagens de erro, tooltips.

### `<Stagger>`

```tsx
// src/components/ui/motion/stagger.tsx
// Props: as, delay (ms entre items, default: 60ms), className
// Internamente: motion[as] com staggerChildren + cada filho usa staggerItem preset
```

**Quando usar:** listas, grids, qualquer conjunto de elementos que devem aparecer em sequencia. Cards do dashboard, items de ranking, resultados de busca.

**Nunca usar:** pra um elemento unico (use `<FadeIn>`).

### `<ScaleEnter>`

```tsx
// src/components/ui/motion/scale-enter.tsx
// Props: as, origin (center/top/bottom), className
// Internamente: scaleIn preset com transform-origin baseado em origin prop
```

**Quando usar:** modais, popovers, dropdowns, qualquer elemento que "aparece" a partir de um ponto de origem.

### `<PageTransition>`

```tsx
// src/components/ui/motion/page-transition.tsx
// Props: children, className
// Internamente: AnimatePresence mode="wait" + pageEnter/pageExit presets
// Wraps o conteudo da pagina no layout root
```

**Quando usar:** exclusivamente no root layout, envolvendo o `{children}`. Nao usar em componentes internos de pagina.

---

## 6. Variants Nomeados em `src/lib/motion/presets.ts`

Cada variant e um objeto MotionVariants exportado. Nenhum variant pode hardcodar valores de duration ou easing — todos devem referenciar tokens CSS via `getComputedStyle` ou constantes importadas de `src/lib/motion/tokens.ts`.

```ts
// src/lib/motion/presets.ts
import { motionTokens } from "./tokens"

export const fadeIn: MotionVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: motionTokens.durationMicro / 1000,
      ease: motionTokens.easeSnappy,
    },
  },
}

export const fadeInUp: MotionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: motionTokens.durationMicro / 1000,
      ease: motionTokens.easeSnappy,
    },
  },
}

export const scaleIn: MotionVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: motionTokens.durationMicro / 1000,
      ease: motionTokens.easeSnappy,
    },
  },
}

export const slideInRight: MotionVariants = {
  initial: { opacity: 0, x: 24 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: {
      duration: motionTokens.durationMicro / 1000,
    },
  },
}

export const staggerChildren: MotionVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06, // 60ms entre items — token nao necessario, fixo por design
      delayChildren: 0,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1, // exit na ordem inversa da entrada
    },
  },
}

// staggerItem e o item individual usado dentro de staggerChildren
export const staggerItem: MotionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
  },
}

export const pageEnter: MotionVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.durationHero / 1000,
      ease: motionTokens.easeSoftLanding,
    },
  },
}

export const pageExit: MotionVariants = {
  exit: {
    opacity: 0,
    transition: {
      duration: motionTokens.durationStandard / 1000,
      ease: motionTokens.easeCinematic,
    },
  },
}
```

**Regra:** nenhum componente da aplicacao define MotionVariants inline. Se um novo pattern de animacao e necessario, ele vai para `presets.ts` com nome descritivo e fica disponivel globalmente.

---

## 7. Reduced-Motion Strategy

### O hook central: `useMotionSafe()`

```ts
// src/lib/motion/hooks.ts
import { useReducedMotion } from "motion/react"

/**
 * Retorna `full` quando animacoes sao seguras e `reduced` quando
 * o usuario prefere movimento reduzido.
 *
 * @example
 * const variants = useMotionSafe(fadeInUp, fadeIn) // usa fadeIn sem translate
 * const duration = useMotionSafe(280, 0)           // instantaneo em reduced
 */
export function useMotionSafe<T>(full: T, reduced: T): T {
  const prefersReduced = useReducedMotion()
  return prefersReduced ? reduced : full
}
```

Todo componente que anima usa `useMotionSafe()`. **Nunca** verificar `prefers-reduced-motion` diretamente via `window.matchMedia` em componentes — centralizar no hook.

### Tabela de fallbacks por tipo de animacao

| Animacao | Full | Reduced |
|----------|------|---------|
| Fade (opacity) | `0 -> 1, duration standard` | `0 -> 1, duration 0` (instantaneo) |
| Translate Y (slide) | `y: 12 -> 0, duration standard` | Remove translate, apenas opacity |
| Scale | `scale: 0.96 -> 1, duration standard` | Remove scale, apenas opacity |
| Spring hover | `scale: 1.03, y: -4, spring` | Remove scale e translate, apenas glow |
| Page transition | `opacity + y, duration hero` | `opacity-only, duration micro` |
| Stagger | `60ms delay entre items` | `0ms delay, todos aparecem juntos` |
| Loop pulse | `opacity 0.6->1, 280ms loop` | `opacity: 1 fixo, sem loop` |
| Ambient particles | `tsParticles full config` | Off completamente |
| Shake de erro | `translate x ciclos, 240ms` | `border flash 120ms` |
| Cinematic takeover | `scale + fade, 900ms` | `fade-only, 200ms` |

### Regra de ouro do reduced-motion

A feature funciona identicamente. A emocao e preservada. Apenas a intensidade visual diminui. Um usuario com reduced-motion ainda ve a partida encontrada, ainda ve o erro, ainda ve o stagger de cards — mas sem movimento que possa causar desconforto fisico.

---

## 8. Bundle Strategy

### LazyMotion no root layout (obrigatorio)

```tsx
// src/app/layout.tsx
import { LazyMotion, domAnimation } from "motion/react"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <LazyMotion features={domAnimation} strict>
          {children}
        </LazyMotion>
      </body>
    </html>
  )
}
```

`domAnimation` cobre: animate, initial, exit, whileHover, whileTap, whileFocus, variants, AnimatePresence. Bundle resultante: ~10kb gzipped (vs ~45kb do bundle completo).

`domMax` adiciona: drag, layout animations, shared element transitions. Bundle: ~34kb gzipped.

**Regra:** usar `domAnimation` por padrao. Declarar explicitamente `domMax` apenas se layout animations ou shared element transitions forem necessarias e validadas como essenciais para a feature.

### Quando `domMax` e aceitavel

- Reorder de lista com layout animation (ex: posicao no ranking muda em tempo real)
- Shared element transition entre paginas (ex: hero portrait que "voa" do card pro perfil)

Antes de usar `domMax`, validar: a feature seria igualmente compreensivel com uma transicao simples de fade? Se sim, usar fade e manter `domAnimation`.

### Componentes com layout animations

Se um componente usar `layout` prop do Motion (para layout animations automaticas), ele **deve** declarar isso no comentario do arquivo:

```tsx
// AVISO: usa Motion layout animation — requer domMax no LazyMotion do root
// Validado em: [data da validacao] por [quem validou]
```

---

## 9. Anti-Patterns Proibidos

### 1. `ease-in-out` generico universal

```ts
// PROIBIDO — sem intencao, sem contexto
transition={{ ease: "easeInOut", duration: 0.2 }}

// CORRETO — easing nomeado com contexto
transition={{ ease: motionTokens.easeSoftLanding, duration: motionTokens.durationStandard / 1000 }}
```

### 2. Duration uniforme 200ms em tudo

```ts
// PROIBIDO — destroi hierarquia temporal
// hover: duration 200ms
// modal: duration 200ms
// page transition: duration 200ms

// CORRETO — hierarquia perceptivel
// hover: duration 90ms (micro)
// modal: duration 240ms (standard)
// page transition: duration 480ms (hero)
```

### 3. Animar entrada sem animar saida

```ts
// PROIBIDO — exit ausente = corte abrupto
const variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 }
  // exit: ausente
}

// CORRETO — toda entrada tem saida correspondente
const variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.08 } }
}
```

### 4. Animar o tempo todo

Qualquer elemento que anima continuamente sem trigger de usuario (exceto ambient particles e loops de estado, que sao intencionais e controlados) e bug de arquitetura. Loops como o pulse do queue card existem para comunicar "estado ativo em progresso" — sao excecao documentada, nao regra.

### 5. `transition-duration` inline hardcoded em CSS/Tailwind

```tsx
// PROIBIDO — hardcoded fora do sistema de tokens
<div className="transition-all duration-200 ease-in-out">

// CORRETO — via token CSS ou preset Motion
<motion.div variants={fadeIn} initial="initial" animate="animate">
// OU para CSS puro simples:
<div style={{ transitionDuration: "var(--motion-duration-standard)" }}>
```

### 6. Bundle sem LazyMotion

```tsx
// PROIBIDO — carrega ~45kb desnecessariamente
import { motion } from "motion/react"
// sem LazyMotion no root

// CORRETO — LazyMotion no root, componentes usam motion normalmente
// O LazyMotion no root e suficiente para lazy-loading funcionar
```

---

## 10. Mapping para Telas FormulaDota

### Login -> Main Menu

**Sequence:** `loginToMenu`
**Componente responsavel:** `<PageTransition>` no layout + sequencia custom em `choreography.ts`
**Easing predominante:** `--motion-ease-cinematic`
**Duration total:** 1200ms (logo) + 800ms (stagger de cards)

O logo aparece primeiro, se estabiliza, e entao os cards de navegacao aparecem em sequencia. O usuario ve "FORMULADOTA" antes de ver o conteudo — establece identidade antes de funcionalidade.

### Queue Card Pulse (estado ativo de fila)

**Tipo:** loop continuo enquanto usuario esta na fila
**Animacao:** opacity 0.6 -> 1.0 -> 0.6, loop infinito
**Duration por ciclo:** 280ms (`--motion-duration-standard`)
**Easing:** `--motion-ease-snappy` (0.6->1.0) + simetrico na volta
**Trigger de parada:** match found ou usuario sai da fila

Comunica "buscando ativamente" sem ser agressivo. O pulso sutil em opacity (nunca scale) e menos invasivo que uma barra de progresso girando.

### Match Found Takeover

**Sequence:** `queueEnterToMatchFound` (parte final)
**Tipo:** fullscreen overlay cinematografico
**Duration total:** ~1600ms (overlay fade + card scale + countdown)
**Easing:** `--motion-ease-cinematic` para tudo
**Reducao:** fade-only em reduced-motion, sem scale, sem overlay escurecimento gradual

E o momento de maior impacto emocional de uma sessao. Merece o budget cinematico.

### Hero Card Hover

**Sequence:** `cardHoverChoreography`
**Animacao:** scale spring + y spring + glow border
**Spring config:** `{ stiffness: 320, damping: 30 }`
**Duration efetivo:** ~150-200ms (determinado pelo spring)
**Sound:** hover hint opcional (volume 0.3, spike de 80ms)

### Page Transition entre Rotas

**Implementacao:** `<PageTransition>` no root layout
**Exit:** `pageExit` preset — opacity 0, duration standard (220ms), ease cinematic
**Enter:** `pageEnter` preset — opacity 1 + y, duration hero (480ms), ease soft-landing
**Modo AnimatePresence:** `"wait"` — exit completa antes de enter comecar

A assimetria intencional: exit e rapida (usuario ja processou), enter e mais lenta (usuario precisa se orientar no novo contexto).

---

## Referencias de Implementacao

- `src/lib/motion/presets.ts` — todos os variants nomeados
- `src/lib/motion/choreography.ts` — todas as sequences compostas
- `src/lib/motion/hooks.ts` — `useMotionSafe`, `useStaggerChildren`, `useInViewport`
- `src/lib/motion/tokens.ts` — constantes TypeScript que espelham os tokens CSS de DF2.5
- `src/components/ui/motion/` — wrappers `<FadeIn>`, `<Stagger>`, `<ScaleEnter>`, `<PageTransition>`
- `src/styles/tokens/motion.css` — tokens CSS canonicos (`--motion-duration-*`, `--motion-ease-*`)

---

*FormulaDota V2.5 — Design Foundations*
*Motion System — documento de lei permanente*
*Criado: 2026-05-23*
