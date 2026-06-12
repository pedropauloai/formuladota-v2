// Tooltip — primitive CSS-only (zero JS de posicionamento, zero dependência).
//
// Hovers EDUCACIONAIS (decisão Pedro 2026-06-12): tooltips carregam a voz da
// doutrina — 1-2 frases que adicionam contexto que não cabe na tela.
//
// Acessibilidade:
//   - Mostra no hover E no focus (group-focus-within cobre filhos interativos
//     e o próprio wrapper quando `focusable`).
//   - `focusable` (default true) dá tabIndex=0 ao wrapper — use false quando o
//     filho JÁ é interativo (Link/button), pra não criar tab stop duplicado.
//   - aria-describedby liga o conteúdo ao wrapper (React.useId funciona em RSC).
//
// Estilo: denso, dark, borda sutil. Delay de 150ms só na ENTRADA (hover) —
// saída é imediata. C17: z via token (--z-elevated = "tooltips hover").
// Server Component friendly — sem hooks de estado.

import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type Side = "top" | "bottom" | "left" | "right"
type Align = "start" | "center" | "end"

const SIDE_CLASS: Record<Side, string> = {
  top: "bottom-full mb-1.5",
  bottom: "top-full mt-1.5",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
}

// Alinhamento horizontal — só se aplica a side top/bottom.
const ALIGN_CLASS: Record<Align, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
}

export interface TooltipProps {
  /** Texto do tooltip — curto (1-2 frases), voz Mestre, PT-BR. */
  content: ReactNode
  children: ReactNode
  /** Lado onde a bolha aparece. @default "top" */
  side?: Side
  /** Alinhamento horizontal (só top/bottom). @default "center" */
  align?: Align
  /**
   * Wrapper recebe tabIndex=0 (revela via teclado). Desligue quando o filho
   * já é interativo. @default true
   */
  focusable?: boolean
  /** Classes do wrapper externo. */
  className?: string
  /** Classes extras da bolha (ex.: largura customizada). */
  contentClassName?: string
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  focusable = true,
  className,
  contentClassName,
}: TooltipProps) {
  const id = useId()
  const isVertical = side === "top" || side === "bottom"

  return (
    <span
      className={cn(
        "group/tt relative inline-flex max-w-full focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brand-primary/60",
        className,
      )}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          // Posição
          "pointer-events-none absolute z-[var(--z-elevated)] w-max max-w-[280px]",
          SIDE_CLASS[side],
          isVertical && ALIGN_CLASS[align],
          // Visual — denso, dark, borda sutil
          "rounded-sm border border-border-strong bg-bg-deep/95 px-2.5 py-1.5 backdrop-blur-md",
          "font-sans text-xs leading-snug text-text-body shadow-lg shadow-black/70",
          // Mostrar: hover (com delay de entrada ~150ms) + focus. Sair: imediato.
          "opacity-0 transition-opacity duration-100",
          "group-hover/tt:opacity-100 group-hover/tt:delay-150",
          "group-focus-within/tt:opacity-100",
          contentClassName,
        )}
      >
        {content}
      </span>
    </span>
  )
}
