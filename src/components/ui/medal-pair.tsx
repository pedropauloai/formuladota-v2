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
  /** Estrelas (1–5) da medalha SKILL Valve. Omitido = sem pips. */
  dotaStars?: number
  /** Estrelas (1–5) do rank sazonal FormulaDota. Omitido = sem pips. */
  seasonStars?: number
  /** Nº do leaderboard (#N) dentro do anel — só top 10 Imortais. */
  seasonLeaderboardNumber?: number
  /**
   * Exibe a medalha SKILL Valve INLINE no par. @default true.
   * `false` (telas de identidade — perfil/mini/hover): a Valve sai do par (fica
   * só RANK sazonal + HONRA), pra NÃO disputar destaque com a nossa medalha —
   * a info da conta Valve vira credencial discreta (<ValveCredential>) e segue
   * no showcase do hover. Pedro 2026-07-02.
   */
  skillInline?: boolean
  /**
   * Exibe a medalha de HONRA (nível) INLINE no par. @default true.
   * `false` (mini-perfil): a honra sai do par porque JÁ está representada pelo
   * nível (anel do avatar + card de progresso) — a medalha de honra é literalmente
   * `getGatedTierForLevel(nível)`, então mostrar as duas é redundante. Fica só o
   * rank sazonal (MMR). A honra segue no showcase do hover. Pedro 2026-07-05.
   */
  honorInline?: boolean
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
  dotaStars,
  seasonStars,
  seasonLeaderboardNumber,
  skillInline = true,
  honorInline = true,
  size = "md",
  glow = true,
  side = "top",
  align = "center",
  className,
}: MedalPairProps) {
  return (
    <Tooltip
      content={
        // Ordem = PRIORIDADE (Pedro 2026-07-02): a NOSSA medalha (rank sazonal
        // FormulaDota) vem PRIMEIRO, depois honra; a Valve (SKILL, pré-calibração)
        // fica por ÚLTIMO — ela não é o protagonista.
        <span className="block divide-y divide-border-subtle">
          {seasonRank && (
            <span className="block pb-3">
              <RankShowcase current={seasonRank} />
            </span>
          )}
          <span className={seasonRank ? "block py-3" : "block pb-3"}>
            <HonorShowcase current={honorRank} />
          </span>
          <span className="block pt-3">
            <SkillShowcase current={dotaRank} />
          </span>
        </span>
      }
      side={side}
      align={align}
      contentClassName="max-w-none p-3"
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {skillInline && (
        <DotaRankMedal
          rank={dotaRank}
          stars={dotaStars}
          size={size}
          tooltip={false}
          glow={glow && (dotaRank === "immortal" || dotaRank === "immortal-top-100")}
        />
      )}
      {seasonRank && (
        <DotaRankMedal
          rank={seasonRank}
          stars={seasonStars}
          leaderboardNumber={seasonLeaderboardNumber}
          variant="formuladota"
          size={size}
          tooltip={false}
          glow={
            glow &&
            (seasonRank === "immortal" ||
              seasonRank === "immortal-top-100" ||
              seasonRank === "immortal-leaderboard")
          }
        />
      )}
      {honorInline && (
        <HonorRankMedal
          rank={honorRank}
          size={size}
          tooltip={false}
          glow={glow && honorRank === "mistico"}
        />
      )}
    </Tooltip>
  )
}
