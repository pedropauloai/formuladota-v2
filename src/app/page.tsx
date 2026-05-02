// Landing pública — hero com CTAs visíveis + sections explicativas.
// Server Component: detecta auth state pra trocar CTA primário (Entrar vs Pacotes).

import Link from "next/link";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[700px] bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

      <Hero isLoggedIn={isLoggedIn} />
      <HowItWorks />
      <CulturePreview />
      <FinalCTA isLoggedIn={isLoggedIn} />
    </main>
  );
}

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-mono uppercase tracking-widest text-[var(--color-cyan)]">
        <Zap size={14} /> milestone v2 · hub
      </span>

      <h1 className="text-5xl font-bold leading-tight md:text-7xl">
        Hub Dota 2 com{" "}
        <span className="text-[var(--color-cyan)] text-glow-cyan">cultura</span>.
      </h1>

      <p className="max-w-2xl text-lg text-[var(--color-muted-foreground)]">
        Comunidade brasileira de Dota 2 doutrinada pela{" "}
        <span className="text-[var(--color-purple)]">Fórmula do Dota de Corrida</span>{" "}
        do Pedro Paulo (Immortal / Top 0.5% / 7000 MMR). Partidas in-house, ranking por temporadas,
        coaches credenciados.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {isLoggedIn ? (
          <Link
            href="/pacotes"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cyan)] px-6 py-3 font-bold text-[var(--color-background)] hover:bg-[var(--color-cyan)]/90 transition"
          >
            Ver pacotes
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cyan)] px-6 py-3 font-bold text-[var(--color-background)] hover:bg-[var(--color-cyan)]/90 transition"
          >
            Entrar com Discord
            <ArrowRight size={18} />
          </Link>
        )}
        <Link
          href="/codigo-de-conduta"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-6 py-3 font-medium text-[var(--color-foreground)] hover:border-[var(--color-cyan)] transition"
        >
          Código de Conduta
        </Link>
      </div>

      <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
        login Discord · vínculo Steam · mensalidade R$ 47/mês via PIX
      </p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "1. Login + Steam",
      body: "Entra com Discord, vincula tua Steam, aceita o código de conduta. Trial de 7 dias liberado.",
    },
    {
      icon: Zap,
      title: "2. Joga partidas in-house",
      body: "Cria ou entra em lobby criado pelo bot Steam. Matchmaking interno por MMR próprio. Modos All Pick e Captains.",
    },
    {
      icon: Trophy,
      title: "3. Sobe no ranking",
      body: "MMR Elo (Herald → Immortal × 5 estrelas). Temporadas de 3 meses com premiação por patrocinadores.",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 space-y-2 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
          como funciona
        </p>
        <h2 className="text-3xl font-bold md:text-4xl">3 passos pra começar</h2>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.title}
            className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          >
            <step.icon
              size={24}
              className="text-[var(--color-cyan)]"
              aria-hidden="true"
            />
            <h3 className="font-bold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {step.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CulturePreview() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <article className="rounded-lg border border-[var(--color-cyan)] bg-[var(--color-card)] p-8 text-center space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-cyan)]">
          a primeira regra
        </p>
        <p className="text-2xl font-bold tracking-wide text-[var(--color-cyan)] text-glow-cyan md:text-3xl">
          ❗ A CULPA NUNCA É DO OUTRO ❗
        </p>
        <p className="mx-auto max-w-2xl text-sm text-[var(--color-muted-foreground)]">
          A responsabilidade é sempre sua, 100% das vezes. Comunidade doutrinada nos 14 princípios da Fórmula do Dota de Corrida.
        </p>
        <Link
          href="/codigo-de-conduta"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--color-cyan)] hover:text-glow-cyan transition"
        >
          Ler código de conduta completo
          <ArrowRight size={14} />
        </Link>
      </article>
    </section>
  );
}

function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) return null;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="mb-6 text-lg text-[var(--color-muted-foreground)]">
        Pronto pra entrar na comunidade?
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cyan)] px-8 py-4 text-lg font-bold text-[var(--color-background)] hover:bg-[var(--color-cyan)]/90 transition"
      >
        Entrar com Discord
        <ArrowRight size={20} />
      </Link>
    </section>
  );
}
