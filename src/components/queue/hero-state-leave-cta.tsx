"use client";

// Cliente: botão "Sair desta fila" do HeroState. Outline discreto (não
// compete visualmente com info principal de posição/tempo).

import { useTransition } from "react";
import { ArrowLeftFromLine, Loader2 } from "lucide-react";
import { leaveCoachQueue } from "@/components/landing/actions";

export function HeroStateLeaveCta({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm("Sair desta fila? Você pode entrar de novo a qualquer momento.")) return;
        startTransition(async () => {
          await leaveCoachQueue(entryId);
        });
      }}
      disabled={pending}
      className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border-2 border-white/30 px-6 py-2.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-white/90 transition-colors hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ArrowLeftFromLine size={14} aria-hidden="true" />
      )}
      Sair desta fila
    </button>
  );
}
