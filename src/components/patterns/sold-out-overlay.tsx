"use client";
/**
 * SoldOutOverlay — FormulaDota V2.5 (Premium Markers)
 *
 * Overlay de estado "Lotada" sobre cards de sessão esgotada.
 *
 * Inspiração: GamersClub "Fechado" state — NÃO esconde o card,
 * apenas o torna visível-mas-inacessível (PRODUCT_CORE § 2: restrição é o produto).
 *
 * Posicionamento: absolute inset-0 — o elemento pai DEVE ter:
 *   - `position: relative`
 *   - `overflow: hidden` (para o overlay não vazar)
 *
 * Design intencional:
 *   - Sem motion (estado estático — o encerramento já aconteceu)
 *   - pointer-events-auto — intercepta todos os clicks no card
 *   - Voz Mestre: "LOTADA" (fato direto), não "Sessão encerrada. Que pena!"
 *
 * Regras:
 *   C14 — zero hex hardcoded; apenas tokens semânticos
 *   C17 — z-index via var(--z-*)
 */

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface SoldOutOverlayProps {
  /**
   * Mensagem principal exibida no overlay.
   * Default: "LOTADA" — direto e factual (voz Mestre).
   */
  message?: string;
  /**
   * Mensagem secundária opcional — ex: "Próxima: terça"
   * Exibida em texto menor abaixo do ícone e mensagem principal.
   */
  subMessage?: string;
  /** Classes extras aplicadas ao wrapper do overlay */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * SoldOutOverlay — estado "Lotada" para sessões esgotadas.
 *
 * Cobre o card pai inteiro. O card continua visível (backdrop-blur-sm)
 * mas fica inacessível — alinhado com a filosofia GamersClub de mostrar
 * o que existe mas não está disponível.
 *
 * O pai PRECISA ter `relative overflow-hidden`.
 *
 * @example
 * // Card de sessão esgotada
 * <div className="relative overflow-hidden">
 *   <SessionCard {...props} />
 *   <SoldOutOverlay subMessage="Próxima: terça-feira 19h" />
 * </div>
 *
 * @example
 * // Mensagem customizada
 * <div className="relative overflow-hidden">
 *   <ProCard {...props} />
 *   <SoldOutOverlay message="INDISPONÍVEL" subMessage="Coach em partida" />
 * </div>
 */
export function SoldOutOverlay({
  message,
  subMessage,
  className,
}: SoldOutOverlayProps) {
  const t = useTranslations("ui");
  const resolvedMessage = message ?? t("soldOut");
  return (
    <div
      className={cn(
        // Cobre todo o card pai — inset-0 com position absolute
        "absolute inset-0",
        // Intercepta todos os eventos de pointer — o card abaixo está bloqueado
        "pointer-events-auto",
        // Z elevado — acima do conteúdo do card (C17: token)
        "z-[var(--z-elevated)]",
        // Fundo semi-opaco com blur — revela o card atrás de forma desfocada
        // C14: sem hex — rgba como string de token não existe; usar opacity class
        "bg-bg-deep/60 backdrop-blur-sm",
        // Centraliza o conteúdo verticalmente e horizontalmente
        "flex flex-col items-center justify-center gap-2",
        className,
      )}
      // Acessibilidade — anuncia que o conteúdo está indisponível
      role="status"
      aria-label={`${t("sessionLabel")} ${resolvedMessage.toLowerCase()}${subMessage ? ` — ${subMessage}` : ""}`}
    >
      {/* ---- Ícone Lock — bloqueio visual imediato ---- */}
      <Lock
        className="size-8 text-[var(--color-text-muted)] mb-1"
        aria-hidden="true"
        strokeWidth={1.5}
      />

      {/* ---- Mensagem principal — Teko uppercase, direto ao ponto ---- */}
      {/* Reservado para momentos de impacto — PRODUCT_CORE § 5 "Maiúsculas para ênfase rara" */}
      <span
        className={cn(
          "font-[family-name:var(--font-display-condensed)]",
          "text-2xl font-semibold uppercase tracking-widest",
          "text-[var(--color-text-display)]",
          // Sem sombra de texto — o backdrop-blur já isola do card abaixo
        )}
        aria-hidden="true" // Já anunciado no aria-label do parent
      >
        {resolvedMessage}
      </span>

      {/* ---- Submensagem — opcional, fonte body, muted (contexto adicional) ---- */}
      {subMessage && (
        <span
          className={cn(
            "text-sm",
            "text-[var(--color-text-muted)]",
            "font-[family-name:var(--font-body)]",
            // Centraliza e limita largura para legibilidade
            "text-center max-w-[80%]",
          )}
          aria-hidden="true"
        >
          {subMessage}
        </span>
      )}
    </div>
  );
}
