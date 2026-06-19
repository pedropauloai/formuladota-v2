"use client";
/**
 * UserAvatar — FormulaDota V2.5-F8
 *
 * Avatar QUADRADO (rounded-sm) com slots para:
 *   - badge overlay no canto inferior-direito (ex: MembershipBadge)
 *   - PresenceDot integrado (prioridade sobre badge quando ativo)
 *   - ring colorido para destaque de tier (ex: tier Immortal = brand glow)
 *
 * Tamanhos: sm=32px | md=40px | lg=64px | xl=96px (hero portrait)
 * Padrão GamersClub/Steam: avatar quadrado, NUNCA circular (Pedro 2026-05-26).
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Seis estados de presença suportados (espelhado de PresenceDot para evitar
 *  dependência circular quando PresenceDot ainda não existe no worktree). */
export type PresenceStatus =
  | "online"
  | "away"
  | "dnd"
  | "offline"
  | "in-queue"
  | "in-match";

/** Cor do ring externo — destaque visual de tier ou estado */
export type RingColor = "brand" | "play" | "tier-immortal" | null;

// ---------------------------------------------------------------------------
// Mapeamentos internos
// ---------------------------------------------------------------------------

/** Cor de fundo do dot de presença inline — sem depender de PresenceDot externo */
const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online:     "bg-success",       /* verde Discord */
  away:       "bg-warning",       /* amarelo Discord */
  dnd:        "bg-error",         /* vermelho "não perturbe" */
  offline:    "bg-neutral-600",   /* cinza Discord */
  "in-queue": "bg-brand-primary", /* vermelho FORMULADOTA */
  "in-match": "bg-play-primary",  /* verde matchmaking */
};

/** Ring colorido — brand vermelho | play verde | immortal dourado */
const RING_CLASSES: Record<NonNullable<RingColor>, string> = {
  "brand":         "ring-2 ring-brand-primary",
  "play":          "ring-2 ring-play-primary",
  "tier-immortal": "ring-2 ring-warning",
};

// ---------------------------------------------------------------------------
// CVA — variantes de tamanho
// ---------------------------------------------------------------------------

const avatarVariants = cva(
  /* Base: quadrado com overflow hidden para imagem não vazar */
  "relative inline-flex shrink-0 rounded-sm overflow-hidden select-none",
  {
    variants: {
      size: {
        sm: "size-8",   /* 32px */
        md: "size-10",  /* 40px */
        lg: "size-16",  /* 64px */
        xl: "size-24",  /* 96px — hero portrait */
      },
    },
    defaultVariants: { size: "md" },
  }
);

