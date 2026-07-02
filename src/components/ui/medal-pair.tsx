// MedalPair — trio canônico dos eixos de rank com UM ÚNICO hover combinado
// (Pedro 2026-06-12; 3º selo 2026-07-01): SKILL (Valve crua) + RANK (pele
// FormulaDota, sazonal) + HONOR/NÍVEL. O showcase mostra as réguas num painel só.
// O rank sazonal (seasonRank) é OPCIONAL — sem ele, o par volta a ser SKILL+HONOR.

import {
  DotaRankMedal,
  SkillShowcase,
  RankShowcase,
  type DotaRank,
} from "@/components/ui/dota-rank-medal"
import {
  HonorRankMedal,
  HonorShowcase,
  type HonorRank,
} from "@/components/ui/honor-rank-medal"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MedalPairProps {
  dotaRank: DotaRank
  honorRank: HonorRank
  /** Rank sazonal FormulaDota (Eixo 2). Omitido = sem calibração/sem season → não exibe. */
  seasonRank?: DotaRank
  /** Tamanho repassado às medalhas. @default "md" */
  size?: "sm" | "md" | "lg" | "xl"
  /** Glow nas medalhas de topo (Imortal/Místico). @default true */
  glow?: boolean
  /** Lado onde o showcase abre. @default "top" */
  side?: "top" | "bottom" | "left" | "right"
  /** Alinhamento no eixo transversal. @default "center" */
  align?: "start" | "center" | "end"
  className?: string
}

export function MedalPair({
  dotaRank,
  honorRank,
  seasonRank,
  size = "md",
  glow = true,
  side = "top",
  align = "center",
  className,
}: MedalPairProps) {
  return (
    <Tooltip
      content={
        <span className="block divide-y divide-border-subtle">
          <span className="block pb-3">
            <SkillShowcase current={dotaRank} />
          </span>
          {seasonRank && (
            <span className="block py-3">
              <RankShowcase current={seasonRank} />
            </span>
          )}
          <span className="block pt-3">
            <HonorShowcase current={honorRank} />
          </span>
        </span>
      }
      side={side}
      align={align}
      contentClassName="max-w-none p-3"
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <DotaRankMedal
        rank={dotaRank}
        size={size}
        tooltip={false}
        glow={glow && (dotaRank === "immortal" || dotaRank === "immortal-top-100")}
      />
      {seasonRank && (
        <DotaRankMedal
          rank={seasonRank}
          variant="formuladota"
          size={size}
          tooltip={false}
          glow={glow && (seasonRank === "immortal" || seasonRank === "immortal-top-100")}
        />
      )}
      <HonorRankMedal
        rank={honorRank}
        size={size}
        tooltip={false}
        glow={glow && honorRank === "mistico"}
      />
    </Tooltip>
  )
}
