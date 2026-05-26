"use client";
// Lista realtime de amigos com presence (Phase 9 — D-34/D-35/D-36/D-37).
// Consome usePresenceChannel + initialFriends (server-fetched pelo shell.tsx).
// Sem polling — Supabase Realtime push updates em tempo real.

import { useMemo } from "react";
import { Users } from "lucide-react";
import { usePresenceChannel, getPresenceStatus } from "@/lib/realtime/presence";
import { EmptyState } from "@/components/ui/empty-state";
import { FriendRow } from "./friend-row";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  currentUserId: string;
  initialFriends: FriendListEntry[];
}

export function FriendsList({ currentUserId, initialFriends }: Props) {
  const presenceMap = usePresenceChannel(currentUserId);

  const { online, offline, onlineCount } = useMemo(() => {
    const o: FriendListEntry[] = [];
    const off: FriendListEntry[] = [];
    for (const f of initialFriends) {
      const s = getPresenceStatus(f.friendUserId, presenceMap);
      if (s === "offline") off.push(f);
      else o.push(f);
    }
    return { online: o, offline: off, onlineCount: o.length };
  }, [initialFriends, presenceMap]);

  if (initialFriends.length === 0) {
    return (
      <EmptyState
        title="Sua lista de amigos está vazia."
        description="Encontre jogadores na comunidade e adicione-os como amigos."
        icon={Users}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header "Online agora" com counter */}
      <div className="flex items-center justify-between px-2">
        <p className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Online agora
        </p>
        {onlineCount > 0 && (
          <span className="font-display text-[13px] font-semibold text-brand-primary">
            {onlineCount}
          </span>
        )}
      </div>

      {/* Amigos online */}
      <div role="list" className="flex flex-col">
        {online.length === 0 ? (
          <p className="px-2 py-1 font-display text-[13px] font-semibold text-text-faded">
            Nenhum amigo online agora.
          </p>
        ) : (
          online.map((f) => (
            <FriendRow
              key={f.friendshipId}
              friend={f}
              presenceStatus={getPresenceStatus(f.friendUserId, presenceMap)}
            />
          ))
        )}
      </div>

      {/* Amigos offline — separador + lista */}
      {offline.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-2 mt-2 pt-2 border-t border-border-subtle">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text-faded">
              Offline
            </p>
          </div>
          <div role="list" className="flex flex-col">
            {offline.map((f) => (
              <FriendRow
                key={f.friendshipId}
                friend={f}
                presenceStatus="offline"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
