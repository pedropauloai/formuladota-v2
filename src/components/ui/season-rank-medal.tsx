// SeasonRankMedal — FONTE ÚNICA da medalha FORMULADOTA de temporada (Eixo 2).
// Mesma medalha usada no /ranking, no hover e na sidebar — pra ficarem IDÊNTICOS
// (Pedro 2026-07-04). A regra de leaderboard de Imortais (top 10 escura / top 30
// vermelha com número) mora aqui, não mais inline no /ranking.

import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier, IMMORTAL_FLOOR, IMMORTAL_ELITE_TOP, IMMORTAL_LEADERBOARD_TOP } from "@/lib/mmr";

/** Medalha pela colocação: <Imortal segue o MMR; Imortal top10 = escura, top30 =
 *  vermelha; resto = medalha Imortal base. `position` = colocação 1-based na season
 *  (passe um número grande, ex. 9999, quando a posição não é conhecida). */
export function rankMedalFor(mmr: number, position: number): DotaRank {
  if (mmr < IMMORTAL_FLOOR) return mmrToDotaRank(mmr);
  if (position <= IMMORTAL_ELITE_TOP) return "immortal-leaderboard";
  if (position <= IMMORTAL_LEADERBOARD_TOP) return "immortal-top-100";
  return mmrToDotaRank(mmr);
}

/** Número (#N) na placa da medalha — só top 30 Imortal. */
export function leaderboardNumberFor(mmr: number, position: number): number | undefined {
  return mmr >= IMMORTAL_FLOOR && position <= IMMORTAL_LEADERBOARD_TOP ? position : undefined;
}

export function SeasonRankMedal({
  mmr,
  position,
  size = "md",
  className,
}: {
  mmr: number | null;
  /** Colocação 1-based na season; ausente → 9999 (medalha base, sem número). */
  position?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const m = mmr ?? 0;
  const pos = position ?? 9999;
  return (
    <DotaRankMedal
      rank={rankMedalFor(m, pos)}
      stars={mmrToTier(m).stars}
      leaderboardNumber={leaderboardNumberFor(m, pos)}
      variant="formuladota"
      size={size}
      tooltip={false}
      className={className}
    />
  );
}
