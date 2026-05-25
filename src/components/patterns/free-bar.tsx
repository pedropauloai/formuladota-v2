"use client";
/**
 * FreeBar — FormulaDota V2.5 (Premium Markers)
 *
 * Banner horizontal persistente acima do top-bar. Aparece apenas para
 * usuários sem ficha ativa (fichasCount === 0).
 *
 * Voz: Mestre — autoridade calma, sem urgência artificial.
 * Zero "OFERTA", "IMPERDÍVEL", "DESCONTO" — ver PRODUCT_CORE § 4 "O Que Não é o Mestre".
 *
 * Inspiração: GamersClub free bar persistente — adaptado para o MVP fichas
 * do FORMULADOTA (sem subscription, venda avulsa de fichas de vaga).
 *
 * Regras:
 *   C14 — zero hex hardcoded; apenas tokens semânticos
 *   C17 — z-index via var(--z-*)
 *   C19 — "use client" explícito — usa hooks de motion
 *   m.  — LazyMotion strict (nunca motion.)
 *   Sem botão de fechar — gentle persistence alinhado à Doutrina
 */

import { m, AnimatePresence } from "motion/react";
import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Informação sobre próxima vaga disponível */
export interface NextSlotInfo {
  /** Horas até a próxima vaga */
  hours: number;
  /** Minutos até a próxima vaga (além das horas) */
  minutes: number;
}

export interface FreeBarProps {
  /** Controla visibilidade — falso oculta com animação de saída */
  show: boolean;
  /** Quantidade de fichas ativas do usuário. 0 = exibe o banner. */
  fichasCount: number;
  /**
   * Informação da próxima vaga disponível.
   * Exibido em destaque com --font-display-condensed Teko.
   */
  nextSlotIn?: NextSlotInfo;
  /** Callback do CTA "Garantir Vaga" */
  onBuy?: () => void;
  /** Classes extras aplicadas ao container (raramente necessário) */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helper — formata info de próxima vaga
// ---------------------------------------------------------------------------

/**
 * Formata o tempo de próxima vaga de forma legível.
 * Ex: { hours: 2, minutes: 14 } → "2h 14min"
 *     { hours: 0, minutes: 30 } → "30min"
 */
function formatNextSlot(next: NextSlotInfo): string {
  if (next.hours > 0 && next.minutes > 0) {
    return `${next.hours}h ${next.minutes}min`;
  }
  if (next.hours > 0) {
    return `${next.hours}h`;
  }
  return `${next.minutes}min`;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * FreeBar — banner persistente para usuários sem ficha ativa.
 *
 * Renderizado acima do top-bar (slot `freeBar` do ClientShell).
 * Sem X para fechar — o usuário sai do estado quando compra uma ficha.
 *
 * @example
 * <FreeBar
 *   show={user.fichasAtivas === 0}
 *   fichasCount={0}
 *   nextSlotIn={{ hours: 2, minutes: 14 }}
 *   onBuy={() => router.push("/pacotes")}
 * />
 */
export function FreeBar({
  show,
  fichasCount,
  nextSlotIn,
  onBuy,
  className,
}: FreeBarProps) {
  // Exibe somente quando show=true E fichasCount === 0
  const visible = show && fichasCount === 0;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          key="free-bar"
          // Entrada: slide de cima para baixo
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: 0.24, // --motion-duration-standard (240ms)
            ease: [0.4, 0, 0.2, 1], // --motion-ease-soft-landing
          }}
          // Overflow hidden para animação de height funcionar corretamente
          style={{ overflow: "hidden", zIndex: "var(--z-system)" }}
          className={cn("relative w-full", className)}
        >
          {/* Wrapper interno com conteúdo e estilos visuais */}
          <div
            className={cn(
              // Layout horizontal centralizado, compacto
              "flex items-center justify-center gap-3",
              "h-10 px-4",
              // Fundo: gradiente sutil brand/15 → bg-elevated — não estridente (voz Mestre)
              "bg-gradient-to-r from-[var(--color-brand-primary-glow)] to-transparent",
              // Borda inferior sutil — separa do top-bar
              "border-b border-[var(--color-border-brand)]/30",
            )}
          >
            {/* ---- CTA "SUBIR DE MMR" — contexto atração, visitante sem ficha ---- */}
            {/* Regra PHILOSOPHY.md §Reconciliações: FreeBar para visitante = contexto de atração */}
            {/* Quem tem ficha ativa não vê este banner — usa PresenceLive ou similar */}
            <span
              className={cn(
                "text-sm font-semibold",
                "text-[var(--color-text-display)]",
                "font-[family-name:var(--font-display)]",
                "uppercase tracking-widest",
                "hidden xs:block",
              )}
            >
              SUBIR DE MMR
            </span>

            {/* ---- Separador visual ---- */}
            {nextSlotIn && (
              <span
                className="text-[var(--color-text-faded)] text-sm hidden xs:block"
                aria-hidden="true"
              >
                ·
              </span>
            )}

            {/* ---- Próxima partida — font-display-condensed Teko em destaque ---- */}
            {nextSlotIn && (
              <span className="flex items-baseline gap-1.5">
                <span
                  className="text-sm text-[var(--color-text-muted)] font-[family-name:var(--font-body)] hidden sm:block"
                >
                  Próxima partida em
                </span>
                {/* Countdown em Teko — reservado para momentos de impacto (semantic.css § 7) */}
                <span
                  className={cn(
                    "font-[family-name:var(--font-display-condensed)]",
                    "text-base font-semibold tracking-wide uppercase",
                    "text-[var(--color-text-display)]",
                    // Tabular nums — dado numérico em destaque (leitura rápida)
                    "tabular-nums",
                  )}
                  // Acessibilidade: anuncia o tempo restante
                  aria-label={`Próxima partida em ${formatNextSlot(nextSlotIn)}`}
                >
                  {formatNextSlot(nextSlotIn)}
                </span>
              </span>
            )}

            {/* ---- CTA: "Garantir vaga" — voz direta, sem urgência artificial ---- */}
            <Button
              variant="cinematic"
              size="sm"
              onClick={onBuy}
              className="shrink-0"
              aria-label="Garantir vaga para subir de MMR — ir para página de fichas"
            >
              <Ticket className="size-3.5" aria-hidden="true" />
              Garantir vaga
            </Button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
