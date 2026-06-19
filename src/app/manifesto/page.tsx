// Página pública "Por que FormulaDota" — o problema do matchmaking oficial da
// Valve (anonimato, topo fechado/MMR inflado, ranking fragmentado por região) e
// a resposta da FormulaDota. Ancorada na prova social do Grubby (lenda dos
// esports expulsa pela toxicidade). Usada na conversão de visitante E como base
// das propostas a representantes. Acessível sem login (vitrine).
//
// Layout cinematográfico "New Frontiers" (igual /metodologia e /codigo-de-conduta).

import Link from "next/link";
import { Swords, ShieldOff, Lock, Globe, Fingerprint, RotateCcw, Trophy } from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { Button } from "@/components/ui/button";
import {
  FrontierHero,
  FrontierSection,
  FrontierStatement,
  ParallaxBackground,
  FRONTIER_ASSETS,
  DOTA_BACKGROUNDS,
} from "@/components/frontier";
import { signInWithDiscord } from "@/app/login/actions";

export const metadata = {
  title: "Por que FormulaDota — não é você, é o sistema",
  description:
    "O ambiente competitivo oficial do Dota 2 tem três falhas estruturais: anonimato, topo fechado e ranking fragmentado. A FormulaDota constrói o ambiente que falta — identidade real, temporadas que reiniciam e ranking único.",
};

// Cada par: a falha da Valve (o que ela produz) × a resposta da FormulaDota.
const COMPARISONS = [
  {
    problemIcon: ShieldOff,
    problemTitle: "Anonimato",
    problemLine: "Ninguém é ninguém.",
    problemBody:
      "Sem identidade real, a toxicidade não tem consequência. Flame, smurf, evasão de punição — tudo sem rosto, sem reputação, sem custo. O anônimo não tem nada a perder.",
    solutionIcon: Fingerprint,
    solutionTitle: "Identidade real",
    solutionBody:
      "1 pessoa, 1 identidade — pública, única, com reputação atrelada. O anonimato é proibido. Quem age mal responde, com nome. Quem joga certo, constrói história.",
  },
  {
    problemIcon: Lock,
    problemTitle: "O topo é fechado",
    problemLine: "Um novato nunca chega ao nº 1.",
    problemBody:
      "Sem reset de verdade, o MMR infla e o topo fica eternamente nas mãos de quem acumulou por anos. Não importa o quanto você evolua — a porta do topo já fechou antes de você chegar.",
    solutionIcon: RotateCcw,
    solutionTitle: "Temporadas que reiniciam",
    solutionBody:
      "Todo ciclo recomeça. O topo é reconquistado a cada temporada, não herdado. Um jogador comprometido — mesmo começando agora — tem um caminho real até o nº 1.",
  },
  {
    problemIcon: Globe,
    problemTitle: "Mundos separados",
    problemLine: "Não existe “o melhor do mundo”.",
    problemBody:
      "O ranking é fragmentado por região. Comunidades isoladas, sem um eixo comum, sem uma corrida única que valha pra todos. “Top da América” não conversa com “top da Europa”.",
    solutionIcon: Trophy,
    solutionTitle: "Ranking único",
    solutionBody:
      "Uma corrida só, sem fronteira de região. Um eixo comum pra todo mundo que joga sob a mesma doutrina — onde o nº 1 significa, de verdade, o nº 1.",
  },
] as const;

