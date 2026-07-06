"use client";

// ElectricBorder — moldura ELÉTRICA/NEON de luxo no contorno do avatar (Pedro
// 2026-07-06, ref: avatar-frame-eletric + "profissional e luxuoso"). Uma linha neon
// nítida na cor do cosmético com ARCO elétrico deformando a borda e CHISPAS brancas
// cintilando ao longo dela — a "estática elétrica" da referência. Sem glow difuso,
// sem nada girando atrás. É a "pele" viva do contorno (cosmético de anel).
//
// TÉCNICA (skill premium-fx — SVG p/ forma vetorial + filtro procedural):
//   • Linha: <path> do contorno (rounded-rect) com stroke neon (drop-shadow APERTADO no
//     CSS) deslocado por feTurbulence+feDisplacementMap com `seed` animado (SMIL) → arco.
//   • Chispas: pontos brancos posicionados ao longo do path (getPointAtLength) que
//     cintilam fora de fase (fd-spark) e correm com a mesma turbulência → luxo elétrico.
//   Duas camadas de linha (base suave + fio brilhante). reduced-motion → estático limpo.
//
// PERF: filtro SVG animado é caro por pixel — como o shader, não escala pra dezenas de
// instâncias. Usar em avatar de DESTAQUE (perfil, mini-perfil, showcase). Em listas o
// XpAvatarRing cai no neon por tier. (Ver skill premium-fx §1.)

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";
import { cn } from "@/lib/utils";

/** Path de um retângulo de cantos arredondados (contorno da moldura). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

interface Props {
  /** Lado do quadrado do container (px) — igual ao `box` do XpAvatarRing. */
  box: number;
  /** Raio dos cantos — igual ao `rx` do anel (concêntrico). */
  rx: number;
  /** Cor da corrente elétrica (via token: var(--color-...) ou hex). */
  color: string;
  /** Cor do núcleo das chispas (default branco — o halo é tingido pelo neon). */
  spark?: string;
  /** Intensidade do brilho neon (px). */
  glow?: number;
  /** Amplitude do deslocamento elétrico (px). Maior = mais "raio". */
  turbulence?: number;
  className?: string;
}

const SPARK_COUNT = 18;

export function ElectricBorder({
  box,
  rx,
  color,
  spark = "#ffffff",
  glow = 4,
  turbulence = 6,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fid = `el-${uid}`;
  const inset = 1.5;
  const side = box - inset * 2;
  const d = roundedRectPath(inset, inset, side, side, rx);

  // Posições das chispas ao longo do contorno (client-only: precisa do DOM p/
  // getPointAtLength). Distribui SPARK_COUNT pontos uniformemente pelo perímetro.
  const pathRef = useRef<SVGPathElement>(null);
  const [sparks, setSparks] = useState<Array<{ x: number; y: number }>>([]);
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const pts = Array.from({ length: SPARK_COUNT }, (_, i) => {
      const at = p.getPointAtLength(((i + 0.5) / SPARK_COUNT) * len);
      return { x: at.x, y: at.y };
    });
    setSparks(pts);
  }, [box, rx, d]);

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

        <g filter={`url(#${fid})`}>
          {/* Linha base — mais suave, dá corpo à corrente. (ref mede o path.) */}
          <path ref={pathRef} d={d} stroke={color} strokeWidth={2} opacity={0.45} />
          {/* Fio brilhante — fino e nítido, o "arco" elétrico por cima. */}
          <path d={d} stroke={color} strokeWidth={1} />
          {/* Chispas — pontos brancos cintilando ao longo da borda (correm com a corrente). */}
          {sparks.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={1.3}
              fill={spark}
              className={reduced ? undefined : "fd-spark"}
              style={reduced ? { opacity: 0.85 } : { animationDelay: `${(i * 173) % 1600}ms` }}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
