// Componente reutilizável pra renderizar videos oficiais Dota 2 (Steam CDN HotLink).
// Usado no hero da landing (default homepage montage) e em qualquer card/perfil/stats
// que mostre um hero específico (props.heroSlug).
//
// Pattern URL Steam CDN:
// - Homepage montage: cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm
// - Hero individual:   cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{slug}.webm
//
// DF7.4 — lazy load via IntersectionObserver + fallback CSS animation se CDN falhar.
// Retorna <video> com sources webm + mp4 fallback. autoplay+loop+muted+playsinline
// (requisito browsers pra autoplay sem user gesture).

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// URLs do homepage montage oficial Dota 2
const HOMEPAGE_WEBM =
  "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm";
const HOMEPAGE_MP4 =
  "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.mp4";

// Base do CDN Akamai pra renders de heroes individuais
const HERO_CDN_BASE =
  "https://cdn.akamai.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders";

// Presets de tamanho — usados apenas quando heroSlug está presente (modo card)
const SIZE_CLASSES = {
  sm: "size-16",
  md: "size-24",
  lg: "size-40",
  xl: "size-64",
} as const;

export interface HeroVideoProps {
  /**
   * Slug canônico do hero pra renderizar video idle individual.
   * Ex: "pudge", "antimage", "invoker", "juggernaut".
   * Se omitido, renderiza o video oficial homepage Dota 2 (sem container de tamanho fixo).
   */
  heroSlug?: string;
  /**
   * Nome display do hero (ex: "Anti-Mage"). Usado no fallback CSS se CDN falhar.
   * Default: heroSlug capitalizado.
   */
  heroName?: string;
  /**
   * Override completo das URLs (webm + mp4). Útil pra catalog custom de videos.
   * Tem prioridade sobre heroSlug.
   */
  src?: { webm: string; mp4?: string };
  /**
   * Preset de tamanho quando em modo card (heroSlug presente).
   * Ignorado no modo homepage (sem heroSlug).
   */
  size?: keyof typeof SIZE_CLASSES;
  /**
   * Lazy load via IntersectionObserver — só carrega quando entra no viewport.
   * Default: true quando heroSlug presente, false no modo homepage.
   */
  lazy?: boolean;
  className?: string;
  /**
   * Imagem poster mostrada antes do video carregar.
   */
  poster?: string;
  /**
   * Loop infinito (default true).
   */
  loop?: boolean;
}

// Constrói as URLs webm + mp4 pro hero individual via CDN Steam
function buildHeroUrls(slug: string): { webm: string; mp4: string } {
  return {
    webm: `${HERO_CDN_BASE}/${slug}.webm`,
    mp4: `${HERO_CDN_BASE}/${slug}.mp4`,
  };
}

// Capitaliza o slug pra usar no fallback visual (ex: "antimage" → "Antimage")
function slugToDisplayName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");
}

export function HeroVideo({
  heroSlug,
  heroName,
  src,
  size = "md",
  lazy,
  className,
  poster,
  loop = true,
}: HeroVideoProps) {
  // Lazy load só faz sentido no modo card (hero individual).
  // No modo homepage (sem heroSlug), carrega imediatamente por padrão.
  const isCardMode = Boolean(heroSlug || src);
  const shouldLazy = lazy !== undefined ? lazy : isCardMode;

  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!shouldLazy);
  const [videoFailed, setVideoFailed] = useState(false);

  // IntersectionObserver — observa o container e dispara quando entra no viewport
  useEffect(() => {
    if (!shouldLazy || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" } // pré-carrega 100px antes de entrar na tela
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLazy]);

  // Resolve as URLs finais: src override > heroSlug > homepage montage
  const urls = src
    ? { webm: src.webm, mp4: src.mp4 }
    : heroSlug
      ? buildHeroUrls(heroSlug)
      : { webm: HOMEPAGE_WEBM, mp4: HOMEPAGE_MP4 };

  // MODO HOMEPAGE: sem heroSlug nem src override — retorna <video> simples,
  // mantendo compatibilidade total com o callsite de page.tsx que passa só className.
  if (!isCardMode) {
    return (
      <video
        autoPlay
        loop={loop}
        muted
        playsInline
        poster={poster}
        className={className}
        aria-hidden="true"
      >
        <source src={urls.webm} type="video/webm" />
        {urls.mp4 && <source src={urls.mp4} type="video/mp4" />}
      </video>
    );
  }

  // MODO CARD: heroSlug ou src presente — container com tamanho fixo,
  // lazy load via IntersectionObserver e fallback CSS animation se CDN falhar.
  const displayName = heroName ?? (heroSlug ? slugToDisplayName(heroSlug) : "Hero");

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        "rounded-[var(--radius-md)]",
        "bg-[var(--color-bg-elevated)]",
        "border border-[var(--color-border-subtle)]",
        SIZE_CLASSES[size],
        className
      )}
      aria-label={displayName}
      role="img"
    >
      {/* Video — só renderiza quando entra no viewport (lazy) e CDN não falhou */}
      {inView && !videoFailed && (
        <video
          autoPlay
          loop={loop}
          muted
          playsInline
          poster={poster}
          className="size-full object-cover"
          onError={() => setVideoFailed(true)}
        >
          <source src={urls.webm} type="video/webm" />
          {urls.mp4 && <source src={urls.mp4} type="video/mp4" />}
        </video>
      )}

      {/* Fallback: placeholder enquanto fora do viewport (ainda não carregou) */}
      {!inView && !videoFailed && (
        <div
          className="size-full"
          style={{
            background:
              "linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-surface) 100%)",
          }}
        />
      )}

      {/* Fallback: gradient animado + nome do hero quando CDN falha */}
      {videoFailed && (
        <>
          <div
            className="size-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-surface) 50%, var(--color-brand-primary-deep) 100%)",
              backgroundSize: "200% 200%",
              animation: "fd-hero-gradient-shift var(--motion-duration-cinematic) ease-in-out infinite",
            }}
          />
          <span
            className="absolute inset-0 flex items-center justify-center px-2 text-center"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--color-text-muted)",
            }}
          >
            {displayName}
          </span>
        </>
      )}

      {/* Keyframe da animação de fallback injetada localmente — sem tocar globals.css */}
      <style>{`
        @keyframes fd-hero-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
