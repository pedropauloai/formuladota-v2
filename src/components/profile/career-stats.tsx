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

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/ui/count-up";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { Tooltip } from "@/components/ui/tooltip";
import { HeroFace } from "@/components/dota/hero-face";
import { getHeroById } from "@/lib/queries/heroes";
import type { CareerStats, CareerHeroStat } from "@/lib/dota/career";
import { cn } from "@/lib/utils";

// rank_tier Valve → DotaRank: a implementação canônica vive em @/lib/dota/rank-badges
// (fonte única). Importado + re-exportado aqui só por compatibilidade dos imports.
import { rankTierToDotaRank } from "@/lib/dota/rank-badges";
export { rankTierToDotaRank };

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
  const t = useTranslations("perfil");
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
        content={t("winrateTooltip")}
        side="bottom"
        align="start"
      >
        <div>
          <p className="font-display-condensed text-3xl leading-none tabular-nums text-gold">
            {winratePct !== null ? (
              <CountUp value={winratePct} from={0} suffix="%" />
            ) : (
              "—"
            )}
            <span className="ml-1.5 text-sm uppercase tracking-wide text-gold-muted">
              {t("winrate")}
            </span>
          </p>
          <p className="mt-1 font-mono text-xs 2xl:text-sm tabular-nums text-gold">
            {t("winsShort", { wins: career.wins.toLocaleString("pt-BR") })}
            <span className="text-gold-muted"> · </span>
            {t("lossesShort", { losses: career.losses.toLocaleString("pt-BR") })}
          </p>
        </div>
      </Tooltip>

      {/* TOP {n} — só Imortais ranqueados no leaderboard. Status máximo. */}
      {career.leaderboardRank != null && (
        <Tooltip
          content={t("leaderboardTooltip")}
          side="bottom"
        >
          <span className="inline-flex items-center rounded-sm border border-border-gold bg-gold/10 px-2 py-1 font-display-condensed text-xl uppercase leading-none tracking-wider text-gold-bright">
            {t("topRank", { rank: career.leaderboardRank.toLocaleString("pt-BR") })}
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
  const t = useTranslations("perfil");
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
          {t("gamesCount", { count: stat.games.toLocaleString("pt-BR") })}
        </p>
        <p className="mt-0.5 font-display-condensed text-lg 2xl:text-xl leading-none tabular-nums text-gold">
          {winrate}%
          <span className="ml-1 text-[10px] uppercase tracking-wide text-gold-muted">
            {t("wr")}
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
  const t = useTranslations("perfil");
  return (
    <Link
      href="/vincular/steam"
      className={cn(
        "inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:text-text-display",
        className
      )}
      title={t("linkSteamCtaTitle")}
    >
      {t("linkSteamCta")}
    </Link>
  );
}
