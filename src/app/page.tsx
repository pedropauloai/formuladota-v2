// Landing pública FORMULADOTA — MVP boost de MMR via fichas + PROs.
// Logged-in: redireciona pra /dashboard (interface estilo client Dota 2).
//
// Ordem das seções:
//   1. LivePROStrip — faixa fina topo (real-time PROs online)
//   2. Hero — proposta principal + CTA compra
//   3. Manifesto — "A culpa nunca é do outro" amarrado ao produto
//   4. HowItWorks — 3 passos (compre / veja / jogue)
//   5. PROsShowcase — Pedro + EM BREVE
//   6. Honesty — disclaimer frontal de win rate 70% e não 100%
//   7. FinalCTA — última conversão

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ShoppingCart,
  Users,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signInWithDiscord } from "@/app/login/actions";
import { HeroVideo } from "@/components/dota/hero-video";
import { LivePROStrip } from "@/components/landing/live-pro-strip";
import { PROsShowcase } from "@/components/landing/pros-showcase";

// Background Dota oficial pra cenas escuras
const DOTA_BG = {
  background1:
    "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background1.png",
  background3:
    "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background3.png",
  background4:
    "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background4.png",
};

// Status dos PROs atualiza a cada 10s
export const revalidate = 10;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main>
      <LivePROStrip />
      <Hero />
      <Manifesto />
      <HowItWorks />
      <PROsShowcase />
      <Honesty />
      <FinalCTA />
    </main>
  );
}

// ============== 1. Hero ==============

function Hero() {
  return (
    <section className="relative min-h-[78vh] overflow-hidden">
      <HeroVideo className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 pt-24 pb-20">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          Boost de MMR + Mentoria
        </p>
        <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-7xl">
          EVOLUA SEU MMR.
          <br />
          NÃO POR SORTE.
        </h1>
        <div className="brand-divider" />
        <p className="max-w-2xl font-serif text-lg text-white/85 md:text-xl">
          Compre sua ficha. Jogue uma PT ranked oficial em grupo de até 5 com um PRO da
          Fórmula do Dota de Corrida.
        </p>
        <p className="max-w-2xl font-sans text-base text-white/70">
          Não vendemos vitória — vendemos vaga, método e direito a questionar o PRO
          depois de cada partida, vitória ou derrota.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <form action={signInWithDiscord}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand-red)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]/80"
            >
              Comprar ficha — R$ 15
              <ArrowRight size={18} />
            </button>
          </form>
          <Link
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-transparent px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white/80 transition-colors hover:border-white/60 hover:text-white"
          >
            Como funciona
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============== 2. Manifesto (com background Dota oficial) ==============

function Manifesto() {
  return (
    <section
      className="relative border-y border-[var(--color-border)]"
      style={{
        backgroundImage: `url(${DOTA_BG.background1})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <header className="mb-8 space-y-4">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Manifesto
          </p>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-6xl">
            A culpa nunca é
            <br />
            do outro
          </h2>
          <div className="brand-divider" />
        </header>
        <p className="max-w-3xl font-serif text-lg leading-relaxed text-white/80 md:text-xl">
          A responsabilidade é sempre sua, 100% das vezes. Aqui o PRO entra com você
          dentro da PT pra mostrar onde sua decisão fez diferença. Vitória ou derrota,
          você sai sabendo o porquê — com base nos fundamentos da Fórmula do Dota de
          Corrida.
        </p>
      </div>
    </section>
  );
}

// ============== 3. Como funciona ==============

function HowItWorks() {
  const steps = [
    {
      icon: ShoppingCart,
      title: "1. Compre sua ficha",
      body: "R$ 15 via PIX. Saldo de fichas fica no seu perfil — joga quando quiser, sem validade no MVP.",
    },
    {
      icon: Users,
      title: "2. Veja quem está online",
      body: "PROs abrem fila quando estão prontos pra jogar. Lista atualizada em tempo real. Entra na fila do PRO que combinar com seu horário.",
    },
    {
      icon: GraduationCap,
      title: "3. Jogue + Aprenda",
      body: "Grupo de 2 a 5 jogadores. PT ranked oficial. Toda partida termina com análise pós-jogo, baseada nos fundamentos da Fórmula.",
    },
  ];

  return (
    <section
      id="como-funciona"
      className="border-y border-[var(--color-border)] bg-[var(--color-background)]"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <header className="mb-12 space-y-4">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Como funciona
          </p>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-5xl">
            3 passos pra começar
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
      </div>
    </section>
  );
}

// ============== 5. Honestidade ==============

function Honesty() {
  return (
    <section
      className="relative border-y border-[var(--color-border)]"
      style={{
        backgroundImage: `url(${DOTA_BG.background3})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/90 to-black/95" />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center">
        <p className="mb-4 inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          <AlertTriangle size={14} /> A promessa real
        </p>
        <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-6xl">
          Ou você ganha,
          <br />
          ou você aprende
        </h2>
        <div className="mx-auto mt-6 brand-divider" />
        <p className="mx-auto mt-8 max-w-2xl font-serif text-lg leading-relaxed text-white/80">
          Win rate 100% é impossível e a gente fala isso na cara. Nossa meta com você é
          70% sustentável — o suficiente pra +1.000 de MMR a cada 20 dias jogando 5
          partidas por dia.
        </p>
        <p className="mx-auto mt-4 max-w-2xl font-sans text-sm text-white/60">
          Cliente paga pela vaga na PT, não pela vitória. Toda derrota você tem o
          direito de chamar o PRO e entender o que aconteceu.
        </p>
      </div>
    </section>
  );
}

// ============== 6. Final CTA ==============

function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage: `url(${DOTA_BG.background4})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-6xl">
          Sua próxima PT
          <br />
          tá esperando
        </h2>
        <div className="mx-auto mt-6 brand-divider" />
        <p className="mt-8 font-serif text-lg text-white/85">
          Até 4 alunos por partida. Sem fila grande, sem matchmaking aleatório. Saldo
          de fichas joga quando quiser.
        </p>
        <form action={signInWithDiscord} className="mt-10 inline-flex">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand-red)] px-8 py-4 font-sans text-base font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]/80"
          >
            Comprar ficha — R$ 15
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </section>
  );
}
