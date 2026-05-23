"use client";

// Modal client pra cliente entrar na fila de um PRO online.
// Recebe lista de PROs online + saldo do user + função de fechamento.
// Chama joinCoachQueue do landing/actions.

import { useState, useTransition } from "react";
import { Radio, ArrowRight, Loader2, Coins } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import { joinCoachQueue } from "./actions";

interface Props {
  open: boolean;
  onClose: () => void;
  prosOnline: ProLiveStatus[];
  fichaBalance: number;
}

export function JoinQueueModal({ open, onClose, prosOnline, fichaBalance }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingCoachId, setPendingCoachId] = useState<string | null>(null);

  if (!open) return null;

  function handleJoin(coachId: string) {
    setError(null);
    setPendingCoachId(coachId);
    startTransition(async () => {
      const res = await joinCoachQueue(coachId);
      setPendingCoachId(null);
      if (!res.success) {
        setError(res.error);
      } else {
        // Fechar modal — UI vai atualizar via revalidatePath na action
        onClose();
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
        aria-labelledby="join-queue-title"
      >
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]">
              Jogar Dota
            </p>
            <h2
              id="join-queue-title"
              className="font-display text-xl uppercase text-white"
            >
              Entrar na fila de um PRO
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

        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <Coins size={14} className="text-emerald-400" />
          <p className="font-mono text-xs text-emerald-300">
            Você tem {fichaBalance} {fichaBalance === 1 ? "ficha" : "fichas"} ·
            cada PT usa 1 quando confirmada pelo PRO
          </p>
        </div>

        {prosOnline.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--color-border)] bg-black/30 p-8 text-center">
            <Radio
              size={24}
              className="mx-auto text-white/20 mb-3"
              aria-hidden="true"
            />
            <p className="font-mono text-sm text-white/50">
              Nenhum PRO online no momento.
            </p>
            <p className="mt-1 font-mono text-xs text-white/30">
              Você será avisado no Discord oficial quando algum abrir fila.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {prosOnline.map((pro) => {
              const isBusy = pendingCoachId === pro.coachId;
              // Permite entrar mesmo sem vagas livres na próxima PT — vira lista de espera
              const canJoin = fichaBalance > 0;
              return (
                <li
                  key={pro.coachId}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    {pro.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pro.avatarUrl}
                        alt=""
                        className="size-10 rounded-full border border-emerald-500/50"
                      />
                    ) : (
                      <div className="size-10 rounded-full border border-emerald-500/50 bg-black/40" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base uppercase text-white truncate">
                        {pro.username ?? pro.slug}
                      </p>
                      <p className="font-mono text-[11px] text-white/60">
                        {pro.mmrAtual ? `${pro.mmrAtual.toLocaleString("pt-BR")} MMR · ` : ""}
                        {pro.vagasProximaPT > 0
                          ? `${pro.vagasProximaPT}/${pro.filaMaxVagas} vagas livres`
                          : `${pro.waitingCount} na fila · você entra na espera`}
                      </p>
                    </div>
                  </div>
                  {pro.headline && (
                    <p className="mt-2 font-serif text-xs italic text-white/60">
                      {pro.headline}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleJoin(pro.coachId)}
                    disabled={!canJoin || isBusy || pending}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        Entrar na fila <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        <p className="mt-5 font-mono text-[10px] text-white/30 text-center">
          A ficha só é debitada quando o PRO confirmar que a partida ocorreu.
        </p>
      </div>
    </div>
  );
}
