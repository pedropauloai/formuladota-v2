"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
import { acceptDoctrine } from "./actions";

type Props = {
  username: string;
  version: number;
  principles: typeof PRINCIPLES;
  antipatterns: typeof ANTIPATTERNS;
  moderation: typeof PROGRESSIVE_MODERATION;
  quotes: typeof CANONICAL_QUOTES;
};

const TOTAL_SLIDES = 5;

export function OnboardingFlow({
  username,
  version,
  principles,
  antipatterns,
  moderation,
  quotes,
}: Props) {
  const [slide, setSlide] = useState(1);
  const [accepted, setAccepted] = useState(false);

  const next = () => setSlide((s) => Math.min(TOTAL_SLIDES, s + 1));
  const back = () => setSlide((s) => Math.max(1, s - 1));

  const comportamentais = principles.filter((p) => p.category === "comportamental");
  const tecnicos = principles.filter((p) => p.category === "tecnico");
  const progressao = principles.filter((p) => p.category === "progressao");

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <ProgressBar current={slide} total={TOTAL_SLIDES} />

      <div className="flex-1 py-12">
        {slide === 1 && (
          <SlideWelcome username={username} quotes={quotes} />
        )}
        {slide === 2 && (
          <SlideAntipatterns antipatterns={antipatterns} />
        )}
        {slide === 3 && (
          <SlidePrinciples
            comportamentais={comportamentais}
            tecnicos={tecnicos}
            progressao={progressao}
          />
        )}
        {slide === 4 && <SlideModeration moderation={moderation} />}
        {slide === 5 && (
          <SlideAccept
            version={version}
            accepted={accepted}
            onToggle={setAccepted}
            quotes={quotes}
          />
        )}
      </div>

      <nav className="flex items-center justify-between border-t border-[var(--color-border)] pt-6">
        <button
          type="button"
          onClick={back}
          disabled={slide === 1}
          className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-30 transition"
        >
          ← anterior
        </button>

        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
          {slide} / {TOTAL_SLIDES}
        </span>

        {slide < TOTAL_SLIDES ? (
          <button
            type="button"
            onClick={next}
            className="rounded-md border border-[var(--color-cyan)] px-5 py-2 font-medium text-[var(--color-cyan)] hover:bg-[var(--color-cyan)]/10 transition"
          >
            Continuar →
          </button>
        ) : (
          <AcceptButton acceptedVersion={version} disabled={!accepted} />
        )}
      </nav>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-cyan)]">
          A Fórmula do Dota de Corrida
        </span>
        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
          onboarding obrigatório
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className="h-full bg-[var(--color-cyan)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SlideWelcome({
  username,
  quotes,
}: {
  username: string;
  quotes: typeof CANONICAL_QUOTES;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          slide 1 — boas-vindas
        </p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          Bem-vindo, <span className="text-[var(--color-cyan)] text-glow-cyan">{username}</span>.
        </h1>
      </header>

      <p className="text-lg italic leading-relaxed text-[var(--color-foreground)]">
        “{quotes.opening}”
      </p>

      <div className="rounded-lg border border-[var(--color-cyan)] bg-[var(--color-card)] p-6 text-center">
        <p className="text-xl font-bold tracking-wide text-[var(--color-cyan)] text-glow-cyan">
          {quotes.firstRule}
        </p>
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          Esta é a primeira regra. A responsabilidade é sempre sua, 100% das
          vezes.
        </p>
      </div>

      <p className="text-base leading-relaxed text-[var(--color-muted-foreground)]">
        Nas próximas telas, você vai conhecer as regras que regem esta
        comunidade — os 14 princípios da Fórmula do Dota de Corrida, os 10
        padrões tóxicos proibidos, e o sistema progressivo de moderação que
        protege a cultura coletiva.
      </p>

      <p className="text-base font-medium text-[var(--color-foreground)]">
        Aceitar essas regras é <strong className="text-[var(--color-cyan)]">obrigatório</strong> pra usar a plataforma.
      </p>
    </article>
  );
}

