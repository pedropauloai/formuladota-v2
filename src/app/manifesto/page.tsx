// Página pública "Por que FormulaDota" — o problema do matchmaking oficial da
// Valve (anonimato, topo fechado/MMR inflado, ranking fragmentado por região) e
// a resposta da FormulaDota. Ancorada na prova social do Grubby (lenda dos
// esports expulsa pela toxicidade). Usada na conversão de visitante E como base
// das propostas a representantes. Acessível sem login (vitrine).
//
// Layout cinematográfico "New Frontiers" (igual /metodologia e /codigo-de-conduta).

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Swords, ShieldOff, Lock, Globe, Fingerprint, RotateCcw, Trophy } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { Button } from "@/components/ui/button";
import {
  FrontierHero,
  FrontierSection,
  FrontierStatement,
  ParallaxBackground,
  FRONTIER_ASSETS,
  DOTA_BACKGROUNDS,
} from "@/components/frontier";
import { signInWithDiscord } from "@/app/login/actions";

export async function generateMetadata() {
  const t = await getTranslations("manifesto");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

// Cada par: a falha da Valve (o que ela produz) × a resposta da FormulaDota.
// Só os ÍCONES e a chave (id) vivem aqui; o TEXTO vem do namespace "manifesto".
const COMPARISONS = [
  {
    id: "anonimato",
    problemIcon: ShieldOff,
    solutionIcon: Fingerprint,
  },
  {
    id: "topo",
    problemIcon: Lock,
    solutionIcon: RotateCcw,
  },
  {
    id: "regiao",
    problemIcon: Globe,
    solutionIcon: Trophy,
  },
] as const;

export default async function ManifestoPage() {
  const t = await getTranslations("manifesto");
  return (
    <ClientShell currentRoute="/manifesto" hideRightSidebar>
      <div className="relative w-full bg-bg-deep">
        <ParallaxBackground src={DOTA_BACKGROUNDS.featuredTeal} />

        <div className="relative z-10">
          {/* HERO */}
          <FrontierHero
            eyebrow={t("heroEyebrow")}
            title={t.rich("heroTitle", {
              red: (chunks) => (
                <span className="text-brand-primary">{chunks}</span>
              ),
            })}
            subtitle={t("heroSubtitle")}
            backgroundImage={FRONTIER_ASSETS.mapBanner}
          />

          {/* PROVA SOCIAL — Grubby: foto + citação + contexto + o vídeo */}
          <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <figure className="shrink-0 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Manuel_%22Grubby%22_Schenkhuizen.jpg/330px-Manuel_%22Grubby%22_Schenkhuizen.jpg"
                  alt="Manuel “Grubby” Schenkhuizen"
                  className="w-40 rounded-md border border-border-subtle object-cover md:w-48"
                  loading="lazy"
                />
                <figcaption className="mt-2 font-display text-[10px] uppercase tracking-wide text-text-faded">
                  {t("photoCredit")}
                </figcaption>
              </figure>

              <div className="space-y-4">
                <blockquote className="font-display text-2xl font-bold leading-tight text-text-display md:text-3xl">
                  <span className="text-brand-primary">
                    {t("grubbyQuote")}
                  </span>
                </blockquote>
                <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-text-muted">
                  Manuel “Grubby” Schenkhuizen
                </p>
                <p className="max-w-2xl font-body text-base leading-relaxed text-text-muted 2xl:text-lg">
                  {t.rich("grubbyBody", {
                    em: (chunks) => (
                      <strong className="text-text-body">{chunks}</strong>
                    ),
                  })}
                </p>
              </div>
            </div>

            {/* O vídeo que originou este manifesto */}
            <div className="mt-10 overflow-hidden rounded-md border border-border-subtle bg-black">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube-nocookie.com/embed/gXBwdg_Fgw8"
                  title="Grubby — I love DOTA2. But this may be the end. Here's why..."
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* O PROBLEMA → A RESPOSTA */}
          <FrontierSection
            id="comparativo"
            index="01"
            title={t("comparisonTitle")}
            intro={t("comparisonIntro")}
            width="wide"
          >
            <div className="space-y-5">
              {COMPARISONS.map((c) => (
                <ComparisonRow
                  key={c.id}
                  item={c}
                  naValve={t("naValve")}
                  naFormulaDota={t("naFormulaDota")}
                  problemTitle={t(`row.${c.id}.problemTitle`)}
                  problemLine={t(`row.${c.id}.problemLine`)}
                  problemBody={t(`row.${c.id}.problemBody`)}
                  solutionTitle={t(`row.${c.id}.solutionTitle`)}
                  solutionBody={t(`row.${c.id}.solutionBody`)}
                />
              ))}
            </div>
          </FrontierSection>

          {/* FECHAMENTO */}
          <FrontierStatement attribution={t("statementAttribution")}>
            {t.rich("statementBody", {
              red: (chunks) => (
                <span className="text-brand-primary">{chunks}</span>
              ),
            })}
          </FrontierStatement>

          {/* CTA */}
          <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <form action={signInWithDiscord}>
                <Button
                  type="submit"
                  variant="cinematic"
                  size="lg"
                  aria-label={t("ctaDiscord")}
                >
                  <Swords size={22} aria-hidden="true" />
                  {t("ctaDiscord")}
                </Button>
              </form>
              <Link
                href="/codigo-de-conduta"
                className="font-display text-sm font-semibold text-brand-primary transition-colors hover:text-text-display"
              >
                {t("ctaDoctrine")}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ClientShell>
  );
}

// Linha comparativa: à esquerda a falha da Valve (tom de alerta), à direita a
// resposta da FormulaDota (tom da marca). No mobile empilha (falha em cima).
function ComparisonRow({
  item,
  naValve,
  naFormulaDota,
  problemTitle,
  problemLine,
  problemBody,
  solutionTitle,
  solutionBody,
}: {
  item: (typeof COMPARISONS)[number];
  naValve: string;
  naFormulaDota: string;
  problemTitle: string;
  problemLine: string;
  problemBody: string;
  solutionTitle: string;
  solutionBody: string;
}) {
  const ProblemIcon = item.problemIcon;
  const SolutionIcon = item.solutionIcon;
  return (
    <div className="grid items-stretch gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle md:grid-cols-2">
      {/* Falha da Valve */}
      <div className="flex flex-col gap-2 bg-bg-base/90 p-5">
        <div className="flex items-center gap-2 text-error">
          <ProblemIcon size={16} aria-hidden="true" />
          <span className="font-display text-sm font-semibold uppercase tracking-wide">
            {naValve}
          </span>
        </div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-text-display">
          {problemTitle}
        </p>
        <p className="font-display text-base font-semibold italic text-text-faded 2xl:text-lg">
          {problemLine}
        </p>
        <p className="font-body text-base leading-relaxed text-text-muted 2xl:text-lg">
          {problemBody}
        </p>
      </div>

      {/* Resposta da FormulaDota */}
      <div className="flex flex-col gap-2 bg-bg-elevated/60 p-5">
        <div className="flex items-center gap-2 text-brand-primary">
          <SolutionIcon size={16} aria-hidden="true" />
          <span className="font-display text-sm font-semibold uppercase tracking-wide">
            {naFormulaDota}
          </span>
        </div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-text-display">
          {solutionTitle}
        </p>
        <p className="font-body text-base leading-relaxed text-text-body 2xl:text-lg">
          {solutionBody}
        </p>
      </div>
    </div>
  );
}
