/**
 * PresenceDot — FormulaDota V2.5-F6 (DF6.6)
 *
 * Indicador de presença rica com 6 estados: 4 padrão Discord +
 * estados específicos do contexto de jogo (in-queue / in-match).
 *
 * Referência de design: M9 Presence Rich em docs/foundations/UX_PRINCIPLES.md
 * Motion: pulse em estados ativos, respeitando prefers-reduced-motion via useMotionSafeBool.
 * Tamanhos: sm (8px) | md (10px) | lg (12px)
 */

"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { m } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Seis estados de presença suportados pelo FormulaDota. */
export type PresenceStatus =
  | "online"
  | "away"
  | "dnd"
  | "offline"
  | "in-queue"
  | "in-match";

// ---------------------------------------------------------------------------
// Mapeamentos internos
// ---------------------------------------------------------------------------

/**
 * Cor de fundo para cada status.
 * Discord pattern: verde / amarelo / vermelho / cinza.
 * Estados de jogo: brand-primary (vermelho FORMULADOTA) pra fila,
 * play-primary (verde matchmaking) pra partida ativa.
 *
 * REGRA: sem hex literals — apenas classes Tailwind ou tokens semânticos.
 */
const STATUS_COLORS: Record<PresenceStatus, string> = {
  online:     "bg-success",         /* #22c55e — verde Discord */
  away:       "bg-warning",         /* #f59e0b — amarelo Discord */
  dnd:        "bg-error",           /* #ef4444 — vermelho Discord ("não perturbe") */
  offline:    "bg-neutral-600",     /* cinza Discord */
  "in-queue": "bg-brand-primary",   /* #ac1d0e — vermelho FORMULADOTA, aguardando fila */
  "in-match": "bg-play-primary",    /* #5b8e3a — verde matchmaking, em partida ativa */
};

/**
 * Quais estados recebem pulse animation.
 * Online indica presença ativa. In-queue e in-match são estados dinâmicos
 * que requerem atenção do usuário.
 */
const ACTIVE_STATUSES: PresenceStatus[] = ["online", "in-queue", "in-match"];

// ---------------------------------------------------------------------------
// CVA — variantes de tamanho
// ---------------------------------------------------------------------------

const dotVariants = cva(
  /* Base: círculo sólido inline */
  "rounded-full inline-block shrink-0",
  {
    variants: {
      size: {
        sm: "size-2",    /* 8px */
        md: "size-2.5",  /* 10px */
        lg: "size-3",    /* 12px */
      },
    },
    defaultVariants: { size: "md" },
  }
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PresenceDotProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    /* Excluir props que colidem com m.span */
    "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
  >,
    VariantProps<typeof dotVariants> {
  /** Status de presença a exibir. */
  status: PresenceStatus;
  /**
   * Quando true, renderiza o rótulo textual do status ao lado do dot.
   * Útil em listas de usuários, perfis e painéis de presença.
   * @default false
   */
  showLabel?: boolean;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Indicador visual de presença com 6 estados e pulse animation em ativos.
 *
 * @example
 * // Apenas o dot (uso padrão em avatares)
 * <PresenceDot status="online" size="md" />
 *
 * @example
 * // Com rótulo inline (painéis de presença, listas de usuários)
 * <PresenceDot status="in-queue" size="lg" showLabel />
 *
 * @example
 * // Offline sem animação
 * <PresenceDot status="offline" size="sm" />
 */
export const PresenceDot = forwardRef<HTMLSpanElement, PresenceDotProps>(
  ({ className, size, status, showLabel = false, ...props }, ref) => {
    const t = useTranslations("ui");
    const motionSafe = useMotionSafeBool();
    const isActive = ACTIVE_STATUSES.includes(status);
    const statusLabel = t(`presence.${status}`);

    // Dot — animado quando estado ativo + motion habilitado
    const dot =
      isActive && motionSafe ? (
        <m.span
          className={cn(dotVariants({ size }), STATUS_COLORS[status])}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      ) : (
        <span
          className={cn(dotVariants({ size }), STATUS_COLORS[status])}
          aria-hidden="true"
        />
      );

    if (showLabel) {
      return (
        <span
          ref={ref}
          className={cn("inline-flex items-center gap-1.5", className)}
          aria-label={statusLabel}
          role="status"
          {...props}
        >
          {dot}
          <span className="text-sm text-text-muted leading-none">
            {statusLabel}
          </span>
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center", className)}
        aria-label={statusLabel}
        role="status"
        {...props}
      >
        {dot}
      </span>
    );
  }
);

PresenceDot.displayName = "PresenceDot";
