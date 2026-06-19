"use client";
// Lista realtime de amigos com presence (Phase 9 + pacote social 2026-06-12).
// Consome usePresenceChannel + dados server-fetched pelo shell.tsx.
// Estrutura (ref client Dota 2): BUSCAR AMIGOS → PENDENTES → ONLINE → OFFLINE.

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { usePresenceChannel, getPresenceStatus } from "@/lib/realtime/presence";
import { EmptyState } from "@/components/ui/empty-state";
import { FriendRow } from "./friend-row";
import { FriendSearch } from "./friend-search";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  currentUserId: string;
  initialFriends: FriendListEntry[];
  /** Pedidos pendentes (recebidos + enviados) — server-fetched. */
  initialPending?: FriendListEntry[];
  /** Sala ABERTA do viewer — habilita "Convidar pra sala" nos rows online. */
  currentLobbyId?: string | null;
}

export function FriendsList({
  currentUserId,
  initialFriends,
  initialPending = [],
  currentLobbyId = null,
}: Props) {
  const t = useTranslations("perfil");
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

  // Recebidos primeiro (pedem ação), depois enviados ("aguardando").
  const pendingSorted = useMemo(
    () =>
      [...initialPending].sort((a, b) =>
        a.direction === b.direction ? 0 : a.direction === "incoming" ? -1 : 1
      ),
    [initialPending]
  );

  const isEmpty = initialFriends.length === 0 && pendingSorted.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Busca SEMPRE visível — é o caminho de entrada de novos amigos */}
      <FriendSearch />

      {isEmpty ? (
        <EmptyState
          title={t("friendsEmptyTitle")}
          description={t("friendsEmptyDesc")}
          icon={Users}
        />
      ) : (
        <>
          {/* Pedidos pendentes — recebidos com aceitar/recusar, enviados com cancelar */}
          {pendingSorted.length > 0 && (
            <>
              <div className="flex items-center justify-between px-2 mt-1">
                <p className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  {t("pending")}
                </p>
                <span className="font-display text-[13px] font-semibold text-brand-primary">
                  {pendingSorted.length}
                </span>
              </div>
              <div role="list" className="flex flex-col">
                {pendingSorted.map((f) => (
                  <FriendRow
                    key={f.friendshipId}
                    friend={f}
                    presenceStatus={getPresenceStatus(f.friendUserId, presenceMap)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Header "Online agora" com counter */}
          <div className="flex items-center justify-between px-2">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {t("onlineNow")}
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
                {t("noFriendsOnline")}
              </p>
            ) : (
              online.map((f) => (
                <FriendRow
                  key={f.friendshipId}
                  friend={f}
                  presenceStatus={getPresenceStatus(f.friendUserId, presenceMap)}
                  currentLobbyId={currentLobbyId}
                />
              ))
            )}
          </div>

          {/* Amigos offline — separador + lista */}
          {offline.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-2 mt-2 pt-2 border-t border-border-subtle">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-text-faded">
                  {t("offline")}
                </p>
              </div>
              <div role="list" className="flex flex-col">
                {offline.map((f) => (
                  <FriendRow key={f.friendshipId} friend={f} presenceStatus="offline" />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
