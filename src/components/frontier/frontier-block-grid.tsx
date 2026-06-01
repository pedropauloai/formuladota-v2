/**
 * FrontierBlockGrid — bloco estilo "herói em destaque" do Dota 2 New Frontiers.
 *
 * Estrutura espelhada do site oficial (parte inferior, seção HERÓIS EM DESTAQUE):
 * grid de 2 colunas — render full-body do herói (arte oficial Valve) de um lado,
 * bloco de título + conteúdo do outro. Lado do render alterna (esquerda/direita)
 * a cada bloco pra criar ritmo visual em zigue-zague.
 *
 * Usa next/image com a arte OFICIAL do herói (heroRender do assets.ts).
 * Reveal no scroll: render entra de um lado (fade-left/right), texto do outro.
 */

import Image from "next/image";
import { RevealOnScroll } from "./reveal-on-scroll";
import { heroRender } from "./assets";

interface FrontierBlockGridProps {
  /** Slug oficial do herói (ex: "muerta", "clinkz"). Render vem do CDN Valve. */
  heroSlug: string;
  /** Nome exibido do herói/eyebrow acima do título. */
  eyebrow?: string;
  /** Título do bloco. */
  title: React.ReactNode;
  /** Conteúdo (parágrafos, listas). */
  children: React.ReactNode;
  /** Lado do render. @default "left" */
  renderSide?: "left" | "right";
}

export function FrontierBlockGrid({
  heroSlug,
  eyebrow,
  title,
  children,
  renderSide = "left",
}: FrontierBlockGridProps) {
  const renderFirst = renderSide === "left";

  const renderCol = (
    <RevealOnScroll
      direction={renderFirst ? "right" : "left"}
      className="relative flex items-center justify-center"
    >
      {/* Glow atrás do render pra destacar do fundo */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-brand-primary-glow)_0%,transparent_65%)]"
        aria-hidden="true"
      />
      <Image
        src={heroRender(heroSlug)}
        alt=""
        width={345}
        height={460}
        className="relative h-auto w-full max-w-[340px] object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        // Render oficial Valve — não otimizar via Next (CDN externo já serve bem).
        unoptimized
      />
    </RevealOnScroll>
  );

  const textCol = (
    <RevealOnScroll
      direction={renderFirst ? "left" : "right"}
      className="flex flex-col justify-center"
    >
      {eyebrow && (
        <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          {eyebrow}
        </p>
      )}
      <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display md:text-3xl">
        {title}
      </h3>
      <div className="mt-5 space-y-4 font-body text-base leading-relaxed text-text-body">
        {children}
      </div>
    </RevealOnScroll>
  );

  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      {renderFirst ? (
        <>
          {renderCol}
          {textCol}
        </>
      ) : (
        <>
          {textCol}
          {renderCol}
        </>
      )}
    </div>
  );
}
