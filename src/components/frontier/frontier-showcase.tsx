/**
 * FrontierShowcase — exibe uma key-art/screenshot/UI oficial em destaque.
 *
 * Dois modos:
 *  - framed (default): screenshot OPACO (retangular) → moldura com borda brand,
 *    cantos arredondados, glow e vinheta. Ex: capturas de tela com fundo sólido.
 *  - transparent: PNG com ALPHA (fundo transparente) → SEM moldura/borda/recorte.
 *    A arte flutua sobre o background da página (object-contain), só com um glow
 *    sutil atrás. Ex: immortal_matchmaking_ui.png, matchmaking.png (UI recortada).
 *
 * Reaproveitável pro futuro sistema de LOBBY (telas de fila/criação de partida).
 * Reveal no scroll. Arte oficial Valve via next/image (unoptimized — CDN externo).
 */

import Image from "next/image";
import { RevealOnScroll } from "./reveal-on-scroll";

interface FrontierShowcaseProps {
  /** URL da imagem (use DOTA_UI_ART). */
  src: string;
  /** Texto alternativo descritivo. */
  alt: string;
  /** Largura intrínseca da imagem (px). Necessária no modo transparente. */
  width: number;
  /** Altura intrínseca da imagem (px). Necessária no modo transparente. */
  height: number;
  /** Legenda opcional abaixo da imagem. */
  caption?: React.ReactNode;
  /**
   * Imagem transparente (PNG com alpha)? Se true, renderiza SEM moldura — a arte
   * flutua sobre o fundo da página. @default false (moldura para screenshots opacos)
   */
  transparent?: boolean;
}

export function FrontierShowcase({
  src,
  alt,
  width,
  height,
  caption,
  transparent = false,
}: FrontierShowcaseProps) {
  // -------------------------------------------------------------------------
  // Modo TRANSPARENTE — sem moldura, arte flutuante (PNG com alpha)
  // -------------------------------------------------------------------------
  if (transparent) {
    return (
      <RevealOnScroll direction="up" className="mx-auto max-w-4xl">
        <div className="relative">
          {/* Glow sutil atrás da arte — dá profundidade sem moldurar */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,var(--color-brand-primary-glow)_0%,transparent_60%)] opacity-50 blur-2xl"
            aria-hidden="true"
          />
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(max-width: 896px) 100vw, 896px"
            className="relative z-10 mx-auto h-auto w-full drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            unoptimized
          />
        </div>
        {caption && (
          <p className="mt-4 text-center font-body text-sm italic text-text-muted">
            {caption}
          </p>
        )}
      </RevealOnScroll>
    );
  }

  // -------------------------------------------------------------------------
  // Modo MOLDURADO (default) — screenshot opaco retangular
  // -------------------------------------------------------------------------
  return (
    <RevealOnScroll direction="up" className="mx-auto max-w-4xl">
      <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border-brand/40 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,var(--color-brand-primary-glow)_0%,transparent_70%)] opacity-60"
          aria-hidden="true"
        />
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 896px) 100vw, 896px"
          className="relative z-10 h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          unoptimized
        />
      </div>
      {caption && (
        <p className="mt-3 text-center font-body text-sm italic text-text-muted">
          {caption}
        </p>
      )}
    </RevealOnScroll>
  );
}
