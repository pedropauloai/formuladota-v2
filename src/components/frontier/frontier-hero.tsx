/**
 * FrontierHero — hero full-bleed estilo Dota 2 "New Frontiers".
 *
 * Estrutura espelhada do site oficial:
 *   - Imagem de fundo dominante (banner key-art), cover, ocupando a largura toda
 *   - Gradiente escuro de baixo pra cima pra legibilidade do texto
 *   - Eyebrow (label pequeno uppercase) + título display gigante UPPERCASE
 *     centralizado + subtítulo opcional
 *
 * No New Frontiers o título é Reaver 72px uppercase coral. Aqui usamos a
 * fonte display do projeto (Ubuntu) com a cor brand (vermelho FormulaDota),
 * mantendo a MESMA hierarquia/escala/centralização — design, não conteúdo.
 */

import { RevealOnScroll } from "./reveal-on-scroll";

interface FrontierHeroProps {
  /** Label pequeno acima do título (ex: "Metodologia · v1"). */
  eyebrow?: string;
  /** Título principal — renderizado grande e uppercase. */
  title: React.ReactNode;
  /** Subtítulo/descrição abaixo do título. */
  subtitle?: React.ReactNode;
  /** URL da imagem de fundo (key-art). Use FRONTIER_ASSETS. */
  backgroundImage: string;
  /** Altura do hero. @default "tall" */
  height?: "tall" | "medium";
}

export function FrontierHero({
  eyebrow,
  title,
  subtitle,
  backgroundImage,
  height = "tall",
}: FrontierHeroProps) {
  const heightClass = height === "tall" ? "min-h-[70vh]" : "min-h-[48vh]";

  return (
    <section
      className={`relative flex ${heightClass} w-full items-end justify-center overflow-hidden`}
    >
      {/* Imagem de fundo dominante (cover, centralizada) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
        aria-hidden="true"
      />
      {/* Gradiente de legibilidade — escurece a base onde o texto vive */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/55 to-bg-deep/20"
        aria-hidden="true"
      />
      {/* Vinheta lateral sutil pra focar no centro */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--color-bg-deep)_100%)] opacity-70"
        aria-hidden="true"
      />

      <RevealOnScroll
        direction="up"
        className="relative z-10 mx-auto max-w-4xl px-6 pb-16 text-center md:pb-24"
      >
        {eyebrow && (
          <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.4em] text-brand-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide text-text-display text-glow-red md:text-7xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl font-body text-base italic leading-relaxed text-text-muted md:text-lg">
            {subtitle}
          </p>
        )}
      </RevealOnScroll>
    </section>
  );
}
