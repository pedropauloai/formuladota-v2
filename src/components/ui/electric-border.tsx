"use client";

// ElectricBorder — moldura ELÉTRICA/NEON no contorno do avatar (Pedro 2026-07-06, ref:
// avatar-frame-eletric). Uma linha nítida na cor da marca com FAÍSCAS elétricas correndo
// pela borda — sem glow difuso, sem nada girando atrás. É um cosmético de anel: a "pele"
// viva do contorno do avatar.
//
// TÉCNICA (skill premium-fx — SVG p/ forma vetorial + filtro procedural): a linha é um
// <rect> arredondado (mesma geometria do anel) com stroke neon (drop-shadow APERTADO no
// CSS) deslocado por um filtro feTurbulence+feDisplacementMap com `seed` animado (SMIL) —
// o ruído deformando a linha dá o arco elétrico/faísca. Duas camadas: base suave + fio
// brilhante deslocado. Respeita reduced-motion (sem animar → linha neon estática limpa).
//
// PERF: filtro SVG animado é caro por pixel — como o shader, NÃO escala pra dezenas de
// instâncias. Usar em avatar de DESTAQUE (perfil, mini-perfil). Em listas, o XpAvatarRing
// cai no neon estático por tier. (Ver skill premium-fx §1.)

import { useId } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";
import { cn } from "@/lib/utils";

interface Props {
  /** Lado do quadrado do container (px) — igual ao `box` do XpAvatarRing. */
  box: number;
  /** Raio dos cantos — igual ao `rx` do anel (concêntrico). */
  rx: number;
  /** Cor da corrente elétrica (via token: var(--color-...)). */
  color: string;
  /** Intensidade do brilho neon (px). */
  glow?: number;
  /** Amplitude do deslocamento elétrico (px). Maior = mais "raio". */
  turbulence?: number;
  className?: string;
}

export function ElectricBorder({ box, rx, color, glow = 4, turbulence = 6, className }: Props) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fid = `el-${uid}`;
  const inset = 1;
  const side = box - inset * 2;

  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute -z-10 inset-0", className)}
      // drop-shadow no CSS = brilho neon APERTADO (fica na linha, não borra pra longe).
      style={{ filter: `drop-shadow(0 0 ${glow}px ${color}) drop-shadow(0 0 ${glow * 2}px ${color})` }}
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="absolute inset-0 overflow-visible"
        fill="none"
      >
        <defs>
          <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.11"
              numOctaves={3}
              seed={2}
              result="noise"
            >
              {!reduced && (
                <animate attributeName="seed" values="2;16;2" dur="2.6s" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={reduced ? 0 : turbulence} />
          </filter>
        </defs>

        {/* Linha base — mais suave, dá corpo à corrente. */}
        <rect
          x={inset}
          y={inset}
          width={side}
          height={side}
          rx={rx}
          stroke={color}
          strokeWidth={2}
          opacity={0.5}
          filter={`url(#${fid})`}
        />
        {/* Fio brilhante — fino e nítido, o "arco" elétrico por cima. */}
        <rect
          x={inset}
          y={inset}
          width={side}
          height={side}
          rx={rx}
          stroke={color}
          strokeWidth={1}
          filter={`url(#${fid})`}
        />
      </svg>
    </span>
  );
}
