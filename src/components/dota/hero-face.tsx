// HeroFace — ROSTO do herói (crop oficial Valve) pra espaços PEQUENOS.
// Decisão Pedro 2026-06-11: em locais pequenos, só o rosto dá destaque —
// o corpo inteiro (HeroVideo) fica pros backdrops/áreas grandes.
//
// CDN: cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/crops/{slug}.png
// (mesma família de assets do HeroVideo; PNG com recorte busto/rosto)

import Image from "next/image";
import { cn } from "@/lib/utils";

const CROP_CDN_BASE =
  "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/crops";

const SIZE_PX = { sm: 64, md: 96, lg: 128 } as const;

export interface HeroFaceProps {
  /** Slug canônico do herói (ex: "tinker") — mesmo do HeroVideo. */
  heroSlug: string;
  /** Nome display pro alt (acessibilidade). */
  heroName?: string;
  /** @default "sm" (64px) */
  size?: keyof typeof SIZE_PX;
  className?: string;
}

export function HeroFace({
  heroSlug,
  heroName,
  size = "sm",
  className,
}: HeroFaceProps) {
  const px = SIZE_PX[size];
  return (
    <Image
      src={`${CROP_CDN_BASE}/${heroSlug}.png`}
      alt={heroName ?? heroSlug}
      width={px}
      height={px}
      // object-top: o rosto fica no topo do crop da Valve
      className={cn("rounded-sm object-cover object-top bg-bg-deep", className)}
      style={{ width: px, height: px }}
      unoptimized
    />
  );
}
