/**
 * SeasonBanner — FormulaDota V2.5
 *
 * Banner horizontal para o topo da app exibindo season + countdown em tempo real.
 * Inspirado no pattern GamersClub "Season 9 — Rising Stars — Começa em 04d 17h 32m".
 *
 * Mandamentos satisfeitos:
 *   M4  — Live state sempre visível (countdown recalculado a cada minuto)
 *   M5  — Feedback sonoro em milestones (1 dia e 1 hora restantes)
 *   M11 — Atmospheric: gradient sutil + pulse no separador
 *
 * Regras cruzadas:
 *   C14 — zero hex — apenas tokens semânticos via classes Tailwind
 *   C15 — durations via presets.ts
 *   C16 — som via useSound(), guard contra spam
 *   C20 — sound acoplado a evento de milestone
 *
 * Font display-condensed (Teko Variable) nos números de countdown —
 * token: var(--font-display-condensed) definido em semantic.css.
 */

"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { m } from "motion/react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";
import { useSound } from "@/lib/sound/hooks";
import { fadeIn, DURATIONS, EASINGS } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface SeasonBannerProps {
  /** Número ordinal da season. */
  seasonNumber: number;
  /** Nome temático da season (ex: "Despertar"). */
  seasonName: string;
  /** Data/hora de encerramento da season (UTC). */
  endsAt: Date;
  className?: string;
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calcula o tempo restante entre agora e uma data alvo.
 * Retorna null quando a data já passou.
 */
function calcTimeRemaining(endsAt: Date): TimeRemaining | null {
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days    = Math.floor(totalMinutes / (60 * 24));
  const hours   = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

/**
 * Formata número com zero à esquerda (ex: 4 → "04").
 */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Sub-componente: countdown display em Teko
// ---------------------------------------------------------------------------

interface CountdownDisplayProps {
  remaining: TimeRemaining;
}

/**
 * Exibe o countdown no formato "47d 12h 04m" em Teko (font-display-condensed).
 * Cada unidade é exibida em tabular-nums para evitar layout shift ao mudar.
 */
function CountdownDisplay({ remaining }: CountdownDisplayProps) {
  const parts: Array<{ value: string; unit: string }> = [
    { value: pad2(remaining.days),    unit: "d" },
    { value: pad2(remaining.hours),   unit: "h" },
    { value: pad2(remaining.minutes), unit: "m" },
  ];

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5",
        "[font-family:var(--font-display-condensed)]",
        "text-lg font-semibold tabular-nums text-text-display leading-none"
      )}
      aria-label={`${remaining.days} dias, ${remaining.hours} horas, ${remaining.minutes} minutos restantes`}
    >
      {parts.map(({ value, unit }, i) => (
        <span key={unit} className="inline-flex items-baseline gap-0.5">
          <span>{value}</span>
          <span className="text-sm text-text-muted">{unit}</span>
          {/* Espaço entre unidades (exceto última) */}
          {i < parts.length - 1 && <span className="mr-1" aria-hidden="true" />}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Banner de season com countdown ao vivo — inspirado em GamersClub.
 *
 * @example
 * <SeasonBanner
 *   seasonNumber={1}
 *   seasonName="Despertar"
 *   endsAt={new Date("2026-08-23T00:00:00Z")}
 * />
 */
export function SeasonBanner({
  seasonNumber,
  seasonName,
  endsAt,
  className,
}: SeasonBannerProps) {
  const motionSafe = useMotionSafeBool();
  const play       = useSound();

  // Controle de milestones já notificados — evita spam de som
  const milestonesFired = useRef<Set<string>>(new Set());

  const [remaining, setRemaining] = useState<TimeRemaining | null>(
    () => calcTimeRemaining(endsAt)
  );

  // Recalcula countdown e verifica milestones a cada minuto
  const tick = useCallback(() => {
    const next = calcTimeRemaining(endsAt);
    setRemaining(next);

    if (next === null) return;

    // Milestone: 1 dia restante (days === 1, hours === 0, minutes < 1)
    if (next.days === 1 && next.hours === 0) {
      const key = "1d";
      if (!milestonesFired.current.has(key)) {
        milestonesFired.current.add(key);
        play("notification");
      }
    }

    // Milestone: 1 hora restante (days === 0, hours === 1, minutes < 1)
    if (next.days === 0 && next.hours === 1 && next.minutes === 0) {
      const key = "1h";
      if (!milestonesFired.current.has(key)) {
        milestonesFired.current.add(key);
        play("notification");
      }
    }
  }, [endsAt, play]);

  // Intervalo de 60s — cleanup automático no unmount
  useEffect(() => {
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tick]);

  const seasonLabel = `Season ${seasonNumber} — ${seasonName}`;

  return (
    <m.div
      className={cn(
        /* Layout */
        "w-full h-10 flex items-center justify-center px-4 gap-3",
        /* Background: gradient brand sutil → transparent (da esquerda) */
        "bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent",
        /* Borda inferior da brand */
        "border-b border-brand-primary/30",
        className
      )}
      variants={fadeIn}
      initial={motionSafe ? "hidden" : false}
      animate="visible"
      transition={{
        duration: DURATIONS.standard,
        ease: EASINGS.softLanding,
      }}
      role="banner"
      aria-label={`${seasonLabel} — Encerra em ${remaining ? `${remaining.days} dias` : "breve"}`}
    >
      {/* Ícone de season */}
      <Trophy
        className="size-3.5 text-brand-primary shrink-0"
        aria-hidden="true"
      />

      {/* Nome da season */}
      <span className="text-sm font-medium text-text-body whitespace-nowrap">
        {seasonLabel}
      </span>

      {/* Separador • com pulse atmospheric */}
      {motionSafe ? (
        <m.span
          className="text-brand-primary/60 text-sm"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          •
        </m.span>
      ) : (
        <span className="text-brand-primary/60 text-sm" aria-hidden="true">•</span>
      )}

      {/* Countdown OU mensagem de encerramento */}
      {remaining !== null ? (
        <CountdownDisplay remaining={remaining} />
      ) : (
        <span className="text-sm text-text-muted">
          Season encerrada — aguarde Season {seasonNumber + 1}
        </span>
      )}
    </m.div>
  );
}