/** Tamanho do dot de presença em função do tamanho do avatar */
const DOT_SIZE: Record<NonNullable<VariantProps<typeof avatarVariants>["size"]>, string> = {
  sm: "size-2",    /* 8px */
  md: "size-2.5",  /* 10px */
  lg: "size-3",    /* 12px */
  xl: "size-3.5",  /* 14px */
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UserAvatarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** URL da imagem do avatar (opcional — exibe fallback se ausente) */
  src?: string;
  /** Texto alternativo para acessibilidade */
  alt?: string;
  /** Iniciais exibidas quando src ausente (ex: "NP" para "Nome Pessoa") */
  fallback?: string;
  /** Tamanho do avatar: sm=32 | md=40 | lg=64 | xl=96 */
  size?: VariantProps<typeof avatarVariants>["size"];
  /**
   * Badge overlay no canto inferior-direito.
   * Tipicamente <MembershipBadge> — oculto quando presence ativo.
   */
  badge?: ReactNode;
  /**
   * Status de presença — quando presente, exibe PresenceDot no lugar do badge.
   * Presença tem prioridade visual sobre badge (estado ativo = info mais relevante).
   */
  presence?: PresenceStatus;
  /**
   * Ring colorido ao redor do avatar — destaque visual de tier alto.
   * brand = vermelho FORMULADOTA | play = verde matchmaking | tier-immortal = âmbar | null = sem ring
   */
  ringColor?: RingColor;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Avatar circular com suporte a badge overlay e presença inline.
 *
 * Padrão GamersClub: empilha 4 sinais visuais —
 * [Avatar] → ring colorido → badge overlay/presença → identidade textual (fora).
 *
 * @example
 * // Avatar simples com fallback
 * <UserAvatar fallback="PP" size="md" />
 *
 * @example
 * // Avatar hero com membership badge e ring brand
 * <UserAvatar
 *   src="https://cdn.example.com/avatar.jpg"
 *   alt="Coach Immortal"
 *   size="xl"
 *   badge={<MembershipBadge tier="consagrado" />}
 *   ringColor="brand"
 * />
 *
 * @example
 * // Avatar com presença online (presença substitui badge)
 * <UserAvatar size="md" fallback="NP" presence="online" />
 */
export const UserAvatar = forwardRef<HTMLDivElement, UserAvatarProps>(
  (
    {
      className,
      src,
      alt,
      fallback,
      size = "md",
      badge,
      presence,
      ringColor = null,
      ...props
    },
    ref
  ) => {
    const t = useTranslations("ui");
    const resolvedAlt = alt ?? t("avatarAlt");
    /* Presença ativa = estados que requerem atenção visual imediata */
    const isPresenceActive =
      presence !== undefined && presence !== "offline";

    /* Ring CSS classes — null = sem ring */
    const ringClass = ringColor ? RING_CLASSES[ringColor] : "";

    /* Slot inferior-direito: presença tem prioridade sobre badge */
    const overlaySlot = presence !== undefined ? (
      /* Dot de presença — anel opaco pra contraste sobre borda */
      <span
        className={cn(
          "absolute bottom-0 right-0",
          "rounded-full",
          "size-fit p-[2px]",
          "bg-bg-deep",
          /* Z elevado para dot ficar sobre a borda do avatar */
          "z-[var(--z-elevated)]",
        )}
        role="status"
        aria-label={t(`presence.${presence}`)}
      >
        <span
          className={cn(
            DOT_SIZE[size ?? "md"],
            "rounded-full block",
            PRESENCE_COLORS[presence],
            /* Pulse CSS animation para estados ativos (tw-animate-css) */
            isPresenceActive && "animate-pulse",
          )}
          aria-hidden="true"
        />
      </span>
    ) : badge ? (
      /* Badge overlay — membership tier no canto */
      <span
        className={cn(
          "absolute bottom-0 right-0",
          "z-[var(--z-elevated)]",
        )}
        aria-hidden="true"
      >
        {badge}
      </span>
    ) : null;

    return (
      /* Wrapper relativo — necessário para posicionar overlay absoluto */
      <div
        className={cn(
          "relative inline-flex shrink-0 select-none",
          /* Ring externo — aplicado no wrapper, não no quadrado interno */
          ringClass,
          "rounded-sm",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* Círculo principal do avatar */}
        <div
          className={cn(
            avatarVariants({ size }),
            "border border-border-subtle",
          )}
        >
          {src ? (
            /* Imagem do avatar */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={resolvedAlt}
              className="size-full object-cover object-top"
              draggable={false}
            />
          ) : (
            /* Fallback com iniciais — fundo bg-elevated, texto display */
            <div
              className={cn(
                "size-full",
                "bg-bg-elevated",
                "flex items-center justify-center",
                "font-display text-text-display font-bold",
                /* Tamanho de fonte proporcional ao avatar */
                size === "sm" && "text-sm",
                size === "md" && "text-sm",
                size === "lg" && "text-xl",
                size === "xl" && "text-3xl",
              )}
              aria-hidden="true"
            >
              {fallback ? fallback.slice(0, 2).toUpperCase() : "?"}
            </div>
          )}
        </div>

        {/* Overlay: presença ou badge — posicionado sobre o avatar */}
        {overlaySlot}
      </div>
    );
  }
);

UserAvatar.displayName = "UserAvatar";
