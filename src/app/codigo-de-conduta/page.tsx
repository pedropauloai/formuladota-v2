import Link from "next/link";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { ClientShell } from "@/components/client-shell/shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Página pública canônica do código de conduta.
// Acessível sem login — referência permanente da cultura.
// Refatorada para Design System V2.5: tokens semânticos + Card primitive
// + hierarquia tipográfica font-display/font-body. Texto integralmente preservado.
export const metadata = {
  title: "Código de Conduta — FORMULADOTA",
  description:
    "A Fórmula do Dota de Corrida — princípios, anti-padrões e sistema progressivo de moderação.",
};

const TOC_SECTIONS = [
  { id: "principios", label: "Os 14 princípios" },
  { id: "antipadroes", label: "15 padrões tóxicos" },
  { id: "moderacao", label: "Sistema progressivo" },
  { id: "compromisso", label: "Compromisso final" },
];

export default async function CodigoDeCondutaPage() {
  const comportamentais = PRINCIPLES.filter((p) => p.category === "comportamental");
  const tecnicos = PRINCIPLES.filter((p) => p.category === "tecnico");
  const progressao = PRINCIPLES.filter((p) => p.category === "progressao");

  return (
    <ClientShell currentRoute="/codigo-de-conduta">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        Pular para o conteúdo
      </a>

      <div id="conteudo" className="relative px-6 py-16">
        <DotaBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl space-y-16">
          {/* Hero — eyebrow + título + subtítulo (tipografia V2.5) */}
          <header className="space-y-4 text-center">
            <p className="font-display text-sm uppercase tracking-[0.4em] text-brand-primary">
              Código de Conduta · v1
            </p>
            <h1 className="font-display text-4xl tracking-wide text-text-display md:text-5xl">
              A Fórmula do{" "}
              <span className="text-brand-primary text-glow-red">Dota</span> de Corrida
            </h1>
            <p className="mx-auto max-w-2xl font-body text-base text-text-muted leading-relaxed">
              {CANONICAL_QUOTES.opening}
            </p>
          </header>

          {/* Card destaque — primeira regra (highlight brand) */}
          <Card variant="elevated" className="border-border-brand text-center">
            <p className="font-display text-2xl tracking-wide text-brand-primary text-glow-red">
              {CANONICAL_QUOTES.firstRule}
            </p>
            <p className="mt-3 font-display text-sm font-semibold text-text-body">
              A primeira regra. A responsabilidade é sempre sua, 100% das vezes.
            </p>
          </Card>

          {/* Card missão — citação canônica */}
          <Card variant="flat" className="border-border-brand/40 text-center">
            <p className="font-display text-sm uppercase tracking-[0.4em] text-brand-primary">
              Missão
            </p>
            <p className="mt-2 font-body text-base italic text-text-body">
              “{CANONICAL_QUOTES.mission}”
            </p>
          </Card>

          {/* Sumário (TOC) */}
          <nav
            aria-label="Sumário do código de conduta"
            className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-5"
          >
            <p className="mb-3 font-display text-sm uppercase tracking-[0.4em] text-brand-primary">
              Sumário
            </p>
            <ol className="space-y-2 font-body text-sm">
              {TOC_SECTIONS.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className="font-mono text-brand-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${s.id}`}
                    className="text-text-body transition hover:text-brand-primary"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <Section id="principios" title="Os 14 princípios da Fórmula do Dota de Corrida">
            <Subsection title="Mentais e comportamentais">
              {comportamentais.map((p) => (
                <PrincipleCard key={p.id} principle={p} highlight={p.id === 1} />
              ))}
            </Subsection>
            <Subsection title="Técnicos e de execução">
              {tecnicos.map((p) => (
                <PrincipleCard key={p.id} principle={p} />
              ))}
            </Subsection>
            <Subsection title="Progressão">
              {progressao.map((p) => (
                <PrincipleCard key={p.id} principle={p} />
              ))}
            </Subsection>
          </Section>

          <Section id="antipadroes" title="Os 15 padrões tóxicos (proibidos)">
            <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
              Esses comportamentos são incompatíveis com a cultura da FORMULADOTA.
              Geram advertência, suspensão ou banimento conforme as regras abaixo.
            </p>
            <div className="space-y-4">
              {ANTIPATTERNS.map((a) => (
                <AntipatternCard key={a.id} antipattern={a} />
              ))}
            </div>
          </Section>

          <Section id="moderacao" title="Sistema progressivo de moderação">
            <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
              Toda violação registrada cita o princípio ou anti-padrão violado.
              Não é punição arbitrária — é aplicação da regra que você aceitou ao entrar.
            </p>
            <ol className="space-y-4">
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
            </ol>
            <p className="rounded-md border border-border-subtle bg-bg-base px-4 py-3 font-display text-sm font-semibold text-text-body">
              <strong className="text-text-display">Reset automático:</strong>{" "}
              {PROGRESSIVE_MODERATION.reset}
            </p>
            <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
              <strong className="text-text-display">Direito ao contraditório:</strong>{" "}
              você pode contestar qualquer decisão via Discord oficial. A equipe FORMULADOTA
              revisa caso a caso e reverte manualmente se entender que houve erro.
            </p>
          </Section>

          <Section id="compromisso" title="Compromisso final">
            <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-base italic text-text-body leading-relaxed">
              {CANONICAL_QUOTES.responsibility}
            </blockquote>
            <blockquote className="border-l-2 border-brand-primary pl-6 font-body text-base italic text-text-body leading-relaxed">
              {CANONICAL_QUOTES.competitiveMindset}
            </blockquote>
          </Section>

          <footer className="border-t border-border-subtle pt-8 text-center">
            <Link
              href="/"
              className="font-mono text-sm uppercase tracking-widest text-brand-primary transition hover:text-glow-red"
            >
              ← voltar à home
            </Link>
          </footer>
        </div>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Section — heading h2 (font-display tracking-wide) + área de conteúdo
// ---------------------------------------------------------------------------
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-6 scroll-mt-8">
      <h2 className="font-display text-2xl tracking-wide text-text-display">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Subsection — h3 uppercase tracking-wider (sub-cabeçalho de categoria)
// ---------------------------------------------------------------------------
function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg uppercase tracking-wider text-text-display">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrincipleCard — Card primitive + numeração mono + título display + body
// highlight = primeiro princípio (border brand + glow)
// ---------------------------------------------------------------------------
function PrincipleCard({
  principle,
  highlight,
}: {
  principle: { id: number; title: string; body: string };
  highlight?: boolean;
}) {
  return (
    <Card
      variant="flat"
      className={highlight ? "border-border-brand" : undefined}
    >
      <CardHeader className="mb-2">
        <div className="flex items-baseline gap-3">
          <span
            className={[
              "font-mono text-sm",
              highlight ? "text-brand-primary text-glow-red" : "text-brand-primary",
            ].join(" ")}
          >
            {String(principle.id).padStart(2, "0")}
          </span>
          <CardTitle
            className={highlight ? "text-glow-red" : undefined}
          >
            {principle.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
          {principle.body}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AntipatternCard — Card + numeração com X (error) + exemplos em <ul>
// + nota de severidade opcional (banner error sutil)
// ---------------------------------------------------------------------------
function AntipatternCard({
  antipattern,
}: {
  antipattern: (typeof ANTIPATTERNS)[number];
}) {
  return (
    <Card variant="flat">
      <CardHeader className="mb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm text-error">
            ✕ {String(antipattern.id).padStart(2, "0")}
          </span>
          <CardTitle>{antipattern.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 font-display text-sm font-semibold text-text-body">
          {antipattern.examples.map((ex, i) => (
            <li key={i} className="leading-relaxed">
              • {ex}
            </li>
          ))}
        </ul>
        {antipattern.directSeverityNote && (
          <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 font-mono text-sm font-medium text-error">
            ⚠ {antipattern.directSeverityNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ModerationStep — passo numerado da escala progressiva (Card + círculo brand)
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
    <li className="flex gap-4 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-primary font-mono text-sm font-bold text-brand-primary">
        {step}
      </div>
      <div className="space-y-1">
        <h4 className="font-display text-base tracking-wide text-text-display">
          {label}
        </h4>
        <p className="font-display text-sm font-semibold text-text-body leading-relaxed">
          {description}
        </p>
      </div>
    </li>
  );
}
