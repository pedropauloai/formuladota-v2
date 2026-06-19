/**
 * QueuePanel — FormulaDota V2.5-F7 (DF7.3)
 *
 * Painel de fila ao vivo — COMPONENTE PURO (pai gerencia Supabase Realtime).
 * Exibe: counter "X/Y jogadores", timer "Searching... MM:SS", CTA massivo.
 *
 * Mandamentos satisfeitos:
 *   M3 — CTA com weight massivo (Button variant="cinematic" size="xl")
 *   M4 — Live state sempre visível (counter + timer visíveis no estado searching)
 *   M5 — Feedback visual + sonoro acoplado (sound em marcos do timer)
 *   M9 — Presence rich 4 estados via PresenceDot
 *   M10 — Sound feedback (notification em marcos do timer)
 *
 * Regras cruzadas:
 *   C14 — zero hex hardcoded — apenas tokens semânticos
 *   C15 — motion durations via tokens
 *   C16 — som via useSound(), nunca direto em onClick
 *   C19 — sem spinner animate-spin; estado loading exibe texto pulsante
 *   C20 — sound + motion acoplados em toda interação
 *
 * Status states: idle | searching | found | in-match
 * Referência de motion: queueEnterToMatchFound em MOTION_SYSTEM.md § 4
 */

"use client";

import { useEffect, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PresenceDot } from "@/components/ui/presence-dot";
import type { PresenceStatus } from "@/components/ui/presence-dot";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";
import { useSound } from "@/lib/sound/hooks";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Quatro estados possíveis do painel de fila. */
export type QueueStatus = "idle" | "searching" | "found" | "in-match";

/**
 * Participante na fila — dados mínimos passados pelo pai via Supabase Presence.
 * Pai gerencia subscription; QueuePanel recebe snapshot via props.
 */
export interface QueueParticipant {
  /** ID único do participante (ex: user UUID ou Supabase presence key) */
  id: string;
  /** Nome de exibição (username Discord ou Steam persona) */
  name: string;
  /** Status de presença do participante */
  presence: PresenceStatus;
}

