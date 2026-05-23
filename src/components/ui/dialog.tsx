"use client";
/**
 * FORMULADOTA V2.5 — Dialog Component (DF6.3)
 *
 * Componente Dialog AAA-grade com duas variantes:
 *   - "centered"  — modal padrão centralizado com tokens semânticos (não shadcn vanilla)
 *   - "takeover"  — fullscreen cinematográfico (z-takeover, Cinzel, motion cinematic)
 *
 * Sound coupling (regra C20 + SOUND_SYSTEM.md):
 *   - centered:  play("notification") ao abrir
 *   - takeover:  play("stinger") ao abrir (momento de alto impacto)
 *
 * Motion (MOTION_SYSTEM.md):
 *   - centered:  scaleIn preset (standard 240ms, soft-landing)
 *   - takeover:  cinematic (1000ms, cinematic easing) — entrada + saída assimétricas
 *
 * Backdrop: fade in/out via data-[open]/data-[closed] Tailwind — sem Motion (background)
 *
 * API Base UI v1.4.1 — @base-ui/react/dialog
 *   Dialog.Root, .Trigger, .Portal, .Backdrop, .Popup, .Title, .Description, .Close
 *
 * Regras:
 *   - C14: zero hex hardcoded — apenas tokens CSS / classes Tailwind mapeadas
 *   - C17: zero z-index ad-hoc — usar var(--z-modal) e var(--z-takeover)
 *   - C20: sound + motion acoplados ao open
 */

import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { useMotionSafeBool } from "@/lib/motion/hooks";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// Re-exports diretos — Base UI primitivos sem wrap necessário
// ---------------------------------------------------------------------------

/** Root do Dialog — gerencia estado open/close */
export const DialogRoot = BaseDialog.Root;

/** Trigger que abre o Dialog ao clicar */
export const DialogTrigger = BaseDialog.Trigger;

/** Close — botão que fecha o Dialog */
export const DialogClose = BaseDialog.Close;

/** Portal — teletransporta o conteúdo para fora do DOM corrente */
export const DialogPortal = BaseDialog.Portal;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Variante visual do Dialog */
type DialogVariant = "centered" | "takeover";

// ---------------------------------------------------------------------------
// DialogBackdrop — overlay escuro com fade animado via classes Tailwind
// ---------------------------------------------------------------------------

type DialogBackdropProps = React.ComponentPropsWithoutRef<
  typeof BaseDialog.Backdrop
> & {
  /** Intensidade extra do backdrop para takeover (mais opaco) */
  dense?: boolean;
};

/**
 * Backdrop semitransparente com fade animado via data-[open]/data-[closed].
 * Não usa Motion lib — Tailwind animate-in/out é suficiente para o fundo.
 */
export function DialogBackdrop({
  className,
  dense = false,
  ...props
}: DialogBackdropProps) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        // Posicionamento fullscreen abaixo do conteúdo
        "fixed inset-0 backdrop-blur-sm",
        // Fade via data attributes do Base UI
        "data-[open]:animate-in data-[closed]:animate-out",
        "data-[open]:fade-in-0 data-[closed]:fade-out-0",
        // Opacidade do fundo — dense para takeover
        dense ? "bg-black/90" : "bg-black/70",
        className
      )}
      style={{ zIndex: "var(--z-modal)" }}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// DialogContent — variant-aware wrapper principal
// ---------------------------------------------------------------------------

type DialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>,
  // Evitar conflito de tipos com Motion wrappers internos
  "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
> & {
  /**
   * "centered" — modal padrão com tokens AAA (default)
   * "takeover" — fullscreen cinematográfico z-takeover
   */
  variant?: DialogVariant;
  /**
   * Controla se toca som ao abrir.
   * true (default) — "notification" em centered, "stinger" em takeover
   */
  playSoundOnOpen?: boolean;
};

/**
 * Conteúdo principal do Dialog.
 *
 * Acopla sound + motion na abertura conforme regra C20.
 * Motion obedece useMotionSafeBool — sem animações quando reduced-motion ativo.
 */
