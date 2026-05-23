"use client";
/**
 * AchievementBadge — FormulaDota V2.5-F8
 *
 * Badge linear (pill horizontal) com ícone + label — estilo GamersClub achievements.
 * Aparece após o nome do jogador em linha, não como overlay.
 *
 * 8 variantes pré-definidas (enum fechado — força consistência visual).
 * Não aceita props abertas: toda nova conquista deve ser adicionada aqui.
 *
 * Visual: pill h-5/h-6, padding compact px-2, ícone 12-14px + texto xs
 * em font-display-condensed (Teko) uppercase tracking-wide.
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { cva } from "class-variance-authority";
import {
  Shield,
  Award,
  Crown,
  Flame,
  Trophy,
  Sparkles,
  ThumbsUp,
  Star,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** 8 variantes de achievement disponíveis — enum fechado */
export type AchievementVariant =
  | "doutrina"
  | "veterano"
  | "fundador"
  | "streak-5"
  | "champion-s1"
  | "comendado"
  | "bom-comportamento"
  | "evento-inaugural";

// ---------------------------------------------------------------------------
// Configuração de cada variant (label, ícone, cor base)
// ---------------------------------------------------------------------------

interface AchievementConfig {
  /** Rótulo exibido no badge */
  label: string;
  /** Componente de ícone Lucide */
  icon: React.FC<LucideProps>;
  /** Classes CSS Tailwind para o pill (fundo, texto, borda) */
  classes: string;
}

const ACHIEVEMENT_CONFIG: Record<AchievementVariant, AchievementConfig> = {
  /**
   * Doutrina — leu e aceitou o código de conduta (verde success)
   * Sinal de alinhamento com os princípios da plataforma.
   */
  doutrina: {
    label: "Doutrina",
    icon:  Shield,
    classes:
      "bg-success/10 border-success/30 text-success",
  },

  /**
   * Veterano — usuário com histórico na plataforma (brand-primary)
   */
  veterano: {
    label: "Veterano",
    icon:  Award,
    classes:
      "bg-brand-primary/10 border-brand-primary/30 text-brand-primary",
  },

  /**
   * Fundador — um dos primeiros 50 membros (brand-primary-deep + glow sutil)
   */
  fundador: {
    label: "Fundador",
    icon:  Crown,
    classes:
      "bg-brand-primary-deep/20 border-brand-primary/40 text-brand-primary",
  },

  /**
   * Streak 5 — 5 partidas consecutivas sem faltas (âmbar warning)
   */
  "streak-5": {
    label: "Streak 5",
    icon:  Flame,
    classes:
      "bg-warning/10 border-warning/30 text-warning",
  },

  /**
   * Champion S1 — #1 no ranking da Temporada 1 (âmbar + glow especial)
   */
  "champion-s1": {
    label: "#1 Season 1",
    icon:  Trophy,
    classes:
      "bg-warning/15 border-warning/50 text-warning",
  },

  /**
   * Comendado — recebeu elogios de outros membros (brand-primary)
   */
  comendado: {
    label: "Comendado",
    icon:  Sparkles,
    classes:
      "bg-brand-primary/10 border-brand-primary/30 text-brand-primary",
  },

  /**
   * Bom comportamento — zero advertências, histórico limpo (verde success)
   */
  "bom-comportamento": {
    label: "Bom Comportamento",
    icon:  ThumbsUp,
    classes:
      "bg-success/10 border-success/30 text-success",
  },

  /**
   * Evento inaugural — participou da primeira sessão pública (info azul)
   */
  "evento-inaugural": {
    label: "Sessão Inaugural",
    icon:  Star,
    classes:
      "bg-info/10 border-info/30 text-info",
  },
};

// ---------------------------------------------------------------------------
// CVA — base do pill
// ---------------------------------------------------------------------------

const achievementBadgeVariants = cva(
  /* Base: pill horizontal compacto com ícone + texto */
  [
    "inline-flex items-center gap-1",
    "h-5 px-2",
    "rounded-full border",
    "whitespace-nowrap",
    "font-display-condensed",  /* Teko — condensed display font */
    "text-[10px] uppercase tracking-widest",
    "leading-none",
    "transition-colors",
    /* Ícones internos — tamanho fixo 10px via CSS */
    "[&>svg]:shrink-0",
  ].join(" ")
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AchievementBadgeProps {
  /** Variante da conquista — determina ícone, label e cor */
  variant: AchievementVariant;
  /** Classes CSS extras para customização de posicionamento */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Badge linear de achievement — estilo GamersClub.
 * Aparece em linha após o nome do jogador ou em BadgeStack.
 *
 * @example
 * // Badge inline após o nome
 * <span className="flex items-center gap-2">
 *   <span>Coach Immortal</span>
 *   <AchievementBadge variant="fundador" />
 *   <AchievementBadge variant="champion-s1" />
 * </span>
 *
 * @example
 * // Dentro de BadgeStack (recomendado para múltiplos badges)
 * <BadgeStack badges={[{ variant: "doutrina" }, { variant: "veteran" }]} />
 */
export function AchievementBadge({ variant, className }: AchievementBadgeProps) {
  const config = ACHIEVEMENT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(achievementBadgeVariants(), config.classes, className)}
      title={config.label}
      aria-label={`Conquista: ${config.label}`}
    >
      <Icon
        className="size-[10px]"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
}
