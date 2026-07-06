// MvpCrown — coroa dourada do MVP, pousada no topo-centro do avatar. Asset PNG ESTÁTICO
// (Twemoji, CC-BY 4.0 — ver public/icons/CREDITS.md), SEM WebGL. Substituiu a chama por
// shader (MvpFlame) no feed /partidas: cada chama gastava 1 contexto WebGL por card e
// competia com os avatares (Pedro 2026-07-06). Aqui é só uma <img> + brilho CSS sutil.
//
// Micro-detalhe (motion-safe): uma flutuação delicada (keyframe fd-crown-float em
// globals.css) + brilho dourado atrás — "detalhe sutil sempre", sem custo de GPU.

import Image from "next/image";

/** Coroa do MVP no topo do avatar. `size` = lado da coroa em px. */
export function MvpCrown({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[62%] motion-safe:animate-[fd-crown-float_3s_ease-in-out_infinite]"
      style={{ width: size, height: size }}
    >
      {/* Brilho dourado suave atrás da coroa (CSS puro). */}
      <span
        className="absolute inset-0 -z-10 rounded-full blur-[3px]"
        style={{
          background:
            "radial-gradient(circle, var(--color-gold-bright) 0%, transparent 65%)",
          opacity: 0.55,
        }}
      />
      <Image
        src="/icons/mvp-crown.png"
        alt=""
        width={size}
        height={size}
        unoptimized
        className="-rotate-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
      />
    </span>
  );
}
