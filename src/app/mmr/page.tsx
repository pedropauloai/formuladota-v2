// /mmr — página DIDÁTICA de como funciona o MMR FormulaDota (Pedro 2026-07-02:
// "é o que mais me perguntam"). Layout AMPLO (usa o canvas todo) + ilustrações.
// Server component, conteúdo estático. Escala espelha src/lib/mmr.ts (bandas oficiais
// do Dota; Imortal 5620+, topo por POSIÇÃO, sem teto). PT-BR (i18n EN é follow-up).

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  Scale,
  Users,
  ArrowRight,
} from "lucide-react";
import { ClientShell } from "@/components/client-shell/shell";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pgMisc");
  return {
    title: t("mmr_metaTitle"),
    description: t("mmr_metaDescription"),
  };
}

// Escala (espelha TIER_BANDS de src/lib/mmr.ts). Imortal no topo = por POSIÇÃO.
// nomeKey/estrelasKey resolvem por idioma (namespace pgMisc) no render.
const LADDER: { rank: DotaRank; nomeKey: string; faixa: string; estrelasKey: string }[] = [
  { rank: "immortal", nomeKey: "mmr_rankImmortal", faixa: "5620+", estrelasKey: "mmr_starsByPosition" },
  { rank: "divine", nomeKey: "mmr_rankDivine", faixa: "4620 – 5619", estrelasKey: "mmr_stars200" },
  { rank: "ancient", nomeKey: "mmr_rankAncient", faixa: "3850 – 4619", estrelasKey: "mmr_stars154" },
  { rank: "legend", nomeKey: "mmr_rankLegend", faixa: "3080 – 3849", estrelasKey: "mmr_stars154" },
  { rank: "archon", nomeKey: "mmr_rankArchon", faixa: "2310 – 3079", estrelasKey: "mmr_stars154" },
  { rank: "crusader", nomeKey: "mmr_rankCrusader", faixa: "1540 – 2309", estrelasKey: "mmr_stars154" },
  { rank: "guardian", nomeKey: "mmr_rankGuardian", faixa: "770 – 1539", estrelasKey: "mmr_stars154" },
  { rank: "herald", nomeKey: "mmr_rankHerald", faixa: "0 – 769", estrelasKey: "mmr_stars154" },
];

