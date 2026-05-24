"use client";
/**
 * OnFireOverlay — FormulaDota V2.5 (Premium Markers)
 *
 * Badge overlay posicionado no canto de cards para indicar sequência de
 * vitórias (streak) de coach ou evolução acelerada de aluno.
 *
 * Inspiração: GamersClub "On Fire!" badge — adaptado ao visual FORMULADOTA.
 *
 * Posicionamento: absolute — o elemento pai DEVE ter `position: relative`.
 * Forma: angular (não pill) — peso "intenso", alinhado com estética game client.
 *
 * Regras:
 *   C14 — zero hex hardcoded; apenas tokens semânticos
 *   C17 — z-index via var(--z-*)
 *   m.  — LazyMotion strict (nunca motion.)
 *   motion safe — pulse apenas quando prefers-reduced-motion: no-preference
 */

import { m } from "motion/react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/**
 * 6 variantes disponíveis — 2 originais + 4 comportamentais (PHILOSOPHY.md 2026-05-23).
 *
 * Eixo SKILL/PERFORMANCE (originais):
 *   "coach"       — "ON FIRE • 5 wins" (streak de vitórias do coach)
 *   "student"     — "+320 MMR esta semana" (evolução semanal do aluno)
 *
 * Eixo HONOR/CONDUTA (novos — filosofia 2-eixos):
 *   "disciplina"  — "EM RITMO • N partidas disciplinadas"
 *   "mentoria"    — "MENTOR ATIVO • N elogios esta semana"
 *   "aprendizado" — "EVOLUÇÃO • N derrotas com aprendizado"
 *   "estabilidade"— "ESTÁVEL • N partidas sem strike"
 */
export type OnFireVariant =
  | "coach"
  | "student"
  | "disciplina"
  | "mentoria"
  | "aprendizado"
  | "estabilidade";

export type OnFirePosition = "top-right" | "top-left";

