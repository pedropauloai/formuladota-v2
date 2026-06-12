// CareerStatsBlock — bloco "Carreira" do perfil (dados OpenDota via getCareerStats).
//
// 3 andares:
//   1. Identidade competitiva — medalha Valve (rank_tier) + winrate de carreira
//      (W-L e % em GOLD) + badge "TOP {n}" (leaderboard regional — raríssimo,
//      é o status máximo do Dota)
//   2. Heróis de assinatura — top 3 da carreira com HeroVideo (o herói VIVO);
//      o nº 1 maior que os outros (hierarquia 60-30-10)
//   3. Veterania — abates/assistências/last hits acumulados como troféus dourados
//
// Estado null (sem Steam / OpenDota mudo) → EmptyState na voz da marca.
// Server Component — HeroVideo/EmptyState (client) são compostos normalmente.

import Link from "next/link";
import { Link2, ShieldQuestion } from "lucide-react";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HeroVideo } from "@/components/dota/hero-video";
import { EmptyState } from "@/components/ui/empty-state";
import { getHeroById } from "@/lib/queries/heroes";
import type { CareerStats, CareerHeroStat } from "@/lib/dota/career";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// rank_tier Valve → DotaRank
// ---------------------------------------------------------------------------

// rank_tier da OpenDota: dezena = medalha (1..8), unidade = estrelas.
const TIER_TO_RANK: Record<number, DotaRank> = {
  1: "herald",
  2: "guardian",
  3: "crusader",
  4: "archon",
  5: "legend",
  6: "ancient",
  7: "divine",
  8: "immortal",
};

/**
 * Converte rank_tier (OpenDota) → DotaRank do design system.
 * Retorna null quando o jogador não expõe rank público.
 * Imortal com leaderboard ≤ 100 ganha a medalha vermelha exclusiva.
 */
export function rankTierToDotaRank(
  rankTier: number | null,
  leaderboardRank: number | null
): DotaRank | null {
  if (rankTier == null) return null;
  const medal = Math.floor(rankTier / 10);
  if (medal === 8 && leaderboardRank != null && leaderboardRank <= 100) {
    return "immortal-top-100";
  }
  return TIER_TO_RANK[medal] ?? null;
}

// ---------------------------------------------------------------------------
// Resolução heroId → catálogo estático (slug pro HeroVideo + nome PT)
// ---------------------------------------------------------------------------

interface ResolvedHero {
  stat: CareerHeroStat;
  slug: string;
  name: string;
}

