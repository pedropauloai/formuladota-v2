// /mmr — página DIDÁTICA de como funciona o MMR FormulaDota (Pedro 2026-07-02:
// "é o que mais me perguntam"). Layout AMPLO (usa o canvas todo) + ilustrações.
// Server component, conteúdo estático. Escala espelha src/lib/mmr.ts (bandas oficiais
// do Dota, teto 7000). PT-BR (i18n EN é follow-up).

import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Fingerprint,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Swords,
  Lock,
  Crown,
  ArrowRight,
} from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";

export const metadata: Metadata = {
  title: "Como funciona o MMR — FORMULADOTA",
  description:
    "Seu MMR FormulaDota, explicado: importado da sua medalha Valve, escala oficial do Dota, teto 7000, leaderboard de Imortais por posição.",
};

// Escala (espelha TIER_BANDS de src/lib/mmr.ts). Imortal no topo = por POSIÇÃO.
const LADDER: { rank: DotaRank; nome: string; faixa: string; estrelas: string }[] = [
  { rank: "immortal", nome: "Imortal", faixa: "5620+", estrelas: "por posição (#N)" },
  { rank: "divine", nome: "Divino", faixa: "4620 – 5619", estrelas: "~200 / estrela" },
  { rank: "ancient", nome: "Ancião", faixa: "3850 – 4619", estrelas: "~154 / estrela" },
  { rank: "legend", nome: "Lenda", faixa: "3080 – 3849", estrelas: "~154 / estrela" },
  { rank: "archon", nome: "Arconte", faixa: "2310 – 3079", estrelas: "~154 / estrela" },
  { rank: "crusader", nome: "Cruzado", faixa: "1540 – 2309", estrelas: "~154 / estrela" },
  { rank: "guardian", nome: "Guardião", faixa: "770 – 1539", estrelas: "~154 / estrela" },
  { rank: "herald", nome: "Arauto", faixa: "0 – 769", estrelas: "~154 / estrela" },
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
      "Escala oficial do Dota. Imortal começa em 5620 e o topo é por POSIÇÃO (leaderboard) — sem teto que trava, sem inflação.",
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
    <section>
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-wide text-text-display 2xl:text-3xl">
        <Icon className="size-6 text-brand-primary 2xl:size-7" aria-hidden="true" />
        {titulo}
      </h2>
      <div className="mt-4 space-y-4 font-body text-base leading-8 text-text-body 2xl:text-lg 2xl:leading-9">
        {children}
      </div>
    </section>
  );
}