export interface OnFireOverlayProps {
  /**
   * Número principal do badge (streak, partidas, elogios, etc).
   * Interpretação varia por variant — ver getBadgeText().
   */
  streakCount: number;
  /**
   * Contexto do badge (default: "coach"):
   *   "coach"       — streak de vitórias do coach
   *   "student"     — evolução de MMR semanal
   *   "disciplina"  — sequência de partidas disciplinadas
   *   "mentoria"    — elogios recebidos na semana
   *   "aprendizado" — derrotas com atitude positiva
   *   "estabilidade"— partidas consecutivas sem strike emocional
   */
  variant?: OnFireVariant;
  /** Posição do badge no card pai (default: top-right) */
  position?: OnFirePosition;
  /**
   * Texto customizado — sobrescreve o texto calculado automaticamente.
   * Útil para "student" com mmrLabel específico.
   */
  mmrLabel?: string;
  /** Classes extras aplicadas ao badge */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helper — texto do badge por variante
// ---------------------------------------------------------------------------

/**
 * Gera o texto exibido no badge conforme a variante e o número fornecido.
 * PHILOSOPHY.md 2026-05-23: 6 variantes (2 originais + 4 comportamentais).
 *
 * mmrLabel sobrescreve o texto calculado quando fornecido — útil para
 * mensagens específicas como "+320 MMR esta semana".
 */
function getBadgeText(
  variant: OnFireVariant,
  streakCount: number,
  mmrLabel?: string
): string {
  // mmrLabel sobrescreve sempre — qualquer variante pode ter texto customizado
  if (mmrLabel) return mmrLabel;

  switch (variant) {
    case "student":
      // Ex: "+320 MMR esta semana"
      return `+${streakCount} MMR esta semana`;

    case "disciplina":
      // Ex: "EM RITMO • 10 partidas disciplinadas"
      return `EM RITMO • ${streakCount} partidas disciplinadas`;

    case "mentoria":
      // Ex: "MENTOR ATIVO • 3 elogios esta semana"
      return `MENTOR ATIVO • ${streakCount} elogios esta semana`;

    case "aprendizado":
      // Ex: "EVOLUÇÃO • 5 derrotas com aprendizado"
      return `EVOLUÇÃO • ${streakCount} derrotas com aprendizado`;

    case "estabilidade":
      // Ex: "ESTÁVEL • 20 partidas sem strike"
      return `ESTÁVEL • ${streakCount} partidas sem strike`;

    case "coach":
    default:
      // "ON FIRE • 5 wins" — número de vitórias em sequência
      return `ON FIRE • ${streakCount} wins`;
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * OnFireOverlay — badge angular de destaque sobre cards.
 *
 * O componente pai PRECISA ter `position: relative` e `overflow: visible`
 * (ou `overflow: hidden` para canto cortado — escolha do consumidor).
 *
 * @example
 * // Sobre ProCard (coach com 5 wins consecutivos)
 * <div className="relative">
 *   <ProCard {...props} />
 *   <OnFireOverlay streakCount={5} variant="coach" />
 * </div>
 *
 * @example
 * // Sobre MatchCard (aluno evoluindo)
 * <div className="relative">
 *   <MatchCard {...props} />
 *   <OnFireOverlay streakCount={320} variant="student" mmrLabel="+320 MMR esta semana" />
 * </div>
 */
export function OnFireOverlay({
  streakCount,
  variant = "coach",
  position = "top-right",
  mmrLabel,
  className,
}: OnFireOverlayProps) {
  // Respeita prefers-reduced-motion — pulse só quando motion permitido
  const motionSafe = useMotionSafeBool();

  const badgeText = getBadgeText(variant, streakCount, mmrLabel);

  return (
    <m.div
      animate={motionSafe ? { scale: [1, 1.02, 1], opacity: [1, 0.88, 1] } : {}}
      transition={
        motionSafe
          ? { duration: 2, ease: "easeInOut" as const, repeat: Infinity, repeatType: "loop" as const }
          : undefined
      }
      className={cn(
        // Posicionamento absoluto — sai do fluxo do card
        "absolute",
        // Posição no canto — top-right por padrão (GamersClub-style)
        position === "top-right" ? "-top-2 -right-2" : "-top-2 -left-2",
        // Z elevado — sobre o card mas abaixo de modais (C17)
        "z-[var(--z-elevated)]",
        // Forma angular — não pill (badge "intenso")
        "rounded-[var(--radius-sm)]",
        // Padding compacto
        "px-2 py-1",
        // Gradiente: warning amber → brand-primary (impacto visual, alinhado ao contexto)
        // C14: sem hex — usa tokens CSS definidos em semantic.css
        "bg-gradient-to-r from-[var(--color-warning)] to-[var(--color-brand-primary)]",
        // Glow amber sutil — atmosfera "intenso" (C14: token warning)
        "shadow-[0_0_12px_var(--color-warning)] shadow-[var(--color-warning)]/40",
        // Layout interno: flex com ícone + texto
        "flex items-center gap-1",
        // Não selecionar texto do badge acidentalmente
        "select-none",
        // Cursor padrão — não é clicável
        "cursor-default",
        className,
      )}
      // Atributo de acessibilidade — anuncia o estado de streak
      role="status"
      aria-label={badgeText}
    >
      {/* Ícone Flame — "on fire" visual imediato */}
      <Flame
        className="size-3 text-[var(--color-text-display)] shrink-0"
        aria-hidden="true"
        strokeWidth={2}
      />

      {/* Texto do badge — Teko uppercase tracking-wider (reservado para impacto) */}
      <span
        className={cn(
          "font-[family-name:var(--font-display-condensed)]",
          "text-xs font-semibold uppercase tracking-wider",
          "text-[var(--color-text-display)]",
          // Tabular nums para os números (streak, MMR) ficarem alinhados
          "tabular-nums",
          // Sem quebra de linha — badge deve caber em uma linha
          "whitespace-nowrap",
        )}
        aria-hidden="true" // Já anunciado no aria-label do parent
      >
        {badgeText}
      </span>
    </m.div>
  );
}
