"use client";

// Lista de alunos na fila + checkbox pra selecionar quem entra na próxima PT.
// Botão "Iniciar PT com selecionados" chama startPT action.

import { useState, useTransition } from "react";
import { Play, Loader2 } from "lucide-react";
import { startPT } from "./actions";

export interface QueueEntry {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  waitingMinutes: number;
}

interface Props {
  entries: QueueEntry[];
  filaAberta: boolean;
}

export function QueueList({ entries, filaAberta }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  function handleStart() {
    setError(null);
    setSuccess(null);
    const ids = Array.from(selected);
    startTransition(async () => {
      const res = await startPT(ids);
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(`PT criada (${ids.length} aluno${ids.length === 1 ? "" : "s"}). Match ID: ${res.data?.matchId.slice(0, 8)}...`);
        setSelected(new Set());
      }
    });
  }

  if (!filaAberta) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/30 p-6 text-center font-mono-ui text-sm text-[var(--color-muted-foreground)]">
        Abra a fila pra começar a receber alunos.
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/30 p-6 text-center font-mono-ui text-sm text-[var(--color-muted-foreground)]">
        Nenhum aluno na fila ainda. Aguardando primeira ficha.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {entries.map((e) => {
          const checked = selected.has(e.id);
          return (
            <li key={e.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
                  checked
                    ? "border-[var(--color-brand-red)]/60 bg-[var(--color-brand-red)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-brand-red)]/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(e.id)}
                  className="size-4 accent-[var(--color-brand-red)]"
                />
                {e.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.avatarUrl}
                    alt=""
                    className="size-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-sans text-sm font-medium text-white">
                    {e.username ?? "(sem username)"}
                  </p>
                  <p className="font-mono-ui text-xs text-[var(--color-muted-foreground)]">
                    aguardando há {e.waitingMinutes} min
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleStart}
        disabled={selected.size === 0 || pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-brand-red)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]/80 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        Iniciar PT com {selected.size} aluno{selected.size === 1 ? "" : "s"}
      </button>

      {error && <p className="font-mono-ui text-sm text-red-400">{error}</p>}
      {success && <p className="font-mono-ui text-sm text-emerald-400">{success}</p>}
    </div>
  );
}
