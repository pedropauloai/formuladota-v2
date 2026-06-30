"use client";
// Listener GLOBAL de convites pra GRUPO (pacote social 2026-06-30). Espelha o
// LobbyInviteListener: escuta INSERT realtime em party_invites (filter invitee_id)
// e mostra banner por convite. [ENTRAR] = accept (revalida o shell → PartyPanel
// aparece). [RECUSAR] = decline. Estado inicial server-fetched (sobrevive a F5).

import { useEffect, useState, useTransition } from "react";
import { Users, X, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/avatar";
import {
  acceptPartyInvite,
  declinePartyInvite,
  fetchMyPartyInvites,
} from "@/actions/party";
import type { PartyInviteView } from "@/lib/queries/party";

interface Props {
  userId: string;
  initialInvites: PartyInviteView[];
}

export function PartyInviteListener({ userId, initialInvites }: Props) {
  const [invites, setInvites] = useState<PartyInviteView[]>(initialInvites);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sincroniza com o server fetch (padrão "adjusting state during render").
  const [prevInitial, setPrevInitial] = useState(initialInvites);
  if (prevInitial !== initialInvites) {
    setPrevInitial(initialInvites);
    setInvites(initialInvites);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`party-invites-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_invites",
          filter: `invitee_id=eq.${userId}`,
        },
        () => {
          void fetchMyPartyInvites().then(setInvites);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleAccept(invite: PartyInviteView) {
    setBusyId(invite.id);
    setError(null);
    startTransition(async () => {
      const res = await acceptPartyInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setBusyId(null);
      if (!res.success) setError(res.error);
    });
  }

  function handleDecline(inviteId: string) {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    startTransition(async () => {
      try {
        await declinePartyInvite(inviteId);
      } catch {
        // silent — convite morto some no próximo refresh
      }
    });
  }

  if (invites.length === 0 && !error) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-auto fixed right-4 bottom-[160px] xl:bottom-[180px] z-[var(--z-system)] flex w-[320px] flex-col gap-2"
    >
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-error/40 bg-bg-deep/95 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60">
          <p className="flex-1 font-display text-[13px] font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar"
            className="text-text-faded hover:text-text-display p-1"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-md p-3 shadow-lg shadow-black/60 animate-in slide-in-from-right-4 fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <UserAvatar
              src={invite.inviterAvatarUrl ?? undefined}
              alt={`Avatar de ${invite.inviterName}`}
              fallback={invite.inviterName.slice(0, 2).toUpperCase()}
              size="sm"
            />
            <p className="flex-1 min-w-0 font-display text-[13px] font-semibold text-text-body">
              <span className="text-text-display">{invite.inviterName}</span> te convidou
              pro <span className="text-brand-primary">grupo</span>
            </p>
            <Users size={16} className="shrink-0 text-brand-primary" aria-hidden="true" />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleAccept(invite)}
              disabled={busyId !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-brand-primary bg-brand-primary/15 px-2 py-1.5 font-display text-[12px] font-bold uppercase tracking-wide text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-60"
            >
              {busyId === invite.id ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <LogIn size={13} aria-hidden="true" />
              )}
              Entrar
            </button>
            <button
              type="button"
              onClick={() => handleDecline(invite.id)}
              disabled={busyId !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-2 py-1.5 font-display text-[12px] font-bold uppercase tracking-wide text-text-muted hover:text-text-body hover:border-border-strong transition-colors disabled:opacity-60"
            >
              <X size={13} aria-hidden="true" />
              Recusar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