function resolveTopHeroes(stats: CareerHeroStat[], limit = 3): ResolvedHero[] {
  return stats
    .slice(0, limit)
    .map((stat) => {
      const hero = getHeroById(stat.heroId);
      return hero ? { stat, slug: hero.slug, name: hero.name_pt } : null;
    })
    .filter((h): h is ResolvedHero => h !== null);
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface CareerStatsBlockProps {
  career: CareerStats | null;
  /** true no /me (CTA "Vincular Steam"); false em perfil público (mensagem neutra). */
  ownProfile?: boolean;
}

export function CareerStatsBlock({
  career,
  ownProfile = false,
}: CareerStatsBlockProps) {
  return (
    <section className="space-y-5">
      <h2 className="font-display-condensed text-2xl uppercase leading-none tracking-wider text-text-muted">
        Carreira
      </h2>
      {career ? (
        <CareerContent career={career} />
      ) : (
        <CareerEmpty ownProfile={ownProfile} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Estado null — voz da marca (anti-anonimato: Steam = identidade)
// ---------------------------------------------------------------------------

function CareerEmpty({ ownProfile }: { ownProfile: boolean }) {
  if (!ownProfile) {
    return (
      <EmptyState
        icon={<ShieldQuestion />}
        title="Carreira ainda sem registro"
        description="Os números de carreira chegam quando a conta Steam deste jogador conversa com o OpenDota. Volte em breve."
      />
    );
  }
  return (
    <EmptyState
      icon={<Link2 />}
      title="Sua carreira merece aparecer aqui"
      description="Vincule sua Steam e a plataforma puxa sua história inteira do Dota: medalha, winrate de carreira e os heróis que te definem. Sem história não há reputação — e reputação é o que vale aqui dentro."
      action={
        <Link
          href="/vincular/steam"
          className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:text-text-display"
        >
          Vincular Steam →
        </Link>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Conteúdo com dados
// ---------------------------------------------------------------------------

function CareerContent({ career }: { career: CareerStats }) {
  const rank = rankTierToDotaRank(career.rankTier, career.leaderboardRank);
  const totalGames = career.wins + career.losses;
  const winratePct =
    totalGames > 0 ? Math.round((career.wins / totalGames) * 100) : null;
  const heroes = resolveTopHeroes(career.topHeroes);

  return (
    <div className="space-y-6">
      {/* ---- 1. Identidade competitiva ---- */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {rank ? (
          <DotaRankMedal
            rank={rank}
            size="lg"
            showLabel
            glow={rank === "immortal" || rank === "immortal-top-100"}
          />
        ) : (
          // Sem rank público na OpenDota — placeholder de não-calibrado
          <DotaRankMedal rank="herald" size="lg" showLabel calibrationStatus="visitante" />
        )}

        <div>
          <p className="font-display-condensed text-5xl leading-none tabular-nums text-gold">
            {winratePct !== null ? `${winratePct}%` : "—"}
            <span className="ml-2 text-xl uppercase tracking-wide text-gold-muted">
              winrate
            </span>
          </p>
          <p className="mt-1.5 font-mono text-sm tabular-nums text-gold">
            {career.wins.toLocaleString("pt-BR")}V
            <span className="text-gold-muted"> · </span>
            {career.losses.toLocaleString("pt-BR")}D
          </p>
        </div>

        {/* TOP {n} — só Imortais ranqueados no leaderboard. Status máximo. */}
        {career.leaderboardRank != null && (
          <span
            className="inline-flex items-center rounded-sm border border-border-gold bg-gold/10 px-3 py-1.5 font-display-condensed text-3xl uppercase leading-none tracking-wider text-gold-bright"
            title="Posição no leaderboard regional Valve — só Imortais ranqueados"
          >
            TOP {career.leaderboardRank.toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {/* ---- 2. Heróis de assinatura (top 3 — herói VIVO) ---- */}
      {heroes.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-faded">
            Heróis de assinatura
          </h3>
          <div className="flex flex-wrap items-stretch gap-3">
            {heroes.map((hero, index) => (
              <SignatureHeroCard
                key={hero.stat.heroId}
                hero={hero}
                primary={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- 3. Veterania — acumulados de carreira como troféus ---- */}
      <div className="space-y-2.5">
        <h3 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-faded">
          Veterania
        </h3>
        <div className="grid max-w-xl grid-cols-3 gap-3">
          <TrophyStat label="Abates" value={career.totals.kills} />
          <TrophyStat label="Assistências" value={career.totals.assists} />
          <TrophyStat label="Last hits" value={career.totals.lastHits} />
        </div>
      </div>

      <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        Fonte: OpenDota · sincronizado{" "}
        {new Date(career.syncedAt).toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de herói de assinatura — nº 1 maior (hierarquia 60-30-10)
// ---------------------------------------------------------------------------

function SignatureHeroCard({
  hero,
  primary,
}: {
  hero: ResolvedHero;
  primary: boolean;
}) {
  const { stat } = hero;
  const winrate = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-sm border bg-bg-elevated/60 p-3",
        // Nº 1 maior que os demais — hierarquia 60-30-10
        primary ? "w-64 border-border-gold/60" : "w-44 border-border-subtle"
      )}
    >
      <HeroVideo
        heroSlug={hero.slug}
        heroName={hero.name}
        size={primary ? "lg" : "md"}
        className="w-full"
      />
      <div className="space-y-1">
        <p
          className={cn(
            "font-display-condensed uppercase leading-none text-text-display",
            primary ? "text-2xl" : "text-lg"
          )}
        >
          {hero.name}
        </p>
        <p className="font-display text-sm font-semibold text-text-muted">
          {stat.games.toLocaleString("pt-BR")} jogos
        </p>
        <p
          className={cn(
            "font-display-condensed leading-none tabular-nums text-gold",
            primary ? "text-3xl" : "text-xl"
          )}
        >
          {winrate}%
          <span className="ml-1 text-sm uppercase tracking-wide text-gold-muted">
            winrate
          </span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrophyStat — número grande dourado + label uppercase muted
// ---------------------------------------------------------------------------

function TrophyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-elevated/60 px-4 py-3">
      <p className="font-display-condensed text-4xl leading-none tabular-nums text-gold">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 font-display text-sm font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </p>
    </div>
  );
}
