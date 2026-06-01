/**
 * FrontierSection — seção full-width empilhada estilo Dota 2 "New Frontiers".
 *
 * Padrão do site oficial: seções verticais full-width, cada uma com título
 * display UPPERCASE centralizado (coral/brand) + parágrafo introdutório
 * centralizado, depois o conteúdo (tabela, mídia, cards). Sem coluna estreita —
 * o conteúdo respira na largura, com max-width generoso pra leitura.
 *
 * Variante de fundo opcional (imagem atmosférica do CDN Dota com overlay, ou
 * cor sólida da marca). Reveal no scroll via RevealOnScroll.
 */

import { RevealOnScroll } from "./reveal-on-scroll";

type FrontierSectionBg = "none" | "image" | "elevated";

interface FrontierSectionProps {
  id?: string;
  /** Numeração opcional (ex: "01") exibida antes do título. */
  index?: string;
  title: React.ReactNode;
  /** Parágrafo introdutório centralizado abaixo do título. */
  intro?: React.ReactNode;
  /** Fundo da seção. "image" usa backgroundImage; "elevated" usa bg sutil. */
  background?: FrontierSectionBg;
  /** URL de imagem quando background="image". */
  backgroundImage?: string;
  /** Largura máxima do conteúdo. @default "wide" */
  width?: "wide" | "prose";
  children?: React.ReactNode;
}

export function FrontierSection({
  id,
  index,
  title,
  intro,
  background = "none",
  backgroundImage,
  width = "wide",
  children,
}: FrontierSectionProps) {
  const maxW = width === "prose" ? "max-w-3xl" : "max-w-5xl";

  return (
    <section
      id={id}
      className="relative w-full scroll-mt-20 overflow-hidden py-20 md:py-28"
    >
      {/* Fundo opcional */}
      {background === "image" && backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-bg-deep/60 via-bg-deep/40 to-bg-deep/75"
            aria-hidden="true"
          />
        </>
      )}
      {background === "elevated" && (
        <div
          className="absolute inset-0 bg-bg-elevated/30"
          aria-hidden="true"
        />
      )}

      <div className={`relative z-10 mx-auto ${maxW} px-6`}>
        <RevealOnScroll direction="up" className="text-center">
          {index && (
            <p className="mb-3 font-mono text-sm tracking-widest text-brand-primary/80">
              {index}
            </p>
          )}
          <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-text-display md:text-5xl">
            {title}
          </h2>
          {intro && (
            <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-text-muted md:text-lg">
              {intro}
            </p>
          )}
        </RevealOnScroll>

        {children && (
          <RevealOnScroll direction="up" delay={0.1} className="mt-12">
            {children}
          </RevealOnScroll>
        )}
      </div>
    </section>
  );
}
