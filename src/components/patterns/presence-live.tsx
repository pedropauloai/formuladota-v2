/**
 * PresenceLive — FormulaDota V2.5
 *
 * Componente de presença em tempo real do coach + estatísticas da comunidade.
 * Desacoplado de Supabase — recebe props, pai gerencia subscriptions.
 *
 * Mandamentos satisfeitos:
 *   M4  — Live state sempre visível (PresenceDot + stats sempre no DOM)
 *   M9  — Presence rich via PresenceDot com 6 estados
 *   M11 — Atmospheric: pulse sutil comunica vida sem interromper foco
 *
 * Regras cruzadas:
 *   C14 — zero hex hardcoded — apenas tokens semânticos
 *   C15 — motion durations via presets.ts
 *   C19 — sem animate-spin; estados carregando usam texto pulsante
 *
 * Variants:
 *   compact  — para header/navbar (linha única, dados essenciais)
 *   expanded — para dashboard (card completo com todas as estatísticas)
 */

"use client";

import { m, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Users, Clock } from "lucide-react";
import { PresenceDot } from "@/components/ui/presence-dot";
import { cn } from "@/lib/utils";
import { useMotionSafeBool } from "@/lib/motion/hooks";
import { fadeIn, DURATIONS, EASINGS } from "@/lib/motion/presets";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Status de presença aceito pelo PresenceLive (subconjunto de PresenceStatus). */
export type ProStatus = "online" | "offline" | "in-match";

export interface NextSlot {
  hours: number;
  minutes: number;
}

