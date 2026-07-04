import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { languageAlternates } from "@/lib/seo";
import { ANTIPATTERNS, PRINCIPLES } from "@/lib/doctrine";
import { ClientShell } from "@/components/client-shell/shell";
import {
  FrontierHero,
  FrontierSection,
  FrontierStatement,
  RevealOnScroll,
  ParallaxBackground,
  FRONTIER_ASSETS,
  DOTA_BACKGROUNDS,
} from "@/components/frontier";

// Página pública canônica do código de conduta.
// Acessível sem login — referência permanente da cultura.
//
// Redesign 2026-06-01: layout cinematográfico estilo Dota 2 "New Frontiers"
// (igual /metodologia) — hero key-art, seções full-width, statements, reveal no
// scroll, background oficial Dota 2. Texto integralmente preservado.
export async function generateMetadata() {
  const t = await getTranslations("conduta");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: languageAlternates("/codigo-de-conduta"),
  };
}

export default async function CodigoDeCondutaPage() {
  const t = await getTranslations("conduta");
  const td = await getTranslations("doctrine");
  const comportamentais = PRINCIPLES.filter((p) => p.category === "comportamental");
  const tecnicos = PRINCIPLES.filter((p) => p.category === "tecnico");
  const progressao = PRINCIPLES.filter((p) => p.category === "progressao");

  return (
    <ClientShell currentRoute="/codigo-de-conduta" hideRightSidebar>
      <a
        href="#principios"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        {t("skipToContent")}
      </a>

      <div className="relative w-full bg-bg-deep">
        {/* UM ÚNICO background teal oficial Dota 2 com PARALLAX (acompanha a
            rolagem). Imagem naturalmente escura — texto branco legível sem
            overlay. Seções/statements NÃO repetem o background (evita duplicação). */}
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
            subtitle={td("quote.opening")}
            backgroundImage={FRONTIER_ASSETS.mapBanner}
          />

          {/* STATEMENT — a primeira regra */}
          <FrontierStatement attribution={t("firstRuleAttribution")}>
            <span className="text-brand-primary">{td("quote.firstRule")}</span>
          </FrontierStatement>

          {/* MISSÃO */}
          <FrontierSection
            index="·"
            title={t("missionTitle")}
            intro={`“${td("quote.mission")}”`}
            width="prose"
          />

          {/* 14 PRINCÍPIOS */}
          <FrontierSection
            id="principios"
            index="01"
            title={t("principlesTitle")}
            intro={t("principlesIntro")}
            width="wide"
          >
            <div className="space-y-12">
              <PrincipleGroup title={t("groupBehavioral")}>
                {comportamentais.map((p) => (
                  <PrincipleCard
                    key={p.id}
                    id={p.id}
                    title={td(`principle.${p.id}.title`)}
                    body={td(`principle.${p.id}.body`)}
                    highlight={p.id === 1}
                  />
                ))}
              </PrincipleGroup>
              <PrincipleGroup title={t("groupTechnical")}>
                {tecnicos.map((p) => (
                  <PrincipleCard
                    key={p.id}
                    id={p.id}
                    title={td(`principle.${p.id}.title`)}
                    body={td(`principle.${p.id}.body`)}
                  />
                ))}
              </PrincipleGroup>
              <PrincipleGroup title={t("groupProgression")}>
                {progressao.map((p) => (
                  <PrincipleCard
                    key={p.id}
                    id={p.id}
                    title={td(`principle.${p.id}.title`)}
                    body={td(`principle.${p.id}.body`)}
                  />
                ))}
              </PrincipleGroup>
            </div>
          </FrontierSection>

          {/* 15 ANTI-PADRÕES */}
          <FrontierSection
            id="antipadroes"
            index="02"
            title={t("antipatternsTitle")}
            intro={t("antipatternsIntro")}
            width="wide"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {ANTIPATTERNS.map((a) => (
                <AntipatternCard
                  key={a.id}
                  id={a.id}
                  title={td(`antipattern.${a.id}.title`)}
                  examples={a.examples.map((_, i) =>
                    td(`antipattern.${a.id}.ex${i}`),
                  )}
                  directSeverityNote={
                    a.directSeverityNote
                      ? td(`antipattern.${a.id}.directSeverityNote`)
                      : undefined
                  }
                />
              ))}
            </div>
          </FrontierSection>

          {/* SISTEMA DE MODERAÇÃO */}
          <FrontierSection
            id="moderacao"
            index="03"
            title={t("moderationTitle")}
            intro={t("moderationIntro")}
            width="prose"
          >
            <div className="mx-auto max-w-2xl space-y-4">
              <ModerationStep
                step={1}
                label={td("moderation.step1.label")}
                description={td("moderation.step1.description")}
              />
              <ModerationStep
                step={2}
                label={td("moderation.step2.label")}
                description={td("moderation.step2.description")}
              />
              <ModerationStep
                step={3}
                label={td("moderation.step3.label")}
                description={td("moderation.step3.description")}
              />
              <p className="rounded-md border border-border-subtle bg-bg-base/60 px-4 py-3 font-display text-base font-semibold text-text-body 2xl:text-lg">
                <strong className="text-text-display">
                  {t("resetLabel")}
                </strong>{" "}
                {td("moderation.reset")}
              </p>
              <p className="font-body text-base leading-relaxed text-text-muted 2xl:text-lg">
                <strong className="text-text-display">
                  {t("appealLabel")}
                </strong>{" "}
                {t("appealBody")}
              </p>
            </div>
          </FrontierSection>

          {/* COMPROMISSO FINAL */}
          <FrontierSection index="04" title={t("commitmentTitle")} width="prose">
            <div className="mx-auto max-w-2xl space-y-6">
              <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-lg italic leading-relaxed text-text-body 2xl:text-xl">
                {td("quote.responsibility")}
              </blockquote>
              <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-lg italic leading-relaxed text-text-body 2xl:text-xl">
                {td("quote.competitiveMindset")}
              </blockquote>
            </div>
          </FrontierSection>

          {/* Footer CTA */}
          <footer className="border-t border-border-subtle py-16 text-center">
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/metodologia"
                className="font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition hover:text-glow-red"
              >
                {t("ctaReadMethodology")}
              </Link>
              <Link
                href="/"
                className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted transition hover:text-text-display"
              >
                {t("ctaBackHome")}
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// PrincipleGroup — subtítulo de categoria + grid de cards
// ---------------------------------------------------------------------------
function PrincipleGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <RevealOnScroll direction="up">
      <h3 className="mb-5 text-center font-display text-sm uppercase tracking-[0.3em] text-brand-primary">
        {title}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </RevealOnScroll>
  );
}

