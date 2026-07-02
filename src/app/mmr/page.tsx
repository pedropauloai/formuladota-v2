// /mmr — página DIDÁTICA de como funciona o MMR FormulaDota (Pedro 2026-07-02:
// "é o que mais me perguntam"). Resumo no topo (TL;DR) + explicação completa abaixo.
// Server component, conteúdo estático. Escala espelha src/lib/mmr.ts (bandas oficiais
// do Dota, teto 7000). PT-BR (i18n EN é follow-up).

import type { Metadata } from "next";
import {
  Fingerprint,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Swords,
  Lock,
} from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";

export const metadata: Metadata = {
  title: "Como funciona o MMR — FORMULADOTA",
  description:
    "Seu MMR FormulaDota, explicado: importado da sua medalha Valve, escala oficial do Dota, teto 7000, sem inflação.",
};

// Escala (espelha TIER_BANDS de src/lib/mmr.ts). label = faixa de MMR.
const LADDER: { rank: DotaRank; nome: string; faixa: string }[] = [
  { rank: "immortal", nome: "Imortal", faixa: "5620 – 7000" },
  { rank: "divine", nome: "Divino", faixa: "4620 – 5619" },
  { rank: "ancient", nome: "Ancião", faixa: "3850 – 4619" },
  { rank: "legend", nome: "Lenda", faixa: "3080 – 3849" },
  { rank: "archon", nome: "Arconte", faixa: "2310 – 3079" },
  { rank: "crusader", nome: "Cruzado", faixa: "1540 – 2309" },
  { rank: "guardian", nome: "Guardião", faixa: "770 – 1539" },
  { rank: "herald", nome: "Arauto", faixa: "0 – 769" },
];

const TLDR = [
  {
    icon: Fingerprint,
    titulo: "Vem da sua medalha",
    texto:
      "Você entra no MMR que a sua medalha Valve representa. A gente não te faz começar do zero — importa o seu nível real.",
  },
  {
    icon: TrendingUp,
    titulo: "Sobe jogando",
    texto:
      "Cada partida ajusta seu MMR pelo resultado (Elo) e pelo seu desempenho. Ganhar de quem é mais forte vale mais.",
  },
  {
    icon: RotateCcw,
    titulo: "Reseta por temporada",
    texto:
      "A cada temporada o topo é reaberto. Ninguém fica sentado no lugar pra sempre — todo ciclo é uma nova corrida.",
  },
  {
    icon: ShieldCheck,
    titulo: "Sem inflação",
    texto:
      "Escala oficial do Dota, teto de 7000. Imortal começa em 5620 e o topo significa algo — não infla com o tempo.",
  },
];

function Section({
  icon: Icon,
  titulo,
  children,
}: {
  icon: typeof Swords;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border-subtle pt-8">
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-wide text-text-display">
        <Icon className="size-6 text-brand-primary" aria-hidden="true" />
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 font-body text-sm leading-relaxed text-text-body 2xl:text-base">
        {children}
      </div>
    </section>
  );
}

