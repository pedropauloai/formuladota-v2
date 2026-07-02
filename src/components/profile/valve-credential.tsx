// ValveCredential — a medalha da CONTA Dota (Valve) apresentada como CREDENCIAL
// discreta, não como um dos selos de identidade FormulaDota (Pedro 2026-07-02).
//
// Contexto: nosso ranking sazonal é o protagonista; a medalha Valve serve só de
// pré-calibração e perde valor com o tempo. Então ela sai do trio de selos (entre
// foto e nome) e vira um chip pequeno + dimmed, agrupado com o link do STRATZ —
// mantém a informação da conta sem disputar destaque. A explicação completa do
// rank Valve segue no showcase do <MedalPair> (SkillShowcase no hover).
//
// Server Component (Tooltip/DotaRankMedal são consumíveis daqui).

import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal"
import { Tooltip } from "@/components/ui/tooltip"
import { SteamIcon } from "@/components/profile/social-icons-row"
import { cn } from "@/lib/utils"

export function ValveCredential({
  rank,
  stars,
  stratzHref,
  stratzLabel,
  size = "sm",
  className,
}: {
  rank: DotaRank
  /** Estrelas (1–5) da medalha Valve. */
  stars?: number
  /** Link pro perfil no STRATZ (quando há Steam vinculada). */
  stratzHref?: string
  /** Texto do tooltip (i18n vem do caller). @default nenhum */
  stratzLabel?: string
  size?: "sm" | "md"
  className?: string
}) {
  // Chip discreto: medalha pequena e rebaixada (opacidade + leve dessaturação),
  // que acende no hover. A Steam/STRATZ ao lado deixa claro que é "dado da conta".
  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-1 opacity-70 grayscale-[0.2] transition-all hover:opacity-100 hover:grayscale-0",
        className
      )}
    >
      <DotaRankMedal rank={rank} stars={stars} variant="valve" size={size} tooltip={false} />
      <SteamIcon size={14} className="text-text-muted" />
    </span>
  )

  if (stratzHref) {
    return (
      <Tooltip content={stratzLabel ?? "STRATZ"} side="bottom" focusable={false}>
        <a href={stratzHref} target="_blank" rel="noopener noreferrer" aria-label={stratzLabel}>
          {chip}
        </a>
      </Tooltip>
    )
  }
  return stratzLabel ? (
    <Tooltip content={stratzLabel} side="bottom" focusable={false}>
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}
