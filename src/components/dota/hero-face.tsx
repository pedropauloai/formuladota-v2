"use client";

// HeroFace — ROSTO do herói VIVO pra espaços PEQUENOS.
// Decisão Pedro 2026-06-12: o rosto também deve se MEXER — usamos o mesmo
// vídeo idle oficial da Valve (renders/{slug}.webm), recortado no busto via
// CSS (container pequeno + zoom com origem no alto, onde fica a cabeça).
// O crop PNG oficial (heroes/crops/{slug}.png) entra como poster (carregamento)
// e como fallback se o vídeo falhar.
//
// CDNs (mesma família do HeroVideo):
//   vídeo: cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{slug}.webm
//   rosto: cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/crops/{slug}.png

import { useState } from "react";
import { cn } from "@/lib/utils";

const VIDEO_CDN_BASE =
  "https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders";
const CROP_CDN_BASE =
  "https://cdn.akamai.steamstatic.com/apps/dota2/images/dota_react/heroes/crops";

const SIZE_PX = { sm: 64, md: 96, lg: 128 } as const;

export interface HeroFaceProps {
  /** Slug canônico do herói (ex: "tinker") — mesmo do HeroVideo. */
  heroSlug: string;
  /** Nome display pro aria-label (acessibilidade). */
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
  const [videoFailed, setVideoFailed] = useState(false);
  const crop = `${CROP_CDN_BASE}/${heroSlug}.png`;

  return (
    <div
      role="img"
      aria-label={heroName ?? heroSlug}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-sm bg-bg-deep",
        className
      )}
      style={{ width: px, height: px }}
    >
      {/* Camada base SEMPRE presente: crop oficial de rosto (carregamento,
          falha de vídeo e prefers-reduced-motion caem aqui). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={crop}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      {/* Vídeo idle por cima, recortado no BUSTO: zoom 2.1x com origem no
          alto-centro (onde fica a cabeça nos renders da Valve). */}
      {!videoFailed && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
          className="relative h-full w-full scale-[2.1] object-cover object-top [transform-origin:50%_12%] motion-reduce:hidden"
        >
          <source src={`${VIDEO_CDN_BASE}/${heroSlug}.webm`} type="video/webm" />
        </video>
      )}
    </div>
  );
}
