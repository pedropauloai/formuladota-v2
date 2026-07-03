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
  useLayoutEffect,
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
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/**
 * Posição FINAL (left/top absolutos, sem transform) considerando o TAMANHO da bolha:
 * escolhe o melhor lado (FLIP quando o lado pedido não cabe) e faz clamp no eixo
 * transversal — a bolha SEMPRE aparece inteira, no melhor espaço, em qualquer lugar
 * da interface (Pedro 2026-07-02: "nunca expandir pro lado errado").
 */
function computePos(rect: DOMRect, bw: number, bh: number, side: Side, align: Align): Pos {
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (side === "left" || side === "right") {
    const fitsRight = rect.right + GAP + bw <= vw - VIEWPORT_PAD
    const fitsLeft = rect.left - GAP - bw >= VIEWPORT_PAD
    // Mantém o lado pedido se couber; senão vira pro oposto; senão pro que tem mais espaço.
    const useLeft =
      side === "left" ? fitsLeft || !fitsRight : !(fitsRight || !fitsLeft)
    const x = useLeft ? rect.left - GAP - bw : rect.right + GAP
    const yRaw =
      align === "start"
        ? rect.top
        : align === "end"
          ? rect.bottom - bh
          : rect.top + rect.height / 2 - bh / 2
    return { x: clamp(x, VIEWPORT_PAD, vw - VIEWPORT_PAD - bw), y: clamp(yRaw, VIEWPORT_PAD, vh - VIEWPORT_PAD - bh) }
  }

  const fitsTop = rect.top - GAP - bh >= VIEWPORT_PAD
  const fitsBottom = rect.bottom + GAP + bh <= vh - VIEWPORT_PAD
  const useTop = side === "top" ? fitsTop || !fitsBottom : !(fitsBottom || !fitsTop)
  const y = useTop ? rect.top - GAP - bh : rect.bottom + GAP
  const xRaw =
    align === "start"
      ? rect.left
      : align === "end"
        ? rect.right - bw
        : rect.left + rect.width / 2 - bw / 2
  return { x: clamp(xRaw, VIEWPORT_PAD, vw - VIEWPORT_PAD - bw), y: clamp(y, VIEWPORT_PAD, vh - VIEWPORT_PAD - bh) }
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
  // trigger = rect do gatilho (bolha renderiza escondida pra medir); pos = final.
  const [trigger, setTrigger] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)

  const show = useCallback((immediate: boolean) => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    const open = () => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (rect) {
        setPos(null)
        setTrigger(rect)
      }
    }
    if (immediate) open()
    else enterTimer.current = setTimeout(open, 150)
  }, [])

  const hide = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    setTrigger(null)
    setPos(null)
  }, [])

  // Mede a bolha (já montada, invisível) e escolhe o melhor lado + clamp. Layout
  // effect: posiciona antes do paint (sem flash).
  useLayoutEffect(() => {
    if (!trigger || !bubbleRef.current) return
    const b = bubbleRef.current.getBoundingClientRect()
    setPos(computePos(trigger, b.width, b.height, side, align))
  }, [trigger, side, align])

  // Posição fixa fica defasada se a página rolar/redimensionar — esconde.
  useEffect(() => {
    if (!trigger) return
    window.addEventListener("scroll", hide, { capture: true, passive: true })
    window.addEventListener("resize", hide, { passive: true })
    return () => {
      window.removeEventListener("scroll", hide, { capture: true })
      window.removeEventListener("resize", hide)
    }
  }, [trigger, hide])

  return (
    <span
      ref={wrapperRef}
      className={cn(
        "inline-flex max-w-full focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brand-primary/60",
        className
      )}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={trigger ? id : undefined}
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
    >
      {children}
      {trigger &&
        createPortal(
          <span
            ref={bubbleRef}
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              // Antes de medir (pos=null), ancora no PRÓPRIO gatilho — nunca em (0,0),
              // que é o canto da TELA (position:fixed). Se um paint escapar antes do
              // reposicionamento fino, a bolha pisca EM CIMA do ícone, não no canto —
              // é o que dava a sensação de "surgir de uma região estranha". (Pedro 2026-07-02)
              left: pos ? pos.x : (trigger ? trigger.left : 0),
              top: pos ? pos.y : (trigger ? trigger.bottom + GAP : 0),
              // E fica invisível até o cálculo final (dupla proteção).
              visibility: pos ? "visible" : "hidden",
            }}
            className={cn(
              // Acima de TUDO (drawers, modais) — tooltip é efêmero
              "pointer-events-none z-[var(--z-takeover)] w-max max-w-[280px]",
              "rounded-sm border border-border-strong bg-bg-deep/95 px-2.5 py-1.5 backdrop-blur-md",
              "font-sans text-xs leading-snug text-text-body shadow-lg shadow-black/70",
              // transition-none é CRÍTICO: sem transition-property explícito, o
              // `duration-100` ativava o default `transition: all` — então a mudança
              // de left/top (posição inicial → final) DESLIZAVA a bolha pela tela.
              // Era esse slide que dava a sensação de "surgir de uma região estranha".
              // A entrada continua suave via `animate-in fade-in` (é animation, não
              // transition — não afeta a posição). (Pedro 2026-07-02)
              "transition-none",
              pos ? "animate-in fade-in duration-100" : "opacity-0",
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
