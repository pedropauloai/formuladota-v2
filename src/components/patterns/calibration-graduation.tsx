"use client";

/**
 * CalibrationGraduation — Cerimônia fullscreen de graduação da calibração.
 *
 * Exibida quando o usuário completa suas partidas de calibração e recebe
 * seu tier inicial (Aprendiz). Visual cinematográfico com motion v12.
 *
 * Trigger manual (MVP): chamado via botão no catalog ou externamente.
 * Trigger automático (TODO): integrar com fluxo PT realizada quando
 *   calibration_status transita de 'visitante' → 'calibrando' (5ª partida).
 *
 * Componente Client: usa motion/react, sem Server Component.
 * Design V2.5 AAA-Grade: zero hex hardcoded, apenas tokens semânticos.
 */

import { useState, useEffect } from "react";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { cn } from "@/lib/utils";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CalibrationGraduationProps {
  /**
   * Função chamada ao clicar em "Continuar".
   * Se não fornecida, usa router.push("/dashboard").
   */
  onContinue?: () => void;

  /**
   * Princípio doutrinário destacado na cerimônia.
   * Default: princípio sobre responsabilidade.
   */
  principle?: string;

  className?: string;
}

// ─── Dados ───────────────────────────────────────────────────────────────────

const DEFAULT_PRINCIPLE =
  "Errar faz parte do aprendizado. Não tenha medo dos erros — eles são o primeiro passo para a evolução, desde que você os reconheça e aprenda com eles.";

// Fases de animação sequencial da cerimônia
type Phase = "ambient" | "reveal" | "principle" | "ready";

// ─── Componente ──────────────────────────────────────────────────────────────

export function CalibrationGraduation({
  onContinue,
  principle = DEFAULT_PRINCIPLE,
  className,
}: CalibrationGraduationProps) {
  const router = useRouter();
  const motionSafe = useMotionSafeBool();
  const [phase, setPhase] = useState<Phase>("ambient");

  // Progressão automática entre fases
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => setPhase("reveal"), 800),
      setTimeout(() => setPhase("principle"), 2200),
      setTimeout(() => setPhase("ready"), 4000),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  function handleContinue() {
    if (onContinue) {
      onContinue();
    } else {
      router.push("/dashboard");
    }
  }

  const showReveal = phase === "reveal" || phase === "principle" || phase === "ready";
  const showPrinciple = phase === "principle" || phase === "ready";
  const showButton = phase === "ready";

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center gap-10 px-8 py-16",
        "bg-bg-deep",
        className,
      )}
      style={{ zIndex: "var(--z-takeover)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Cerimônia de calibração concluída"
    >
      {/* ── AmbientLayer: gradiente radial brand vermelho ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, var(--color-brand-primary-glow) 0%, transparent 70%)",
        }}
      />

      {/* ── Grade sutil ── */}
      <div
        className="bg-grid pointer-events-none absolute inset-0 opacity-15"
        aria-hidden="true"
      />

      {/* ── Eyebrow — FORMULADOTA ── */}
      <div className="relative flex flex-col items-center gap-2 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.5em] text-brand-primary">
          FORMULADOTA
        </p>
        <p className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
          Calibração concluída
        </p>
      </div>

      {/* ── Medalha + Reveal ── */}
      <AnimatePresence>
        {showReveal && (
          <m.div
            key="medal-block"
            className="relative flex flex-col items-center gap-6"
            initial={motionSafe ? { opacity: 0, scale: 0.6, y: 20 } : {}}
            animate={motionSafe ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{
              duration: DURATIONS.cinematic,
              ease: EASINGS.cinematic,
            }}
          >
            {/* Glow ring ao redor da medalha */}
            <div
              className="relative flex items-center justify-center"
              style={{ filter: "drop-shadow(0 0 32px var(--color-brand-primary-glow))" }}
            >
              <HonorRankMedal
                rank="aprendiz"
                size="xl"
                showLabel={false}
                glow={false}
              />
            </div>

            {/* Tier name — cerimônia dramática */}
            <div className="text-center">
              <p className="font-display-condensed text-sm uppercase tracking-[0.5em] text-text-faded">
                Tier inicial
              </p>
              <h1
                className="mt-1 font-display text-5xl font-bold uppercase tracking-tight text-text-display"
                style={{ textShadow: "0 0 40px var(--color-brand-primary-glow)" }}
              >
                Aprendiz
              </h1>
            </div>

            {/* Headline cerimonial */}
            <p className="font-display text-lg font-medium uppercase tracking-wide text-text-muted">
              Sua jornada começa agora
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Princípio doutrinário ── */}
      <AnimatePresence>
        {showPrinciple && (
          <m.div
            key="principle-block"
            className="relative max-w-xl text-center"
            initial={motionSafe ? { opacity: 0, y: 16 } : {}}
            animate={motionSafe ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: DURATIONS.hero,
              ease: EASINGS.softLanding,
            }}
          >
            {/* Divider decorativo */}
            <div className="mx-auto mb-6 h-px w-24 bg-border-strong" aria-hidden="true" />

            <p className="font-sans text-sm uppercase tracking-widest text-brand-primary mb-3">
              Doutrina FormulaDota
            </p>

            {/* Princípio em Cinzel — usa font-display-condensed disponível */}
            <blockquote
              className={cn(
                "font-display-condensed text-xl font-medium italic leading-relaxed",
                "text-text-body md:text-2xl",
              )}
            >
              &ldquo;{principle}&rdquo;
            </blockquote>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Botão Continuar ── */}
      <AnimatePresence>
        {showButton && (
          <m.div
            key="button-block"
            initial={motionSafe ? { opacity: 0, y: 12 } : {}}
            animate={motionSafe ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: DURATIONS.standard,
              ease: EASINGS.softLanding,
            }}
          >
            <button
              type="button"
              onClick={handleContinue}
              className={cn(
                "inline-flex items-center justify-center gap-2",
                "rounded-md border border-brand-primary",
                "bg-brand-primary/10 hover:bg-brand-primary/20",
                "px-8 py-3",
                "font-display text-sm font-semibold uppercase tracking-widest",
                "text-brand-primary",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
              )}
            >
              Continuar
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
