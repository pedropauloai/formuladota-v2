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
import { Radio, X, Loader2, Clock, Users, Crown } from "lucide-react";

export interface BoardCoach {
  coachId: string;
  username: string | null;
  avatarUrl: string | null;
  mmrAtual: number | null;
  headline: string | null;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
}

export interface BoardEntry {
  entryId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
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
  const slots = Array.from({ length: coach.filaMaxVagas }, (_, i) => entries[i] ?? null);
  const minutesOpen = coach.filaAbertaEm
    ? Math.floor((Date.now() - new Date(coach.filaAbertaEm).getTime()) / 60000)
    : 0;
  const isCompact = variant === "compact";
  const isAdmin = variant === "admin";

  return (
    <article
      className={`relative rounded-md border backdrop-blur-sm ${
        coach.filaAberta
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-[var(--color-border)] bg-[var(--color-card)]/50"
      } ${isCompact ? "p-3" : "p-5"}`}
      aria-label={`Fila do PRO ${coach.username ?? coach.coachId}`}
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
            className={`shrink-0 rounded-full border-2 ${
              coach.filaAberta ? "border-emerald-500/60" : "border-[var(--color-border)]"
            } ${isCompact ? "size-8" : "size-12"}`}
          />
        ) : (
          <div
            className={`shrink-0 rounded-full border-2 bg-black/40 ${
              coach.filaAberta ? "border-emerald-500/60" : "border-[var(--color-border)]"
            } ${isCompact ? "size-8" : "size-12"}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Crown
              size={isCompact ? 10 : 12}
              className="text-[var(--color-brand-red)] shrink-0"
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
              isCompact ? "text-[10px]" : "text-xs"
            }`}
          >
            {coach.mmrAtual ? `${coach.mmrAtual.toLocaleString("pt-BR")} MMR` : "—"}
            {coach.filaAberta && minutesOpen > 0 && ` · aberta há ${minutesOpen}m`}
          </p>
        </div>
      </header>

      {/* Headline (só em presentation/admin grandes) */}
      {!isCompact && showHeadline && coach.headline && (
        <p className="mb-4 font-serif text-sm italic text-white/60 border-l-2 border-emerald-500/30 pl-3">
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

      {/* Footer status */}
      <footer className={`flex items-center justify-between ${isCompact ? "mt-2" : "mt-4"}`}>
        <span
          className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-widest ${
            isCompact ? "text-[9px]" : "text-[10px]"
          } ${coach.filaAberta ? "text-emerald-300" : "text-white/40"}`}
        >
          {coach.filaAberta ? (
            <>
              <Radio size={isCompact ? 8 : 10} aria-hidden="true" />
              Fila aberta
            </>
          ) : (
            <>Fila fechada</>
          )}
        </span>
        <span
          className={`font-mono text-white/40 ${
            isCompact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          <Users size={isCompact ? 8 : 10} className="inline mr-1 -mt-0.5" aria-hidden="true" />
          {entries.length}/{coach.filaMaxVagas}
        </span>
      </footer>
    </article>
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

  // Slot vazio
  if (!slot) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md border border-dashed border-white/10 bg-black/20 ${
          isCompact ? "p-1.5 min-h-[56px]" : "p-3 min-h-[100px]"
        }`}
      >
        <span
          className={`font-mono text-white/20 ${isCompact ? "text-[9px]" : "text-[10px]"}`}
        >
          slot {index + 1}
        </span>
        <span
          className={`font-mono text-white/30 mt-1 ${
            isCompact ? "text-[8px]" : "text-[9px]"
          } uppercase tracking-widest`}
        >
          livre
        </span>
      </div>
    );
  }

  function handleRemove() {
    if (!onRemoveEntry) return;
    const reason = window.prompt(
      `Remover ${slot?.username ?? "aluno"} da fila? Motivo (mín 3 chars):`,
      "Removido pelo PRO"
    );
    if (!reason || reason.trim().length < 3) return;
    setError(null);
    startTransition(async () => {
      try {
        await onRemoveEntry(slot!.entryId, reason);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  const waitingMinutes = Math.floor(
    (Date.now() - new Date(slot.joinedAt).getTime()) / 60000
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
          className={`rounded-full ${
            isCompact ? "size-7" : "size-10"
          } ${isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-emerald-500/40"}`}
        />
      ) : (
        <div
          className={`rounded-full bg-black/40 ${
            isCompact ? "size-7" : "size-10"
          } ${isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-emerald-500/40"}`}
        />
      )}
      <p
        className={`mt-1 font-sans text-white truncate max-w-full text-center ${
          isCompact ? "text-[10px]" : "text-xs"
        } ${isViewer ? "font-bold" : ""}`}
      >
        {isViewer ? "VOCÊ" : slot.username ?? "—"}
      </p>
      <p
        className={`font-mono text-white/40 ${
          isCompact ? "text-[8px]" : "text-[10px]"
        } flex items-center gap-0.5`}
      >
        <Clock size={isCompact ? 7 : 9} aria-hidden="true" />
        {waitingMinutes}m
      </p>

      {isAdmin && onRemoveEntry && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={pending}
          aria-label={`Remover ${slot.username ?? "aluno"}`}
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-red-500/50 bg-black text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 size={9} className="animate-spin" /> : <X size={10} />}
        </button>
      )}
      {error && (
        <p className="absolute -bottom-5 left-0 right-0 text-center font-mono text-[8px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