export interface QueuePanelProps {
  /** Estado atual da fila */
  status: QueueStatus;
  /** Lista de participantes na fila — pai gerencia via Supabase Presence */
  participants: QueueParticipant[];
  /**
   * Capacidade máxima da fila (default 5 — grupo Pedro + 4 players).
   * Exibido no formato "X/{maxSize} jogadores".
   */
  maxSize?: number;
  /**
   * Segundos decorridos desde que o usuário entrou na fila.
   * Pai deve incrementar com setInterval(1000) após onJoin.
   * Exibido como "MM:SS" no estado "searching".
   */
  searchSeconds?: number;
  /** Callback ao clicar "Entrar na Fila" (estado idle) */
  onJoin?: () => void;
  /** Callback ao clicar "Sair da Fila" (estado searching) */
  onLeave?: () => void;
  /** Callback ao clicar "Aceitar Partida" (estado found) */
  onAccept?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formata segundos como "MM:SS" (ex: 90 → "01:30").
 * Usa padStart pra garantir dois dígitos — tabular-nums previne layout shift.
 */
function formatTimer(seconds: number): string {
  const totalSeconds = Math.max(0, seconds);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const ss = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Retorna rótulo de status localizado para exibição no header.
 */
function getStatusLabel(
  status: QueueStatus,
  t: (key: string) => string
): string {
  switch (status) {
    case "idle":     return t("queueStatusIdle");
    case "searching": return t("queueStatusSearching");
    case "found":    return t("queueStatusFound");
    case "in-match": return t("queueStatusInMatch");
  }
}

/**
 * Marcos de tempo (segundos) em que o sound "notification" é disparado.
 * MOTION_SYSTEM § 4 queueEnterToMatchFound: timer incrementa sem animação,
 * mas marcos disparam feedback sonoro (M4 + M10).
 */
const TIMER_SOUND_MILESTONES = new Set([30, 60, 120, 300]);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function QueuePanel({
  status,
  participants,
  maxSize = 5,
  searchSeconds = 0,
  onJoin,
  onLeave,
  onAccept,
  className,
}: QueuePanelProps) {
  const t = useTranslations("ui");
  const motionSafe = useMotionSafeBool();
  const play = useSound();

  // Ref para rastrear último marco disparado (evita disparo duplo)
  const lastMilestoneRef = useRef<number>(-1);

  const isSearching = status === "searching";
  const isFound = status === "found";
  const filled = participants.length;

  // -------------------------------------------------------------------------
  // Efeito: som em marcos do timer (M10 — sound feedback obrigatório)
  // Dispara "notification" nos marcos 0:30, 1:00, 2:00, 5:00
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isSearching) return;
    if (!TIMER_SOUND_MILESTONES.has(searchSeconds)) return;
    if (lastMilestoneRef.current === searchSeconds) return;

    lastMilestoneRef.current = searchSeconds;
    play("notification");
  }, [isSearching, searchSeconds, play]);

  // -------------------------------------------------------------------------
  // Reset do tracking de marco quando sai da fila
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isSearching) {
      lastMilestoneRef.current = -1;
    }
  }, [isSearching]);

  // -------------------------------------------------------------------------
  // Sound: stinger ao entrar no estado "found" (partida encontrada)
  // Nível Crítico (M5, M10, UX_PRINCIPLES § 4 Nível 1)
  // -------------------------------------------------------------------------
  const prevStatusRef = useRef<QueueStatus>(status);
  useEffect(() => {
    if (prevStatusRef.current !== "found" && status === "found") {
      // "notification" como proxy — stinger real virá do SoundManager em F5
      play("notification");
    }
    prevStatusRef.current = status;
  }, [status, play]);

  // -------------------------------------------------------------------------
  // Variante de pulse para estado "searching"
  // MOTION_SYSTEM § 10 "Queue Card Pulse": opacity 0.6→1.0→0.6, 280ms por ciclo
  // -------------------------------------------------------------------------
  const pulseAnimate = motionSafe
    ? { opacity: [0.6, 1, 0.6] }
    : { opacity: 1 };

  const pulseTransition = motionSafe
    ? {
        duration: DURATIONS.standard, // 240ms ≈ 280ms do MOTION_SYSTEM
        repeat: Infinity,
        ease: EASINGS.snappy as [number, number, number, number],
      }
    : {};

  // -------------------------------------------------------------------------
  // Variante de entrada do card de partida encontrada (scaleIn cinematográfico)
  // MOTION_SYSTEM § 4 queueEnterToMatchFound: card escala 0.8→1.0 em 900ms
  // -------------------------------------------------------------------------
  const foundCardVariants = {
    hidden: { opacity: 0, scale: 0.88 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: DURATIONS.cinematic,
        ease: EASINGS.cinematic as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: {
        duration: DURATIONS.micro,
        ease: EASINGS.snappy as [number, number, number, number],
      },
    },
  };

  // -------------------------------------------------------------------------
  // Variante de entrada suave para participantes (fadeInUp stagger)
  // -------------------------------------------------------------------------
  const participantVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATIONS.standard,
        ease: EASINGS.softLanding as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: { duration: DURATIONS.micro },
    },
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Card variant="hero" className={cn("w-full max-w-lg", className)}>
      {/* ------------------------------------------------------------------ */}
      {/* HEADER — status label + counter "X/Y jogadores"                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-[var(--space-2)]">
        {/* Status label — micro uppercase tracking-widest */}
        <p
          className="font-[family-name:var(--font-display)] text-sm uppercase tracking-widest"
          style={{ color: "var(--color-text-faded)" }}
        >
          {getStatusLabel(status, t)}
        </p>

        {/* Counter "X/Y jogadores" — tabular-nums previne layout shift (M4) */}
        <h2
          className="font-[family-name:var(--font-display)] text-3xl tracking-wide"
          style={{ color: "var(--color-text-display)" }}
        >
          <span className="tabular-nums">{filled}</span>
          <span
            className="text-xl"
            style={{ color: "var(--color-text-muted)" }}
          >
            /{maxSize}
          </span>
          <span
            className="ml-[var(--space-2)] text-xl uppercase"
            style={{ color: "var(--color-text-muted)" }}
          >
            {` ${t("players")}`}
          </span>
        </h2>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TIMER "MM:SS" — visível apenas no estado "searching" (M4 Live State) */}
      {/* Pulse animation: queueEnterToMatchFound — opacity 0.6→1.0, 240ms loop */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence mode="wait">
        {isSearching && (
          <m.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATIONS.standard }}
            className="mt-[var(--space-6)]"
          >
            {/* Container pulsante — comunica "buscando ativamente" */}
            <m.div
              animate={pulseAnimate}
              transition={pulseTransition}
              className="text-center"
            >
              {/* Label "Buscando..." */}
              <p
                className="font-[family-name:var(--font-body)] text-sm uppercase tracking-widest mb-[var(--space-2)]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("searching")}
              </p>
              {/* Timer MM:SS — fonte display, tabular-nums (sem layout shift) */}
              <span
                className="font-[family-name:var(--font-mono)] text-5xl tabular-nums"
                style={{ color: "var(--color-brand-primary)" }}
                aria-live="polite"
                aria-label={t("searchTimeAria", { time: formatTimer(searchSeconds) })}
              >
                {formatTimer(searchSeconds)}
              </span>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* PARTIDA ENCONTRADA — overlay/card com animação cinematográfica       */}
      {/* MOTION_SYSTEM § 4: card escala 0.8→1.0 em 900ms ease cinematic     */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence mode="wait">
        {isFound && (
          <m.div
            key="found"
            variants={motionSafe ? foundCardVariants : undefined}
            initial={motionSafe ? "hidden" : { opacity: 0 }}
            animate={motionSafe ? "visible" : { opacity: 1 }}
            exit={motionSafe ? "exit" : { opacity: 0 }}
            className="mt-[var(--space-6)] rounded-[var(--radius-md)] p-[var(--space-4)] text-center"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-brand)",
              boxShadow: "var(--glow-brand)",
            }}
          >
            <p
              className="font-[family-name:var(--font-display)] text-lg uppercase tracking-widest font-bold"
              style={{ color: "var(--color-text-display)" }}
            >
              {t("queueStatusFound")}
            </p>
            <p
              className="mt-[var(--space-1)] text-sm font-[family-name:var(--font-body)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("playersReady", { filled, maxSize })}
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* LISTA DE PARTICIPANTES — presence dots + nomes (M9 Presence Rich)   */}
      {/* Slots vazios exibem placeholder iterativo                           */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {participants.length > 0 && (
          <m.div
            key="participants"
            className="mt-[var(--space-6)] space-y-[var(--space-2)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATIONS.standard }}
          >
            {/* Slots preenchidos */}
            {participants.map((participant, index) => (
              <m.div
                key={participant.id}
                variants={motionSafe ? participantVariants : undefined}
                initial={motionSafe ? "hidden" : false}
                animate={motionSafe ? "visible" : true}
                exit={motionSafe ? "exit" : undefined}
                custom={index}
                className="flex items-center justify-center gap-[var(--space-2)]"
              >
                <PresenceDot status={participant.presence} size="sm" />
                <span
                  className="text-sm font-[family-name:var(--font-display)] tracking-wide"
                  style={{ color: "var(--color-text-body)" }}
                >
                  {participant.name}
                </span>
              </m.div>
            ))}

            {/* Slots vazios — "aguardando..." */}
            {Array.from({ length: Math.max(0, maxSize - filled) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center gap-[var(--space-2)]"
                >
                  {/* Dot vazio: borda subtle, sem cor de presença */}
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-sm font-[family-name:var(--font-display)] tracking-wide italic"
                    style={{ color: "var(--color-text-faded)" }}
                  >
                    {t("waiting")}
                  </span>
                </div>
              )
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* PRIMARY CTA MASSIVO — hierarquia de ação por status (M3)            */}
      {/* idle: cinematic "Entrar na Fila"                                    */}
      {/* searching: ghost "Sair da Fila" (ação secundária)                   */}
      {/* found: primary "Aceitar Partida" (urgência máxima)                  */}
      {/* in-match: exibição informativa sem CTA                              */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="mt-[var(--space-8)] pt-[var(--space-6)]"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <AnimatePresence mode="wait">
          {status === "idle" && onJoin && (
            <m.div
              key="cta-join"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                duration: DURATIONS.standard,
                ease: EASINGS.softLanding as [number, number, number, number],
              }}
              className="flex justify-center"
            >
              {/* Cinematic — maior variante; M3 Entrar na Fila peso massivo */}
              <Button
                variant="cinematic"
                size="xl"
                onClick={onJoin}
                aria-label={t("joinQueueAria")}
              >
                {t("joinQueue")}
              </Button>
            </m.div>
          )}

          {isSearching && onLeave && (
            <m.div
              key="cta-leave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATIONS.standard }}
              className="flex justify-center"
            >
              {/* Ghost — peso mínimo; ação de sair é secundária (M3) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLeave}
                aria-label={t("leaveQueueAria")}
              >
                {t("leaveQueue")}
              </Button>
            </m.div>
          )}

          {isFound && onAccept && (
            <m.div
              key="cta-accept"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: DURATIONS.hero,
                ease: EASINGS.cinematic as [number, number, number, number],
              }}
              className="flex justify-center"
            >
              {/* Primary — máxima urgência; partida encontrada = nível crítico (M3) */}
              <Button
                variant="primary"
                size="xl"
                onClick={onAccept}
                aria-label={t("acceptMatchAria")}
              >
                {t("acceptMatch")}
              </Button>
            </m.div>
          )}

          {status === "in-match" && (
            <m.div
              key="in-match-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATIONS.standard }}
              className="text-center"
            >
              <p
                className="text-sm font-[family-name:var(--font-body)] uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                {t("matchInProgress")}
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Exportação de tipos para uso pelo pai (Supabase Presence integration)
// ---------------------------------------------------------------------------
export type { PresenceStatus };
