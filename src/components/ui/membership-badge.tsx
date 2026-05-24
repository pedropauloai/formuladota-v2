"use client";
/**
 * MembershipBadge — FormulaDota V2.5-F8
 *
 * Badge circular pequeno (16-20px) para uso como overlay em UserAvatar.
 * Representa o tier de membership do usuário dentro da plataforma.
 *
 * TIERS NÃO SÃO PROGRESSÃO DE PAGAMENTO.
 *
 * Visitante → Aluno: vem de comprar primeira ficha.
 * Aluno → Veterano: vem de TEMPO ativo (3+ meses).
 * Veterano → Consagrado: vem de CONDUTA (não pagamento).
 * Fundador: identidade histórica (primeiros 50).
 *
 * Filosofia PHILOSOPHY.md: NÃO criar pay-to-status visual.
 * Nenhum tier é "premium" sobre outro — todos têm dignidade visual.
 *
 * Diferente do <Badge> genérico (shadcn-based) — este é especializado
 * para ser encaixado no slot badge do <UserAvatar>.
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { cva, type VariantProps } from "class-variance-authority";
import {
  Check,
  Award,
  Star,
  Crown,
  Shield,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/**
 * Tiers de membership da plataforma FormulaDota.
 *
 * - visitante:  não comprou ainda — tem dignidade visual, sem "pobreza"
 * - aluno:      comprou primeira ficha
 * - veterano:   ativo há 3+ meses
 * - consagrado: reconhecimento comportamental (conduta + pares) — NÃO financeiro
 * - fundador:   early adopter histórico (primeiros 50)
 */
export type MembershipTier = "visitante" | "aluno" | "veterano" | "consagrado" | "fundador";

// ---------------------------------------------------------------------------
// CVA — variantes de tier
// ---------------------------------------------------------------------------

const membershipBadgeVariants = cva(
  /* Base: círculo pequeno com ícone centralizado + anel de contraste */
  [
    "inline-flex items-center justify-center",
    "rounded-full",
    "size-5",            /* 20px — visível mas discreto sobre o avatar */
    "ring-2 ring-bg-deep", /* anel dark para contraste sobre qualquer fundo */
    "shrink-0",
  ].join(" "),
  {
    variants: {
      tier: {
        /* Visitante — cinza muted com borda sutil; presença digna, sem pobreza visual */
        visitante:
          "bg-bg-elevated border border-border-subtle text-text-faded",
        /* Aluno ativo — brand-primary vermelho FORMULADOTA */
        aluno:
          "bg-brand-primary text-text-inverse border border-brand-primary",
        /* Veterano — brand-primary mais escuro, borda reforçada */
        veterano:
          "bg-brand-primary text-text-inverse border border-brand-primary-hover",
        /* Consagrado — âmbar warning controlado; destaque sutil, sem glow excessivo */
        consagrado:
          "bg-warning/80 text-bg-deep border border-warning",
        /* Fundador — brand-primary-deep + borda especial (primeiros 50) */
        fundador:
          "bg-brand-primary-deep text-text-inverse border border-brand-primary",
      },
    },
    defaultVariants: { tier: "visitante" },
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
  visitante: Shield,    /* escudo sutil — presença digna mesmo sem adesão */
  aluno:     Check,     /* check — confirmado como aluno */
  veterano:  Award,     /* medalha — veterano da plataforma */
  consagrado: Star,     /* estrela — reconhecimento comportamental peer */
  fundador:  Crown,     /* coroa — fundador, os primeiros 50 */
};

/** Rótulos de acessibilidade PT-BR por tier */
const TIER_LABELS: Record<MembershipTier, string> = {
  visitante:  "Visitante",
  aluno:      "Aluno",
  veterano:   "Veterano",
  consagrado: "Consagrado",
  fundador:   "Fundador",
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
 * <UserAvatar size="xl" badge={<MembershipBadge tier="consagrado" />} />
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
