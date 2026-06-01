/**
 * FrontierStatement — bloco de FRASE DE DESTAQUE full-width.
 *
 * Inspirado no tom editorial do New Frontiers (texto narrativo grande e
 * direto, centralizado, full-bleed sobre fundo atmosférico). É o lugar do
 * "hero statement" — a frase-manifesto que para o scroll.
 *
 * Uso pretendido: a frase adaptada dos "8 bilhões / 99,99% terríveis em Dota 2"
 * que abre a seção de método.
 */

import { RevealOnScroll } from "./reveal-on-scroll";

interface FrontierStatementProps {
  /** A frase de destaque (grande). Pode conter <span> pra realçar trechos. */
  children: React.ReactNode;
  /** Atribuição/legenda opcional abaixo (ex: autor, fonte). */
  attribution?: React.ReactNode;
  /** URL de imagem de fundo atmosférica. */
  backgroundImage?: string;
}

export function FrontierStatement({
  children,
  attribution,
  backgroundImage,
}: FrontierStatementProps) {
  return (
    <section className="relative w-full overflow-hidden py-24 md:py-36">
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-bg-deep via-bg-deep/60 to-bg-deep"
            aria-hidden="true"
          />
        </>
      )}
      {/* Régua superior brand — marca o início do statement */}
      <div
        className="absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-brand-primary"
        aria-hidden="true"
      />

      <RevealOnScroll
        direction="up"
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
      >
        <blockquote className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-text-display md:text-5xl">
          {children}
        </blockquote>
        {attribution && (
          <p className="mt-8 font-display text-sm uppercase tracking-[0.3em] text-text-muted">
            {attribution}
          </p>
        )}
      </RevealOnScroll>
    </section>
  );
}
