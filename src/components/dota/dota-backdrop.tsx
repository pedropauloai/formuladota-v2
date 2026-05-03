// DotaBackdrop — backdrop full-bleed com video oficial Dota 2 + overlay escuro pra legibilidade.
// Phase 3.5+ — usa HeroVideo (Steam CDN HotLink) com z-index negativo + gradient overlay.
//
// Pattern Dota oficial dota2.com: video atmospheric atrás de texto/UI, opacity reduzida.
// Variantes:
// - "hero" (default): bem visível, opacity 50, gradient suave — pra hero sections
// - "ambient": sutil, opacity 20, gradient mais escuro — pra pages internas (legibilidade)
// - "split": dois videos lado-a-lado (criativo) — usado em landing variada

import { HeroVideo } from "./hero-video";

interface DotaBackdropProps {
  heroSlug?: string;       // ex: "pudge", "invoker", "antimage", "nevermore", "windrunner"
  variant?: "hero" | "ambient" | "split";
  splitSlugs?: [string, string]; // só usado quando variant="split"
  /** Forçar montage homepage default (sem heroSlug) */
  homepage?: boolean;
}

export function DotaBackdrop({
  heroSlug,
  variant = "ambient",
  splitSlugs,
  homepage = false,
}: DotaBackdropProps) {
  if (variant === "split" && splitSlugs) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <HeroVideo
            heroSlug={splitSlugs[0]}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          <HeroVideo
            heroSlug={splitSlugs[1]}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black" />
      </div>
    );
  }

  const opacityClass = variant === "hero" ? "opacity-50" : "opacity-20";
  const gradientClass =
    variant === "hero"
      ? "bg-gradient-to-b from-black/40 via-black/55 to-black"
      : "bg-gradient-to-b from-black/70 via-black/75 to-black";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <HeroVideo
        heroSlug={homepage ? undefined : heroSlug}
        className={`absolute inset-0 h-full w-full object-cover ${opacityClass}`}
      />
      <div className={`absolute inset-0 ${gradientClass}`} />
    </div>
  );
}
