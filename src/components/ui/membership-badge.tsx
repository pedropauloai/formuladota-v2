"use client";
/**
 * MembershipBadge — FormulaDota V2.5-F8
 *
 * Badge circular pequeno (16-20px) para uso como overlay em UserAvatar.
 * Representa o tier de membership do usuário dentro da plataforma.
 *
 * 5 tiers: free | aluno | veterano | elite | fundador
 *
 * Diferente do <Badge> genérico (shadcn-based) — este é especializado
 * para ser encaixado no slot badge do <UserAvatar>.
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { cva, type VariantProps } from "class-variance-authority";
import {
  Check,
  Star,
  Crown,
  Shield,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Tiers de membership disponíveis na plataforma FormulaDota */
export type MembershipTier = "free" | "aluno" | "veterano" | "elite" | "fundador";

// ---------------------------------------------------------------------------
// CVA — variantes de tier
// ---------------------------------------------------------------------------

const membershipBadgeVariants = cva(
  /* Base: círculo pequeno com ícone centralizado + anel de contraste */
  [
    "inline-flex items-center justify-center",
    "rounded-full",
    "size-5",            /* 20px — visível mas discreto sobre o avatar */
    "ring-2 ring-bg-deep", /* anel branco/dark para contraste sobre qualquer fundo */
    "shrink-0",
  ].join(" "),
  {
    variants: {
      tier: {
        /* Sem membership — cinza muted, borda sutil, sem ícone colorido */
        free:
          "bg-bg-elevated border border-border-subtle text-text-faded",
        /* Aluno ativo — brand-primary vermelho FORMULADOTA */
        aluno:
          "bg-brand-primary text-text-inverse border border-brand-primary",
        /* Veterano — brand-primary com glow leve (border mais brilhante) */
        veterano:
          "bg-brand-primary text-text-inverse border border-brand-primary-hover",
        /* Elite — âmbar warning, destaque premium */
        elite:
          "bg-warning text-bg-deep border border-warning",
        /* Fundador — brand-primary-deep + borda especial (primeiros 50) */
        fundador:
          "bg-brand-primary-deep text-text-inverse border border-brand-primary",
      },
    },
    defaultVariants: { tier: "free" },
  }
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MembershipBadgeProps
  extends VariantProps<typeof membershipBadgeVariants> {
  /** Tier de membership do usuário */
  tier: MembershipTier;
  className?: string;
}

// ---------------------------------------------------------------------------
// Configuração de ícones por tier
// ---------------------------------------------------------------------------

/** Componente de ícone Lucide para cada tier */
const TIER_ICONS: Record<MembershipTier, React.FC<LucideProps>> = {
  free:     Shield,   /* escudo sutil — "sem proteção" / ainda não ativo */
  aluno:    Check,    /* check — confirmado como aluno */
  veterano: Star,     /* estrela — veterano da plataforma */
  elite:    Crown,    /* coroa — tier elite premium */
  fundador: Shield,   /* escudo especial — fundador, os primeiros 50 */
};

/** Rótulos de acessibilidade PT-BR por tier */
const TIER_LABELS: Record<MembershipTier, string> = {
  free:     "Membro Free",
  aluno:    "Aluno",
  veterano: "Veterano",
  elite:    "Elite",
  fundador: "Fundador",
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Badge circular de membership — projetado para overlay em UserAvatar.
 *
 * Cada tier tem cor e ícone próprios. Encaixe no slot badge do UserAvatar:
 *
 * @example
 * <UserAvatar size="xl" badge={<MembershipBadge tier="elite" />} />
 *
 * @example
 * // Badge standalone (incomum mas válido em listas)
 * <MembershipBadge tier="fundador" />
 */
export function MembershipBadge({ tier, className }: MembershipBadgeProps) {
  const Icon = TIER_ICONS[tier];

  return (
    <span
      className={cn(membershipBadgeVariants({ tier }), className)}
      aria-label={TIER_LABELS[tier]}
      title={TIER_LABELS[tier]}
    >
      <Icon
        /* Ícone cabe no círculo de 20px — 10px é seguro */
        className="size-[10px]"
        aria-hidden="true"
        strokeWidth={2.5}
      />
    </span>
  );
}
