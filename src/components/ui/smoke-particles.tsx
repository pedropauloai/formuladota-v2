"use client";

// SmokeParticles — fumaça viva + brasas com glow, LOCALIZADA atrás de um card
// (ex.: card "buscando partida"). Reaproveita a infra tsParticles (Canvas 2D,
// Tauri-safe) já usada no AmbientLayer — sem WebGL, sem three.js, sem assets.
//
// Duas camadas sobrepostas: fumaça (grandes círculos verdes semitransparentes
// subindo) + brasas (motes verde/dourado brilhantes com shadow/glow). Cores da
// marca (verde matchmaking + dourado) — zero neon.
//
// Uso: dentro de um container `relative`, renderiza um wrapper absoluto ATRÁS
// (z-0, pointer-events-none). Respeita prefers-reduced-motion (não anima).

import { useCallback } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import { smokePuffsPreset, emberPreset } from "@/lib/particles/presets";
import { useReducedMotion } from "@/lib/particles/hooks";

export function SmokeParticles() {
  const prefersReducedMotion = useReducedMotion();
  const initEngine = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  // Sem animação por preferência do usuário — o card já tem seu próprio glow.
  if (prefersReducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-8 -top-28 bottom-0 z-0 overflow-hidden"
    >
      <ParticlesProvider init={initEngine}>
        <Particles id="fd-search-smoke" options={smokePuffsPreset} className="absolute inset-0" />
        <Particles id="fd-search-embers" options={emberPreset} className="absolute inset-0" />
      </ParticlesProvider>
    </div>
  );
}
