// HeroVideoBackdrop — herói VIVO como atmosfera de fundo (vídeo oficial Valve).
//
// Camada absoluta pra colocar ATRÁS de headers/painéis de identidade:
//   1. HeroVideo (webm oficial Steam CDN) em opacidade baixa (~15-25%) —
//      é ATMOSFERA, nunca pode atrapalhar a leitura do conteúdo por cima.
//   2. Gradiente fundindo o vídeo com o background da página hospedeira.
//
// Respeita prefers-reduced-motion: o vídeo some (motion-reduce:hidden) e fica
// só o gradiente — o HeroVideo não trata isso internamente.
//
// Contrato de uso: o container PAI precisa ser `relative overflow-hidden`;
// o conteúdo legível por cima precisa de `relative` (ou z-index maior).

import { HeroVideo } from "@/components/dota/hero-video";
import { cn } from "@/lib/utils";

/** Par mínimo pra renderizar um herói vivo — slug canônico Valve + nome display. */
export interface SignatureHero {
  /** Slug canônico Valve (ex: "antimage", "crystal_maiden"). */
  slug: string;
  /** Nome display (ex: "Anti-Mage") — usado no fallback se o CDN falhar. */
  name: string;
}

interface HeroVideoBackdropProps {
  heroSlug: string;
  heroName?: string;
  /** Opacidade do vídeo — atmosfera sutil. Default "opacity-20". */
  videoOpacityClass?: string;
  /** Gradiente por cima do vídeo — fundir com o bg da página hospedeira. */
  gradientClass?: string;
  className?: string;
}

export function HeroVideoBackdrop({
  heroSlug,
  heroName,
  videoOpacityClass = "opacity-20",
  gradientClass = "bg-gradient-to-r from-bg-deep/70 via-bg-deep/25 to-bg-deep/70",
  className,
}: HeroVideoBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {/* Vídeo — escondido em prefers-reduced-motion (sobra só o gradiente) */}
      <div
        className={cn("absolute inset-0 motion-reduce:hidden", videoOpacityClass)}
      >
        <HeroVideo
          heroSlug={heroSlug}
          heroName={heroName}
          lazy={false}
          /* size-full + sem moldura: aqui o HeroVideo é backdrop, não card.
             twMerge resolve os conflitos com as classes internas do modo card. */
          className="size-full rounded-none border-0 bg-transparent"
        />
      </div>

      {/* Vinheta/gradiente — garante contraste do conteúdo por cima */}
      <div className={cn("absolute inset-0", gradientClass)} />
    </div>
  );
}
