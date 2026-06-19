"use client";

// QueueBoard — visualização da fila de 1 PRO, com slots N (até filaMaxVagas).
// Reusável em 3 variantes:
//   - compact: card pequeno pra right-sidebar
//   - presentation: card grande pro center do dashboard
//   - admin: variante presentation com botão X em cada slot ocupado
//
// Componente puro de visualização. Ações (entrar, sair, iniciar PT, remover)
// ficam no parent — QueueBoard só renderiza estado.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Radio, X, Loader2, Clock, Users, Crown } from "lucide-react";
import { usePrompt } from "@/components/ui/confirm";

export interface BoardCoach {
  coachId: string;
  username: string | null;
  avatarUrl: string | null;
  mmrAtual: number | null;
  headline: string | null;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
  /** Modo da fila: 'play' (PRO joga) ou 'coached' (PRO observa + análise). */
  queueMode?: "play" | "coached";
}

export interface BoardEntry {
  entryId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  /** Opcional: PTs jogadas com esse coach nas últimas 24h. Badge informativo. */
  ptsToday?: number;
}

interface Props {
  coach: BoardCoach;
  entries: BoardEntry[];
  variant?: "compact" | "presentation" | "admin";
  /** ID do user vendo o board — se estiver na fila, destaca slot dele */
  viewerUserId?: string | null;
  /** Callback admin pra remover aluno do slot (variante admin) */
  onRemoveEntry?: (entryId: string, reason: string) => Promise<void>;
  /** Header colapsado quando compact (esconde headline e divisor extra) */
  showHeadline?: boolean;
}

export function QueueBoard({
  coach,
  entries,
  variant = "presentation",
  viewerUserId = null,
  onRemoveEntry,
  showHeadline = true,
}: Props) {
  // Slots ativos = "próxima PT" (top N pelo algoritmo LRU)
  const slotsCount = coach.filaMaxVagas;
  const slots = Array.from({ length: slotsCount }, (_, i) => entries[i] ?? null);
  // Restante da fila esperando (5º em diante quando filaMaxVagas=4)
  const waitingList = entries.slice(slotsCount);
  // Snapshot do horário ao montar — useState lazy init é puro (não invoca em re-renders)
  const [now] = useState(() => Date.now());
  const minutesOpen = coach.filaAbertaEm
    ? Math.floor((now - new Date(coach.filaAbertaEm).getTime()) / 60000)
    : 0;
  const isCompact = variant === "compact";
  const isAdmin = variant === "admin";
  const t = useTranslations("queue");

  return (
    <article
      className={`relative rounded-md border backdrop-blur-sm ${
        coach.filaAberta
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border-subtle bg-bg-elevated/50"
      } ${isCompact ? "p-3" : "p-5"}`}
      aria-label={t("boardAriaLabel", { name: coach.username ?? coach.coachId })}
    >
      {/* Ring pulsante de status quando aberta */}
      {coach.filaAberta && (
        <span
          className="absolute -top-1 -right-1 flex size-3"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
        </span>
      )}

      {/* Header — info do PRO */}
      <header className={`flex items-center gap-3 ${isCompact ? "mb-2" : "mb-4"}`}>
        {coach.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.avatarUrl}
            alt=""
            className={`shrink-0 rounded-sm border-2 ${
              coach.filaAberta ? "border-emerald-500/60" : "border-border-subtle"
            } ${isCompact ? "size-8" : "size-12"}`}
          />
        ) : (
          <div
            className={`shrink-0 rounded-sm border-2 bg-bg-deep/40 ${
              coach.filaAberta ? "border-emerald-500/60" : "border-border-subtle"
            } ${isCompact ? "size-8" : "size-12"}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Crown
              size={isCompact ? 10 : 12}
              className="text-brand-primary shrink-0"
              aria-hidden="true"
            />
            <p
              className={`font-display uppercase tracking-wide text-white truncate ${
                isCompact ? "text-sm" : "text-lg"
              }`}
            >
              {coach.username ?? "PRO"}
            </p>
          </div>
          <p
            className={`font-mono text-white/60 mt-0.5 ${
              isCompact ? "text-sm 2xl:text-base" : "text-sm 2xl:text-base"
            }`}
          >
            {coach.mmrAtual ? `${coach.mmrAtual.toLocaleString("pt-BR")} MMR` : "—"}
            {coach.filaAberta && minutesOpen > 0 && ` · ${t("openForMinutes", { minutes: minutesOpen })}`}
          </p>
          {coach.filaAberta && coach.queueMode && (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-wide ${
                coach.queueMode === "coached"
                  ? "bg-success/10 text-success"
                  : "bg-brand-primary/10 text-brand-primary"
              }`}
            >
              {coach.queueMode === "coached"
                ? t("modeCoached")
                : t("modePlay")}
            </span>
          )}
        </div>
      </header>

      {/* Headline (só em presentation/admin grandes) */}
      {!isCompact && showHeadline && coach.headline && (
        <p className="mb-4 font-serif text-sm 2xl:text-base italic text-white/60 border-l-2 border-emerald-500/30 pl-3">
          {coach.headline}
        </p>
      )}

      {/* Slots */}
      <div
        className={`grid gap-${isCompact ? "1" : "2"} ${
          coach.filaMaxVagas === 4 ? "grid-cols-4" : `grid-cols-${coach.filaMaxVagas}`
        }`}
      >
        {slots.map((slot, idx) => (
          <Slot
            key={slot?.entryId ?? `empty-${idx}`}
            slot={slot}
            index={idx}
            isViewer={slot?.userId === viewerUserId}
            isAdmin={isAdmin}
            isCompact={isCompact}
            onRemoveEntry={onRemoveEntry}
          />
        ))}
      </div>

      {/* Waiting list — só na variante presentation/admin se há overflow além dos slots */}
      {!isCompact && waitingList.length > 0 && (
        <WaitingList
          entries={waitingList}
          startPosition={slotsCount + 1}
          viewerUserId={viewerUserId}
          isAdmin={isAdmin}
          onRemoveEntry={onRemoveEntry}
        />
      )}

      {/* Footer status — Teko condensed (font-display-condensed) pra labels
          pequenas. Substitui Geist Mono que ficava pesada/espalhada em
          11-12px. Pedro 2026-05-25: teste de fonte pra labels minúsculas. */}
      <footer className={`flex items-center justify-between gap-2 ${isCompact ? "mt-3" : "mt-5"}`}>
        <span
          className={`inline-flex items-center gap-1.5 font-display-condensed uppercase tracking-wider font-semibold ${
            isCompact ? "text-sm" : "text-sm"
          } ${coach.filaAberta ? "text-emerald-300" : "text-white/40"}`}
        >
          {coach.filaAberta ? (
            <>
              <Radio size={isCompact ? 10 : 12} aria-hidden="true" />
              {t("queueOpen")}
            </>
          ) : (
            <>{t("queueClosed")}</>
          )}
        </span>
        <span
          className={`font-display-condensed uppercase tracking-wider text-white/60 text-right ${
            isCompact ? "text-sm" : "text-sm"
          }`}
        >
          <Users size={isCompact ? 10 : 12} className="inline mr-1 -mt-0.5" aria-hidden="true" />
          {t("inQueueCount", { count: entries.length })}
          {waitingList.length > 0 && (
            <span className="ml-1 text-amber-300">
              · {t("waitingCount", { count: waitingList.length })}
            </span>
          )}
        </span>
      </footer>
    </article>
  );
}

