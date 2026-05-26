"use client";
// Row individual de amigo na sidebar (Phase 9 — UI-SPEC "Lista de amigos — row spec").
// - Avatar sm (32px) com presence dot via UserAvatar
// - Nome 13px font-display weight 600
// - Status "Visto há Xh" se offline (formatLastSeen)
// - Hover: bg-bg-elevated/60 + ícone UserMinus aparece pra remover
// - Confirmação inline (não modal) ao clicar UserMinus
//
// CLAUDE.md: ZERO log em Client Component — Server Action errors são silent failure no MVP
// (futura iteração: passar onError prop pro parent dispatch toast).

import { useState, useTransition } from "react";
import { UserMinus, X, Check } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { removeFriend, acceptFriendRequest, rejectFriendRequest } from "@/actions/friends";
import { formatLastSeen, type PresenceStatus } from "@/lib/realtime/presence";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  friend: FriendListEntry;
  presenceStatus: PresenceStatus | "offline";
}

export function FriendRow({ friend, presenceStatus }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOnline = presenceStatus !== "offline";

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeFriend(friend.friendshipId);
      } catch {
        // Silent fail — CLAUDE.md proíbe log em Client Component.
        // V2: propagar erro via onError prop pra parent disparar toast global.
      }
      setConfirming(false);
    });
  };

  // Confirmação inline (não modal) — UI-SPEC seção Interaction Contracts > Remoção de amigo
  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-bg-elevated/80">
        <p className="flex-1 min-w-0 truncate font-display text-[13px] font-semibold text-text-body">
          Remover {friend.friendUsername ?? "amigo"}?
        </p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={`Confirmar remoção de ${friend.friendUsername ?? "amigo"}`}
          className="rounded px-2 py-1 font-display text-[11px] font-semibold text-error border border-error/60 hover:bg-error/10 transition-colors disabled:opacity-50"
        >
          REMOVER
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancelar remoção"
          className="text-text-faded hover:text-text-display p-1"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="listitem"
      className={`group flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated/60 ${isOnline ? "" : "opacity-60"}`}
    >
      <UserAvatar
        src={friend.friendAvatarUrl ?? undefined}
        alt={`Avatar de ${friend.friendUsername ?? "amigo"}`}
        fallback={(friend.friendUsername ?? "??").slice(0, 2).toUpperCase()}
        size="sm"
        presence={isOnline ? (presenceStatus as PresenceStatus) : "offline"}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-display text-[13px] font-semibold truncate ${isOnline ? "text-text-body" : "text-text-faded"}`}
        >
          {friend.friendUsername ?? "Anônimo"}
        </p>
        {!isOnline && (
          <p className="font-display text-[13px] font-semibold text-text-faded truncate">
            {formatLastSeen(friend.friendLastSeenAt) ?? "—"}
          </p>
        )}
        {isOnline && presenceStatus === "in-match" && (
          <p className="font-display text-[13px] font-semibold text-play-primary truncate">
            Em partida
          </p>
        )}
        {isOnline && presenceStatus === "in-queue" && (
          <p className="font-display text-[13px] font-semibold text-brand-primary truncate">
            Na fila
          </p>
        )}
      </div>
      {friend.status === "accepted" && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remover ${friend.friendUsername ?? "amigo"} da lista de amigos`}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-faded hover:text-error p-1"
        >
          <UserMinus size={14} aria-hidden="true" />
        </button>
      )}
      {friend.status === "pending" && friend.direction === "incoming" && (
        <>
          <button
            type="button"
            onClick={() => startTransition(() => { void acceptFriendRequest(friend.friendshipId); })}
            disabled={isPending}
            aria-label={`Aceitar pedido de ${friend.friendUsername ?? "amigo"}`}
            className="text-text-faded hover:text-success p-1 disabled:opacity-50"
          >
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => { void rejectFriendRequest(friend.friendshipId); })}
            disabled={isPending}
            aria-label={`Recusar pedido de ${friend.friendUsername ?? "amigo"}`}
            className="text-text-faded hover:text-error p-1 disabled:opacity-50"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
