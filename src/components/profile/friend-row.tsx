"use client";
// Row individual de amigo na sidebar (Phase 9 + pacote social 2026-06-12).
// - Avatar sm (32px) com presence dot via UserAvatar
// - Status contextual rico: "Na fila do {PRO}" / "Em sala: {nome}" /
//   presença / "Online" / "Visto há Xh" (missão 5 — snapshot server-side)
// - "Convidar pra sala" (Swords) quando o viewer está numa sala aberta e o
//   amigo está online (missão 4)
// - Pendentes: incoming = aceitar/recusar inline; outgoing = "aguardando" + cancelar
//
// CLAUDE.md: ZERO log em Client Component — Server Action errors são silent failure
// no MVP (futura iteração: passar onError prop pro parent dispatch toast).

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserMinus, X, Check, Swords, Loader2 } from "lucide-react";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { removeFriend, acceptFriendRequest, rejectFriendRequest } from "@/actions/friends";
import { createLobbyInvite } from "@/actions/lobby-invites";
import { formatLastSeen, type PresenceStatus } from "@/lib/realtime/presence";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  friend: FriendListEntry;
  presenceStatus: PresenceStatus | "offline";
  /** Sala ABERTA em que o viewer está agora — habilita "Convidar pra sala". */
  currentLobbyId?: string | null;
}

type InviteState = "idle" | "sending" | "sent" | "error";

export function FriendRow({ friend, presenceStatus, currentLobbyId = null }: Props) {
  const t = useTranslations("perfil");
  const [confirming, setConfirming] = useState(false);
  const [inviteState, setInviteState] = useState<InviteState>("idle");
  const [isPending, startTransition] = useTransition();
  const isOnline = presenceStatus !== "offline";
  const name = friend.friendUsername ?? t("friendFallbackName");

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeFriend(friend.friendshipId);
      } catch {
        // Silent fail — CLAUDE.md proíbe log em Client Component.
      }
      setConfirming(false);
    });
  };

  const handleInvite = () => {
    if (!currentLobbyId || inviteState === "sending" || inviteState === "sent") return;
    setInviteState("sending");
    startTransition(async () => {
      try {
        const res = await createLobbyInvite({
          lobbyId: currentLobbyId,
          inviteeId: friend.friendUserId,
        });
        setInviteState(res.success ? "sent" : "error");
      } catch {
        setInviteState("error");
      }
    });
  };

  // Confirmação inline (não modal) — UI-SPEC Interaction Contracts > Remoção de amigo
  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded px-2 py-1.5 bg-bg-elevated/80">
        <p className="flex-1 min-w-0 truncate font-display text-[13px] font-semibold text-text-body">
          {t("friendRemoveQuestion", { name })}
        </p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={t("friendConfirmRemoveAria", { name })}
          className="rounded px-2 py-1 font-display text-[11px] font-semibold text-error border border-error/60 hover:bg-error/10 transition-colors disabled:opacity-50"
        >
          {t("friendRemoveCta")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label={t("friendCancelRemoveAria")}
          className="text-text-faded hover:text-text-display p-1"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  // Convidar pra sala: só amigo aceito, online, com o viewer numa sala aberta.
  const canInvite =
    friend.status === "accepted" && isOnline && currentLobbyId !== null;

  return (
    <div
      role="listitem"
      className={`group flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated/60 ${isOnline ? "" : "opacity-60"}`}
    >
      <UserHoverCard
        userId={friend.friendUserId}
        online={isOnline}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {/* Avatar com anel de XP + badge de nível + dot de presença. */}
        <span className="relative shrink-0">
          <XpAvatarRing
            src={friend.friendAvatarUrl ?? undefined}
            alt={t("avatarAlt", { name })}
            fallback={name.slice(0, 2).toUpperCase()}
            level={friend.friendLevel}
            pct={0}
            size={28}
          />
          <span
            className={`absolute right-0 top-0 size-2.5 rounded-full border-2 border-bg-deep ${
              isOnline ? "bg-success" : "bg-text-faded"
            }`}
            aria-hidden="true"
          />
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`font-display text-[13px] font-semibold truncate ${isOnline ? "text-text-body" : "text-text-faded"}`}
          >
            {name}
          </p>
          <StatusLine friend={friend} presenceStatus={presenceStatus} isOnline={isOnline} />
        </div>
      </UserHoverCard>

      {canInvite && (
        <button
          type="button"
          onClick={handleInvite}
          disabled={inviteState === "sending" || inviteState === "sent"}
          aria-label={
            inviteState === "sent"
              ? t("inviteSentAria", { name })
              : t("inviteAria", { name })
          }
          title={inviteState === "sent" ? t("inviteSentTitle") : t("inviteTitle")}
          className={`p-1 transition-colors ${
            inviteState === "sent"
              ? "text-play-primary"
              : inviteState === "error"
                ? "text-error"
                : "text-text-faded hover:text-play-primary"
          }`}
        >
          {inviteState === "sending" ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : inviteState === "sent" ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Swords size={14} aria-hidden="true" />
          )}
        </button>
      )}

      {friend.status === "accepted" && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={t("friendRemoveFromListAria", { name })}
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
            aria-label={t("friendAcceptAria", { name })}
            className="text-text-faded hover:text-success p-1 disabled:opacity-50"
          >
            <Check size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => { void rejectFriendRequest(friend.friendshipId); })}
            disabled={isPending}
            aria-label={t("friendRejectAria", { name })}
            className="text-text-faded hover:text-error p-1 disabled:opacity-50"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </>
      )}

      {friend.status === "pending" && friend.direction === "outgoing" && (
        <>
          <span className="font-display text-[11px] font-semibold uppercase text-text-faded">
            {t("friendWaiting")}
          </span>
          <button
            type="button"
            onClick={() => startTransition(() => { void removeFriend(friend.friendshipId); })}
            disabled={isPending}
            aria-label={t("friendCancelRequestAria", { name })}
            title={t("friendCancelRequestTitle")}
            className="text-text-faded hover:text-error p-1 disabled:opacity-50"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

// Linha de status contextual (missão 5). Prioridade quando online:
// snapshot de contexto (fila do PRO / sala) > presença rica > "Online".
function StatusLine({
  friend,
  presenceStatus,
  isOnline,
}: {
  friend: FriendListEntry;
  presenceStatus: PresenceStatus | "offline";
  isOnline: boolean;
}) {
  const t = useTranslations("perfil");
  if (!isOnline) {
    return (
      <p className="font-display text-[13px] font-semibold text-text-faded truncate">
        {formatLastSeen(friend.friendLastSeenAt) ?? "—"}
      </p>
    );
  }

  const ctx = friend.context;
  if (ctx?.kind === "queue") {
    return (
      <p className="font-display text-[13px] font-semibold text-brand-primary truncate">
        {t("statusInQueueOf", { pro: ctx.proName })}
      </p>
    );
  }
  if (ctx?.kind === "lobby") {
    return (
      <p className="font-display text-[13px] font-semibold text-play-primary truncate">
        {t("statusInLobby", { lobby: ctx.lobbyName })}
      </p>
    );
  }
  if (presenceStatus === "in-match") {
    return (
      <p className="font-display text-[13px] font-semibold text-play-primary truncate">
        {t("statusInMatch")}
      </p>
    );
  }
  if (presenceStatus === "in-queue") {
    return (
      <p className="font-display text-[13px] font-semibold text-brand-primary truncate">
        {t("statusInQueue")}
      </p>
    );
  }
  return (
    <p className="font-display text-[13px] font-semibold text-success truncate">
      {t("statusOnline")}
    </p>
  );
}
