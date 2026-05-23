/**
 * FORMULADOTA — AmbientLayer (Camada Atmosférica)
 *
 * Componente root-level que adiciona profundidade visual atmosférica
 * em toda a aplicação sem impactar a interação do usuário.
 *
 * ARQUITETURA (DF3.1):
 *  - position: fixed, inset-0 — cobre toda a viewport
 *  - z-index: var(--z-atmosphere) = -10 — ATRÁS de todo conteúdo
 *  - pointer-events: none — completamente transparente para cliques
 *
 * PERFORMANCE (DF3.3):
 *  - Page Visibility API: pausa partículas quando aba fica oculta
 *  - fpsLimit: 60 configurado nos presets
 *  - tsParticles reduz auto se FPS cair (comportamento nativo do engine)
 *
 * ACESSIBILIDADE (DF3.4):
 *  - prefers-reduced-motion: remove canvas, mantém gradient estático CSS
 *  - gradient não anima quando motion reduzido está ativo
 *
 * OPT-OUT POR PÁGINA (DF3.5):
 *  Opção 1 — data attribute no body:
 *    <body data-ambient="off">
 *  Opção 2 — prop no AmbientLayer no root layout:
 *    <AmbientLayer density="off" />
 *  Opção 3 — hook useAmbientControl() em Client Component:
 *    const { setDensity } = useAmbientControl()
 *    useEffect(() => { setDensity("off"); return () => setDensity("medium") }, [])
 *
 * @see src/lib/particles/presets.ts — configuração das partículas
 * @see src/lib/particles/hooks.ts — hooks de controle
 * @see docs/foundations/VISUAL_PHILOSOPHY.md — princípio de atmosfericidade
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, Container } from "@tsparticles/engine";
import { getPresetByName } from "@/lib/particles/presets";
import { useReducedMotion } from "@/lib/particles/hooks";

/** Densidade de partículas — controla quantidade e intensidade visual */
export type AmbientDensity = "off" | "low" | "medium" | "high";

/** Preset visual disponível */
export type AmbientPreset = "dust" | "fog";

interface AmbientLayerProps {
  /**
   * Intensidade da camada atmosférica.
   * - "off"    → sem partículas, sem gradient (opt-out total)
   * - "low"    → gradient estático + partículas mínimas (50% do count)
   * - "medium" → preset completo (padrão)
   * - "high"   → partículas extras (150% do count, use com cuidado)
   */
  density?: AmbientDensity;

  /**
   * Qual preset visual usar.
   * - "dust" → poeira estelar sutil (padrão, recomendado para todas as páginas)
   * - "fog"  → névoa de batalha (landing, loading screens)
   */
  preset?: AmbientPreset;
}

/**
 * Multiplica o count de partículas baseado na density.
 * Aplicado sobre o count base do preset selecionado.
 */
function getCountMultiplier(density: AmbientDensity): number {
  switch (density) {
    case "off":    return 0;
    case "low":    return 0.5;
    case "medium": return 1.0;
    case "high":   return 1.5;
    default:       return 1.0;
  }
}

/**
 * AmbientParticlesInner — renderiza o canvas tsParticles após engine pronto.
 * Separado de AmbientLayer para que o Provider seja wrapper externo.
 */
