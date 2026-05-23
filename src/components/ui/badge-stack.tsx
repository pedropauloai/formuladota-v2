"use client";
/**
 * BadgeStack — FormulaDota V2.5-F8
 *
 * Container que empilha múltiplos AchievementBadge horizontalmente.
 * Suporta overflow com truncamento "+N mais" quando badges excedem o max.
 *
 * Uso típico: abaixo do nome do PRO no ProCard ou em perfis de usuário.
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { AchievementBadge, type AchievementVariant } from "@/components/ui/achievement-badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Item individual de badge para uso no stack */
export interface BadgeItem {
  /** Variante da conquista */
  variant: AchievementVariant;
}

export interface BadgeStackProps {
  /** Lista de badges a exibir */
  badges: BadgeItem[];
  /**
   * Número máximo de badges visíveis antes do truncamento.
   * Badges excedentes são resumidos como "+N".
   * @default 3
   */
  max?: number;
  /** Classes CSS extras para o container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Stack horizontal de achievement badges com overflow handling.
 *
 * @example
 * <BadgeStack
 *   badges={[
 *     { variant: "doutrina" },
 *     { variant: "veterano" },
 *     { variant: "streak-5" },
 *     { variant: "fundador" },
 *   ]}
 *   max={3}
 * />
 * // Exibe: [Doutrina] [Veterano] [Streak 5] [+1]
 */
export function BadgeStack({ badges, max = 3, className }: BadgeStackProps) {
  /* Nada a exibir — retorna null silenciosamente */
  if (!badges.length) return null;

  const visible = badges.slice(0, max);
  const overflow = badges.length - max;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        className,
      )}
      aria-label={`${badges.length} conquista${badges.length !== 1 ? "s" : ""}`}
    >
      {/* Badges visíveis — limitados por max */}
      {visible.map((item, index) => (
        <AchievementBadge
          key={`${item.variant}-${index}`}
          variant={item.variant}
        />
      ))}

      {/* Indicador de overflow — "+N mais" quando há badges além do max */}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center",
            "h-5 px-2",
            "rounded-full border border-border-subtle",
            "bg-bg-elevated text-text-muted",
            "text-[10px] leading-none",
            "whitespace-nowrap",
          )}
          aria-label={`e mais ${overflow} conquista${overflow !== 1 ? "s" : ""}`}
          title={`${overflow} conquista${overflow !== 1 ? "s" : ""} não exibida${overflow !== 1 ? "s" : ""}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
