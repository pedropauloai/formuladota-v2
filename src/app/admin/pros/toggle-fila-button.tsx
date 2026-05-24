"use client";

// Botão grande pra PRO abrir/fechar a própria fila — atualiza visualmente
// imediato via optimistic state, recarrega via revalidatePath.

import { useState, useTransition } from "react";
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
  const [mountedAt] = useState(() => Date.now());
  const minutesOpen = filaAbertaEm
    ? Math.floor((mountedAt - new Date(filaAbertaEm).getTime()) / 60000)
    : 0;

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
            ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
            : "border-border-subtle bg-bg-elevated text-text-body hover:border-brand-primary/60 hover:text-text-display"
        }`}
      >
        {open ? <Radio size={20} /> : <PowerOff size={20} />}
        {open ? "Fila aberta — clicar pra fechar" : "Abrir fila pra alunos"}
      </button>
      {open && filaAbertaEm && (
        <p className="text-center font-mono-ui text-xs text-success/80">
          Aberta há {minutesOpen} min
        </p>
      )}
      {error && (
        <p className="text-center font-mono-ui text-xs text-error">{error}</p>
      )}
    </div>
  );
}
