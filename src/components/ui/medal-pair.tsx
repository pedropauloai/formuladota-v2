// MedalPair — par canônico SKILL (Valve) + HONOR (FormulaDota) com UM ÚNICO
// hover combinado (Pedro 2026-06-12): o showcase mostra as duas réguas de
// medalhas num painel só, em vez de um tooltip por medalha.

import {
  DotaRankMedal,
  SkillShowcase,
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
  /** Tamanho repassado às duas medalhas. @default "md" */
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
      <HonorRankMedal
        rank={honorRank}
        size={size}
        tooltip={false}
        glow={glow && honorRank === "mistico"}
      />
    </Tooltip>
  )
}