export default async function ManifestoPage() {
  return (
    <ClientShell currentRoute="/manifesto" hideRightSidebar>
      <div className="relative w-full bg-bg-deep">
        <ParallaxBackground src={DOTA_BACKGROUNDS.featuredTeal} />

        <div className="relative z-10">
          {/* HERO */}
          <FrontierHero
            eyebrow="Por que FormulaDota"
            title={
              <>
                Não é você.{" "}
                <span className="text-brand-primary">É o sistema.</span>
              </>
            }
            subtitle="O Dota é um dos melhores jogos do mundo. O que está quebrado é o ambiente competitivo da Valve — e até as lendas estão indo embora."
            backgroundImage={FRONTIER_ASSETS.mapBanner}
          />

          {/* PROVA SOCIAL — Grubby: foto + citação + contexto + o vídeo */}
          <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <figure className="shrink-0 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Manuel_%22Grubby%22_Schenkhuizen.jpg/330px-Manuel_%22Grubby%22_Schenkhuizen.jpg"
                  alt="Manuel “Grubby” Schenkhuizen"
                  className="w-40 rounded-md border border-border-subtle object-cover md:w-48"
                  loading="lazy"
                />
                <figcaption className="mt-2 font-display text-[10px] uppercase tracking-wide text-text-faded">
                  Foto: Wikimedia Commons
                </figcaption>
              </figure>

              <div className="space-y-4">
                <blockquote className="font-display text-2xl font-bold leading-tight text-text-display md:text-3xl">
                  <span className="text-brand-primary">
                    “Eu amo Dota 2. Mas isso pode ser o fim.”
                  </span>
                </blockquote>
                <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-text-muted">
                  Manuel “Grubby” Schenkhuizen
                </p>
                <p className="max-w-2xl font-body text-base leading-relaxed text-text-muted">
                  Lenda dos esports — múltiplas vezes campeão mundial de Warcraft III
                  e referência em{" "}
                  <strong className="text-text-body">mentalidade positiva</strong>.
                  Quando o jogador mais equilibrado do cenário — justo o que ensina a
                  manter a cabeça boa — é expulso pela toxicidade, fica provado: não é
                  o jogador, é o sistema sem regras.
                </p>
              </div>
            </div>

            {/* O vídeo que originou este manifesto */}
            <div className="mt-10 overflow-hidden rounded-md border border-border-subtle bg-black">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube-nocookie.com/embed/gXBwdg_Fgw8"
                  title="Grubby — I love DOTA2. But this may be the end. Here's why..."
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* O PROBLEMA → A RESPOSTA */}
          <FrontierSection
            id="comparativo"
            index="01"
            title="Três falhas. Três respostas."
            intro="O matchmaking oficial da Valve tem três falhas estruturais. Não são bugs — são escolhas de design que produzem o ambiente que afasta quem leva o jogo a sério. A FormulaDota não tenta consertar a Valve: constrói o ambiente que ela deveria ter."
            width="wide"
          >
            <div className="space-y-5">
              {COMPARISONS.map((c) => (
                <ComparisonRow key={c.problemTitle} item={c} />
              ))}
            </div>
          </FrontierSection>

          {/* FECHAMENTO */}
          <FrontierStatement attribution="A cultura é o produto. O Dota é o terreno.">
            Você não está entrando num matchmaking. Está entrando num lugar com{" "}
            <span className="text-brand-primary">
              identidade, regras e consequência
            </span>{" "}
            — feito pra quem ainda se importa de verdade com o jogo.
          </FrontierStatement>

          {/* CTA */}
          <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <form action={signInWithDiscord}>
                <Button
                  type="submit"
                  variant="cinematic"
                  size="lg"
                  aria-label="Entrar com Discord"
                >
                  <Swords size={22} aria-hidden="true" />
                  Entrar com Discord
                </Button>
              </form>
              <Link
                href="/codigo-de-conduta"
                className="font-display text-sm font-semibold text-brand-primary transition-colors hover:text-text-display"
              >
                Conhecer a doutrina →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ClientShell>
  );
}

// Linha comparativa: à esquerda a falha da Valve (tom de alerta), à direita a
// resposta da FormulaDota (tom da marca). No mobile empilha (falha em cima).
function ComparisonRow({
  item,
}: {
  item: (typeof COMPARISONS)[number];
}) {
  const ProblemIcon = item.problemIcon;
  const SolutionIcon = item.solutionIcon;
  return (
    <div className="grid items-stretch gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle md:grid-cols-2">
      {/* Falha da Valve */}
      <div className="flex flex-col gap-2 bg-bg-base/90 p-5">
        <div className="flex items-center gap-2 text-error">
          <ProblemIcon size={16} aria-hidden="true" />
          <span className="font-display text-sm font-semibold uppercase tracking-wide">
            Na Valve
          </span>
        </div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-text-display">
          {item.problemTitle}
        </p>
        <p className="font-display text-sm font-semibold italic text-text-faded">
          {item.problemLine}
        </p>
        <p className="font-body text-sm leading-relaxed text-text-muted">
          {item.problemBody}
        </p>
      </div>

      {/* Resposta da FormulaDota */}
      <div className="flex flex-col gap-2 bg-bg-elevated/60 p-5">
        <div className="flex items-center gap-2 text-brand-primary">
          <SolutionIcon size={16} aria-hidden="true" />
          <span className="font-display text-sm font-semibold uppercase tracking-wide">
            Na FormulaDota
          </span>
        </div>
        <p className="font-display text-lg font-semibold uppercase tracking-wide text-text-display">
          {item.solutionTitle}
        </p>
        <p className="font-body text-sm leading-relaxed text-text-body">
          {item.solutionBody}
        </p>
      </div>
    </div>
  );
}
