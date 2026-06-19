import Link from "next/link";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
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
export const metadata = {
  title: "Código de Conduta — FORMULADOTA",
  description:
    "A Fórmula do Dota de Corrida — princípios, anti-padrões e sistema progressivo de moderação.",
};

export default async function CodigoDeCondutaPage() {
  const comportamentais = PRINCIPLES.filter((p) => p.category === "comportamental");
  const tecnicos = PRINCIPLES.filter((p) => p.category === "tecnico");
  const progressao = PRINCIPLES.filter((p) => p.category === "progressao");

  return (
    <ClientShell currentRoute="/codigo-de-conduta" hideRightSidebar>
      <a
        href="#principios"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        Pular para o conteúdo
      </a>

      <div className="relative w-full bg-bg-deep">
        {/* UM ÚNICO background teal oficial Dota 2 com PARALLAX (acompanha a
            rolagem). Imagem naturalmente escura — texto branco legível sem
            overlay. Seções/statements NÃO repetem o background (evita duplicação). */}
        <ParallaxBackground src={DOTA_BACKGROUNDS.featuredTeal} />

        <div className="relative z-10">
          {/* HERO */}
          <FrontierHero
            eyebrow="Código de Conduta · v1"
            title={
              <>
                A Fórmula do{" "}
                <span className="text-brand-primary">Dota</span> de Corrida
              </>
            }
            subtitle={CANONICAL_QUOTES.opening}
            backgroundImage={FRONTIER_ASSETS.mapBanner}
          />

          {/* STATEMENT — a primeira regra */}
          <FrontierStatement
            attribution="A responsabilidade é sempre sua, 100% das vezes"
          >
            <span className="text-brand-primary">{CANONICAL_QUOTES.firstRule}</span>
          </FrontierStatement>

          {/* MISSÃO */}
          <FrontierSection
            index="·"
            title="A Missão"
            intro={`“${CANONICAL_QUOTES.mission}”`}
            width="prose"
          />

          {/* 14 PRINCÍPIOS */}
          <FrontierSection
            id="principios"
            index="01"
            title="Os 14 Princípios"
            intro="A Fórmula do Dota de Corrida — os princípios que regem a cultura. Mentais, técnicos e de progressão."
            width="wide"
          >
            <div className="space-y-12">
              <PrincipleGroup title="Mentais e comportamentais">
                {comportamentais.map((p) => (
                  <PrincipleCard key={p.id} principle={p} highlight={p.id === 1} />
                ))}
              </PrincipleGroup>
              <PrincipleGroup title="Técnicos e de execução">
                {tecnicos.map((p) => (
                  <PrincipleCard key={p.id} principle={p} />
                ))}
              </PrincipleGroup>
              <PrincipleGroup title="Progressão">
                {progressao.map((p) => (
                  <PrincipleCard key={p.id} principle={p} />
                ))}
              </PrincipleGroup>
            </div>
          </FrontierSection>

          {/* 15 ANTI-PADRÕES */}
          <FrontierSection
            id="antipadroes"
            index="02"
            title="Os 15 Padrões Tóxicos"
            intro="Comportamentos incompatíveis com a cultura da FORMULADOTA. Geram advertência, suspensão ou banimento conforme as regras abaixo."
            width="wide"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {ANTIPATTERNS.map((a) => (
                <AntipatternCard key={a.id} antipattern={a} />
              ))}
            </div>
          </FrontierSection>

          {/* SISTEMA DE MODERAÇÃO */}
          <FrontierSection
            id="moderacao"
            index="03"
            title="Sistema Progressivo de Moderação"
            intro="Toda violação registrada cita o princípio ou anti-padrão violado. Não é punição arbitrária — é aplicação da regra que você aceitou ao entrar."
            width="prose"
          >
            <div className="mx-auto max-w-2xl space-y-4">
              <ModerationStep
                step={1}
                label={PROGRESSIVE_MODERATION.step1.label}
                description={PROGRESSIVE_MODERATION.step1.description}
              />
              <ModerationStep
                step={2}
                label={PROGRESSIVE_MODERATION.step2.label}
                description={PROGRESSIVE_MODERATION.step2.description}
              />
              <ModerationStep
                step={3}
                label={PROGRESSIVE_MODERATION.step3.label}
                description={PROGRESSIVE_MODERATION.step3.description}
              />
              <p className="rounded-md border border-border-subtle bg-bg-base/60 px-4 py-3 font-display text-base font-semibold text-text-body 2xl:text-lg">
                <strong className="text-text-display">Reset automático:</strong>{" "}
                {PROGRESSIVE_MODERATION.reset}
              </p>
              <p className="font-body text-base leading-relaxed text-text-muted 2xl:text-lg">
                <strong className="text-text-display">
                  Direito ao contraditório:
                </strong>{" "}
                você pode contestar qualquer decisão via Discord oficial. A equipe
                FORMULADOTA revisa caso a caso e reverte manualmente se entender que
                houve erro.
              </p>
            </div>
          </FrontierSection>

          {/* COMPROMISSO FINAL */}
          <FrontierSection index="04" title="Compromisso Final" width="prose">
            <div className="mx-auto max-w-2xl space-y-6">
              <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-lg italic leading-relaxed text-text-body 2xl:text-xl">
                {CANONICAL_QUOTES.responsibility}
              </blockquote>
              <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-lg italic leading-relaxed text-text-body 2xl:text-xl">
                {CANONICAL_QUOTES.competitiveMindset}
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
                ler a metodologia →
              </Link>
              <Link
                href="/"
                className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted transition hover:text-text-display"
              >
                ← voltar à home
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
  principle,
  highlight,
}: {
  principle: { id: number; title: string; body: string };
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
          {String(principle.id).padStart(2, "0")}
        </span>
        <h4
          className={[
            "font-display text-base uppercase tracking-wide text-text-display",
            highlight ? "text-glow-red" : "",
          ].join(" ")}
        >
          {principle.title}
        </h4>
      </div>
      <p className="font-body text-base leading-relaxed text-text-body 2xl:text-lg">
        {principle.body}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AntipatternCard — card de anti-padrão (X error + exemplos + severidade)
// ---------------------------------------------------------------------------
function AntipatternCard({
  antipattern,
}: {
  antipattern: (typeof ANTIPATTERNS)[number];
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-sm text-error">
          ✕ {String(antipattern.id).padStart(2, "0")}
        </span>
        <h4 className="font-display text-base uppercase tracking-wide text-text-display">
          {antipattern.title}
        </h4>
      </div>
      <ul className="space-y-1 font-body text-base leading-relaxed text-text-body 2xl:text-lg">
        {antipattern.examples.map((ex, i) => (
          <li key={i}>• {ex}</li>
        ))}
      </ul>
      {antipattern.directSeverityNote && (
        <p className="mt-3 rounded-md border border-error/40 bg-error/10 px-3 py-2 font-mono text-sm font-medium text-error">
          ⚠ {antipattern.directSeverityNote}
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
