"use client";

// Modal client pra cliente que JÁ está em fila — mostra posição, tempo,
// e botão sair. Pode estar em N filas simultâneas (lista todas).

import { useState, useTransition } from "react";
import { Loader2, Users, ArrowLeftFromLine } from "lucide-react";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { leaveCoachQueue } from "./actions";

interface Props {
  open: boolean;
  onClose: () => void;
  myQueues: MyQueueEntry[];
}

export function QueueStatusModal({ open, onClose, myQueues }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function handleLeave(entryId: string) {
    setError(null);
    setPendingEntryId(entryId);
    startTransition(async () => {
      const res = await leaveCoachQueue(entryId);
      setPendingEntryId(null);
      if (!res.success) {
        setError(res.error);
      } else {
        // Se essa era a única fila, fechar modal
        if (myQueues.length === 1) {
          onClose();
        }
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-status-title"
      >
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              Aguardando PT
            </p>
            <h2
              id="queue-status-title"
              className="font-display text-xl uppercase text-white"
            >
              Sua situação na fila
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="size-8 rounded-md text-white/40 hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </header>

        <ul className="space-y-3">
          {myQueues.map((q) => {
            const isBusy = pendingEntryId === q.entryId;
            return (
              <li
                key={q.entryId}
                className="rounded-md border border-[var(--color-border)] bg-black/40 p-4"
              >
                <div className="flex items-center gap-3">
                  {q.coachAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={q.coachAvatar}
                      alt=""
                      className="size-10 rounded-full border border-emerald-500/40"
                    />
                  ) : (
                    <div className="size-10 rounded-full border border-emerald-500/40 bg-black/40" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base uppercase text-white truncate">
                      Na fila de {q.coachUsername ?? "PRO"}
                    </p>
                    <p className="font-mono text-[11px] text-white/60">
                      <Users
                        size={10}
                        className="inline mr-1 -mt-0.5"
                        aria-hidden="true"
                      />
                      {q.position}º de {q.total} na fila · aguardando{" "}
                      {q.waitingMinutes} min
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLeave(q.entryId)}
                  disabled={isBusy || pending}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50"
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saindo...
                    </>
                  ) : (
                    <>
                      <ArrowLeftFromLine size={14} />
                      Sair desta fila
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        <p className="mt-5 font-mono text-[10px] text-white/30 text-center">
          Quando o PRO iniciar a PT com você, será avisado no Discord oficial.
        </p>
      </div>
    </div>
  );
}
