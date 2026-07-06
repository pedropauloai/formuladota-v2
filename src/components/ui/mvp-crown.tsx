// MvpCrown — coroa dourada do MVP, pousada no topo-centro do avatar. SVG (lucide Crown)
// preenchido em dourado, SEM WebGL. Voltou a ser SVG (Pedro 2026-07-06: o emoji PNG não
// ficou bom, "estava melhor antes"). Substituiu a chama por shader (MvpFlame) no feed e
// na aba MMR: cada chama gastava 1 contexto WebGL e competia com os avatares.
//
// Micro-detalhe (motion-safe): flutuação delicada (keyframe fd-crown-float em globals.css)
// + brilho por drop-shadow — "detalhe sutil sempre", sem custo de GPU.

import { Crown } from "lucide-react";

/** Coroa do MVP no topo do avatar. `size` = altura da coroa em px. */
export function MvpCrown({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[62%] motion-safe:animate-[fd-crown-float_3s_ease-in-out_infinite]"
      style={{ color: "var(--color-gold-bright)" }}
    >
      <Crown
        size={size}
        strokeWidth={1.5}
        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
        style={{ fill: "var(--color-gold)" }}
      />
    </span>
  );
}