function AmbientParticlesInner({
  density,
  preset,
}: Required<AmbientLayerProps>) {
  /* Ref para o container de partículas — usado para pause/resume via Visibility API */
  const containerRef = useRef<Container | null>(null);

  /* Page Visibility API (DF3.3):
   * Pausa partículas quando a aba fica oculta (background tab).
   * Economiza CPU e bateria — crítico em laptops durante sessão de jogo. */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!containerRef.current) return;

      if (document.hidden) {
        /* Aba oculta — pausa o loop de animação do canvas */
        void containerRef.current.pause();
      } else {
        /* Aba visível novamente — retoma o loop */
        void containerRef.current.play();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  /* Callback quando o container tsParticles está pronto.
   * Guarda referência para pause/resume via Page Visibility. */
  const handleParticlesLoaded = useCallback(async (container?: Container) => {
    if (container) {
      containerRef.current = container;
    }
  }, []);

  /* Obtém a configuração do preset selecionado */
  const baseConfig = getPresetByName(preset);

  /* Ajusta count de partículas baseado na density */
  const multiplier = getCountMultiplier(density);
  const baseCount =
    baseConfig.particles?.number &&
    typeof baseConfig.particles.number === "object" &&
    "value" in baseConfig.particles.number
      ? (baseConfig.particles.number.value as number)
      : 30;
  const adjustedCount = Math.round(baseCount * multiplier);

  /* Config final com count ajustado — spread para não mutar o preset original */
  const particlesConfig = {
    ...baseConfig,
    particles: {
      ...baseConfig.particles,
      number: {
        ...(typeof baseConfig.particles?.number === "object"
          ? baseConfig.particles.number
          : {}),
        value: adjustedCount,
      },
    },
  };

  return (
    <Particles
      id="fd-ambient-particles"
      particlesLoaded={handleParticlesLoaded}
      options={particlesConfig}
      style={{
        position: "fixed",
        inset: 0,
        /* Token --z-atmosphere = -10 (definido em src/styles/tokens/semantic.css).
         * NUNCA usar número hardcoded aqui (C17). */
        zIndex: "var(--z-atmosphere)" as unknown as number,
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * AmbientLayer — camada atmosférica root-level.
 *
 * Montado uma única vez no root layout (src/app/layout.tsx).
 * Não remontar por página — o canvas persiste entre navegações (sem flash).
 *
 * @example
 * // Em src/app/layout.tsx:
 * <AmbientLayer density="medium" preset="dust" />
 */
export function AmbientLayer({
  density = "medium",
  preset = "dust",
}: AmbientLayerProps) {
  /* Detecta preferência do SO por movimento reduzido (DF3.4) */
  const prefersReducedMotion = useReducedMotion();

  /* Verifica opt-out via data attribute no body ou html (DF3.5).
   * Alternativa à prop density="off" — útil para páginas que não têm
   * acesso direto ao root layout (ex: intercepting routes). */
  const [dataAttrOff, setDataAttrOff] = useState<boolean>(false);

  useEffect(() => {
    /* Checa data-ambient="off" no body ou html */
    const checkDataAttr = () => {
      const bodyOff = document.body.getAttribute("data-ambient") === "off";
      const htmlOff = document.documentElement.getAttribute("data-ambient") === "off";
      setDataAttrOff(bodyOff || htmlOff);
    };

    checkDataAttr();

    /* Observa mudanças dinâmicas no atributo (ex: SPA navigation) */
    const observer = new MutationObserver(checkDataAttr);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-ambient"],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ambient"],
    });

    return () => observer.disconnect();
  }, []);

  /* Função de inicialização do engine tsParticles.
   * Passada ao ParticlesProvider via prop `init`.
   * loadSlim = bundle Canvas 2D sem WebGL — Tauri-safe (DF3.2). */
  const initEngine = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  /* === EARLY RETURNS (ordem importante — mais restritivo primeiro) === */

  /* Opt-out: density="off" ou data-ambient="off" no DOM (DF3.5) */
  const effectiveDensity = dataAttrOff ? "off" : density;
  if (effectiveDensity === "off") {
    /* Sem partículas, sem gradient — black canvas puro */
    return null;
  }

  /* prefers-reduced-motion: renderiza gradient estático sem partículas (DF3.4).
   * Mantém a estética atmosférica mas sem nenhuma animação. */
  if (prefersReducedMotion) {
    return (
      <div
        aria-hidden="true"
        style={{
          /* z-index via CSS custom property — nunca hardcoded (C17) */
          zIndex: "var(--z-atmosphere)",
          /* Gradient estático — atmosfera sem animação */
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(172, 29, 14, 0.04) 0%, transparent 60%)," +
            "radial-gradient(ellipse at 80% 20%, rgba(26, 26, 26, 0.6) 0%, transparent 60%)",
        }}
        className="fixed inset-0 pointer-events-none"
      />
    );
  }

  /* === RENDERIZAÇÃO PRINCIPAL === */

  return (
    <>
      {/* Gradient de fundo estático — sempre presente junto com partículas.
          Adiciona profundidade visual mesmo quando partículas são lentas.
          Técnica: vinheta de cantos + glow brand sutil no rodapé. */}
      <div
        aria-hidden="true"
        style={{ zIndex: "var(--z-atmosphere)" }}
        className="fixed inset-0 pointer-events-none"
      >
        {/* Vinheta sutil nos cantos — técnica clássica de game client */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
          }}
          className="absolute inset-0"
        />
        {/* Glow brand vermelho no canto inferior esquerdo — sutil referência ao logo */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at 15% 90%, rgba(172, 29, 14, 0.05) 0%, transparent 50%)",
          }}
          className="absolute inset-0"
        />
      </div>

      {/* ParticlesProvider inicializa o engine uma única vez.
          Todos os <Particles /> filhos aguardam a inicialização antes de renderizar.
          initEngine carrega @tsparticles/slim (Canvas 2D, sem WebGL). */}
      <ParticlesProvider init={initEngine}>
        {/* Canvas de partículas tsParticles.
            aria-hidden: puramente decorativo, sem valor semântico.
            pointer-events-none: não intercepta cliques ou hovers. */}
        <AmbientParticlesInner
          density={effectiveDensity}
          preset={preset}
        />
      </ParticlesProvider>
    </>
  );
}
