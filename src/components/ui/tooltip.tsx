"use client"

// Tooltip — portal com posição FIXA (fix 2026-06-12, feedback Pedro: a versão
// CSS-only absoluta era cortada por qualquer ancestral com overflow-hidden —
// e o layout master-detail usa overflow-hidden em todo lugar).
//
// A bolha renderiza em document.body via createPortal com position:fixed —
// "salta pra fora" e sobrepõe qualquer container, mantendo o design system.
//
// Hovers EDUCACIONAIS (decisão Pedro): 1-2 frases com a voz da doutrina.
// Acessível: hover E focus; `focusable` dá tabIndex=0 ao wrapper (desligue
// quando o filho já é interativo). Delay 150ms só na entrada; esconde em
// scroll/resize (posição ficaria defasada). Clamp nas bordas do viewport.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type Side = "top" | "bottom" | "left" | "right"
type Align = "start" | "center" | "end"

export interface TooltipProps {
  /** Texto do tooltip — curto (1-2 frases), voz Mestre, PT-BR. */
  content: ReactNode
  children: ReactNode
  /** Lado onde a bolha aparece. @default "top" */
  side?: Side
  /** Alinhamento (eixo transversal). @default "center" */
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

const GAP = 6
const VIEWPORT_PAD = 8

interface Pos {
  x: number
  y: number
  transform: string
}

/** Calcula a posição fixa da bolha a partir do rect do trigger. */
function computePos(rect: DOMRect, side: Side, align: Align): Pos {
  if (side === "left" || side === "right") {
    const x = side === "left" ? rect.left - GAP : rect.right + GAP
    const tx = side === "left" ? "-100%" : "0%"
    const y =
      align === "start" ? rect.top : align === "end" ? rect.bottom : rect.top + rect.height / 2
    const ty = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%"
    return { x, y, transform: `translate(${tx}, ${ty})` }
  }
  const y = side === "top" ? rect.top - GAP : rect.bottom + GAP
  const ty = side === "top" ? "-100%" : "0%"
  const x =
    align === "start" ? rect.left : align === "end" ? rect.right : rect.left + rect.width / 2
  const tx = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%"
  return { x, y, transform: `translate(${tx}, ${ty})` }
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
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)

  const show = useCallback(
    (immediate: boolean) => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      const open = () => {
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (rect) setPos(computePos(rect, side, align))
      }
      if (immediate) open()
      else enterTimer.current = setTimeout(open, 150)
    },
    [side, align]
  )

  const hide = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    setPos(null)
  }, [])

  // Posição fixa fica defasada se a página rolar/redimensionar — esconde.
  useEffect(() => {
    if (!pos) return
    window.addEventListener("scroll", hide, { capture: true, passive: true })
    window.addEventListener("resize", hide, { passive: true })
    return () => {
      window.removeEventListener("scroll", hide, { capture: true })
      window.removeEventListener("resize", hide)
    }
  }, [pos, hide])

  // Clamp pós-render NOS DOIS EIXOS (Pedro 2026-06-12): a bolha se adapta pra
  // aparecer inteira dentro do viewport, independente de onde o trigger esteja.
  useEffect(() => {
    const el = bubbleRef.current
    if (!el || !pos) return
    // Reset antes de medir (re-aberturas reaproveitam o nó)
    el.style.marginLeft = "0px"
    el.style.marginTop = "0px"
    const r = el.getBoundingClientRect()
    let dx = 0
    if (r.left < VIEWPORT_PAD) dx = VIEWPORT_PAD - r.left
    else if (r.right > window.innerWidth - VIEWPORT_PAD)
      dx = window.innerWidth - VIEWPORT_PAD - r.right
    let dy = 0
    if (r.top < VIEWPORT_PAD) dy = VIEWPORT_PAD - r.top
    else if (r.bottom > window.innerHeight - VIEWPORT_PAD)
      dy = window.innerHeight - VIEWPORT_PAD - r.bottom
    if (dx !== 0) el.style.marginLeft = `${dx}px`
    if (dy !== 0) el.style.marginTop = `${dy}px`
  }, [pos])

  return (
    <span
      ref={wrapperRef}
      className={cn(
        "inline-flex max-w-full focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brand-primary/60",
        className
      )}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={pos ? id : undefined}
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
    >
      {children}
      {pos &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
              transform: pos.transform,
            }}
            className={cn(
              // Acima de TUDO (drawers, modais) — tooltip é efêmero
              "pointer-events-none z-[var(--z-takeover)] w-max max-w-[280px]",
              "rounded-sm border border-border-strong bg-bg-deep/95 px-2.5 py-1.5 backdrop-blur-md",
              "font-sans text-xs leading-snug text-text-body shadow-lg shadow-black/70",
              "animate-in fade-in duration-100",
              contentClassName
            )}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  )
}
