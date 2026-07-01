/**
 * FORMULADOTA — Presets de Partículas Atmosféricas
 *
 * Dois presets disponíveis:
 *  - "dust"  → partículas minúsculas e sutis flutuando (padrão)
 *  - "fog"   → elementos grandes e desfocados simulando névoa de fundo
 *
 * IMPORTANTE: Usar @tsparticles/slim (Canvas 2D) — sem WebGL.
 * Compatível com Tauri v2 e browsers antigos.
 *
 * Configurações pensadas para hardware-alvo do Pedro (mid-range).
 * Densidade conservadora para manter FPS >= 55.
 */

import type { ISourceOptions } from "@tsparticles/engine";

/**
 * dustPreset — "Poeira Estelar"
 *
 * Partículas muito pequenas e quase invisíveis que flutuam lentamente.
 * Remete ao lobby idle do Dota 2 client (partículas de luz ambiente).
 *
 * Configurações de performance:
 * - count baixo (30 partículas) — impacto mínimo em CPU
 * - fpsLimit: 60 — cap conservador
 * - sem interação com mouse — zero tracking de evento extra
 * - opacity baixa (0.05-0.35) — sutil, não distrai do conteúdo
 */
export const dustPreset: ISourceOptions = {
  /* Identificador único pra debug no DevTools */
  name: "fd-dust",

  /* Limite de FPS: 60fps cap padrão.
   * tsParticles reduz automaticamente se cair abaixo de 30fps.
   * Ver: DF3.3 — throttle automático se FPS < 30 */
  fpsLimit: 60,

  /* Sem interação com cursor — zero overhead de event listeners */
  interactivity: {
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
    },
  },

  /* Configuração das partículas individuais */
  particles: {
    /* Número de partículas simultâneas.
     * 30 = sutil e performático. "medium" density usa este valor. */
    number: {
      value: 30,
      /* Distribui as partículas baseado na área da viewport */
      density: {
        enable: true,
        /* Área de referência em pixels quadrados.
         * Distribui as 30 partículas por 1920x1080px de referência */
        width: 1920,
        height: 1080,
      },
    },

    /* Cor das partículas — neutro warm para não conflitar com brand vermelho */
    color: {
      /* Branco com leve tom warm — como poeira iluminada */
      value: "#f5f5f5",
    },

    /* Formato: círculo perfeito = mais performático no Canvas 2D */
    shape: {
      type: "circle",
    },

    /* Opacidade: variação entre partículas para profundidade visual */
    opacity: {
      /* Valor inicial — quase invisível */
      value: { min: 0.05, max: 0.35 },
      /* Animação de respiração lenta — partículas pulsam suavemente */
      animation: {
        enable: true,
        /* Ciclo de ~6 segundos de fade in/out */
        speed: 0.5,
        /* Cada partícula tem fase diferente — organic feel */
        sync: false,
      },
    },

    /* Tamanho: micro-partículas para não distrair */
    size: {
      /* Raio em pixels — variação para profundidade 3D simulada */
      value: { min: 0.5, max: 2.5 },
      animation: {
        enable: false,
      },
    },

    /* Movimento: drift lento e orgânico */
    move: {
      enable: true,
      /* Velocidade muito lenta — como poeira em ar parado */
      speed: 0.3,
      /* Direção levemente para cima — partículas "subindo" */
      direction: "top",
      /* Não seguir direção rígida — deriva orgânica */
      random: true,
      /* Variação angular para movimento mais natural */
      straight: false,
      /* Ao sair da tela pelo topo, reaparecer na base */
      outModes: {
        default: "out",
      },
    },

    /* Link entre partículas: desabilitado — sem linhas de conexão */
    links: {
      enable: false,
    },

    /* Colisão entre partículas: desabilitada — mais performático */
    collisions: {
      enable: false,
    },
  },

  /* Background: transparente — o CSS do body controla o fundo */
  background: {
    color: {
      value: "transparent",
    },
  },
};

/**
 * fogPreset — "Névoa de Batalha"
 *
 * Pouquíssimas partículas muito grandes (blur simulado via tamanho) que
 * drifam horizontalmente. Cria efeito de névoa de fundo sem WebGL.
 *
 * Notas de implementação:
 * - count muito baixo (6) — alta opacidade mas poucas unidades
 * - tamanho grande (80-250px) — blur visual por sobreposição semitransparente
 * - movimento muito lento — atmospheric drift
 * - ideal para pages de destaque (landing, loading screens)
 */
