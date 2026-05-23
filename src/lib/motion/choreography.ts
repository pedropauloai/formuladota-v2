/**
 * FORMULADOTA V2.5 — Motion Choreography
 * Sequences compostas que coordenam múltiplos elementos.
 *
 * REGRA: nenhuma sequence pode ser reimplementada inline nos componentes.
 * Toda orquestração de múltiplos elementos vem daqui.
 *
 * Referência: docs/foundations/MOTION_SYSTEM.md — seção 4 (Choreography Patterns)
 */

import type { Variants } from "motion/react";
import { DURATIONS, EASINGS } from "./presets";

// ---------------------------------------------------------------------------
// loginToMenu — primeira impressão do produto
// ---------------------------------------------------------------------------
/**
 * Sequência de boas-vindas após autenticação.
 * Objetivo: comunicar "bem-vindo ao seu game client".
 *
 * Stage 1 — Logo FormulaDota aparece (cinematic, 1000ms)
 * Stage 2 — Cards de nav aparecem em stagger (hero, 60ms entre items)
 * Stage 3 — Ambient particles sobem (hero, 600ms linear)
 *
 * Uso:
 *   <motion.div variants={loginToMenu.logo} initial="hidden" animate="visible">
 *   <motion.div variants={loginToMenu.navContainer} initial="hidden" animate="visible">
 *   <motion.div variants={loginToMenu.navItem}> (filho do container)
 */
export const loginToMenu = {
  /** Container do logo — duração cinematográfica */
  logo: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: DURATIONS.cinematic,
        ease: EASINGS.cinematic,
      },
    },
  } satisfies Variants,

  /** Container dos nav items — orquestra stagger dos filhos */
  navContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,     // 60ms entre cada nav item
        delayChildren: 0.8,        // aguarda o logo aparecer primeiro
      },
    },
  } satisfies Variants,

  /** Nav item individual — filho do navContainer */
  navItem: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATIONS.hero,
        ease: EASINGS.softLanding,
      },
    },
  } satisfies Variants,

  /** Camada de particles ambiente — sobe depois de tudo */
  particles: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: DURATIONS.hero,
        ease: "linear",            // particles: sem easing, curva natural linear
        delay: 1.2,               // após logo + nav começarem
      },
    },
  } satisfies Variants,
} as const;

// ---------------------------------------------------------------------------
// queueEnterToMatchFound — tensão → pico emocional
// ---------------------------------------------------------------------------
/**
 * Sequência da fila ao vivo até o match ser encontrado.
 * Objetivo: manter tensão durante a fila; pico emocional no match found.
 *
 * Estágio 1 — Queue card pulsa (loop enquanto aguarda)
 * Estágio 2 — Match found: overlay escurece a tela
 * Estágio 3 — Card da partida escala para o centro
 * Estágio 4 — Countdown com micro-flash por tick
 *
 * Uso:
 *   <motion.div animate={queueEnterToMatchFound.queuePulse.animate}
 *               transition={queueEnterToMatchFound.queuePulse.transition}>
 */
export const queueEnterToMatchFound = {
  /**
   * Pulso do queue card enquanto buscando.
   * Loop infinito — parar via animate prop quando match for encontrado.
   * NOTA: aplicar em `animate` diretamente (não via variants/initial).
   */
  queuePulse: {
    animate: { opacity: [0.6, 1, 0.6] },
    transition: {
      duration: DURATIONS.standard,  // 240ms por ciclo
      ease: EASINGS.snappy,
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },

  /** Overlay que escurece a tela quando partida é encontrada */
  matchFoundOverlay: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: DURATIONS.cinematic,  // 1000ms — momento cinematográfico
        ease: EASINGS.cinematic,
      },
    },
  } satisfies Variants,

  /** Card da partida encontrada — escala do centro da tela */
  matchFoundCard: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: DURATIONS.cinematic,  // 1000ms
        ease: EASINGS.cinematic,
        delay: 0.3,                     // leve delay após o overlay começar
      },
    },
  } satisfies Variants,

  /**
   * Flash por tick do countdown.
   * Cada número que muda ganha um flash rápido de opacity.
   * Aplicar em `animate` com key={tick} para re-disparar a animação.
   */
  countdownTick: {
    animate: { opacity: [0.4, 1] },
    transition: {
      duration: DURATIONS.micro,  // 100ms — instantâneo como feedback de tick
      ease: EASINGS.snappy,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// cardHoverChoreography — feedback de hover em cards interativos
// ---------------------------------------------------------------------------
/**
 * Configuração de hover para Hero cards, PRO cards, Match cards.
 * Objetivo: comunicar "isso é clicável e responsivo" sem ruído excessivo.
 *
 * Usa spring physics para sensação orgânica de levitação.
 * Glow de borda intensifica via className condicional (não motion — é CSS).
 *
 * Uso:
 *   <motion.div
 *     whileHover={cardHoverChoreography.hover}
 *     whileTap={cardHoverChoreography.tap}
 *     transition={cardHoverChoreography.transition}
 *   >
 */
export const cardHoverChoreography = {
  /** Estado hover — levita ligeiramente */
  hover: {
    scale: 1.03,
    y: -4,
  },

  /** Estado tap/press — afunda levemente (feedback de clique) */
  tap: {
    scale: 0.98,
    y: -2,
  },

  /** Spring physics — sensação orgânica de peso real */
  transition: {
    type: "spring" as const,
    stiffness: 320,
    damping: 30,
  },
} as const;

// ---------------------------------------------------------------------------
// errorRecovery — feedback de erro em formulários e ações
// ---------------------------------------------------------------------------
/**
 * Sequência de shake para comunicar erro sem ser dramático.
 * Objetivo: clareza imediata sem ansiedade excessiva.
 *
 * 3 ciclos de shake horizontal em 240ms total.
 *
 * Uso:
 *   <motion.div
 *     animate={hasError ? errorRecovery.shake.animate : undefined}
 *     transition={errorRecovery.shake.transition}
 *   >
 */
export const errorRecovery = {
  shake: {
    animate: { x: [0, -8, 8, -8, 8, 0] },
    transition: {
      duration: 0.3,             // 300ms — 3 ciclos perceptíveis
      ease: EASINGS.snappy,
    },
  },

  /** Mensagem de erro inline — aparece após o shake */
  errorMessage: {
    hidden: { opacity: 0, y: -4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATIONS.standard,  // 240ms
        ease: EASINGS.softLanding,
      },
    },
  } satisfies Variants,
} as const;
