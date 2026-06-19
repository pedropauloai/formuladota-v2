"use client";
// Listener GLOBAL de convites pra sala (pacote social 2026-06-12 — missão 4).
// Vive no shell (junto do mini-profile): escuta INSERT realtime em lobby_invites
// (filter invitee_id = user logado) e exibe banner persistente por convite.
//
// [ENTRAR]  → acceptLobbyInvite (deleta convite + grava cookie pm_state na sala)
//             e navegação COMPLETA pra /ranked-com-pro — o PlayMenu remonta
//             lendo o cookie e abre o drawer direto na sala (fluxo existente).
// [RECUSAR] → declineLobbyInvite (deleta convite).
//
// Perdeu o push (aba fechada)? initialInvites é server-fetched no shell —
// convites pendentes aparecem ao recarregar qualquer página.

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Swords, X, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/avatar";
import {
  acceptLobbyInvite,
  declineLobbyInvite,
  fetchMyLobbyInvites,
} from "@/actions/lobby-invites";
import type { LobbyInviteView } from "@/lib/queries/lobby-social";

interface Props {
  userId: string;
  initialInvites: LobbyInviteView[];
}

export function LobbyInviteListener({ userId, initialInvites }: Props) {
  const t = useTranslations("lobbyInvite");
  const [invites, setInvites] = useState<LobbyInviteView[]>(initialInvites);
  const [error, setError] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Server re-fetch (router.refresh) re-sincroniza a lista — padrão oficial
  // "adjusting state during render" (sem useEffect, sem render extra em cascata).
  const [prevInitial, setPrevInitial] = useState(initialInvites);
  if (prevInitial !== initialInvites) {
    setPrevInitial(initialInvites);
    setInvites(initialInvites);
  }

  // Realtime: INSERT com filter no invitee → re-busca a view (payload só tem
  // ids; a view precisa de nome da sala + identidade do convidante).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lobby-invites-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lobby_invites",
          filter: `invitee_id=eq.${userId}`,
        },
        () => {
          void fetchMyLobbyInvites().then(setInvites);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleEnter(invite: LobbyInviteView) {
    setEnteringId(invite.id);
    setError(null);
    startTransition(async () => {
      const res = await acceptLobbyInvite(invite.id);
      if (res.success) {
        // Navegação completa: PlayMenu remonta lendo o cookie → abre a sala.
        window.location.assign("/ranked-com-pro");
        return;
      }
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setEnteringId(null);
      setError(res.error);
    });
  }

  function handleDecline(inviteId: string) {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    startTransition(async () => {
      try {
        await declineLobbyInvite(inviteId);
      } catch {
        // Silent fail — convite morto some no próximo refresh de qualquer forma.
      }
    });
  }

  if (invites.length === 0 && !error) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-auto fixed right-4 bottom-[96px] xl:bottom-[112px] z-[var(--z-system)] flex w-[320px] flex-col gap-2"
    >
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-error/40 bg-bg-deep/95 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60">
          <p className="flex-1 font-display text-[13px] font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label={t("dismiss")}
            className="text-text-faded hover:text-text-display p-1"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-md border border-play-primary/40 bg-bg-deep/95 backdrop-blur-md p-3 shadow-lg shadow-black/60 animate-in slide-in-from-right-4 fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <UserAvatar
              src={invite.inviterAvatarUrl ?? undefined}
              alt={t("avatarAlt", { name: invite.inviterName })}
              fallback={invite.inviterName.slice(0, 2).toUpperCase()}
              size="sm"
            />
            <p className="flex-1 min-w-0 font-display text-[13px] font-semibold text-text-body">
              <span className="text-text-display">{invite.inviterName}</span>{" "}
              {t("invitedTo")}{" "}
              <span className="text-play-primary">{invite.lobbyName}</span>
            </p>
            <Swords size={16} className="shrink-0 text-play-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleEnter(invite)}
              disabled={enteringId !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-play-primary bg-play-primary/15 px-2 py-1.5 font-display text-[12px] font-bold uppercase tracking-wide text-play-primary hover:bg-play-primary/25 transition-colors disabled:opacity-60"
            >
              {enteringId === invite.id ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <LogIn size={13} aria-hidden="true" />
              )}
              {t("enter")}
            </button>
            <button
              type="button"
              onClick={() => handleDecline(invite.id)}
              disabled={enteringId !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-2 py-1.5 font-display text-[12px] font-bold uppercase tracking-wide text-text-muted hover:text-text-body hover:border-border-strong transition-colors disabled:opacity-60"
            >
              <X size={13} aria-hidden="true" />
              {t("decline")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
