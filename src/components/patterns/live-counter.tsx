/**
 * LiveCounter — FormulaDota V2.5
 *
 * Counter inline destacado, estilo "Jogadores online: 9.362" (GamersClub).
 * Mais simples que PresenceLive — exibe um único valor com label e ícone.
 *
 * Regras: C14 zero hex, C15 motion via presets, m. (LazyMotion strict).
 * M4 — Live state sempre visível.
 * M11 — Atmospheric: pulse no ícone comunica vida sem invadir layout.
 */

"use client";

import { type ElementType } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Variantes de cor semântica para o LiveCounter. */
export type LiveCounterVariant = "success" | "brand" | "muted";

export interface LiveCounterProps {
  /** Texto descritivo exibido ao lado do valor. */
  label: string;
  /**
   * Valor numérico exibido em font-display-condensed (Teko).
   * Quando omitido, exibe apenas label + ícone.
   */
  value?: number;
  /** Ícone Lucide passado como componente. Ex: `icon={UsersIcon}` */
  icon?: ElementType<{ className?: string }>;
  /**
   * Quando true, aplica pulse animation ao ícone (motion-safe).
   * Comunica estado "ao vivo" sem texto adicional.
   * @default false
   */
  pulse?: boolean;
  /** Esquema de cor semântico do componente. @default "success" */
  variant?: LiveCounterVariant;
  className?: string;
}

// ---------------------------------------------------------------------------
// Mapeamentos de cor por variante
// ---------------------------------------------------------------------------

/**
 * Mapeamento de cores semânticas por variante.
 * Todos os valores são classes Tailwind sobre tokens CSS — zero hex.
 */
const VARIANT_CLASSES: Record<LiveCounterVariant, {
  icon: string;
  value: string;
  label: string;
}> = {
  success: {
    icon:  "text-success",
    value: "text-success",
    label: "text-text-muted",
  },
  brand: {
    icon:  "text-brand-primary",
    value: "text-brand-primary",
    label: "text-text-muted",
  },
  muted: {
    icon:  "text-text-muted",
    value: "text-text-body",
    label: "text-text-faded",
  },
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Counter inline estilo GamersClub — exibe presença ou estatísticas ao vivo.
 *
 * @example
 * // Simples — com ícone e valor
 * <LiveCounter
 *   label="alunos online esta semana"
 *   value={12}
 *   icon={UsersIcon}
 *   pulse
 *   variant="success"
 * />
 *
 * @example
 * // Apenas label + ícone, sem número
 * <LiveCounter label="Pedro está online" icon={RadioIcon} pulse variant="brand" />
 */
export function LiveCounter({
  label,
  value,
  icon: Icon,
  pulse = false,
  variant = "success",
  className,
}: LiveCounterProps) {
  const motionSafe = useMotionSafeBool();
  const colors = VARIANT_CLASSES[variant];

  // Ícone — com ou sem pulse animation
  const iconEl = Icon ? (
    motionSafe && pulse ? (
      <m.span
        className={cn("flex items-center shrink-0", colors.icon)}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </m.span>
    ) : (
      <span className={cn("flex items-center shrink-0", colors.icon)} aria-hidden="true">
        <Icon className="size-4" />
      </span>
    )
  ) : null;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="status"
      aria-live="polite"
    >
      {iconEl}

      {/* Valor numérico — Teko (font-display-condensed) quando presente */}
      {value !== undefined && (
        <span
          className={cn(
            "text-base font-semibold leading-none tabular-nums",
            /* font-display-condensed = Teko Variable, definida em semantic.css */
            "[font-family:var(--font-display-condensed)]",
            colors.value
          )}
          aria-label={`${value} `}
        >
          {value.toLocaleString("pt-BR")}
        </span>
      )}

      {/* Label textual */}
      <span className={cn("text-sm leading-none", colors.label)}>
        {label}
      </span>
    </span>
  );
}
