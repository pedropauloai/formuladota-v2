// Landing pública FORMULADOTA — hero video oficial Dota 2 + sections inspiradas no site oficial.
// Server Component: detecta auth state pra trocar CTA primário (Entrar Discord vs Pacotes).

import Link from "next/link";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HeroVideo } from "@/components/dota/hero-video";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main>
      <Hero isLoggedIn={isLoggedIn} />
      <Manifesto />
      <HowItWorks />
      <CulturePreview />
      <FinalCTA isLoggedIn={isLoggedIn} />
    </main>
  );
}

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative min-h-[85vh] overflow-hidden">
      {/* Video oficial Dota 2 montage — autoplay+loop+muted */}
      <HeroVideo className="absolute inset-0 h-full w-full object-cover opacity-50" />
      {/* Overlay gradient escuro pra contraste do texto */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 pt-32 pb-24">
        <h1 className="font-display text-6xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-8xl">
          FORMULADOTA
        </h1>
        <p className="font-serif text-xl text-white/85 md:text-2xl">
          O HUB Dota 2 brasileiro
        </p>
        <div className="brand-divider" />
        <p className="max-w-2xl font-sans text-base text-white/70 md:text-lg">
          Lobbies in-house criados por bot Steam, ranking próprio por temporadas, comunidade alinhada culturalmente.
          Acesso integrado a Discord e Steam, mensalidade R$ 47 via PIX recorrente.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/pacotes"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]"
            >
              Ver pacotes
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]"
            >
              Entrar com Discord
              <ArrowRight size={18} />
            </Link>
          )}
          <Link
            href="/codigo-de-conduta"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white/80 transition-colors hover:border-white/60 hover:text-white"
          >
            Código de Conduta
          </Link>
        </div>
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="border-y border-[var(--color-border)] bg-black">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <header className="mb-8 space-y-4">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Manifesto
          </p>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-6xl">
            Junte-se à<br />Batalha dos Ancestrais
          </h2>
          <div className="brand-divider" />
        </header>
        <p className="max-w-3xl font-serif text-lg leading-relaxed text-white/75 md:text-xl">
          Todos os dias, milhões de jogadores ao redor do mundo entram em batalha como um dos mais
          de 100 heróis de Dota. FORMULADOTA é o HUB onde a comunidade brasileira se reúne — não
          apenas pra competir, mas pra evoluir alinhada culturalmente. Aqui a frustração não dita
          o tom. A responsabilidade é sempre sua, 100% das vezes.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "Vincule Discord + Steam",
      body: "Login com Discord, autorização Steam OpenID. Aceite obrigatório do código de conduta antes de qualquer interação.",
    },
    {
      icon: Zap,
      title: "Pague a mensalidade",
      body: "R$ 47/mês via PIX (Mercado Pago Pix Automático). Renovação automática após autorização única.",
    },
    {
      icon: Trophy,
      title: "Jogue e suba no ranking",
      body: "Lobbies in-house criados por bot Steam. Matchmaking interno por MMR próprio. Temporadas trimestrais com premiação.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <header className="mb-12 space-y-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Como funciona
        </p>
        <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-5xl">
          3 passos pra entrar
        </h2>
        <div className="brand-divider" />
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.title}
            className="space-y-4 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-8 transition-colors hover:border-[var(--color-brand-red)]/60"
          >
            <step.icon
              size={28}
              className="text-[var(--color-brand-red)]"
              aria-hidden="true"
            />
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              {step.title}
            </h3>
            <p className="font-sans text-sm leading-relaxed text-[var(--color-muted-foreground)]">
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
    <section className="border-y border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          A primeira regra
        </p>
        <p className="font-display text-3xl font-bold uppercase tracking-wide text-white md:text-5xl">
          A culpa nunca é do outro
        </p>
        <div className="mx-auto mt-6 brand-divider" />
        <p className="mx-auto mt-8 max-w-2xl font-serif text-lg leading-relaxed text-white/75">
          A responsabilidade é sempre sua, 100% das vezes. Comunidade alinhada nos 14 princípios
          e 10 anti-padrões da metodologia FORMULADOTA. Sem aceite, sem acesso.
        </p>
        <Link
          href="/codigo-de-conduta"
          className="mt-8 inline-flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-widest text-[var(--color-brand-red)] transition-colors hover:text-white"
        >
          Ler código de conduta completo
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) return null;
  return (
    <section className="relative overflow-hidden">
      <HeroVideo className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-32 text-center">
        <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-6xl">
          Junte-se à batalha
        </h2>
        <div className="mx-auto mt-6 brand-divider" />
        <p className="mt-8 font-serif text-xl text-white/85">
          Pronto pra entrar no HUB?
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-8 py-4 font-sans text-base font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]"
        >
          Entrar com Discord
          <ArrowRight size={20} />
        </Link>
      </div>
    </section>
  );
}