// ---------------------------------------------------------------------------
// PrincipleCard — card de princípio (numeração mono + título + body)
// ---------------------------------------------------------------------------
function PrincipleCard({
  id,
  title,
  body,
  highlight,
}: {
  id: number;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border bg-bg-elevated/40 p-5 backdrop-blur-sm transition-colors",
        highlight
          ? "border-brand-primary shadow-[var(--glow-brand)]"
          : "border-border-subtle hover:border-border-brand",
      ].join(" ")}
    >
      <div className="mb-2 flex items-baseline gap-3">
        <span
          className={[
            "font-mono text-sm",
            highlight ? "text-brand-primary text-glow-red" : "text-brand-primary",
          ].join(" ")}
        >
          {String(id).padStart(2, "0")}
        </span>
        <h4
          className={[
            "font-display text-base uppercase tracking-wide text-text-display",
            highlight ? "text-glow-red" : "",
          ].join(" ")}
        >
          {title}
        </h4>
      </div>
      <p className="font-body text-base leading-relaxed text-text-body 2xl:text-lg">
        {body}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AntipatternCard — card de anti-padrão (X error + exemplos + severidade)
// ---------------------------------------------------------------------------
function AntipatternCard({
  id,
  title,
  examples,
  directSeverityNote,
}: {
  id: number;
  title: string;
  examples: string[];
  directSeverityNote?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-sm text-error">
          ✕ {String(id).padStart(2, "0")}
        </span>
        <h4 className="font-display text-base uppercase tracking-wide text-text-display">
          {title}
        </h4>
      </div>
      <ul className="space-y-1 font-body text-base leading-relaxed text-text-body 2xl:text-lg">
        {examples.map((ex, i) => (
          <li key={i}>• {ex}</li>
        ))}
      </ul>
      {directSeverityNote && (
        <p className="mt-3 rounded-md border border-error/40 bg-error/10 px-3 py-2 font-mono text-sm font-medium text-error">
          ⚠ {directSeverityNote}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ModerationStep — passo numerado da escala progressiva
// ---------------------------------------------------------------------------
function ModerationStep({
  step,
  label,
  description,
}: {
  step: number;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-5 backdrop-blur-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-primary font-mono text-sm font-bold text-brand-primary">
        {step}
      </div>
      <div className="space-y-1">
        <h4 className="font-display text-base uppercase tracking-wide text-text-display">
          {label}
        </h4>
        <p className="font-body text-base leading-relaxed text-text-body 2xl:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}
