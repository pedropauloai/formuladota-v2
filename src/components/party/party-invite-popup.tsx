"use client";
// Popup CENTRAL de convite de grupo (fiel ao cliente Dota 2, 2026-06-30).
// Mostra quem chamou + quem já está no grupo, no centro da tela. Substitui o
// banner bottom-right. Realtime: INSERT em party_invites (invitee) → refetch
// detalhado (RPC party_invites_detailed traz o preview dos membros).

import { useEffect, useState, useTransition } from "react";
import { Users, X, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/avatar";
import {
  acceptPartyInvite,
  declinePartyInvite,
  fetchPartyInvitesDetailed,
} from "@/actions/party";
import type { PartyInviteDetailed } from "@/lib/queries/party";

interface Props {
  userId: string;
  initialInvites: PartyInviteDetailed[];
}

export function PartyInvitePopup({ userId, initialInvites }: Props) {
  const [invites, setInvites] = useState<PartyInviteDetailed[]>(initialInvites);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const [prevInit, setPrevInit] = useState(initialInvites);
  if (prevInit !== initialInvites) {
    setPrevInit(initialInvites);
    setInvites(initialInvites);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`party-invites-popup-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "party_invites", filter: `invitee_id=eq.${userId}` },
        () => void fetchPartyInvitesDetailed().then(setInvites)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Mostra um convite por vez (o mais recente é o primeiro).
  const invite = invites[0];
  if (!invite) return null;

  function accept() {
    if (!invite) return;
    setBusy(true);
    startTransition(async () => {
      await acceptPartyInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setBusy(false);
    });
  }

  function decline() {
    if (!invite) return;
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    startTransition(async () => {
      try {
        await declinePartyInvite(invite.id);
      } catch {
        /* convite morto some no próximo refresh */
      }
    });
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-takeover)] flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm overflow-hidden rounded-lg border border-brand-primary/50 bg-bg-deep/95 shadow-[var(--shadow-cinematic)] animate-in zoom-in-95 fade-in duration-200">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-3 border-b border-border-subtle px-6 pt-6 pb-5">
          <span className="flex items-center gap-1.5 font-display text-[12px] font-bold uppercase tracking-[0.15em] text-brand-primary">
            <Users size={14} aria-hidden="true" /> Convite de grupo
          </span>
          <UserAvatar
            src={invite.inviterAvatar ?? undefined}
            alt={invite.inviterName}
            fallback={invite.inviterName.slice(0, 2).toUpperCase()}
            size="lg"
            ringColor="brand"
          />
          <p className="text-center font-display text-base text-text-body">
            <span className="font-bold text-text-display">{invite.inviterName}</span> te
            chamou pro grupo
          </p>
        </div>

        {/* Preview do grupo */}
        <div className="px-6 py-4">
          <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
            No grupo ({invite.members.length}/5)
          </p>
          <div className="flex flex-wrap gap-2">
            {invite.members.map((m) => (
              <div key={m.userId} className="flex flex-col items-center gap-1 w-14">
                <UserAvatar
                  src={m.avatar ?? undefined}
                  alt={m.name}
                  fallback={m.name.slice(0, 2).toUpperCase()}
                  size="md"
                />
                <span className="w-full truncate text-center font-display text-[11px] text-text-muted">
                  {m.name}
                </span>
              </div>
            ))}
            {/* Slots vazios restantes */}
            {Array.from({ length: Math.max(0, 5 - invite.members.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex size-10 items-center justify-center rounded-sm border border-dashed border-border-strong text-text-faded"
              >
                <Users size={14} aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 border-t border-border-subtle p-4">
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-brand-primary bg-brand-primary/20 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-text-display transition-colors hover:bg-brand-primary/30 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
            Entrar
          </button>
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-text-muted transition-colors hover:text-text-body hover:border-border-strong disabled:opacity-60"
          >
            <X size={16} aria-hidden="true" /> Recusar
          </button>
        </div>
      </div>
    </div>
  );
}
