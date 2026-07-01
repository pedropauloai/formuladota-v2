"use client";

// Botão de amizade da PÁGINA de perfil público (/perfil/u/[id]) — Pedro 2026-07-01:
// a gestão de amizade (adicionar E remover) vive AQUI, não no mini-perfil/hover.
// Estados: none (adicionar) / pending_out (enviado, cancelar) / pending_in
// (aceitar/recusar) / friends ("Amigos" → hover vira "Remover" com confirmação).

import { useState, useTransition } from "react";
import { UserPlus, Clock, Check, X, UserMinus, Loader2 } from "lucide-react";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/actions/friends";

export type ProfileFriendState = "none" | "pending_out" | "pending_in" | "friends";

interface Props {
  targetUserId: string;
  friendshipId: string | null;
  initial: ProfileFriendState;
}

const BTN =
  "inline-flex items-center gap-2 rounded-md border px-4 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-60";

export function ProfileFriendButton({ targetUserId, friendshipId, initial }: Props) {
  const [state, setState] = useState<ProfileFriendState>(initial);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>, next: ProfileFriendState) {
    startTransition(async () => {
      try {
        await fn();
        setState(next);
      } catch {
        /* silent — RLS/erro raro; o revalidate reconcilia */
      }
      setConfirming(false);
    });
  }

  if (state === "none") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => sendFriendRequest(targetUserId), "pending_out")}
        className={`${BTN} border-brand-primary bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25`}
      >
        {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UserPlus size={15} aria-hidden />}
        Adicionar amigo
      </button>
    );
  }

  if (state === "pending_out") {
    return (
      <span className={`${BTN} border-border-subtle bg-bg-elevated text-text-muted`}>
        <Clock size={15} aria-hidden /> Pedido enviado
        {friendshipId && (
          <button
            type="button"
            disabled={pending}
            aria-label="Cancelar pedido"
            onClick={() => run(() => removeFriend(friendshipId), "none")}
            className="ml-1 text-text-faded hover:text-error"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </span>
    );
  }

  if (state === "pending_in") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !friendshipId}
          onClick={() => friendshipId && run(() => acceptFriendRequest(friendshipId), "friends")}
          className={`${BTN} border-success/60 bg-success/10 text-success hover:bg-success/20`}
        >
          <Check size={15} aria-hidden /> Aceitar
        </button>
        <button
          type="button"
          disabled={pending || !friendshipId}
          onClick={() => friendshipId && run(() => rejectFriendRequest(friendshipId), "none")}
          className={`${BTN} border-border-subtle bg-bg-elevated text-text-muted hover:text-text-body`}
        >
          <X size={15} aria-hidden /> Recusar
        </button>
      </div>
    );
  }

  // friends
  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || !friendshipId}
          onClick={() => friendshipId && run(() => removeFriend(friendshipId), "none")}
          className={`${BTN} border-error/60 text-error hover:bg-error/10`}
        >
          {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <UserMinus size={15} aria-hidden />}
          Remover amigo
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancelar"
          className="p-1 text-text-faded hover:text-text-display"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={`${BTN} group border-success/50 bg-success/10 text-success hover:border-error/60 hover:bg-error/10 hover:text-error`}
    >
      <Check size={15} className="group-hover:hidden" aria-hidden />
      <UserMinus size={15} className="hidden group-hover:inline" aria-hidden />
      <span className="group-hover:hidden">Amigos</span>
      <span className="hidden group-hover:inline">Remover</span>
    </button>
  );
}