export interface PresenceLiveProps {
  /** Nome do coach exibido ao lado do PresenceDot. */
  proName: string;
  /** Status de presença atual do coach. */
  proStatus: ProStatus;
  /** Alunos que jogaram ao menos uma sessão nos últimos 7 dias. */
  weekActiveStudents: number;
  /**
   * Tempo até a próxima vaga disponível.
   * null quando não há vaga prevista (Pedro offline / agenda cheia).
   */
  nextSlotIn: NextSlot | null;
  /**
   * Variant de exibição:
   * - compact  → linha única, ideal para header/navbar
   * - expanded → card com todas as estatísticas, ideal para dashboard
   * @default "expanded"
   */
  variant?: "compact" | "expanded";
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Formata o tempo até a próxima vaga em string legível.
 * Ex: { hours: 2, minutes: 14 } → "2h 14min"
 */
function formatNextSlot(slot: NextSlot, t: Translator): string {
  const partes: string[] = [];
  if (slot.hours > 0)   partes.push(`${slot.hours}h`);
  if (slot.minutes > 0) partes.push(`${slot.minutes}min`);
  return partes.join(" ") || t("soon");
}

/**
 * Retorna texto de status offline localizado.
 * Usa "retorna amanhã 19h" como texto padrão — ajustar quando horário vier do DB.
 */
function getOfflineText(proName: string, t: Translator): string {
  return t("proReturnsTomorrow", { name: proName });
}

// ---------------------------------------------------------------------------
// Sub-componente — variante compact (header)
// ---------------------------------------------------------------------------

function PresenceLiveCompact({
  proName,
  proStatus,
  weekActiveStudents,
  nextSlotIn,
  motionSafe,
}: Omit<PresenceLiveProps, "variant" | "className"> & { motionSafe: boolean }) {
  const t = useTranslations("ui");
  const isOnline = proStatus !== "offline";

  return (
    <span className="inline-flex items-center gap-3 flex-wrap">
      {/* Coach — dot + nome */}
      <span className="inline-flex items-center gap-1.5">
        <PresenceDot
          status={proStatus === "in-match" ? "in-match" : proStatus === "online" ? "online" : "offline"}
          size="sm"
        />
        <span className="text-sm font-medium text-text-body">{proName}</span>
      </span>

      {/* Separador visual */}
      <span className="text-text-faded text-sm" aria-hidden="true">·</span>

      {/* Stat principal: próxima vaga OU offline */}
      <AnimatePresence mode="wait">
        {isOnline && nextSlotIn ? (
          <m.span
            key="next-slot"
            className="inline-flex items-center gap-1"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            <Clock className="size-3.5 text-text-muted shrink-0" aria-hidden="true" />
            <span className="text-sm text-text-muted">{t("nextSlotIn")}</span>
            <span
              className={cn(
                "text-sm font-semibold text-text-display tabular-nums leading-none",
                "[font-family:var(--font-display-condensed)]"
              )}
            >
              {formatNextSlot(nextSlotIn, t)}
            </span>
          </m.span>
        ) : isOnline ? (
          <m.span
            key="online-no-slot"
            className="text-sm text-text-muted"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            <span className="text-success font-medium">{weekActiveStudents}</span>
            {` ${t("studentsThisWeekSuffix")}`}
          </m.span>
        ) : (
          <m.span
            key="offline"
            className="text-sm text-text-faded"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            {getOfflineText(proName, t)}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente — variante expanded (dashboard)
// ---------------------------------------------------------------------------

function PresenceLiveExpanded({
  proName,
  proStatus,
  weekActiveStudents,
  nextSlotIn,
  motionSafe,
}: Omit<PresenceLiveProps, "variant" | "className"> & { motionSafe: boolean }) {
  const t = useTranslations("ui");
  const isOnline = proStatus !== "offline";

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Coach com presença rich */}
      <div className="flex items-center gap-2">
        <PresenceDot
          status={proStatus === "in-match" ? "in-match" : proStatus === "online" ? "online" : "offline"}
          size="md"
        />
        <span className="text-base font-semibold text-text-display">{proName}</span>
        {/* Badge de status em partida */}
        {proStatus === "in-match" && (
          <m.span
            className="text-sm px-1.5 py-0.5 rounded bg-play-primary/20 text-play-primary font-medium"
            animate={motionSafe ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {t("inMatch")}
          </m.span>
        )}
      </div>

      {/* Linha 2: Próxima vaga — destaque visual com Teko */}
      <AnimatePresence mode="wait">
        {isOnline && nextSlotIn ? (
          <m.div
            key="slot-info"
            className="flex items-center gap-2"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            <Clock className="size-4 text-text-muted shrink-0" aria-hidden="true" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-text-muted">{t("nextSlotIn")}</span>
              <span
                className={cn(
                  "text-xl font-semibold text-text-display tabular-nums leading-none",
                  "[font-family:var(--font-display-condensed)]"
                )}
              >
                {formatNextSlot(nextSlotIn, t)}
              </span>
            </div>
          </m.div>
        ) : isOnline ? (
          <m.div
            key="online-no-slot"
            className="flex items-center gap-2"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            <Clock className="size-4 text-text-muted shrink-0" aria-hidden="true" />
            <span className="text-sm text-text-muted">{t("noOpenSlots")}</span>
          </m.div>
        ) : (
          <m.div
            key="offline"
            className="flex items-center gap-2"
            variants={fadeIn}
            initial={motionSafe ? "hidden" : false}
            animate="visible"
            exit="exit"
          >
            <Clock className="size-4 text-text-faded shrink-0" aria-hidden="true" />
            <span className="text-sm text-text-faded">{getOfflineText(proName, t)}</span>
          </m.div>
        )}
      </AnimatePresence>

      {/* Linha 3: Alunos ativos — sempre visível */}
      <div className="flex items-center gap-2">
        <Users className="size-4 text-text-muted shrink-0" aria-hidden="true" />
        <span className="text-sm text-text-muted">
          <span
            className={cn(
              "text-base font-semibold text-text-display tabular-nums",
              "[font-family:var(--font-display-condensed)]"
            )}
          >
            {weekActiveStudents}
          </span>
          {` ${t("activeStudentsThisWeekSuffix")}`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Presença em tempo real do coach + estatísticas da comunidade.
 *
 * @example
 * // Compact — header/navbar
 * <PresenceLive
 *   proName="Pedro"
 *   proStatus="online"
 *   weekActiveStudents={12}
 *   nextSlotIn={{ hours: 2, minutes: 14 }}
 *   variant="compact"
 * />
 *
 * @example
 * // Expanded — dashboard card
 * <PresenceLive
 *   proName="Pedro"
 *   proStatus="in-match"
 *   weekActiveStudents={12}
 *   nextSlotIn={null}
 *   variant="expanded"
 * />
 */
export function PresenceLive({
  proName,
  proStatus,
  weekActiveStudents,
  nextSlotIn,
  variant = "expanded",
  className,
}: PresenceLiveProps) {
  const motionSafe = useMotionSafeBool();

  const sharedProps = { proName, proStatus, weekActiveStudents, nextSlotIn, motionSafe };

  return (
    <m.div
      className={cn(className)}
      variants={fadeIn}
      initial={motionSafe ? "hidden" : false}
      animate="visible"
      transition={{
        duration: DURATIONS.standard,
        ease: EASINGS.softLanding,
      }}
    >
      {variant === "compact" ? (
        <PresenceLiveCompact {...sharedProps} />
      ) : (
        <PresenceLiveExpanded {...sharedProps} />
      )}
    </m.div>
  );
}
