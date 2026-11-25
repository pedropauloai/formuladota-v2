"use client";

// Peças da mesa de operação da fila. Instrumento, não vitrine: silencioso (nada de som, que vazaria
// para a live), letra de 14 px para cima e uma cor por função: verde é a próxima ação, dourado é
// quem entra no lugar de alguém, âmbar é falta, vermelho é tirar. Menus e popovers são do Base UI
// (teclado e foco prontos); este arquivo só dá a forma.

import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy } from "lucide-react";
import { v2Page } from "@/components/v2";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import { cn } from "@/lib/utils";

export const opButton = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] font-medium",
    "transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-primary [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      tone: {
        /** A próxima ação da live: uma por tela. */
        go: "bg-play-primary text-bg-deep shadow-[inset_0_1px_0_rgb(255_255_255/0.28)] hover:bg-play-primary-hover",
        neutral: "border border-white/[0.12] bg-white/[0.04] text-text-display hover:border-white/25 hover:bg-white/[0.08]",
        quiet: "text-text-muted hover:bg-white/[0.06] hover:text-text-display",
        /** Quem entra no lugar de alguém (troca). */
        target: "border border-gold/60 bg-gold/[0.06] text-gold hover:border-gold hover:bg-gold hover:text-bg-deep",
        caution: "border border-warning/40 text-warning hover:bg-warning/10",
        danger: "border border-error/40 text-error hover:bg-error/10",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-[15px]",
        xl: "h-14 px-6 text-base font-semibold",
        icon: "size-9",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
);

interface OpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof opButton> {
  icon?: ReactNode;
  /** Tecla de atalho, mostrada no próprio botão. */
  kbd?: string;
  /** Ação em andamento: o rótulo pulsa e o botão espera. */
  pending?: boolean;
}

export const OpButton = forwardRef<HTMLButtonElement, OpButtonProps>(function OpButton(
  { tone, size, icon, kbd, pending = false, className, children, disabled, type = "button", ...props },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={cn(opButton({ tone, size }), className)} {...props}>
      {icon}
      {children !== undefined && <span className={cn(pending && "animate-pulse")}>{children}</span>}
      {kbd && <Kbd className="ml-1">{kbd}</Kbd>}
    </button>
  );
});

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border border-current/30 px-1 font-body text-sm font-medium leading-none opacity-60", className)}>
      {children}
    </kbd>
  );
}

export type Origin = "pedido" | "battlepass" | "cortesia";

export function originOf(entry: AdminQueueEntry): Origin {
  if (entry.courtesy) return "cortesia";
  return entry.battlepass ? "battlepass" : "pedido";
}

const ORIGIN: Record<Origin, { label: string; dot: string; text: string }> = {
  pedido: { label: "Pagou", dot: "bg-gold", text: "text-gold" },
  battlepass: { label: "Battlepass", dot: "bg-brand-primary", text: "text-brand-primary" },
  cortesia: { label: "Cortesia", dot: "bg-play-primary", text: "text-play-primary" },
};

export function OriginPill({ entry }: { entry: AdminQueueEntry }) {
  const origin = ORIGIN[originOf(entry)];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", origin.text)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", origin.dot)} />
      {origin.label}
    </span>
  );
}

/** O ID do Dota com um clique para copiar: é por ele que o PPA convida para a party. */
export function CopyId({ id, variant = "quiet", className }: { id: string; variant?: "large" | "quiet"; className?: string }) {
  const [copied, setCopied] = useState(false);
  const large = variant === "large";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copy();
      }}
      className={cn(
        "group/copy inline-flex items-center gap-2 rounded-[var(--radius-button)] tabular-nums transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-primary",
        large && "h-11 w-full justify-center border px-3 text-base font-semibold tracking-wide",
        large && (copied ? "border-play-primary/60 bg-play-primary/10 text-play-primary" : "border-white/10 bg-bg-deep text-text-display hover:border-white/25"),
        !large && "h-8 px-2 text-sm",
        !large && (copied ? "bg-play-primary/10 text-play-primary" : "text-text-muted hover:bg-white/[0.06] hover:text-text-display"),
        className
      )}
      data-fila-copiar-id={id}
    >
      <span className="inline-flex items-center gap-2">
        {copied ? <Check size={large ? 16 : 14} aria-hidden="true" /> : <Copy size={large ? 16 : 14} aria-hidden="true" className="opacity-60 group-hover/copy:opacity-100" />}
        {id}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "ID copiado" : ""}
      </span>
    </button>
  );
}

/** Partidas de quem está na party: jogadas cheias, a atual com anel, as que faltam apagadas. */
export function MatchPips({ played, matches, dayPass = false }: { played: number; matches: number; dayPass?: boolean }) {
  // A vaga do dia não tem teto: as de hoje cheias (até 4, para caber no lugar) e a atual com anel.
  if (dayPass) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-text-muted" data-fila-vaga-do-dia>
        <span className="inline-flex gap-1" aria-hidden="true">
          {Array.from({ length: Math.min(played, 4) }, (_, i) => (
            <span key={i} className="size-2 rounded-full bg-play-primary" />
          ))}
          <span className="size-2 rounded-full bg-play-primary/25 ring-1 ring-play-primary" />
        </span>
        <span>
          <b className="font-semibold text-text-display">{played + 1}ª</b> partida hoje
        </span>
      </span>
    );
  }
  const current = Math.min(played + 1, matches);
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text-muted">
      <span className="inline-flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.min(matches, 10) }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full",
              i < played ? "bg-play-primary" : i === played ? "bg-play-primary/25 ring-1 ring-play-primary" : "bg-white/15"
            )}
          />
        ))}
      </span>
      {current === matches ? (
        <span className="text-text-body">última partida</span>
      ) : (
        <span>
          partida <b className="font-semibold text-text-display">{current}</b> de {matches}
        </span>
      )}
    </span>
  );
}

/** "agora", "há 12 min", "há 3 h"; passou de um dia, a data. */
export function since(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 24 * 60) return `há ${Math.floor(minutes / 60)} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Título de seção da mesa, na mesma voz condensada do cliente do Dota. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("font-display-condensed text-[1.75rem] uppercase leading-none tracking-wide text-text-display", className)}>{children}</h2>;
}

/** Menus e janelas abrem fora da mesa (no body), então levam a mesma escala dela na tela de 1440 de altura. */
export const POPUP = `${v2Page} rounded-md border border-white/10 bg-bg-elevated p-1 text-sm text-text-body shadow-[0_16px_40px_rgba(0,0,0,0.6)] outline-none`;
export const MENU_ITEM =
  "flex cursor-default select-none items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-text-display data-[disabled]:opacity-40";