function SlideAntipatterns({
  antipatterns,
}: {
  antipatterns: typeof ANTIPATTERNS;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          slide 2 — os 10 padrões tóxicos
        </p>
        <h1 className="text-3xl font-bold">
          O que <span className="text-[var(--color-danger)]">não</span> é tolerado
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Esses comportamentos são incompatíveis com a cultura da Fórmula
          Dota. Geram advertência, suspensão ou banimento.
        </p>
      </header>

      <ul className="space-y-3">
        {antipatterns.map((a) => (
          <li
            key={a.id}
            className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <span className="font-mono text-xs text-[var(--color-danger)] shrink-0">
              ✕ {String(a.id).padStart(2, "0")}
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold">{a.title}</h3>
              {a.directSeverityNote && (
                <p className="text-xs font-medium text-[var(--color-danger)]">
                  ⚠ {a.directSeverityNote}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function SlidePrinciples({
  comportamentais,
  tecnicos,
  progressao,
}: {
  comportamentais: typeof PRINCIPLES;
  tecnicos: typeof PRINCIPLES;
  progressao: typeof PRINCIPLES;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          slide 3 — os 14 princípios
        </p>
        <h1 className="text-3xl font-bold">
          A <span className="text-[var(--color-cyan)]">Fórmula</span>
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Texto completo dos 14 princípios em <a href="/codigo-de-conduta" className="underline text-[var(--color-cyan)]" target="_blank" rel="noreferrer">/codigo-de-conduta</a>. Aqui o resumo executivo.
        </p>
      </header>

      <PrincipleGroup label="Mentais e comportamentais" items={comportamentais} accent="cyan" />
      <PrincipleGroup label="Técnicos e de execução" items={tecnicos} accent="purple" />
      <PrincipleGroup label="Progressão" items={progressao} accent="cyan" />
    </article>
  );
}

function PrincipleGroup({
  label,
  items,
  accent,
}: {
  label: string;
  items: typeof PRINCIPLES;
  accent: "cyan" | "purple";
}) {
  const accentClass =
    accent === "cyan" ? "text-[var(--color-cyan)]" : "text-[var(--color-purple)]";
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
        {label}
      </h3>
      <ul className="space-y-2">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3"
          >
            <span className={`font-mono text-xs shrink-0 ${accentClass}`}>
              {String(p.id).padStart(2, "0")}
            </span>
            <span className="text-sm font-medium">{p.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SlideModeration({
  moderation,
}: {
  moderation: typeof PROGRESSIVE_MODERATION;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          slide 4 — moderação progressiva
        </p>
        <h1 className="text-3xl font-bold">
          Como funciona quando alguém viola as regras
        </h1>
      </header>

      <ol className="space-y-4">
        {[moderation.step1, moderation.step2, moderation.step3].map((step, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-cyan)] font-mono text-sm font-bold text-[var(--color-cyan)]">
              {i + 1}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{step.label}</h3>
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm">
        <p>
          <strong className="text-[var(--color-foreground)]">Reset automático: </strong>
          <span className="text-[var(--color-muted-foreground)]">{moderation.reset}</span>
        </p>
        <p>
          <strong className="text-[var(--color-foreground)]">Override direto: </strong>
          <span className="text-[var(--color-muted-foreground)]">
            preconceito vai direto pra banimento; feeding em partida com Pedro
            vai direto pra suspensão de 14 dias; fraude de pagamento é banimento imediato.
          </span>
        </p>
        <p>
          <strong className="text-[var(--color-foreground)]">Direito ao contraditório: </strong>
          <span className="text-[var(--color-muted-foreground)]">
            você pode contestar via Discord oficial. Pedro revisa caso a caso.
          </span>
        </p>
      </div>
    </article>
  );
}

function SlideAccept({
  version,
  accepted,
  onToggle,
  quotes,
}: {
  version: number;
  accepted: boolean;
  onToggle: (v: boolean) => void;
  quotes: typeof CANONICAL_QUOTES;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          slide 5 — aceite final
        </p>
        <h1 className="text-3xl font-bold">
          Compromisso
        </h1>
      </header>

      <blockquote className="border-l-2 border-[var(--color-cyan)] pl-6 italic text-[var(--color-foreground)]">
        “{quotes.responsibility}”
      </blockquote>

      <blockquote className="border-l-2 border-[var(--color-purple)] pl-6 italic text-[var(--color-foreground)]">
        “{quotes.competitiveMindset}”
      </blockquote>

      <label
        htmlFor="accept-doctrine"
        className="flex cursor-pointer gap-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:border-[var(--color-cyan)] transition"
      >
        <input
          id="accept-doctrine"
          type="checkbox"
          checked={accepted}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-5 cursor-pointer accent-[var(--color-cyan)]"
        />
        <span className="text-sm leading-relaxed">
          Eu li, compreendi e aceito os 14 princípios da Fórmula do Dota de
          Corrida, os 10 padrões tóxicos proibidos, e o sistema progressivo de
          moderação. Sei que violações geram advertência, suspensão ou
          banimento — e que Pedro tem autoridade final na aplicação dessas
          regras.
        </span>
      </label>

      <p className="text-center font-mono text-xs text-[var(--color-muted-foreground)]">
        versão {version} · aceitando esta versão você concorda com o texto
        canônico em <a href="/codigo-de-conduta" className="underline text-[var(--color-cyan)]" target="_blank" rel="noreferrer">/codigo-de-conduta</a>
      </p>
    </article>
  );
}

function AcceptButton({
  acceptedVersion,
  disabled,
}: {
  acceptedVersion: number;
  disabled: boolean;
}) {
  return (
    <form action={acceptDoctrine}>
      <input type="hidden" name="acceptedVersion" value={acceptedVersion} />
      <SubmitButton disabled={disabled} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="rounded-md bg-[var(--color-cyan)] px-6 py-2 font-bold text-[var(--color-background)] hover:bg-[var(--color-cyan)]/90 disabled:cursor-not-allowed disabled:opacity-30 transition"
    >
      {pending ? "Registrando..." : "Aceitar e entrar →"}
    </button>
  );
}
