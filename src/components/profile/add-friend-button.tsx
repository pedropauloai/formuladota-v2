"use client";
// Botão [ADICIONAR AMIGO] no hero do perfil público (pacote social 2026-06-12
// — missão 3). O ESTADO inicial é decidido server-side (page.tsx consulta a
// friendship do par) — aqui só a transição otimista Adicionar → Pendente.

import { useState, useTransition } from "react";
import { UserPlus, Clock, Check, Loader2 } from "lucide-react";
import { sendFriendRequest } from "@/actions/friends";

export type FriendButtonState = "none" | "pending" | "friends";

interface Props {
  targetUserId: string;
  initialState: FriendButtonState;
}

export function AddFriendButton({ targetUserId, initialState }: Props) {
  const [state, setState] = useState<FriendButtonState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      try {
        await sendFriendRequest(targetUserId);
        setState("pending");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível enviar o pedido");
      }
    });
  }

  if (state === "friends") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-success/50 bg-success/10 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-success">
        <Check size={15} aria-hidden="true" />
        Amigos
      </span>
    );
  }

  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-text-muted">
        <Clock size={15} aria-hidden="true" />
        Pendente
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md border border-brand-primary bg-brand-primary/15 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus size={15} aria-hidden="true" />
        )}
        Adicionar amigo
      </button>
      {error && (
        <p className="font-display text-sm 2xl:text-base font-semibold text-error">{error}</p>
      )}
    </div>
  );
}
