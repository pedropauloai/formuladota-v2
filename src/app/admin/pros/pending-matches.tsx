"use client";

// PTs em status='agendada' — PRO precisa decidir: confirmar (cobra fichas)
// ou cancelar (libera entries sem cobrar). Opcionalmente enriquece via OpenDota.
//
// Após confirmação: exibe CoachNotesPanel pra registrar conduta dos alunos.

import { useState, useTransition } from "react";
import { Check, X, Database, Loader2 } from "lucide-react";
import { confirmPTRealized, cancelPT, enrichMatchFromOpenDota } from "./actions";
import { CoachNotesPanel, type CoachNoteEntry } from "./coach-notes-panel";

interface PendingMatch {
  id: string;
  createdAt: string;
  alunoCount: number;
  /** Alunos da PT — para exibir CoachNotesPanel após confirmação */
  entries?: CoachNoteEntry[];
}

interface Props {
  matches: PendingMatch[];
}

export function PendingMatches({ matches }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [enrichInput, setEnrichInput] = useState<Record<string, string>>({});
  // IDs de PTs confirmadas (para exibir CoachNotesPanel)
  const [confirmedMatchIds, setConfirmedMatchIds] = useState<Set<string>>(new Set());

  function handleConfirm(matchId: string) {
    if (!window.confirm("Confirmar que a PT ocorreu? Isso cobrará 1 ficha de cada aluno.")) {
      return;
    }
    setError(null);
    setSuccess(null);
    setPendingId(matchId);
    startTransition(async () => {
      const res = await confirmPTRealized(matchId);
      setPendingId(null);
      if (!res.success) setError(res.error);
      else {
        setSuccess("PT confirmada — fichas cobradas.");
        setConfirmedMatchIds((prev) => new Set([...prev, matchId]));
      }
    });
  }

  function handleCancel(matchId: string) {
    const reason = window.prompt(
      "Motivo do cancelamento (será salvo):",
      ""
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Motivo precisa ter pelo menos 3 caracteres.");
      return;
    }
    setError(null);
    setSuccess(null);
    setPendingId(matchId);
    startTransition(async () => {
      const res = await cancelPT(matchId, reason);
      setPendingId(null);
      if (!res.success) setError(res.error);
      else setSuccess(`PT cancelada — ${res.data?.cancelledEntries ?? 0} entries liberadas, sem cobrança.`);
    });
  }

  function handleEnrich(matchId: string) {
    const dotaMatchId = (enrichInput[matchId] ?? "").trim();
    if (!/^\d+$/.test(dotaMatchId)) {
      setError("Match ID precisa ser numérico (ex: 7891234567).");
      return;
    }
    setError(null);
    setSuccess(null);
    setPendingId(matchId);
    startTransition(async () => {
      const res = await enrichMatchFromOpenDota(matchId, dotaMatchId);
      setPendingId(null);
      if (!res.success) setError(res.error);
      else setSuccess(`Match enriquecido (${res.data?.playersInserted} players) + fichas cobradas.`);
    });
  }

  if (matches.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/30 p-6 text-center font-mono text-sm text-[var(--color-muted-foreground)]">
        Nenhuma PT pendente. Inicie uma com alunos da fila.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => {
        const isBusy = pendingId === m.id;
        return (
          <article
            key={m.id}
            className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
          >
            <header className="flex items-center justify-between">
              <div>
                <p className="font-display text-sm uppercase tracking-wide text-amber-200">
                  PT agendada
                </p>
                <p className="font-mono text-xs text-white/60 mt-0.5">
                  {new Date(m.createdAt).toLocaleString("pt-BR")} · {m.alunoCount}{" "}
                  aluno{m.alunoCount === 1 ? "" : "s"}
                </p>
              </div>
              <span className="font-mono text-[10px] text-white/40">
                #{m.id.slice(0, 8)}
              </span>
            </header>

            {/* Botões de ação rápida */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleConfirm(m.id)}
                disabled={isBusy || pending}
                className="flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => handleCancel(m.id)}
                disabled={isBusy || pending}
                className="flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-white/70 transition-colors hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                <X size={12} />
                Cancelar
              </button>
            </div>

            {/* CoachNotesPanel — exibido após confirmação */}
            {confirmedMatchIds.has(m.id) && (m.entries ?? []).length > 0 && (
              <CoachNotesPanel
                entries={m.entries ?? []}
                matchId={m.id}
              />
            )}

            {/* OpenDota enrichment opcional */}
            <details className="rounded-md border border-[var(--color-border)] bg-black/30">
              <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-white">
                ou submeter dota match_id (OpenDota) →
              </summary>
              <div className="border-t border-[var(--color-border)] p-3 space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={enrichInput[m.id] ?? ""}
                  onChange={(e) =>
                    setEnrichInput({ ...enrichInput, [m.id]: e.target.value })
                  }
                  placeholder="ex: 7891234567"
                  className="w-full rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 font-mono text-xs text-white placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => handleEnrich(m.id)}
                  disabled={isBusy || pending}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)]/50 bg-[var(--color-brand-red)]/10 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--color-brand-red)] transition-colors hover:bg-[var(--color-brand-red)]/20 disabled:opacity-50"
                >
                  {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                  Buscar OpenDota + Confirmar
                </button>
              </div>
            </details>
          </article>
        );
      })}

      {error && <p className="font-mono text-sm text-red-400">{error}</p>}
      {success && <p className="font-mono text-sm text-emerald-400">{success}</p>}
    </div>
  );
}
