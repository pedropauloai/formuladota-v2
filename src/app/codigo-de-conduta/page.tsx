import Link from "next/link";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { ClientShell } from "@/components/client-shell/shell";

// Página pública canônica do código de conduta.
// Acessível sem login — referência permanente da cultura.
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--color-brand-red)] focus:px-4 focus:py-2 focus:font-medium focus:text-[var(--color-background)]"
      >
        Pular para o conteúdo
      </a>

      <div id="conteudo" className="relative px-6 py-16">
        <DotaBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl space-y-16">
          <header className="space-y-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)]">
              código de conduta · v1
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              A Fórmula do <span className="text-[var(--color-brand-red)] text-glow-red">Dota</span> de Corrida
            </h1>
            <p className="mx-auto max-w-2xl text-base text-[var(--color-muted-foreground)]">
              {CANONICAL_QUOTES.opening}
            </p>
          </header>

          <aside className="rounded-lg border border-[var(--color-brand-red)] bg-[var(--color-card)] p-6 text-center">
            <p className="text-2xl font-bold tracking-wide text-[var(--color-brand-red)] text-glow-red">
              {CANONICAL_QUOTES.firstRule}
            </p>
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              A primeira regra. A responsabilidade é sempre sua, 100% das vezes.
            </p>
          </aside>

          <aside className="rounded-md border border-[var(--color-brand-red)]/40 bg-[var(--color-card)] p-5 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)]">
              missão
            </p>
            <p className="mt-2 text-base italic text-[var(--color-foreground)]">
              “{CANONICAL_QUOTES.mission}”
            </p>
          </aside>

          <nav
            aria-label="Sumário do código de conduta"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5"
          >
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)]">
              sumário
            </p>
            <ol className="space-y-2 text-sm">
              {TOC_SECTIONS.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className="font-mono text-[var(--color-brand-red)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${s.id}`}
                    className="text-[var(--color-foreground)] hover:text-[var(--color-brand-red)] transition"
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
            <p className="text-sm text-[var(--color-muted-foreground)]">
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
          <p className="text-sm text-[var(--color-muted-foreground)]">
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
          <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
            <strong className="text-[var(--color-foreground)]">Reset automático:</strong>{" "}
            {PROGRESSIVE_MODERATION.reset}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            <strong className="text-[var(--color-foreground)]">Direito ao contraditório:</strong>{" "}
            você pode contestar qualquer decisão via Discord oficial. A equipe FORMULADOTA
            revisa caso a caso e reverte manualmente se entender que houve erro.
          </p>
        </Section>

          <Section id="compromisso" title="Compromisso final">
            <blockquote className="border-l-2 border-[var(--color-brand-red)] pl-6 italic text-[var(--color-foreground)]">
              {CANONICAL_QUOTES.responsibility}
            </blockquote>
            <blockquote className="border-l-2 border-[var(--color-brand-red)] pl-6 italic text-[var(--color-foreground)]">
              {CANONICAL_QUOTES.competitiveMindset}
            </blockquote>
          </Section>

          <footer className="border-t border-[var(--color-border)] pt-8 text-center">
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)] hover:text-glow-red transition"
            >
              ← voltar à home
            </Link>
          </footer>
        </div>
      </div>
    </ClientShell>
  );
}

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
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)]">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PrincipleCard({
  principle,
  highlight,
}: {
  principle: { id: number; title: string; body: string };
  highlight?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-lg border p-5 space-y-2",
        highlight
          ? "border-[var(--color-brand-red)] bg-[var(--color-card)]"
          : "border-[var(--color-border)] bg-[var(--color-card)]",
      ].join(" ")}
    >
      <header className="flex items-baseline gap-3">
        <span
          className={[
            "font-mono text-xs",
            highlight ? "text-[var(--color-brand-red)] text-glow-red" : "text-[var(--color-brand-red)]",
          ].join(" ")}
        >
          {String(principle.id).padStart(2, "0")}
        </span>
        <h4 className={highlight ? "font-semibold text-glow-red" : "font-semibold"}>
          {principle.title}
        </h4>
      </header>
      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {principle.body}
      </p>
    </article>
  );
}

function AntipatternCard({
  antipattern,
}: {
  antipattern: (typeof ANTIPATTERNS)[number];
}) {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
      <header className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-[var(--color-danger)]">
          ✕ {String(antipattern.id).padStart(2, "0")}
        </span>
        <h4 className="font-semibold">{antipattern.title}</h4>
      </header>
      <ul className="space-y-1 text-sm text-[var(--color-muted-foreground)]">
        {antipattern.examples.map((ex, i) => (
          <li key={i} className="leading-relaxed">
            • {ex}
          </li>
        ))}
      </ul>
      {antipattern.directSeverityNote && (
        <p className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-xs font-medium text-[var(--color-danger)]">
          ⚠ {antipattern.directSeverityNote}
        </p>
      )}
    </article>
  );
}

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
    <li className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-red)] font-mono text-sm font-bold text-[var(--color-brand-red)]">
        {step}
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold">{label}</h4>
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
    </li>
  );
}