// ============== Waiting list — slots além dos primeiros N ==============

interface WaitingListProps {
  entries: BoardEntry[];
  startPosition: number;
  viewerUserId: string | null;
  isAdmin: boolean;
  onRemoveEntry?: (entryId: string, reason: string) => Promise<void>;
}

function WaitingList({
  entries,
  startPosition,
  viewerUserId,
  isAdmin,
  onRemoveEntry,
}: WaitingListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const prompt = usePrompt();
  const t = useTranslations("queue");
  // Snapshot do horário ao montar — useState lazy init é puro (não invoca em re-renders)
  const [now] = useState(() => Date.now());

  async function handleRemove(entryId: string, username: string | null) {
    if (!onRemoveEntry) return;
    const reason = await prompt({
      title: t("removePromptTitle", { name: username ?? t("student") }),
      message: t("removePromptMessage"),
      placeholder: t("removePromptPlaceholder"),
      defaultValue: t("removeDefaultReason"),
      required: true,
      confirmLabel: t("remove"),
      variant: "destructive",
    });
    if (!reason || reason.trim().length < 3) return;
    setPendingId(entryId);
    startTransition(async () => {
      try {
        await onRemoveEntry(entryId, reason);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="mt-4 rounded-md border border-white/10 bg-black/30 p-4">
      <p className="mb-3 font-display font-semibold text-sm font-semibold uppercase tracking-wide text-amber-300">
        {t("waitingNextRoundCount", { count: entries.length })}
      </p>
      <ul className="space-y-2">
        {entries.map((e, idx) => {
          const position = startPosition + idx;
          const isViewer = e.userId === viewerUserId;
          const waitingMinutes = Math.floor(
            (now - new Date(e.joinedAt).getTime()) / 60000
          );
          const isRemoving = pendingId === e.entryId;
          return (
            <li
              key={e.entryId}
              className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                isViewer
                  ? "bg-amber-400/15 ring-1 ring-amber-400/40"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`font-mono text-sm 2xl:text-base font-semibold tabular-nums w-7 ${
                  isViewer ? "font-bold text-amber-300" : "text-white/60"
                }`}
              >
                {position}º
              </span>
              {e.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.avatarUrl}
                  alt=""
                  className={`size-7 rounded-sm ${
                    isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-white/20"
                  }`}
                />
              ) : (
                <div className="size-7 rounded-sm bg-white/10" />
              )}
              <span
                className={`flex-1 truncate font-sans text-sm 2xl:text-base ${
                  isViewer ? "font-bold text-white" : "text-white/90"
                }`}
              >
                {isViewer ? t("you") : e.username ?? "—"}
              </span>
              {e.ptsToday !== undefined && e.ptsToday > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-sm 2xl:text-base font-semibold text-amber-200">
                  {t("timesToday", { count: e.ptsToday })}
                </span>
              )}
              <span className="font-mono text-sm 2xl:text-base text-white/55 tabular-nums w-10 text-right">
                {waitingMinutes}m
              </span>
              {isAdmin && onRemoveEntry && (
                <button
                  type="button"
                  onClick={() => handleRemove(e.entryId, e.username)}
                  disabled={isRemoving}
                  aria-label={t("removeAriaLabel", { name: e.username ?? t("student") })}
                  className="flex size-6 items-center justify-center rounded-full text-white/40 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {isRemoving ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <X size={11} />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SlotProps {
  slot: BoardEntry | null;
  index: number;
  isViewer: boolean;
  isAdmin: boolean;
  isCompact: boolean;
  onRemoveEntry?: (entryId: string, reason: string) => Promise<void>;
}

function Slot({
  slot,
  index,
  isViewer,
  isAdmin,
  isCompact,
  onRemoveEntry,
}: SlotProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const prompt = usePrompt();
  const t = useTranslations("queue");
  // Snapshot do horário ao montar — via useState inicial (não muda entre renders)
  const [mountNow] = useState(() => Date.now());

  // Slot vazio
  if (!slot) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md border border-dashed border-white/10 bg-black/20 ${
          isCompact ? "p-2 min-h-[64px]" : "p-3 min-h-[110px]"
        }`}
      >
        <span
          className={`font-mono text-white/30 ${isCompact ? "text-sm 2xl:text-base" : "text-sm 2xl:text-base"}`}
        >
          {t("slotN", { n: index + 1 })}
        </span>
        <span
          className={`font-mono text-white/40 mt-1 ${
            isCompact ? "text-sm" : "text-sm"
          } uppercase tracking-widest`}
        >
          {t("free")}
        </span>
      </div>
    );
  }

  async function handleRemove() {
    if (!onRemoveEntry) return;
    const reason = await prompt({
      title: t("removePromptTitle", { name: slot?.username ?? t("student") }),
      message: t("removePromptMessage"),
      placeholder: t("removePromptPlaceholder"),
      defaultValue: t("removeDefaultReason"),
      required: true,
      confirmLabel: t("remove"),
      variant: "destructive",
    });
    if (!reason || reason.trim().length < 3) return;
    setError(null);
    startTransition(async () => {
      try {
        await onRemoveEntry(slot!.entryId, reason);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errorGeneric"));
      }
    });
  }

  const waitingMinutes = Math.floor(
    (mountNow - new Date(slot.joinedAt).getTime()) / 60000
  );

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-md border ${
        isViewer
          ? "border-amber-400/80 bg-amber-400/10 ring-2 ring-amber-400/40"
          : "border-emerald-500/30 bg-emerald-500/5"
      } ${isCompact ? "p-1.5" : "p-3"}`}
    >
      {slot.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.avatarUrl}
          alt=""
          className={`rounded-sm ${
            isCompact ? "size-7" : "size-10"
          } ${isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-emerald-500/40"}`}
        />
      ) : (
        <div
          className={`rounded-sm bg-black/40 ${
            isCompact ? "size-7" : "size-10"
          } ${isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-emerald-500/40"}`}
        />
      )}
      <p
        className={`mt-1.5 font-sans text-white truncate max-w-full text-center font-medium ${
          isCompact ? "text-sm 2xl:text-base" : "text-sm 2xl:text-base"
        } ${isViewer ? "font-bold" : ""}`}
      >
        {isViewer ? t("you") : slot.username ?? "—"}
      </p>
      <p
        className={`mt-0.5 font-mono text-white/55 ${
          isCompact ? "text-sm 2xl:text-base" : "text-sm 2xl:text-base"
        } flex items-center gap-1`}
      >
        <Clock size={isCompact ? 9 : 11} aria-hidden="true" />
        {waitingMinutes}m
      </p>
      {slot.ptsToday !== undefined && slot.ptsToday > 0 && (
        <span
          className={`mt-1 inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 font-mono font-semibold text-amber-200 ${
            isCompact ? "text-sm 2xl:text-base" : "text-sm 2xl:text-base"
          }`}
          title={t("ptsTodayTooltip", { count: slot.ptsToday })}
        >
          {t("timesToday", { count: slot.ptsToday })}
        </span>
      )}

      {isAdmin && onRemoveEntry && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          aria-label={t("removeAriaLabel", { name: slot.username ?? t("student") })}
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-red-500/50 bg-black text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 size={9} className="animate-spin" /> : <X size={10} />}
        </button>
      )}
      {error && (
        <p className="absolute -bottom-5 left-0 right-0 text-center font-mono text-sm 2xl:text-base text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