export default function MmrExplainerPage() {
  return (
    <ClientShell currentRoute="/mmr">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        {/* ─── Resumo (topo) ─── */}
        <header className="mb-10">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            Ranking · Guia
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-text-display md:text-5xl">
            Como funciona o MMR
          </h1>
          <p className="mt-3 max-w-2xl font-body text-base leading-relaxed text-text-muted">
            O MMR FormulaDota é o número que mede o seu nível dentro da liga. Ele nasce da
            sua medalha real do Dota, sobe e desce nas partidas, e reseta a cada temporada.
            Aqui está tudo, do resumo ao detalhe.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TLDR.map((c) => (
              <div
                key={c.titulo}
                className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4"
              >
                <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-text-display">
                  <c.icon className="size-4 text-brand-primary" aria-hidden="true" />
                  {c.titulo}
                </p>
                <p className="mt-1.5 font-body text-sm leading-relaxed text-text-muted">
                  {c.texto}
                </p>
              </div>
            ))}
          </div>
        </header>

        {/* ─── A escala ─── */}
        <Section icon={Trophy} titulo="A escala das medalhas">
          <p>
            Usamos a <strong className="text-text-display">mesma escala oficial do Dota</strong>: 8
            medalhas, de Arauto a Imortal. Cada faixa de MMR corresponde a uma medalha. O teto do
            FormulaDota é <strong className="text-gold">7000</strong> — o topo é conquistado
            jogando, não inflaciona.
          </p>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-border-subtle">
            {LADDER.map((tier, i) => (
              <div
                key={tier.rank}
                className={`flex items-center gap-4 px-4 py-3 ${
                  i % 2 === 0 ? "bg-bg-elevated/30" : "bg-transparent"
                }`}
              >
                <DotaRankMedal rank={tier.rank} variant="formuladota" size="md" tooltip={false} />
                <span className="flex-1 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                  {tier.nome}
                </span>
                <span className="font-mono text-sm tabular-nums text-gold">{tier.faixa} MMR</span>
              </div>
            ))}
          </div>
          <p className="text-text-muted">
            Você vê duas medalhas no seu perfil: a <strong className="text-text-display">Valve</strong>{" "}
            (sua medalha oficial do Dota, o legado) e a <strong className="text-brand-primary">FormulaDota</strong>{" "}
            (o rank da temporada, na mesma escala, com a nossa pele).
          </p>
        </Section>

        {/* ─── De onde vem ─── */}
        <Section icon={Fingerprint} titulo="De onde vem o seu MMR">
          <p>
            Quando você joga sua primeira partida na liga, a gente <strong className="text-text-display">importa
            o seu nível real</strong> a partir da sua medalha Valve — você já entra no valor que
            aquela medalha representa (um Divino 3 entra mais alto que um Divino 1). Nada de "começar
            do zero e calibrar": a sua medalha JÁ é a prova do seu nível.
          </p>
          <p>
            Isso é parte do <strong className="text-text-display">anti-anonimato</strong>: a medalha
            pública é a sua identidade competitiva. Sem ela, não dá pra confirmar quem você é.
          </p>
        </Section>

        {/* ─── Como sobe e desce ─── */}
        <Section icon={TrendingUp} titulo="Como o MMR sobe e desce">
          <p>
            Cada partida move o seu MMR por dois fatores:
          </p>
          <ul className="ml-1 space-y-2">
            <li className="flex gap-2">
              <Swords className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />
              <span>
                <strong className="text-text-display">Resultado (Elo, base 25):</strong> vitória sobe,
                derrota desce. Ganhar de um time <em>mais forte</em> que o seu vale mais; ganhar de
                quem era mais fraco vale menos (você tinha que ganhar mesmo).
              </span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />
              <span>
                <strong className="text-text-display">Desempenho:</strong> o quão bem você jogou (por
                herói, comparado com a média) ajusta o valor. Jogar bem numa derrota faz você perder
                menos — <em>ou você ganha, ou você aprende</em>.
              </span>
            </li>
          </ul>
          <p>
            Pra não ter swing maluco, cada partida mexe no máximo{" "}
            <strong className="text-gold">±30 MMR</strong>. A variação exata da partida aparece no
            placar e no seu histórico (<span className="text-play-primary">+</span> verde /{" "}
            <span className="text-error">−</span> vermelho).
          </p>
        </Section>

        {/* ─── Temporadas ─── */}
        <Section icon={RotateCcw} titulo="Temporadas e reset">
          <p>
            A cada temporada (2 meses) o ranking reabre. Você não perde tudo: leva um{" "}
            <strong className="text-text-display">soft reset</strong> — o MMR volta um pouco (−30%) e
            você recalibra perto de onde parou. É o que mantém o topo <em>alcançável</em> pra todo
            mundo a cada ciclo, em vez de travado pra sempre nos mesmos nomes.
          </p>
        </Section>

        {/* ─── Místico ─── */}
        <Section icon={Trophy} titulo="Místico = Imortal">
          <p>
            O topo do seu <strong className="text-text-display">Nível</strong> (a escada Novato →
            Místico, que mede lealdade e domínio da doutrina) é o <strong className="text-brand-primary">Místico</strong>,
            e ele exige o Imortal. É a promessa da metodologia: seguir a Fórmula → chegar no Imortal.
          </p>
        </Section>

        {/* ─── Gate ─── */}
        <Section icon={Lock} titulo="Perfil público é obrigatório">
          <p>
            Pra entrar na fila, seu perfil do Dota precisa estar{" "}
            <strong className="text-text-display">público e calibrado</strong> — é assim que a gente
            lê sua medalha e prova seu nível. Conta privada ou descalibrada não entra: é o que
            mantém a liga <strong className="text-text-display">limpa de smurfs</strong>.
          </p>
        </Section>
      </div>
    </ClientShell>
  );
}
