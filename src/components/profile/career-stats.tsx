// Sub-peças ENCAIXÁVEIS de carreira (dados híbridos STRATZ + OpenDota via
// getCareerStats). REFATOR 2026-06-11 (feedback Pedro): o antigo
// CareerStatsBlock era uma seção full-width APENSADA ao perfil e criava
// rolagem extra. Agora a carreira se distribui nos espaços que JÁ existem:
//
//   <CareerIdentityInline>   medalha Valve + winrate (GOLD) + badge TOP {n}
//                            → dentro do header/identidade existente
//   <SignatureHeroesStrip>   top 3 heróis com HeroVideo (o herói VIVO),
//                            horizontal compacto → encaixa em header ou em
//                            área de heróis já existente
//   veterania (kills/assists/last hits) → células nas linhas de stats
//                            numéricos existentes (WidgetStats no /me,
//                            "Temporada atual" no público) — sem bloco novo
//   <CareerLinkSteamCta>     CTA compacto "Vincular Steam" pro /me sem carreira
//
// Nenhuma peça cria seção empilhada — todas são inline/flex pra caber na
// altura que a página já tinha. Server Components — HeroVideo (client) é
// composto normalmente.

import Link from "next/link";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { Tooltip } from "@/components/ui/tooltip";
import { HeroFace } from "@/components/dota/hero-face";
import { getHeroById } from "@/lib/queries/heroes";
import type { CareerStats, CareerHeroStat } from "@/lib/dota/career";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// rank_tier Valve → DotaRank
// ---------------------------------------------------------------------------

// rank_tier (STRATZ seasonRank / OpenDota): dezena = medalha (1..8), unidade = estrelas.
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
 * Converte rank_tier (STRATZ/OpenDota) → DotaRank do design system.
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
// CareerIdentityInline — medalha + winrate + TOP {n} na MESMA linha do header
// ---------------------------------------------------------------------------

interface CareerIdentityInlineProps {
  career: CareerStats;
  /**
   * false quando o header já exibe uma DotaRankMedal própria (perfil público)
   * — aí esta peça contribui só com winrate + badge TOP, sem duplicar medalha.
   */
  showMedal?: boolean;
  className?: string;
}

export function CareerIdentityInline({
  career,
  showMedal = true,
  className,
}: CareerIdentityInlineProps) {
  const rank = rankTierToDotaRank(career.rankTier, career.leaderboardRank);
  const totalGames = career.wins + career.losses;
  const winratePct =
    totalGames > 0 ? Math.round((career.wins / totalGames) * 100) : null;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {showMedal && rank && (
        <DotaRankMedal
          rank={rank}
          size="md"
          glow={rank === "immortal" || rank === "immortal-top-100"}
        />
      )}

      {/* Winrate de carreira — número em GOLD, compacto pra caber no header.
          Hover educacional: fonte e abrangência do número. */}
      <Tooltip
        content="Winrate da carreira completa, todos os modos (inclui Turbo) — fonte STRATZ/OpenDota."
        side="bottom"
        align="start"
      >
        <div>
          <p className="font-display-condensed text-3xl leading-none tabular-nums text-gold">
            {winratePct !== null ? `${winratePct}%` : "—"}
            <span className="ml-1.5 text-sm uppercase tracking-wide text-gold-muted">
              winrate
            </span>
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-gold">
            {career.wins.toLocaleString("pt-BR")}V
            <span className="text-gold-muted"> · </span>
            {career.losses.toLocaleString("pt-BR")}D
          </p>
        </div>
      </Tooltip>

      {/* TOP {n} — só Imortais ranqueados no leaderboard. Status máximo. */}
      {career.leaderboardRank != null && (
        <Tooltip
          content="Posição no leaderboard regional Valve — só Imortais ranqueados."
          side="bottom"
        >
          <span className="inline-flex items-center rounded-sm border border-border-gold bg-gold/10 px-2 py-1 font-display-condensed text-xl uppercase leading-none tracking-wider text-gold-bright">
            TOP {career.leaderboardRank.toLocaleString("pt-BR")}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SignatureHeroesStrip — top 3 heróis VIVOS em linha horizontal compacta
// ---------------------------------------------------------------------------

interface SignatureHeroesStripProps {
  career: CareerStats;
  limit?: number;
  className?: string;
}

export function SignatureHeroesStrip({
  career,
  limit = 3,
  className,
}: SignatureHeroesStripProps) {
  const heroes = resolveTopHeroes(career.topHeroes, limit);
  if (heroes.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {heroes.map((hero, index) => (
        <SignatureHeroMini
          key={hero.stat.heroId}
          hero={hero}
          primary={index === 0}
        />
      ))}
    </div>
  );
}

// Mini-card horizontal: ROSTO do herói 64px (HeroFace) + nome/jogos/winrate.
// Pedro 2026-06-11: em local pequeno, só o rosto dá destaque — corpo inteiro
// (vídeo) fica pros backdrops grandes. Altura ≈ 64px, cabe ao lado do avatar XL.
function SignatureHeroMini({
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
        "flex items-center gap-2 rounded-sm border bg-bg-elevated/60 p-1.5 pr-2.5",
        // Nº 1 com borda dourada — hierarquia sem mudar a altura
        primary ? "border-border-gold/60" : "border-border-subtle"
      )}
    >
      <HeroFace heroSlug={hero.slug} heroName={hero.name} size="sm" />
      <div className="min-w-0">
        <p className="font-display-condensed text-base uppercase leading-none text-text-display truncate max-w-[7rem]">
          {hero.name}
        </p>
        <p className="mt-0.5 font-display text-[11px] font-semibold text-text-muted">
          {stat.games.toLocaleString("pt-BR")} jogos
        </p>
        <p className="mt-0.5 font-display-condensed text-lg leading-none tabular-nums text-gold">
          {winrate}%
          <span className="ml-1 text-[10px] uppercase tracking-wide text-gold-muted">
            wr
          </span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CareerLinkSteamCta — CTA compacto pro /me sem carreira (sem EmptyState gigante)
// ---------------------------------------------------------------------------

export function CareerLinkSteamCta({ className }: { className?: string }) {
  return (
    <Link
      href="/vincular/steam"
      className={cn(
        "inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:text-text-display",
        className
      )}
      title="Vincule sua Steam e a plataforma puxa sua história inteira do Dota: medalha, winrate de carreira e os heróis que te definem."
    >
      Vincular Steam →
    </Link>
  );
}
