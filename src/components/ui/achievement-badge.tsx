"use client";
/**
 * AchievementBadge — FormulaDota V2.5-F8
 *
 * Badge linear (pill horizontal) com ícone + label — estilo GamersClub achievements.
 * Aparece após o nome do jogador em linha, não como overlay.
 *
 * 15 variantes pré-definidas (enum fechado — força consistência visual).
 * Não aceita props abertas: toda nova conquista deve ser adicionada aqui.
 *
 * Eixos:
 *   SKILL (partidas, rank, performance) — streak-5, champion-s1, veterano, etc.
 *   HONOR (conduta, comportamento)      — champion-s1-honor, derrotado-com-honra,
 *                                         mentor, reconciliado, voz-construtiva,
 *                                         estabilidade-emocional, presenca-disciplina
 *
 * Visual: pill h-5/h-6, padding compact px-2, ícone 12-14px + texto xs
 * em font-display-condensed (Teko) uppercase tracking-wide.
 *
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 * PHILOSOPHY.md 2026-05-23 — novos 7 variants comportamentais.
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
  ShieldCheck,
  GraduationCap,
  Heart,
  MessageCircle,
  Anchor,
  Calendar,
  type LucideProps,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/**
 * 15 variantes de achievement disponíveis — enum fechado.
 * 8 originais + 7 comportamentais (PHILOSOPHY.md 2026-05-23).
 */
export type AchievementVariant =
  // ---- Eixo SKILL / PERFORMANCE (originais) ----
  | "doutrina"
  | "veterano"
  | "fundador"
  | "streak-5"
  | "champion-s1"
  | "comendado"
  | "bom-comportamento"
  | "evento-inaugural"
  // ---- Eixo HONOR / CONDUTA (PHILOSOPHY.md 2026-05-23) ----
  | "champion-s1-honor"       // #1 no ranking de HONOR da Temporada 1
  | "derrotado-com-honra"     // Perdeu N partidas sem strikes — derrota com dignidade
  | "mentor"                  // Recebeu elogios de novato por orientação voluntária
  | "reconciliado"            // Após strike, conduta exemplar reconhecida
  | "voz-construtiva"         // Comunicação positiva reconhecida pela comunidade
  | "estabilidade-emocional"  // N partidas consecutivas sem strike emocional
  | "presenca-disciplina";    // 5+ partidas sem falta — presença como forma de respeito

// ---------------------------------------------------------------------------
// Configuração de cada variant (label, ícone, cor base)
// ---------------------------------------------------------------------------

interface AchievementConfig {
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
    icon:  Shield,
    classes:
      "bg-success/10 border-success/30 text-success",
  },

  /**
   * Veterano — usuário com histórico na plataforma (brand-primary)
   */
  veterano: {
    icon:  Award,
    classes:
      "bg-brand-primary/10 border-brand-primary/30 text-brand-primary",
  },

  /**
   * Fundador — um dos primeiros 50 membros (brand-primary-deep + glow sutil)
   */
  fundador: {
    icon:  Crown,
    classes:
      "bg-brand-primary-deep/20 border-brand-primary/40 text-brand-primary",
  },

  /**
   * Streak 5 — 5 partidas consecutivas sem faltas (âmbar warning)
   */
  "streak-5": {
    icon:  Flame,
    classes:
      "bg-warning/10 border-warning/30 text-warning",
  },

  /**
   * Champion S1 — #1 no ranking da Temporada 1 (âmbar + glow especial)
   */
  "champion-s1": {
    icon:  Trophy,
    classes:
      "bg-warning/15 border-warning/50 text-warning",
  },

  /**
   * Comendado — recebeu elogios de outros membros (brand-primary)
   */
  comendado: {
    icon:  Sparkles,
    classes:
      "bg-brand-primary/10 border-brand-primary/30 text-brand-primary",
  },

  /**
   * Bom comportamento — zero advertências, histórico limpo (verde success)
   */
  "bom-comportamento": {
    icon:  ThumbsUp,
    classes:
      "bg-success/10 border-success/30 text-success",
  },

  /**
   * Evento inaugural — participou da primeira sessão pública (info azul)
   */
  "evento-inaugural": {
    icon:  Star,
    classes:
      "bg-info/10 border-info/30 text-info",
  },

  // --------------------------------------------------------------------------
  // EIXO HONOR / CONDUTA — PHILOSOPHY.md 2026-05-23
  // --------------------------------------------------------------------------

  /**
   * Champion S1 Honor — #1 no ranking de HONOR (conduta) da Temporada 1.
   * Paralelo a champion-s1 (SKILL). Verde success: HONOR = máxima virtude.
   */
  "champion-s1-honor": {
    icon: ShieldCheck,
    classes: "bg-success/15 border-success/50 text-success",
  },

  /**
   * Derrotado com honra — perdeu partidas consecutivas sem strikes.
   * Princípio: a derrota com dignidade é mais honrada que a vitória sem caráter.
   * Âmbar warning: momento difícil, conduta exemplar.
   */
  "derrotado-com-honra": {
    icon: Shield,
    classes: "bg-warning/10 border-warning/30 text-warning",
  },

  /**
   * Mentor — recebeu elogios de novato por orientação voluntária.
   * Info azul: conhecimento compartilhado, liderança positiva.
   */
  mentor: {
    icon: GraduationCap,
    classes: "bg-info/10 border-info/30 text-info",
  },

  /**
   * Reconciliado — após strike, conduta exemplar reconhecida pela comunidade.
   * Verde success: redenção é caminho, não vergonha.
   */
  reconciliado: {
    icon: Heart,
    classes: "bg-success/10 border-success/30 text-success",
  },

  /**
   * Voz construtiva — comunicação positiva reconhecida pela comunidade.
   * Info azul: palavras que constroem, não destroem.
   */
  "voz-construtiva": {
    icon: MessageCircle,
    classes: "bg-info/10 border-info/30 text-info",
  },

  /**
   * Estabilidade emocional — N partidas consecutivas sem strike emocional.
   * Brand-primary: controle emocional é pilar da filosofia FormulaDota.
   */
  "estabilidade-emocional": {
    icon: Anchor,
    classes: "bg-brand-primary/10 border-brand-primary/30 text-brand-primary",
  },

  /**
   * Presença disciplina — 5+ partidas sem falta.
   * Princípio: presença é forma de respeito ao grupo e ao coach.
   * Verde success: comprometimento manifesto em ação.
   */
  "presenca-disciplina": {
    icon: Calendar,
    classes: "bg-success/10 border-success/30 text-success",
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
    "text-sm uppercase tracking-widest",
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
  const t = useTranslations("ui");
  const config = ACHIEVEMENT_CONFIG[variant];
  const Icon = config.icon;
  const label = t(`achievement.${variant}`);

  return (
    <span
      className={cn(achievementBadgeVariants(), config.classes, className)}
      title={label}
      aria-label={t("achievementAriaLabel", { label })}
    >
      <Icon
        className="size-[10px]"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