// Cartão de uma das 3 faixas de Imortal (base / vermelha / leaderboard).
function ImmortalTier({
  rank,
  titulo,
  faixa,
  desc,
  leaderboardNumber,
  highlight,
}: {
  rank: DotaRank;
  titulo: string;
  faixa: string;
  desc: string;
  leaderboardNumber?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-[var(--radius-md)] border p-5 text-center ${
        highlight ? "border-brand-primary/50 bg-brand-primary/10" : "border-border-subtle bg-bg-elevated/40"
      }`}
    >
      <DotaRankMedal
        rank={rank}
        leaderboardNumber={leaderboardNumber}
        variant="formuladota"
        size="xl"
        glow
        tooltip={false}
      />
      <p className="font-display text-lg font-bold uppercase tracking-wide text-text-display">{titulo}</p>
      <p className="-mt-2 font-display text-xs uppercase tracking-wide text-gold">{faixa}</p>
      <p className="font-body text-sm leading-6 text-text-muted">{desc}</p>
    </div>
  );
}

export default function MmrExplainerPage() {
  return (
    <ClientShell currentRoute="/mmr">
      <div className="w-full pb-16">
        {/* ─── HERO full-bleed: imagem da Lina + leaderboard à direita, texto à
            esquerda com fade pra leitura. ─── */}
        <header className="relative overflow-hidden border-b border-border-subtle">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/12 via-bg-base to-bg-base" />
          {/* Ilustração (Lina segurando a medalha + cards de leaderboard ao fundo) —
              à direita no desktop; fade à esquerda garante leitura do texto. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] lg:block">
            <Image
              src="/images/mmr/matchmaking.png"
              alt=""
              fill
              priority
              unoptimized
              aria-hidden="true"
              className="object-contain object-right"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/40 to-transparent" />
          </div>
          <div className="relative mx-auto w-full max-w-6xl px-6 py-16 xl:px-10 xl:py-24">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
              Ranking · Guia
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold uppercase tracking-tight text-text-display drop-shadow-lg md:text-6xl">
              Como funciona o MMR
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-8 text-text-muted 2xl:text-xl 2xl:leading-9">
              O MMR FormulaDota é o número que mede o seu nível dentro da liga. Ele nasce da sua
              medalha real do Dota, sobe e desce nas partidas, reseta a cada temporada — e no topo,
              vira uma corrida por posição. Aqui está tudo, do resumo ao detalhe.
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-6 xl:px-10">
          {/* ─── TL;DR — 4 cards largos ─── */}
          <div className="mt-4 mb-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TLDR.map((c) => (
              <div
                key={c.titulo}
                className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/50 p-6 backdrop-blur-sm"
              >
                <c.icon className="size-7 text-brand-primary" aria-hidden="true" />
                <p className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                  {c.titulo}
                </p>
                <p className="mt-2 font-body text-base leading-7 text-text-muted">{c.texto}</p>
              </div>
            ))}
          </div>

          {/* ─── A escala (2 colunas: texto + ladder) ─── */}
          <div className="grid gap-10 border-t border-border-subtle pt-12 lg:grid-cols-[1fr_1.1fr]">
            <Section icon={Trophy} titulo="A escala das medalhas">
              <p>
                Usamos a <strong className="text-text-display">mesma escala oficial do Dota</strong>:
                8 medalhas, de Arauto a Imortal. Abaixo do Imortal, cada medalha tem{" "}
                <strong className="text-text-display">5 estrelas</strong> — cada estrela vale ~154 MMR
                (e ~200 no Divino). No <strong className="text-brand-primary">Imortal</strong> não há
                teto: o rank é por <strong className="text-text-display">posição</strong>.
              </p>
              <p className="text-text-muted">
                No seu perfil você vê a medalha <strong className="text-text-display">Valve</strong>{" "}
                (oficial do Dota, o legado) e a{" "}
                <strong className="text-brand-primary">FormulaDota</strong> (o rank da temporada, na
                mesma escala, com a nossa pele).
              </p>
            </Section>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-subtle">
              {LADDER.map((tier, i) => (
                <div
                  key={tier.rank}
                  className={`flex items-center gap-4 px-4 py-3 ${
                    tier.rank === "immortal"
                      ? "bg-brand-primary/10"
                      : i % 2 === 0
                        ? "bg-bg-elevated/30"
                        : "bg-transparent"
                  }`}
                >
                  <DotaRankMedal
                    rank={tier.rank}
                    variant="formuladota"
                    size="md"
                    tooltip={false}
                    glow={tier.rank === "immortal"}
                  />
                  <span className="flex-1 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                    {tier.nome}
                    <span className="ml-2 font-body text-xs font-normal normal-case text-text-faded">
                      {tier.estrelas}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-gold">{tier.faixa} MMR</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── De onde vem ─── */}
          <div className="border-t border-border-subtle pt-12">
            <Section icon={Fingerprint} titulo="De onde vem o seu MMR">
              <div className="grid gap-6 lg:grid-cols-2">
                <p>
                  Quando você joga sua primeira partida na liga, a gente{" "}
                  <strong className="text-text-display">importa o seu nível real</strong> a partir da
                  sua medalha Valve — você já entra no valor que aquela medalha representa (um Divino
                  3 entra mais alto que um Divino 1). Nada de “começar do zero e calibrar”: a sua
                  medalha JÁ é a prova do seu nível.
                </p>
                <p>
                  Isso é parte do <strong className="text-text-display">anti-anonimato</strong>: a
                  medalha pública é a sua identidade competitiva. Sem ela, não dá pra confirmar quem
                  você é — por isso perfil privado não entra na fila.
                </p>
              </div>
            </Section>
          </div>

          {/* ─── Como sobe/desce — texto + ILUSTRAÇÃO (performance) ─── */}
          <div className="grid items-center gap-10 border-t border-border-subtle pt-12 lg:grid-cols-2">
            <Section icon={TrendingUp} titulo="Como o MMR sobe e desce">
              <p>Cada partida move o seu MMR por dois fatores:</p>
              <ul className="ml-1 space-y-2">
                <li className="flex gap-2">
                  <Swords className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>
                    <strong className="text-text-display">Resultado (Elo, base 25):</strong> vitória
                    sobe, derrota desce. Ganhar de um time <em>mais forte</em> vale mais; ganhar de
                    quem era mais fraco vale menos.
                  </span>
                </li>
                <li className="flex gap-2">
                  <TrendingUp
                    className="mt-0.5 size-4 shrink-0 text-brand-primary"
                    aria-hidden="true"
                  />
                  <span>
                    <strong className="text-text-display">Desempenho:</strong> o quão bem você jogou
                    (por herói, comparado à média) ajusta o valor. Jogar bem numa derrota faz você
                    perder menos — <em>ou você ganha, ou você aprende</em>.
                  </span>
                </li>
              </ul>
              <p>
                Pra não ter swing maluco, cada partida mexe no máximo{" "}
                <strong className="text-gold">±30 MMR</strong>. A variação exata aparece no placar e
                no seu histórico (<span className="text-play-primary">+</span> verde /{" "}
                <span className="text-error">−</span> vermelho).
              </p>
            </Section>
            <Image
              src="/images/mmr/performance.png"
              alt="Painel de performance de uma partida"
              width={900}
              height={560}
              unoptimized
              className="h-auto w-full"
            />
          </div>

          {/* ─── Desempenho detalhado — ILUSTRAÇÃO (graphs) + texto ─── */}
          <div className="grid items-center gap-10 border-t border-border-subtle pt-12 lg:grid-cols-2">
            <Image
              src="/images/mmr/graphs-player-damage.png"
              alt="Gráfico de dano por jogador ao longo da partida"
              width={900}
              height={560}
              unoptimized
              className="order-2 h-auto w-full lg:order-1"
            />
            <div className="order-1 lg:order-2">
              <Section icon={Swords} titulo="Desempenho é medido de verdade">
                <p>
                  A gente não olha só o placar: cada partida traz gráficos completos (dano, ouro,
                  experiência, objetivos) por jogador e por minuto. O seu desempenho é comparado com
                  a <strong className="text-text-display">média do seu herói</strong> — então um
                  suporte é medido como suporte, um carry como carry.
                </p>
                <p className="text-text-muted">
                  É esse retrato honesto que modula o seu MMR e que você revê no placar pós-jogo,
                  aba por aba.
                </p>
              </Section>
            </div>
          </div>

          {/* ─── O TOPO: leaderboard de Imortais — 3 medalhas distintas ─── */}
          <div className="mt-14 overflow-hidden rounded-[var(--radius-lg)] border border-brand-primary/40 bg-brand-primary/5">
            <div className="p-6 md:p-9">
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-wide text-text-display 2xl:text-3xl">
                <Crown className="size-6 text-brand-primary 2xl:size-7" aria-hidden="true" />
                No topo, vale a POSIÇÃO
              </h2>
              <div className="mt-4 space-y-4 font-body text-base leading-8 text-text-body 2xl:text-lg 2xl:leading-9">
                <p>
                  Acima de <strong className="text-gold">5620</strong> (piso do Imortal), o número
                  para de importar sozinho — o que vale é o seu{" "}
                  <strong className="text-text-display">lugar no leaderboard</strong> da temporada:
                  Imortal <strong className="text-text-display">#1</strong>, #2, #3… Um ranking
                  global, sem teto inflacionado, onde ser o melhor é ser o{" "}
                  <strong className="text-text-display">#1 de verdade</strong>.
                </p>
              </div>
              {/* As 3 medalhas de Imortal, da base ao topo — cada faixa tem a sua. */}
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <ImmortalTier
                  rank="immortal"
                  titulo="Imortal"
                  faixa="5620+ · fora do top 30"
                  desc="A medalha padrão de todo Imortal da liga."
                />
                <ImmortalTier
                  rank="immortal-top-100"
                  titulo="Top 30 – 11"
                  faixa="a elite da temporada"
                  desc="A medalha vermelha, com a sua posição gravada dentro dela."
                  leaderboardNumber={23}
                />
                <ImmortalTier
                  rank="immortal-leaderboard"
                  titulo="Top 10 – 1"
                  faixa="o cume do leaderboard"
                  desc="A medalha oficial de leaderboard — do #1 ao #10, com o número dentro."
                  leaderboardNumber={1}
                  highlight
                />
              </div>
            </div>
          </div>

          {/* ─── Temporadas / Místico / Gate — 3 cards ─── */}
          <div className="mt-12 grid gap-4 border-t border-border-subtle pt-12 lg:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={RotateCcw} titulo="Temporadas">
                <p>
                  A cada temporada (2 meses) o ranking reabre com um{" "}
                  <strong className="text-text-display">soft reset</strong> (−30%): você recalibra
                  perto de onde parou. É o que mantém o topo <em>alcançável</em> a cada ciclo.
                </p>
              </Section>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={Trophy} titulo="Místico = Imortal">
                <p>
                  O topo do seu <strong className="text-text-display">Nível</strong> (Novato →
                  Místico) exige o Imortal. É a promessa da metodologia: seguir a Fórmula → chegar no
                  Imortal.
                </p>
              </Section>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={Lock} titulo="Perfil público">
                <p>
                  Pra entrar na fila, seu perfil do Dota precisa estar{" "}
                  <strong className="text-text-display">público e calibrado</strong> — é assim que
                  lemos sua medalha. Mantém a liga <strong className="text-text-display">limpa de
                  smurfs</strong>.
                </p>
              </Section>
            </div>
          </div>

          {/* ─── CTA final ─── */}
          <div className="mt-12 flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/30 p-8 text-center">
            <p className="font-display text-xl font-bold uppercase tracking-wide text-text-display">
              Pronto pra subir?
            </p>
            <Link
              href="/ranking"
              className="group inline-flex items-center gap-2 rounded-md border-2 border-brand-primary bg-brand-primary/15 px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-text-display transition-all hover:scale-[1.02] hover:bg-brand-primary/25"
            >
              <Trophy className="size-5 text-brand-primary" aria-hidden="true" />
              Ver o ranking da temporada
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
