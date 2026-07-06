// MvpAura — destaque do MVP da partida (maior desempenho). Aura DOURADA viva ao
// redor do avatar: anel de luz pulsante + labareda na base + brasas/partículas
// subindo. Substitui o antigo ícone de coroa (Pedro 2026-07-06: "não um SVG patético,
// quero partículas douradas / uma chama"). O reconhecimento do jogador é o produto —
// por isso o MVP aparece com destaque em TODO lugar que mostra o placar.
//
// COMO EMITE LUZ: a camada usa `mix-blend-mode: screen` → em vez de COBRIR o avatar,
// SOMA a luz dourada (o escuro do avatar clareia pro dourado, o claro fica). Por isso
// fica em FRENTE (pointer-events-none) sem esconder a foto: brilha as bordas e as
// faíscas aparecem por cima, como fogo de verdade. Cai como camada absoluta que cobre
// o avatar-pai + folga (-inset-2).
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
  { left: "10%", dx: "-7px", dur: "2500ms", delay: "0ms", size: 3 },
  { left: "24%", dx: "5px", dur: "3100ms", delay: "1300ms", size: 4 },
  { left: "38%", dx: "-4px", dur: "2300ms", delay: "600ms", size: 3 },
  { left: "52%", dx: "7px", dur: "2800ms", delay: "1900ms", size: 3 },
  { left: "64%", dx: "-6px", dur: "2600ms", delay: "300ms", size: 4 },
  { left: "78%", dx: "4px", dur: "3200ms", delay: "1600ms", size: 3 },
  { left: "90%", dx: "6px", dur: "2400ms", delay: "900ms", size: 3 },
];

interface Props {
  /** Ajuste fino da camada (ex.: aumentar a folga). Default cobre o avatar-pai +8px. */
  className?: string;
}

export function MvpAura({ className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute -inset-2", className)}
      style={{ mixBlendMode: "screen" }}
    >
      {/* Halo externo suave — brilho ambiente que vaza pra fora do avatar. */}
      <span
        className="fd-mvp-glow absolute -inset-1 rounded-md"
        style={{
          background:
            "radial-gradient(circle at 50% 52%, var(--color-gold) 0%, transparent 66%)",
          opacity: 0.5,
          filter: "blur(7px)",
        }}
      />
      {/* Anel dourado BRILHANTE hugando a borda do avatar (transparente no centro pra
          não lavar a foto). É o que dá o "highlight" visível mesmo parado. */}
      <span
        className="fd-mvp-glow absolute inset-0 rounded-md"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 42%, var(--color-gold-bright) 57%, var(--color-gold) 66%, transparent 84%)",
          filter: "blur(2px)",
        }}
      />
      {/* Labareda na base — lambe por baixo do avatar, tremula rápido (fogo). */}
      <span
        className="fd-mvp-flame absolute -bottom-1 left-1/2 h-5 w-10 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, var(--color-gold-cream) 0%, var(--color-gold-bright) 42%, transparent 74%)",
          filter: "blur(3px)",
        }}
      />
      {/* Brasas/partículas subindo ao redor — núcleo quase branco com halo dourado. */}
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
