"use client";
/**
 * FORMULADOTA V2.5 — Toast System Custom (DF6.4)
 *
 * Sistema de toasts bottom-center, NÃO top-right SaaS.
 * Context-based: requer <ToastProvider> no root layout.
 *
 * Posicionamento: bottom-6, centralizado via left-1/2 + -translate-x-1/2
 * Animação: slide-up (y: 32→0) + fade, via motion/react
 * Som: success→confirm | error→error | info|warning→notification
 * Stack: múltiplos toasts empilham em coluna (flex-col-reverse, recente em cima)
 * Auto-dismiss: default 5000ms; duration=0 desativa
 *
 * Uso:
 *   const { toast } = useToast()
 *   toast({ type: "success", title: "Fila confirmada!", description: "Partida em breve." })
 *
 * NÃO substitui sonner.tsx — mantém como compat layer (código legado pode usar).
 * Este é o novo padrão para features V2.5+.
 *
 * Documentação: docs/foundations/PRODUCT_CORE.md § feedback hierarchy
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import type { SoundId } from "@/lib/sound/sprite-map";

// ---------------------------------------------------------------------------
// TIPOS PÚBLICOS
// ---------------------------------------------------------------------------

export type ToastType = "info" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  /** Duração em ms antes do auto-dismiss. Passar 0 para sem auto-dismiss. Default: 5000 */
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// CONTEXT
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// MAPEAMENTOS POR TIPO
// ---------------------------------------------------------------------------

/** Sons acoplados por tipo — SOUND_SYSTEM.md § coupling */
const SOUND_BY_TYPE: Record<ToastType, SoundId> = {
  info: "notification",
  success: "confirm",
  error: "error",
  warning: "notification",
};

/** Ícones Lucide por tipo */
const ICON_BY_TYPE: Record<ToastType, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
};

/**
 * Borda lateral colorida por tipo (border-l-2).
 * Usa tokens semânticos de --color-* via classes Tailwind mapeadas em globals.css.
 * ZERO hex hardcoded — apenas tokens CSS.
 */
const BORDER_BY_TYPE: Record<ToastType, string> = {
  info: "border-l-[var(--color-info)]",
  success: "border-l-[var(--color-success)]",
  error: "border-l-[var(--color-error)]",
  warning: "border-l-[var(--color-warning)]",
};

/** Cor do ícone por tipo */
const ICON_COLOR_BY_TYPE: Record<ToastType, string> = {
  info: "text-[var(--color-info)]",
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-error)]",
  warning: "text-[var(--color-warning)]",
};

// ---------------------------------------------------------------------------
// PROVIDER
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const play = useSound();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      const newToast: Toast = { duration: 5000, ...t, id };

      setToasts((prev) => [...prev, newToast]);

      // Som acoplado ao tipo — dispara junto com o toast
      play(SOUND_BY_TYPE[newToast.type]);

      // Auto-dismiss: duração > 0 agenda remoção
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => dismiss(id), newToast.duration);
      }
    },
    [play, dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// VIEWPORT — container fixo bottom-center
// ---------------------------------------------------------------------------

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const t = useTranslations("ui");
  return (
    /*
     * Posicionamento: fixed bottom-6, centralizado.
     * left-1/2 + -translate-x-1/2 garante centro horizontal absoluto.
     * flex-col-reverse: toast mais recente fica em cima do stack.
     * pointer-events-none no container, pointer-events-auto em cada item
     * (garante que cliques fora do toast não são interceptados).
     * aria-live="polite" — leitores de tela anunciam novos toasts.
     * z-index usa var(--z-system) = 100 (GRUPO 11 semantic.css).
     */
    <div
      role="region"
      aria-label={t("toastRegionLabel")}
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 pointer-events-none"
      style={{ zIndex: "var(--z-system)" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ITEM INDIVIDUAL — animado com motion/react
// ---------------------------------------------------------------------------

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast: toastData, onDismiss }: ToastItemProps) {
  const t = useTranslations("ui");
  const Icon = ICON_BY_TYPE[toastData.type];

  return (
    <m.div
      layout
      /*
       * Animação slide-up + fade (DF6.4):
       *   initial: opacidade 0, deslocado 32px abaixo, escala 0.96 (sensação de distância)
       *   animate: posição natural, opacidade 1, escala 1
       *   exit:    fade + recolhe (escala 0.96) — saída discreta
       *
       * Easing softLanding (cubic-bezier 0.4, 0, 0.2, 1) — entra rápido, pousa suave.
       * Duration standard = 240ms — transição de elemento padrão (DURATIONS.standard).
       */
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{
        duration: DURATIONS.standard,
        ease: EASINGS.softLanding,
      }}
      className={cn(
        // Layout base
        "pointer-events-auto flex items-start gap-3 px-4 py-3",
        // Dimensões
        "min-w-[320px] max-w-md",
        // Fundo elevado via token semântico
        "bg-[var(--color-bg-elevated)]",
        // Borda arredondada estilo Dota (radius-md = 8px)
        "rounded-[var(--radius-md)]",
        // Borda lateral colorida por tipo (border-l-2)
        "border-l-2",
        BORDER_BY_TYPE[toastData.type],
        // Sombra cinematográfica
        "shadow-[var(--shadow-cinematic)]"
      )}
      role="alert"
      aria-atomic="true"
    >
      {/* Ícone colorido por tipo */}
      <Icon
        className={cn("size-5 mt-0.5 shrink-0", ICON_COLOR_BY_TYPE[toastData.type])}
        aria-hidden="true"
      />

      {/* Conteúdo textual */}
      <div className="flex-1 min-w-0">
        <p
          className="font-display text-sm text-[var(--color-text-display)] tracking-wide leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {toastData.title}
        </p>
        {toastData.description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
            {toastData.description}
          </p>
        )}
      </div>

      {/* Botão de dispensar */}
      <button
        onClick={() => onDismiss(toastData.id)}
        className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-display)] transition-colors duration-[var(--motion-duration-micro)]"
        aria-label={t("toastDismiss")}
        type="button"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </m.div>
  );
}
