"use client";

// Botão de sair da fila — chama leaveCoachQueue. Usado no sticky banner global.

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { leaveCoachQueue } from "@/components/landing/actions";

export function LeaveQueueButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Sair da fila? Você pode entrar de novo a qualquer momento.")) return;
        startTransition(async () => {
          await leaveCoachQueue(entryId);
        });
      }}
      disabled={pending}
      aria-label="Sair da fila"
      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-black/40 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-200 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/50 transition-colors disabled:opacity-50"
    >
      {pending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
      Sair
    </button>
  );
}