export const fogPreset: ISourceOptions = {
  name: "fd-fog",

  /* FPS cap idêntico ao dust — consistência */
  fpsLimit: 60,

  interactivity: {
    events: {
      onHover: { enable: false },
      onClick: { enable: false },
    },
  },

  particles: {
    /* Pouquíssimas partículas grandes = impacto de performance similar ao dust */
    number: {
      value: 6,
      density: {
        enable: false,
      },
    },

    /* Tons de vermelho muito sutis e cinza — remete ao brand sem gritar */
    color: {
      value: [
        "#ac1d0e",  /* brand red muito escuro */
        "#1a1a1a",  /* cinza quase preto */
        "#2d1515",  /* marrom escuro */
      ],
    },

    shape: {
      type: "circle",
    },

    /* Opacidade muito baixa — névoa sutil que mal se percebe diretamente */
    opacity: {
      value: { min: 0.02, max: 0.08 },
      animation: {
        enable: true,
        /* Ciclo muito longo — transição de 30s */
        speed: 0.1,
        sync: false,
      },
    },

    /* Partículas enormes — o "blur" é criado pela sobreposição de grandes
     * círculos semitransparentes. Efeito de glow/névoa sem WebGL. */
    size: {
      value: { min: 80, max: 250 },
      animation: {
        enable: true,
        /* Pulsação muito lenta do tamanho */
        speed: 0.5,
        sync: false,
      },
    },

    /* Drift horizontal muito lento — névoa se movendo */
    move: {
      enable: true,
      /* Extremamente lento — quase imperceptível em tempo curto */
      speed: 0.08,
      direction: "none",
      random: true,
      straight: false,
      outModes: {
        default: "out",
      },
    },

    links: {
      enable: false,
    },

    collisions: {
      enable: false,
    },
  },

  background: {
    color: {
      value: "transparent",
    },
  },
};

/**
 * getPresetByName — Helper pra selecionar preset por string
 *
 * @param name - "dust" | "fog"
 * @returns Config compatível com tsParticles ISourceOptions
 */
export function getPresetByName(name: "dust" | "fog"): ISourceOptions {
  return name === "fog" ? fogPreset : dustPreset;
}

/**
 * smokePuffsPreset — "Fumaça viva" LOCALIZADA (atrás do card de busca).
 *
 * Grandes círculos verdes/escuros semitransparentes subindo devagar → volume de
 * fumaça sem WebGL (efeito estilo cliente Dota 2, mas na cor do matchmaking).
 * fullScreen:false = o canvas fica DENTRO do container (não cobre a tela toda).
 */
export const smokePuffsPreset: ISourceOptions = {
  name: "fd-smoke-puffs",
  fpsLimit: 60,
  fullScreen: { enable: false },
  interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
  particles: {
    number: { value: 7, density: { enable: false } },
    /* verde play (matchmaking) + verde escuro + quase-preto = fumaça de energia */
    color: { value: ["#00C466", "#0f3d2a", "#0B0C0F"] },
    shape: { type: "circle" },
    opacity: {
      value: { min: 0.03, max: 0.11 },
      animation: { enable: true, speed: 0.35, sync: false },
    },
    /* círculos enormes semitransparentes = blur/volume por sobreposição */
    size: {
      value: { min: 50, max: 140 },
      animation: { enable: true, speed: 3, sync: false },
    },
    move: {
      enable: true,
      speed: 0.5,
      direction: "top",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    links: { enable: false },
    collisions: { enable: false },
  },
  background: { color: { value: "transparent" } },
};

/**
 * emberPreset — "Brasas vivas" com GLOW (partículas pequenas subindo).
 *
 * Sobreposto à fumaça pra dar vida: motes verdes/dourados brilhantes que sobem,
 * com shadow (glow) real por partícula. Poucos e pequenos = performático.
 */
export const emberPreset: ISourceOptions = {
  name: "fd-embers",
  fpsLimit: 60,
  fullScreen: { enable: false },
  interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
  particles: {
    number: { value: 16, density: { enable: false } },
    /* verde play + dourado (família gold) — brasas de energia da fila */
    color: { value: ["#00C466", "#e0b64e"] },
    shape: { type: "circle" },
    opacity: {
      value: { min: 0.15, max: 0.7 },
      animation: { enable: true, speed: 1.2, sync: false },
    },
    size: { value: { min: 0.6, max: 2.4 } },
    /* GLOW por partícula — o brilho "vivo" que o Pedro pediu */
    shadow: { enable: true, color: "#00C466", blur: 6 },
    move: {
      enable: true,
      speed: { min: 0.5, max: 1.6 },
      direction: "top",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    links: { enable: false },
    collisions: { enable: false },
  },
  background: { color: { value: "transparent" } },
};
