"use client";

// HubCenter — a CAPA do client (/ e /dashboard), visitante E logado.
//
// É a TESE do produto, estampada e cabendo na tela SEM scroll (Pedro 2026-06-18,
// "é o principal do produto"): o ambiente competitivo da Valve é quebrado
// (anonimato, topo fechado, regiões isoladas) e a FormulaDota é a resposta
// (identidade, temporadas, ranking único). A versão completa vive em /por-que.
//
// Client Component (passa refs de LucideIcon pros pilares — não serializável).

import Link from "next/link";
import { Swords, ShieldX, Fingerprint, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "@/app/login/actions";

export interface HubCenterProps {
  /** True = visitante deslogado. Adapta só o CTA (login vs jogar). */
  isVisitor?: boolean;
  /** PROs com fila aberta agora — pulso da comunidade (prova social). */
  prosOnlineCount: number;
}

// Os 3 pilares — falha da Valve → resposta da FormulaDota. Compactos pra caber
// na capa sem scroll; o aprofundamento mora em /por-que.
const PILLARS = [
  {
    problem: "Anonimato",
    solution: "Identidade real",
    icon: Fingerprint,
    line: "Nome público, reputação atrelada. Sem máscara, sem smurf.",
  },
  {
    problem: "Topo fechado · MMR inflado",
    solution: "Temporadas que reiniciam",
    icon: RotateCcw,
    line: "Todo ciclo recomeça. O nº 1 volta a ser alcançável.",
  },
  {
    problem: "Rankings por região",
    solution: "Ranking único global",
    icon: Trophy,
    line: "Uma corrida só. O melhor é o melhor do mundo.",
  },
] as const;

export function HubCenter({ isVisitor, prosOnlineCount }: HubCenterProps) {
  const pulso =
    prosOnlineCount === 0
      ? "Nenhum PRO em fila agora"
      : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO" : "PROs"} em fila agora`;

  return (
    <section className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-5 px-6 py-4 xl:px-10">
      {/* TESE — headline + subtítulo */}
      <header className="space-y-2">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Por que FormulaDota
        </p>
        <h1 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-text-display sm:text-4xl 2xl:text-5xl">
          Não é você.{" "}
          <span
            className="text-brand-primary"
            style={{ textShadow: "0 0 24px var(--color-brand-primary-glow)" }}
          >
            É o sistema.
          </span>
        </h1>
        <p className="max-w-2xl font-display text-base font-semibold text-text-body xl:text-lg">
          O Dota é um dos melhores jogos do mundo. O que quebra é o ambiente
          competitivo da Valve — até as lendas vão embora. Aqui, a cultura tem regras.
        </p>
      </header>

      {/* 3 PILARES — falha da Valve → resposta FormulaDota */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.solution}
              className="rounded-md border border-border-subtle bg-bg-base/60 p-3"
            >
              <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
                <ShieldX size={12} aria-hidden="true" className="shrink-0" />
                <span className="truncate">Na Valve: {p.problem}</span>
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 font-display text-base font-bold uppercase tracking-wide text-text-display">
                <Icon
                  size={15}
                  aria-hidden="true"
                  className="shrink-0 text-brand-primary"
                />
                {p.solution}
              </p>
              <p className="mt-1 font-body text-xs leading-snug text-text-muted">
                {p.line}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA + aprofundamento + pulso da comunidade */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {isVisitor ? (
          <form action={signInWithDiscord}>
            <Button
              type="submit"
              variant="cinematic"
              size="lg"
              aria-label="Entrar com Discord"
            >
              <Swords size={20} aria-hidden="true" />
              Entrar com Discord
            </Button>
          </form>
        ) : (
          <Link href="/ranked-com-pro" aria-label="Ir para Ranked com PRO">
            <Button variant="cinematic" size="lg">
              <Swords size={20} aria-hidden="true" />
              Subir de MMR
            </Button>
          </Link>
        )}
        <Link
          href="/por-que"
          className="font-display text-sm font-semibold text-brand-primary transition-colors hover:text-text-display"
        >
          Entenda o porquê →
        </Link>
        <span
          className="font-display text-sm font-semibold text-text-muted"
          role="status"
        >
          {pulso}
        </span>
      </div>
    </section>
  );
}