export function DialogContent({
  className,
  variant = "centered",
  playSoundOnOpen = true,
  children,
  ...props
}: DialogContentProps) {
  const play = useSound();
  const canAnimate = useMotionSafeBool();

  // Sound acoplado ao mount (= abertura do Popup no Portal)
  // Base UI monta o Popup apenas quando open=true
  React.useEffect(() => {
    if (!playSoundOnOpen) return;
    // takeover = reward (maior impacto disponível no sprite — stinger é asset separado, F5+)
    // centered = notification (alerta não-crítico, bell warm)
    // Regra C20: sound acoplado ao visual de abertura do Dialog
    play(variant === "takeover" ? "reward" : "notification");
  }, [playSoundOnOpen, play, variant]);

  // -------------------------------------------------------------------------
  // Variante TAKEOVER — fullscreen cinematográfico
  // -------------------------------------------------------------------------
  if (variant === "takeover") {
    return (
      <DialogPortal>
        {/* Backdrop mais denso para takeover */}
        <DialogBackdrop dense />

        <BaseDialog.Popup
          className={cn(
            // Fullscreen — cobre tudo
            "fixed inset-0 flex flex-col items-center justify-center",
            // Padding generoso para não costar nas bordas em mobile
            "p-8",
            // Sem outline do browser
            "outline-none",
            className
          )}
          style={{ zIndex: "var(--z-takeover)" }}
          {...props}
        >
          {canAnimate ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="takeover-content"
                // Entrada: escala de 0.96 → 1 com fade — cinematic timing
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                // Saída: expande levemente e desaparece (exit mais agressivo)
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{
                  duration: DURATIONS.cinematic,
                  ease: EASINGS.cinematic,
                }}
                // Tipografia Cinzel como padrão para takeover (override via className)
                className="font-display w-full flex flex-col items-center"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            // Fallback reduced-motion: sem scale/translate, apenas presença
            <div className="font-display w-full flex flex-col items-center">
              {children}
            </div>
          )}
        </BaseDialog.Popup>
      </DialogPortal>
    );
  }

  // -------------------------------------------------------------------------
  // Variante CENTERED — modal padrão com tokens AAA
  // -------------------------------------------------------------------------
  return (
    <DialogPortal>
      <DialogBackdrop />

      <BaseDialog.Popup
        className={cn(
          // Posicionamento centralizado
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          // Dimensões — max-w sem container SaaS excessivo
          "max-w-md w-[calc(100%-2rem)]",
          // Superfície elevada com tokens semânticos
          "bg-[var(--color-bg-elevated)]",
          "border border-[var(--color-border-strong)]",
          "rounded-[var(--radius-xl)]",
          "p-[var(--space-6)]",
          // Sombra cinematográfica
          "shadow-[var(--shadow-cinematic)]",
          // Sem outline browser
          "outline-none",
          className
        )}
        style={{ zIndex: "var(--z-modal)" }}
        {...props}
      >
        {canAnimate ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="centered-content"
              // scaleIn preset inline (standard 240ms, soft-landing)
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{
                duration: DURATIONS.standard,
                ease: EASINGS.softLanding,
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        ) : (
          // Fallback reduced-motion: sem scale
          children
        )}
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

// ---------------------------------------------------------------------------
// DialogTitle — título com tipografia display
// ---------------------------------------------------------------------------

type DialogTitleProps = React.ComponentPropsWithoutRef<
  typeof BaseDialog.Title
>;

/**
 * Título do Dialog.
 * Usa font-display (Cinzel) + cor text-display para máximo contraste.
 */
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Title
      className={cn(
        "font-display text-2xl font-semibold tracking-wide",
        "text-[var(--color-text-display)]",
        "mb-[var(--space-2)]",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// DialogDescription — corpo descritivo
// ---------------------------------------------------------------------------

type DialogDescriptionProps = React.ComponentPropsWithoutRef<
  typeof BaseDialog.Description
>;

/**
 * Descrição/corpo do Dialog.
 * Tom muted — hierarquia visual abaixo do título.
 */
export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps) {
  return (
    <BaseDialog.Description
      className={cn(
        "text-sm text-[var(--color-text-muted)]",
        "mb-[var(--space-4)]",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Compound export — API conveniente para consumo
// ---------------------------------------------------------------------------

/**
 * API Compound do Dialog.
 *
 * @example Variante centered (default)
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>Abrir</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Title>Título</Dialog.Title>
 *     <Dialog.Description>Descrição.</Dialog.Description>
 *     <Dialog.Close>Fechar</Dialog.Close>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 *
 * @example Variante takeover (fullscreen cinematográfico)
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>ACEITAR PARTIDA</Dialog.Trigger>
 *   <Dialog.Content variant="takeover">
 *     <Dialog.Title>PARTIDA ENCONTRADA</Dialog.Title>
 *     <Dialog.Description>10/10 jogadores prontos.</Dialog.Description>
 *     <Dialog.Close>ACEITAR</Dialog.Close>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
} as const;
