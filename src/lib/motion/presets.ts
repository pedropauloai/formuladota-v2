/**
 * FORMULADOTA V2.5 — Motion Presets
 * Variants nomeados reutilizáveis para toda a aplicação.
 *
 * REGRA ABSOLUTA: nenhum componente define MotionVariants inline.
 * Se precisar de um novo pattern, adicionar aqui com nome descritivo.
 *
 * SINCRONIZAÇÃO COM TOKENS CSS (src/styles/tokens/semantic.css):
 * As constantes DURATIONS e EASINGS abaixo DEVEM estar sincronizadas
 * com os tokens --motion-duration-* e --motion-ease-* definidos em semantic.css.
 * Ao alterar um token CSS, atualizar a constante correspondente aqui.
 *
 * Por que constantes TypeScript em vez de ler CSS vars:
 * - SSR-safe: getComputedStyle não existe no servidor
 * - Type-safe: TypeScript valida os valores em build time
 * - Simples: sem leitura do DOM, sem parsing de strings
 * - Sincronização: comentários apontam para o token CSS correspondente
 *
 * Versão Motion: 12.40.0 (import de "motion/react", não "framer-motion")
 */

import type { Variants } from "motion/react";

// ---------------------------------------------------------------------------
// DURAÇÕES — sincronizadas com src/styles/tokens/semantic.css GRUPO 9
// Valores em SEGUNDOS (Motion v12 usa segundos, CSS usa ms)
// ---------------------------------------------------------------------------

export const DURATIONS = {
  /** 100ms — hover, focus, ripple (--motion-duration-micro: 100ms) */
  micro: 0.1,
  /** 240ms — entradas/saídas padrão de elementos (--motion-duration-standard: 240ms) */
  standard: 0.24,
  /** 500ms — cards hero, modais, moments de destaque (--motion-duration-hero: 500ms) */
  hero: 0.5,
  /** 1000ms — loading, page transitions cinematográficas (--motion-duration-cinematic: 1000ms) */
  cinematic: 1.0,
} as const;

// ---------------------------------------------------------------------------
// EASINGS — sincronizados com src/styles/tokens/semantic.css GRUPO 10
// Formato: [x1, y1, x2, y2] cubic-bezier
// ---------------------------------------------------------------------------

export const EASINGS = {
  /**
   * Snap — resposta física imediata, como tecla mecânica.
   * Uso: hover state, press/active, focus ring (nível micro).
   * CSS: --motion-ease-snappy: cubic-bezier(0.32, 0.72, 0, 1)
   */
  snappy: [0.32, 0.72, 0, 1],
  /**
   * Soft landing — entra rápido, pousa suavemente.
   * Uso: modal open, dropdown, card expand, revelação de conteúdo (nível standard).
   * CSS: --motion-ease-soft-landing: cubic-bezier(0.4, 0, 0.2, 1)
   */
  softLanding: [0.4, 0, 0.2, 1],
  /**
   * Cinematic — narrativo, pesado, com peso. Começa lento, acelera, pousa lento.
   * Uso: page transitions, narrativa beats, momentos cinematográficos (nível hero/cinematic).
   * CSS: --motion-ease-cinematic: cubic-bezier(0.65, 0, 0.35, 1)
   */
  cinematic: [0.65, 0, 0.35, 1],
  /**
   * Spring — overshoot sutil (para CSS ease fallback; motion usa spring physics separado).
   * Uso: notificações, confirmações, badges.
   * CSS: --motion-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
   */
  spring: [0.34, 1.56, 0.64, 1],
} as const;

// ---------------------------------------------------------------------------
// SPRING PHYSICS — configuração para motion spring (não cubic-bezier)
// Usar em whileHover/whileTap com propriedades transform (scale, x, y)
// ---------------------------------------------------------------------------

export const SPRING_CONFIG = {
  /** Hover em cards — sensação orgânica de levitação */
  cardHover: { type: "spring" as const, stiffness: 320, damping: 30 },
  /** Press/tap feedback — responsivo e snappy */
  press: { type: "spring" as const, stiffness: 400, damping: 25 },
} as const;

// ---------------------------------------------------------------------------
// VARIANTS NOMEADOS
// Cada variant exportado segue o padrão: { hidden/initial, visible/animate, exit }
// Nomes dos estados: "hidden" + "visible" OU "initial" + "animate" — consistente.
// Usamos "hidden"/"visible" para compatibilidade com useInViewport e Stagger.
// ---------------------------------------------------------------------------

/**
 * fadeIn — fade simples, sem translate.
 * Uso: conteúdo carregado assíncronamente, tooltips, mensagens de erro.
 * Nível: Standard.
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.standard,
      ease: EASINGS.softLanding,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.micro,
      ease: EASINGS.snappy,
    },
  },
};

/**
 * fadeInUp — fade + deslize suave de baixo para cima.
 * Uso: cards ao entrar na viewport, listas, conteúdo principal de páginas.
 * Nível: Standard.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.standard,
      ease: EASINGS.softLanding,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: DURATIONS.micro,
      ease: EASINGS.snappy,
    },
  },
};

/**
 * scaleIn — fade + escala sutil de 96% para 100%.
 * Uso: modais, popovers, dropdowns, dialogs.
 * Nível: Standard.
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATIONS.standard,
      ease: EASINGS.softLanding,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: DURATIONS.micro,
      ease: EASINGS.snappy,
    },
  },
};

/**
 * slideInRight — deslize da direita para a posição final.
 * Uso: sidebars, drawers, painéis laterais, notificações.
 * Nível: Standard.
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATIONS.standard,
      ease: EASINGS.softLanding,
    },
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: {
      duration: DURATIONS.micro,
      ease: EASINGS.snappy,
    },
  },
};

/**
 * staggerChildren — container que orquestra entrada sequencial dos filhos.
 * Uso: listas, grids, conjuntos de cards.
 * Nível: depende dos filhos (normalmente Standard).
 *
 * IMPORTANTE: os filhos devem usar um variant com estados "hidden"/"visible"
 * (ex: fadeInUp, fadeIn) para o stagger funcionar corretamente.
 */
export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06, // 60ms entre cada filho — fixo por design
      delayChildren: 0.04,   // 40ms antes do primeiro filho começar
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,  // exit na ordem inversa da entrada
    },
  },
};

/**
 * pageEnter — animação de entrada de página.
 * Uso: exclusivamente no <PageTransition> wrapper no root layout.
 * Nível: Hero (500ms — dá tempo ao usuário para se orientar no novo contexto).
 */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.hero,
      ease: EASINGS.softLanding,
    },
  },
};

/**
 * pageExit — animação de saída de página.
 * Uso: exclusivamente no <PageTransition> wrapper.
 * Nível: Standard (exit mais rápido que enter — usuário já processou a página).
 *
 * NOTA: o estado padrão é "visible" (página já estava visível).
 * AnimatePresence ativa o exit quando o componente é desmontado.
 */
export const pageExit: Variants = {
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.standard,
      ease: EASINGS.cinematic,
    },
  },
};