const TLDR = [
  { icon: Fingerprint, titleKey: "mmr_tldr1Title", textKey: "mmr_tldr1Text" },
  { icon: TrendingUp, titleKey: "mmr_tldr2Title", textKey: "mmr_tldr2Text" },
  { icon: RotateCcw, titleKey: "mmr_tldr3Title", textKey: "mmr_tldr3Text" },
  { icon: ShieldCheck, titleKey: "mmr_tldr4Title", textKey: "mmr_tldr4Text" },
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

// Mapeamento das tags ricas usadas nas strings i18n (namespace pgMisc) → elementos
// estilizados. disp = destaque claro, red = vermelho de marca, gold = dourado.
const richTags = {
  disp: (chunks: React.ReactNode) => <strong className="text-text-display">{chunks}</strong>,
  red: (chunks: React.ReactNode) => <strong className="text-brand-primary">{chunks}</strong>,
  gold: (chunks: React.ReactNode) => <strong className="text-gold">{chunks}</strong>,
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
  plus: (chunks: React.ReactNode) => <span className="text-play-primary">{chunks}</span>,
  minus: (chunks: React.ReactNode) => <span className="text-error">{chunks}</span>,
};

export default async function MmrExplainerPage() {
  const t = await getTranslations("pgMisc");
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
              src="/images/mmr/matchmaking.webp"
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
              {t("mmr_heroKicker")}
            </p>
            <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold uppercase tracking-tight text-text-display drop-shadow-lg md:text-6xl">
              {t("mmr_heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl font-body text-lg leading-8 text-text-muted 2xl:text-xl 2xl:leading-9">
              {t("mmr_heroBody")}
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-6 xl:px-10">
          {/* ─── TL;DR — 4 cards largos ─── */}
          <div className="mt-4 mb-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TLDR.map((c) => (
              <div
                key={c.titleKey}
                className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/50 p-6 backdrop-blur-sm"
              >
                <c.icon className="size-7 text-brand-primary" aria-hidden="true" />
                <p className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                  {t(c.titleKey)}
                </p>
                <p className="mt-2 font-body text-base leading-7 text-text-muted">{t(c.textKey)}</p>
              </div>
            ))}
          </div>

          {/* ─── A escala (2 colunas: texto + ladder) ─── */}
          <div className="grid gap-10 border-t border-border-subtle pt-12 lg:grid-cols-[1fr_1.1fr]">
            <Section icon={Trophy} titulo={t("mmr_secScaleTitle")}>
              <p>{t.rich("mmr_secScaleP1", richTags)}</p>
              <p className="text-text-muted">{t.rich("mmr_secScaleP2", richTags)}</p>
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
                    {t(tier.nomeKey)}
                    <span className="ml-2 font-body text-xs font-normal normal-case text-text-faded">
                      {t(tier.estrelasKey)}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-gold">{tier.faixa} MMR</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── De onde vem ─── */}
          <div className="border-t border-border-subtle pt-12">
            <Section icon={Fingerprint} titulo={t("mmr_secOriginTitle")}>
              <div className="grid gap-6 lg:grid-cols-2">
                <p>{t.rich("mmr_secOriginP1", richTags)}</p>
                <p>{t.rich("mmr_secOriginP2", richTags)}</p>
              </div>
            </Section>
          </div>

          {/* ─── Com quem você joga (matchmaking por skill) ─── */}
          <div className="border-t border-border-subtle pt-12">
            <Section icon={Scale} titulo={t("mmr_secMatchTitle")}>
              <p>{t.rich("mmr_secMatchP1", richTags)}</p>
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
                  <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                    <Scale className="size-5 text-brand-primary" aria-hidden="true" />
                    {t("mmr_cardBalancedTitle")}
                  </p>
                  <p className="mt-2 font-body text-base leading-7 text-text-muted">
                    {t.rich("mmr_cardBalancedBody", richTags)}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
                  <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-text-display">
                    <Users className="size-5 text-brand-primary" aria-hidden="true" />
                    {t("mmr_cardGroupTitle")}
                  </p>
                  <p className="mt-2 font-body text-base leading-7 text-text-muted">
                    {t.rich("mmr_cardGroupBody", richTags)}
                  </p>
                </div>
              </div>
            </Section>
          </div>

          {/* ─── Como sobe/desce — texto + ILUSTRAÇÃO (performance) ─── */}
          <div className="grid items-center gap-10 border-t border-border-subtle pt-12 lg:grid-cols-[1fr_1.3fr]">
            <Section icon={TrendingUp} titulo={t("mmr_secRiseTitle")}>
              <p>{t("mmr_secRiseIntro")}</p>
              <ul className="ml-1 space-y-2">
                <li className="flex gap-2">
                  <Swords className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  <span>{t.rich("mmr_secRiseLi1", richTags)}</span>
                </li>
                <li className="flex gap-2">
                  <TrendingUp
                    className="mt-0.5 size-4 shrink-0 text-brand-primary"
                    aria-hidden="true"
                  />
                  <span>{t.rich("mmr_secRiseLi2", richTags)}</span>
                </li>
                <li className="flex gap-2">
                  <TrendingUp
                    className="mt-0.5 size-4 shrink-0 text-brand-primary"
                    aria-hidden="true"
                  />
                  <span>{t.rich("mmr_secRiseLi3", richTags)}</span>
                </li>
              </ul>
              <p>{t.rich("mmr_secRiseP", richTags)}</p>
            </Section>
            <figure className="relative">
              {/* PNG sem borda (Pedro 2026-07-05): destaque só pelo glow da marca +
                  profundidade, que aparecem no fundo escuro sem "emoldurar" a imagem. */}
              <Image
                src="/images/mmr/performance.png"
                alt={t("mmr_riseImgAlt")}
                width={1100}
                height={686}
                unoptimized
                className="h-auto w-full [filter:drop-shadow(0_14px_34px_rgba(0,0,0,0.55))_drop-shadow(0_0_30px_var(--color-brand-primary-glow))]"
              />
            </figure>
          </div>

          {/* ─── Desempenho detalhado — ILUSTRAÇÃO (graphs) + texto ─── */}
          <div className="grid items-center gap-10 border-t border-border-subtle pt-12 lg:grid-cols-[1.3fr_1fr]">
            <figure className="relative order-2 lg:order-1">
              {/* PNG sem borda (Pedro 2026-07-05): destaque só pelo glow + profundidade. */}
              <Image
                src="/images/mmr/graphs-player-damage.png"
                alt={t("mmr_perfImgAlt")}
                width={1100}
                height={686}
                unoptimized
                className="h-auto w-full [filter:drop-shadow(0_14px_34px_rgba(0,0,0,0.55))_drop-shadow(0_0_30px_var(--color-brand-primary-glow))]"
              />
            </figure>
            <div className="order-1 lg:order-2">
              <Section icon={Swords} titulo={t("mmr_secPerfTitle")}>
                <p>{t.rich("mmr_secPerfP1", richTags)}</p>
                <p>{t.rich("mmr_secPerfP2", richTags)}</p>
                <p>{t.rich("mmr_secPerfP3", richTags)}</p>
                <p className="text-text-muted">{t("mmr_secPerfP4")}</p>
              </Section>
            </div>
          </div>

          {/* ─── O TOPO: leaderboard de Imortais — 3 medalhas distintas ─── */}
          <div className="mt-14 overflow-hidden rounded-[var(--radius-lg)] border border-brand-primary/40 bg-brand-primary/5">
            <div className="p-6 md:p-9">
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-wide text-text-display 2xl:text-3xl">
                <Crown className="size-6 text-brand-primary 2xl:size-7" aria-hidden="true" />
                {t("mmr_topTitle")}
              </h2>
              <div className="mt-4 space-y-4 font-body text-base leading-8 text-text-body 2xl:text-lg 2xl:leading-9">
                <p>{t.rich("mmr_topP", richTags)}</p>
              </div>
              {/* As 3 medalhas de Imortal, da base ao topo — cada faixa tem a sua. */}
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <ImmortalTier
                  rank="immortal"
                  titulo={t("mmr_tier1Title")}
                  faixa={t("mmr_tier1Faixa")}
                  desc={t("mmr_tier1Desc")}
                />
                <ImmortalTier
                  rank="immortal-top-100"
                  titulo={t("mmr_tier2Title")}
                  faixa={t("mmr_tier2Faixa")}
                  desc={t("mmr_tier2Desc")}
                  leaderboardNumber={23}
                />
                <ImmortalTier
                  rank="immortal-leaderboard"
                  titulo={t("mmr_tier3Title")}
                  faixa={t("mmr_tier3Faixa")}
                  desc={t("mmr_tier3Desc")}
                  leaderboardNumber={1}
                  highlight
                />
              </div>
            </div>
          </div>

          {/* ─── Temporadas / Místico / Gate — 3 cards ─── */}
          <div className="mt-12 grid gap-4 border-t border-border-subtle pt-12 lg:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={RotateCcw} titulo={t("mmr_secSeasonsTitle")}>
                <p>{t.rich("mmr_secSeasonsP", richTags)}</p>
              </Section>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={Trophy} titulo={t("mmr_secMysticTitle")}>
                <p>{t.rich("mmr_secMysticP", richTags)}</p>
              </Section>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-5">
              <Section icon={Lock} titulo={t("mmr_secPublicTitle")}>
                <p>{t.rich("mmr_secPublicP", richTags)}</p>
              </Section>
            </div>
          </div>

          {/* ─── CTA final ─── */}
          <div className="mt-12 flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/30 p-8 text-center">
            <p className="font-display text-xl font-bold uppercase tracking-wide text-text-display">
              {t("mmr_ctaTitle")}
            </p>
            <Link
              href="/ranking"
              className="group inline-flex items-center gap-2 rounded-md border-2 border-brand-primary bg-brand-primary/15 px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-text-display transition-all hover:scale-[1.02] hover:bg-brand-primary/25"
            >
              <Trophy className="size-5 text-brand-primary" aria-hidden="true" />
              {t("mmr_ctaButton")}
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </ClientShell>
  );
}
