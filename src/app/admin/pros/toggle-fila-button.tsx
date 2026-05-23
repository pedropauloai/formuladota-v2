"use client";

// Botão grande pra PRO abrir/fechar a própria fila — atualiza visualmente
// imediato via optimistic state, recarrega via revalidatePath.

import { useState, useTransition, useMemo } from "react";
import { Radio, PowerOff } from "lucide-react";
import { togglePROFila } from "./actions";

interface Props {
  filaAberta: boolean;
  filaAbertaEm: string | null;
}

export function ToggleFilaButton({ filaAberta, filaAbertaEm }: Props) {
  const [open, setOpen] = useState(filaAberta);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Snapshot do horário ao montar — evita Date.now() impure em render
  const minutesOpen = useMemo(
    () =>
      filaAbertaEm
        ? Math.floor((Date.now() - new Date(filaAbertaEm).getTime()) / 60000)
        : 0,
    [filaAbertaEm]
  );

  function handleClick() {
    setError(null);
    const next = !open;
    setOpen(next);
    startTransition(async () => {
      const res = await togglePROFila(next);
      if (!res.success) {
        setError(res.error);
        setOpen(!next); // reverter
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`flex w-full items-center justify-center gap-3 rounded-md border px-6 py-4 font-sans text-base font-semibold uppercase tracking-wide transition-colors disabled:opacity-60 ${
          open
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            : "border-[var(--color-border)] bg-[var(--color-card)] text-white/70 hover:border-[var(--color-brand-red)]/60 hover:text-white"
        }`}
      >
        {open ? <Radio size={20} /> : <PowerOff size={20} />}
        {open ? "Fila aberta — clicar pra fechar" : "Abrir fila pra alunos"}
      </button>
      {open && filaAbertaEm && (
        <p className="text-center font-mono-ui text-xs text-emerald-300/80">
          Aberta há {minutesOpen} min
        </p>
      )}
      {error && (
        <p className="text-center font-mono-ui text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
