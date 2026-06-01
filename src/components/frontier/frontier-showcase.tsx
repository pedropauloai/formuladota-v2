/**
 * FrontierShowcase — exibe uma key-art/screenshot oficial em destaque, emoldurada.
 *
 * Pensado pras telas de UI do Dota 2 (matchmaking, immortal_matchmaking_ui) —
 * imagens largas e nítidas que merecem aparecer grandes, com moldura sutil +
 * glow brand + legenda opcional. Reaproveitável pro futuro sistema de LOBBY
 * (mostrar a tela de fila/criação de partida).
 *
 * Reveal no scroll. Arte oficial Valve via next/image (unoptimized — CDN externo).
 */

import Image from "next/image";
import { RevealOnScroll } from "./reveal-on-scroll";

interface FrontierShowcaseProps {
  /** URL da imagem (use DOTA_UI_ART). */
  src: string;
  /** Texto alternativo descritivo. */
  alt: string;
  /** Legenda opcional abaixo da imagem. */
  caption?: React.ReactNode;
  /** Proporção da imagem pra reservar espaço (evita layout shift). @default 16/9 */
  aspect?: "16/9" | "4/3" | "21/9";
}

const ASPECT_CLASS: Record<NonNullable<FrontierShowcaseProps["aspect"]>, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "21/9": "aspect-[21/9]",
};

export function FrontierShowcase({
  src,
  alt,
  caption,
  aspect = "16/9",
}: FrontierShowcaseProps) {
  return (
    <RevealOnScroll direction="up" className="mx-auto max-w-4xl">
      {/* Moldura: borda brand sutil + glow + cantos arredondados */}
      <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border-brand/40 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {/* Glow brand atrás (aparece nas bordas) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,var(--color-brand-primary-glow)_0%,transparent_70%)] opacity-60"
          aria-hidden="true"
        />
        <div className={`relative ${ASPECT_CLASS[aspect]} w-full`}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            unoptimized
          />
          {/* Vinheta inferior pra assentar a legenda */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg-deep/80 to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
      {caption && (
        <p className="mt-3 text-center font-body text-sm italic text-text-muted">
          {caption}
        </p>
      )}
    </RevealOnScroll>
  );
}
