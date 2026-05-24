"use client";

import { useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { m } from "motion/react";
import {
  ANTIPATTERNS,
  CANONICAL_QUOTES,
  PRINCIPLES,
  PROGRESSIVE_MODERATION,
} from "@/lib/doctrine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import { acceptDoctrine } from "./actions";

type Props = {
  username: string;
  version: number;
  principles: typeof PRINCIPLES;
  antipatterns: typeof ANTIPATTERNS;
  moderation: typeof PROGRESSIVE_MODERATION;
  quotes: typeof CANONICAL_QUOTES;
  errorMessage?: string;
};

const TOTAL_SLIDES = 5;

// Persist slide via URL hash — back button do navegador funciona naturalmente.
// useSyncExternalStore é o pattern correto pra subscrever em estado externo.
function readSlideFromHash(): number {
  const m = window.location.hash.match(/#slide-(\d)/);
  if (!m) return 1;
  const n = Number(m[1]);
  return n >= 1 && n <= TOTAL_SLIDES ? n : 1;
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

const SSR_DEFAULT_SLIDE = 1;

export function OnboardingFlow({
  username,
  version,
  principles,
  antipatterns,
  moderation,
  quotes,
  errorMessage,
}: Props) {
  const slide = useSyncExternalStore(
    subscribeToHash,
    readSlideFromHash,
    () => SSR_DEFAULT_SLIDE
  );
  const [accepted, setAccepted] = useState(false);

  const goTo = (n: number) => {
    const target = Math.max(1, Math.min(TOTAL_SLIDES, n));
    window.history.pushState(null, "", `#slide-${target}`);
    // dispatchEvent força re-render via subscriber (pushState não dispara popstate)
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const next = () => goTo(slide + 1);
  const back = () => goTo(slide - 1);

  const comportamentais = principles.filter((p) => p.category === "comportamental");
  const tecnicos = principles.filter((p) => p.category === "tecnico");
  const progressao = principles.filter((p) => p.category === "progressao");

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-error/60 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {errorMessage}
        </div>
      )}

      <ProgressBar current={slide} total={TOTAL_SLIDES} />

      <m.div
        key={slide}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATIONS.hero, ease: EASINGS.softLanding }}
        className="flex-1 py-12"
      >
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
      </m.div>

      <nav
        aria-label="Navegação do onboarding"
        className="flex items-center justify-between border-t border-border-subtle pt-6"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={back}
          disabled={slide === 1}
          aria-label="Slide anterior"
        >
          ← anterior
        </Button>

        <span className="font-mono text-xs text-text-muted">
          {slide} / {TOTAL_SLIDES}
        </span>

        {slide < TOTAL_SLIDES ? (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={next}
            aria-label="Próximo slide"
          >
            Continuar →
          </Button>
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
        <span className="font-mono text-xs uppercase tracking-widest text-brand-primary">
          A Fórmula do Dota de Corrida
        </span>
        <span className="font-mono text-xs text-text-muted">
          onboarding obrigatório
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso do onboarding"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuetext={`Slide ${current} de ${total}`}
        className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated"
      >
        <div
          className="h-full bg-brand-primary transition-all duration-500"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 12px var(--color-brand-primary-glow)",
          }}
        />
      </div>
    </div>
  );
}

function SlideEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.35em] text-brand-primary">
      {children}
    </p>
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
      <header className="space-y-4">
        <SlideEyebrow>slide 1 — boas-vindas</SlideEyebrow>
        <h1 className="font-display text-4xl font-bold leading-tight tracking-wide text-text-display md:text-5xl">
          Bem-vindo,{" "}
          <span
            className="text-brand-primary"
            style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
          >
            {username}
          </span>
          .
        </h1>
        <p className="pt-2 font-body text-base italic leading-relaxed text-text-muted">
          Permita-se questionar. Sobre tudo e qualquer coisa.
          <br />
          Isso sim é o que evolui um ser.
        </p>
      </header>

      <p className="font-body text-lg italic leading-relaxed text-text-body">
        “{quotes.opening}”
      </p>

      <Card
        variant="hero"
        className="text-center"
      >
        <CardContent>
          <p
            className="font-display text-2xl font-bold uppercase tracking-wide text-brand-primary"
            style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
          >
            {quotes.firstRule}
          </p>
          <p className="mt-3 font-body text-sm text-text-muted">
            Esta é a primeira regra. A responsabilidade é sempre sua, 100% das
            vezes.
          </p>
        </CardContent>
      </Card>

      <p className="font-body text-base leading-relaxed text-text-muted">
        Nas próximas telas, você vai conhecer as regras que regem esta
        comunidade — os 14 princípios da Fórmula do Dota de Corrida, os 15
        padrões tóxicos proibidos, e o sistema progressivo de moderação que
        protege a cultura coletiva.
      </p>

      <p className="font-body text-base font-medium text-text-body">
        Aceitar essas regras é{" "}
        <strong className="text-brand-primary">obrigatório</strong> pra usar a
        plataforma.
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
        <SlideEyebrow>slide 2 — os 10 padrões tóxicos</SlideEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-wide text-text-display">
          O que <span className="text-error">não</span> é tolerado
        </h1>
        <p className="font-body text-sm text-text-muted">
          Esses comportamentos são incompatíveis com a cultura da Fórmula
          Dota. Geram advertência, suspensão ou banimento.
        </p>
      </header>

      <ul className="space-y-3">
        {antipatterns.map((a) => (
          <li key={a.id}>
            <Card variant="flat" className="flex gap-4">
              <span className="shrink-0 font-mono text-xs text-error">
                ✕ {String(a.id).padStart(2, "0")}
              </span>
              <div className="space-y-1">
                <h3 className="font-display text-sm font-semibold tracking-wide text-text-display">
                  {a.title}
                </h3>
                {a.directSeverityNote && (
                  <p className="font-body text-xs font-medium text-error">
                    ⚠ {a.directSeverityNote}
                  </p>
                )}
              </div>
            </Card>
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
        <SlideEyebrow>slide 3 — os 14 princípios</SlideEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-wide text-text-display">
          A <span className="text-brand-primary">Fórmula</span>
        </h1>
        <p className="font-body text-sm text-text-muted">
          Texto completo dos 14 princípios em{" "}
          <a
            href="/codigo-de-conduta"
            className="text-brand-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            /codigo-de-conduta
          </a>
          . Aqui o resumo executivo.
        </p>
      </header>

      <PrincipleGroup label="Mentais e comportamentais" items={comportamentais} />
      <PrincipleGroup label="Técnicos e de execução" items={tecnicos} />
      <PrincipleGroup label="Progressão" items={progressao} />
    </article>
  );
}

function PrincipleGroup({
  label,
  items,
}: {
  label: string;
  items: typeof PRINCIPLES;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-widest text-text-faded">
        {label}
      </h3>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id}>
            <Card variant="flat" className={cn("flex gap-3 p-3")}>
              <span className="shrink-0 font-mono text-xs text-brand-primary">
                {String(p.id).padStart(2, "0")}
              </span>
              <span className="font-body text-sm font-medium text-text-body">
                {p.title}
              </span>
            </Card>
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
        <SlideEyebrow>slide 4 — moderação progressiva</SlideEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-wide text-text-display">
          Como funciona quando alguém viola as regras
        </h1>
      </header>

      <ol className="space-y-4">
        {[moderation.step1, moderation.step2, moderation.step3].map((step, i) => (
          <li key={i}>
            <Card variant="elevated" className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-primary font-mono text-sm font-bold text-brand-primary">
                {i + 1}
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-sm font-semibold tracking-wide text-text-display">
                  {step.label}
                </h3>
                <p className="font-body text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card variant="flat" className="space-y-3 text-sm">
        <p>
          <strong className="text-text-display">Reset automático: </strong>
          <span className="text-text-muted">{moderation.reset}</span>
        </p>
        <p>
          <strong className="text-text-display">Override direto: </strong>
          <span className="text-text-muted">
            preconceito vai direto pra banimento; feeding em partida com coach
            vai direto pra suspensão de 14 dias; fraude de pagamento é
            banimento imediato.
          </span>
        </p>
        <p>
          <strong className="text-text-display">Direito ao contraditório: </strong>
          <span className="text-text-muted">
            você pode contestar via Discord oficial. A equipe FORMULADOTA
            revisa caso a caso.
          </span>
        </p>
      </Card>
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
        <SlideEyebrow>slide 5 — aceite final</SlideEyebrow>
        <h1 className="font-display text-3xl font-bold tracking-wide text-text-display">
          Compromisso
        </h1>
      </header>

      <blockquote className="border-l-2 border-brand-primary pl-6 font-body italic text-text-body">
        “{quotes.responsibility}”
      </blockquote>

      <blockquote className="border-l-2 border-brand-primary pl-6 font-body italic text-text-body">
        “{quotes.competitiveMindset}”
      </blockquote>

      <label
        htmlFor="accept-doctrine"
        className={cn(
          "flex cursor-pointer gap-4 rounded-[var(--radius-lg)] border-2 p-5 transition-colors",
          accepted
            ? "border-brand-primary bg-brand-primary/5"
            : "border-border-subtle bg-bg-elevated hover:border-brand-primary"
        )}
      >
        <input
          id="accept-doctrine"
          type="checkbox"
          checked={accepted}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-5 cursor-pointer accent-brand-primary"
          style={{ accentColor: "var(--color-brand-primary)" }}
        />
        <span className="font-body text-sm leading-relaxed text-text-body">
          Eu li, compreendi e aceito os 14 princípios da Fórmula do Dota de
          Corrida, os 10 padrões tóxicos proibidos, e o sistema progressivo de
          moderação. Sei que violações geram advertência, suspensão ou
          banimento — e que o admin FORMULADOTA tem autoridade final na
          aplicação dessas regras.
        </span>
      </label>

      <p className="text-center font-mono text-xs text-text-muted">
        versão {version} · aceitando esta versão você concorda com o texto
        canônico em{" "}
        <a
          href="/codigo-de-conduta"
          className="text-brand-primary underline"
          target="_blank"
          rel="noreferrer"
        >
          /codigo-de-conduta
        </a>
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
    <form action={acceptDoctrine} aria-live="polite" aria-atomic="true">
      <input type="hidden" name="acceptedVersion" value={acceptedVersion} />
      <SubmitButton disabled={disabled} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      disabled={disabled}
      loading={pending}
      aria-busy={pending}
    >
      {pending ? "Registrando..." : "Aceitar e entrar →"}
    </Button>
  );
}
