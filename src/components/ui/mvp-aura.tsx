// MvpAura — destaque do MVP da partida (maior desempenho). Aura DOURADA viva ao
// redor do avatar: glow externo pulsante + labareda na base + brasas/partículas
// subindo. Substitui o antigo ícone de coroa (Pedro 2026-07-06: "não um SVG patético,
// quero partículas douradas / uma chama"). O reconhecimento do jogador é o produto —
// por isso o MVP aparece com destaque em TODO lugar que mostra o placar.
//
// NÃO TAMPA NADA (Pedro 2026-07-06): nem o rosto, nem o anel de XP do XpAvatarRing.
//   - A camada é de TRÁS (z-0); o avatar renderiza por cima (z-10, wrapper isolate).
//   - O glow é um BOX-SHADOW externo, que só emana PRA FORA da borda — nunca pinta
//     por dentro do quadrado do avatar nem sobre o anel de progresso. Antes eu usava
//     um radial "colado na borda" que competia com o anel de XP; trocado por shadow.
//   - Labareda e brasas nascem FORA do box do avatar (embaixo/ao redor).
//
// SSR-safe: sem hooks/estado — animações e o fallback de prefers-reduced-motion vivem
// no CSS (globals.css, classes fd-mvp-*). Cores 100% via tokens gold. Barato (só
// opacity/transform no compositor) → escala pra várias instâncias no feed.

import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

// Brasas com posição/tempo DETERMINÍSTICOS (sem Math.random — estável no SSR e entre
// re-renders). Espalhadas na largura, tamanhos/derivas/tempos variados = orgânico. Os
// delays são escalonados pra que a QUALQUER instante haja faíscas em voo (nunca "vazio").
const EMBERS: ReadonlyArray<{
  left: string;
  dx: string;
  dur: string;
  delay: string;
  size: number;
}> = [
  { left: "4%", dx: "-7px", dur: "2500ms", delay: "0ms", size: 3 },
  { left: "20%", dx: "5px", dur: "3100ms", delay: "1300ms", size: 4 },
  { left: "36%", dx: "-4px", dur: "2300ms", delay: "600ms", size: 3 },
  { left: "52%", dx: "7px", dur: "2800ms", delay: "1900ms", size: 3 },
  { left: "66%", dx: "-6px", dur: "2600ms", delay: "300ms", size: 4 },
  { left: "82%", dx: "4px", dur: "3200ms", delay: "1600ms", size: 3 },
  { left: "94%", dx: "6px", dur: "2400ms", delay: "900ms", size: 3 },
];

interface Props {
  /** Ajuste fino da camada (ex.: aumentar a folga). Default cobre o avatar-pai +8px. */
  className?: string;
}

export function MvpAura({ className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute -inset-2 z-0", className)}
    >
      {/* Glow dourado EXTERNO — box-shadow alinhado à borda do avatar (inset-2 volta ao
          tamanho do box). Sem background: só emana pra fora, nunca tampa o interior nem
          o anel de XP. Pulsa (fd-mvp-glow). */}
      <span
        className="fd-mvp-glow absolute inset-2 rounded-md"
        style={{
          boxShadow:
            "0 0 6px 1px var(--color-gold-bright), 0 0 14px 3px var(--color-gold), 0 0 26px 7px var(--color-gold-muted)",
        }}
      />
      {/* Labareda na base — lambe por baixo do avatar (fora do box), tremula (fogo). */}
      <span
        className="fd-mvp-flame absolute bottom-0 left-1/2 h-4 w-9 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, var(--color-gold-cream) 0%, var(--color-gold-bright) 42%, transparent 74%)",
          filter: "blur(3px)",
        }}
      />
      {/* Brasas/partículas subindo ao redor — núcleo quase branco com halo dourado. As
          que estão atrás do avatar aparecem ao subir além do topo; as das bordas, de lado. */}
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="fd-mvp-ember absolute bottom-0 block rounded-full"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              background: "var(--color-gold-cream)",
              boxShadow:
                "0 0 5px 1px var(--color-gold-bright), 0 0 2px var(--color-gold-cream)",
              "--fd-ember-dx": e.dx,
              "--fd-ember-dur": e.dur,
              "--fd-ember-delay": e.delay,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
