"use client";
// ChatBar — chat estilo cliente Dota 2 (2026-06-30): barra RETRAÍDA no rodapé
// central; ao clicar, EXPANDE com ABAS. Canais: Grupo (party) + Sala (lobby) +
// DMs privadas (uma aba por conversa). Substitui o antigo ChatDock bottom-right.
// Abrir DM de qualquer lugar via evento global openChatWith.

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X, Plus, Users, Home, ChevronDown } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import {
  PartyChannelPanel,
  LobbyChannelPanel,
  DmChannelPanel,
} from "./chat-channels";
import { fetchDmInbox } from "@/actions/messages";
import { useDmInboxSignal } from "@/lib/realtime/use-dm-realtime";
import { usePartyMessages } from "@/lib/realtime/use-party-realtime";
import { useLobbyMessages } from "@/lib/realtime/use-lobby-realtime";
import { useSound } from "@/lib/sound/hooks";
import { useToast } from "@/components/ui/toast";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "@/lib/chat/open-chat";
import type { DmInboxEntry } from "@/lib/queries/messages";
import type { PartyView } from "@/lib/queries/party";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  currentUserId: string;
  party: PartyView | null;
  lobbyId: string | null;
  initialInbox: DmInboxEntry[];
  friends: FriendListEntry[];
}

interface DmTab {
  userId: string;
  name: string;
  avatar: string | null;
}

export function ChatBar({ currentUserId, party, lobbyId, initialInbox, friends }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [openDms, setOpenDms] = useState<DmTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [inbox, setInbox] = useState<DmInboxEntry[]>(initialInbox);
  const [pickerOpen, setPickerOpen] = useState(false);
  const play = useSound();
  const { toast } = useToast();

  const partyId = party?.partyId ?? null;
  const nameById: Record<string, string> = Object.fromEntries(
    (party?.members ?? []).map((m) => [m.userId, m.name])
  );

  // Abas disponíveis: Grupo, Sala, e uma por DM aberta.
  const tabs: { id: string; label: string; avatar?: string | null; closable?: boolean }[] = [];
  if (partyId) tabs.push({ id: "party", label: "Grupo" });
  if (lobbyId) tabs.push({ id: "lobby", label: "Sala" });
  for (const d of openDms) tabs.push({ id: `dm:${d.userId}`, label: d.name, avatar: d.avatar, closable: true });

  const validActive = tabs.find((t) => t.id === activeTab)?.id ?? tabs[0]?.id ?? null;
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  const activate = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setExpanded(true);
    setUnread((u) => ({ ...u, [tabId]: 0 }));
    setPickerOpen(false);
  }, []);

  const openDm = useCallback(
    (d: OpenChatDetail) => {
      setOpenDms((prev) =>
        prev.some((x) => x.userId === d.userId) ? prev : [...prev, { userId: d.userId, name: d.name, avatar: d.avatar }]
      );
      activate(`dm:${d.userId}`);
    },
    [activate]
  );

  // Abrir DM via evento global (lista de amigos / hover card).
  useEffect(() => {
    function handler(e: Event) {
      openDm((e as CustomEvent<OpenChatDetail>).detail);
    }
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, [openDm]);

  // Mensagem nova (de outra pessoa) → badge + SOM + TOAST, só quando NÃO estou
  // vendo aquela aba (aberta + ativa). Atende o pedido de "notificação + áudio".
  const alertIncoming = (tabId: string, title: string, body?: string) => {
    if (expanded && validActive === tabId) return;
    setUnread((u) => ({ ...u, [tabId]: (u[tabId] ?? 0) + 1 }));
    play("notification");
    toast({ type: "info", title, description: body });
  };

  usePartyMessages(partyId, (m) => {
    if (m.senderId === currentUserId) return;
    alertIncoming("party", `${nameById[m.senderId] ?? "Alguém"} no grupo`, m.body);
  });
  useLobbyMessages(lobbyId, () => alertIncoming("lobby", "Nova mensagem na sala"));
  useDmInboxSignal(true, (senderId) => {
    void fetchDmInbox().then((data) => {
      setInbox(data);
      if (senderId === currentUserId) return;
      const conv = data.find((c) => c.otherUserId === senderId);
      // Abre a ABA da conversa com quem mandou (sem roubar foco / sem forçar
      // expandir) — o usuário não precisa mais achar a conversa no "+". A badge
      // de não-lidas aparece nessa aba via alertIncoming.
      if (conv) {
        setOpenDms((prev) =>
          prev.some((d) => d.userId === senderId)
            ? prev
            : [...prev, { userId: senderId, name: conv.otherName, avatar: conv.otherAvatarUrl }]
        );
      }
      alertIncoming(
        `dm:${senderId}`,
        conv?.otherName ?? "Nova mensagem",
        conv?.lastPreview ?? undefined
      );
    });
  });

  function toggleBar() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    const first = validActive;
    if (first) setUnread((u) => ({ ...u, [first]: 0 }));
  }

  function closeDm(userId: string) {
    setOpenDms((prev) => prev.filter((d) => d.userId !== userId));
    if (activeTab === `dm:${userId}`) setActiveTab(null);
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-[var(--z-overlay)] hidden w-[360px] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col sm:flex">
      {/* Painel expandido — cresce pra cima */}
      {expanded && (
        <div className="pointer-events-auto mb-2 overflow-hidden rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-md shadow-2xl shadow-black/70 animate-in slide-in-from-bottom-2 fade-in duration-150">
          {/* Abas */}
          <div className="flex items-center gap-1 border-b border-border-subtle bg-bg-elevated/50 px-1.5 py-1">
            <div className="flex flex-1 items-center gap-1 overflow-x-auto">
              {tabs.length === 0 && (
                <span className="px-2 py-1 font-display text-[12px] text-text-faded">
                  Nenhuma conversa. Abra uma no +
                </span>
              )}
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  label={tab.label}
                  icon={tab.id === "party" ? Users : tab.id === "lobby" ? Home : MessageCircle}
                  active={validActive === tab.id}
                  unread={unread[tab.id] ?? 0}
                  onClick={() => activate(tab.id)}
                  onClose={tab.closable ? () => closeDm(tab.id.slice(3)) : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Nova conversa"
              className={`shrink-0 rounded-sm p-1.5 transition-colors ${
                pickerOpen ? "text-brand-primary" : "text-text-faded hover:text-text-display"
              }`}
            >
              <Plus size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Retrair chat"
              className="shrink-0 rounded-sm p-1.5 text-text-faded hover:text-text-display transition-colors"
            >
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>

          {/* Picker de nova conversa */}
          {pickerOpen ? (
            <DmPicker
              inbox={inbox}
              friends={friends}
              openUserIds={new Set(openDms.map((d) => d.userId))}
              onPick={openDm}
            />
          ) : validActive === "party" && partyId ? (
            <PartyChannelPanel partyId={partyId} currentUserId={currentUserId} />
          ) : validActive === "lobby" && lobbyId ? (
            <LobbyChannelPanel lobbyId={lobbyId} currentUserId={currentUserId} />
          ) : validActive?.startsWith("dm:") ? (
            <DmTabBody userId={validActive.slice(3)} openDms={openDms} currentUserId={currentUserId} />
          ) : (
            <p className="px-4 py-10 text-center font-display text-[13px] text-text-faded">
              Abra uma conversa no +
            </p>
          )}
        </div>
      )}

      {/* Barra retraída */}
      <button
        type="button"
        onClick={toggleBar}
        className={`pointer-events-auto flex items-center gap-2 self-center rounded-md border px-4 py-2 font-display text-[13px] font-semibold shadow-lg shadow-black/50 backdrop-blur-md transition-colors ${
          expanded
            ? "border-brand-primary bg-brand-primary/15 text-text-display"
            : "border-brand-primary/30 bg-bg-deep/90 text-text-muted hover:border-brand-primary/60 hover:text-text-display"
        }`}
      >
        <MessageCircle size={16} aria-hidden="true" />
        <span className="uppercase tracking-wide">Chat</span>
        {totalUnread > 0 && !expanded && (
          <span className="flex min-w-5 h-5 items-center justify-center rounded-full bg-brand-primary px-1 font-display text-[11px] font-bold tabular-nums text-text-display">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}

// Renderiza o corpo da aba DM ativa (resolve o nome pela lista de abas abertas).
function DmTabBody({
  userId,
  openDms,
  currentUserId,
}: {
  userId: string;
  openDms: DmTab[];
  currentUserId: string;
}) {
  const dm = openDms.find((d) => d.userId === userId);
  if (!dm) return null;
  return <DmChannelPanel otherUserId={dm.userId} otherName={dm.name} currentUserId={currentUserId} />;
}

function TabButton({
  label,
  icon: Icon,
  active,
  unread,
  onClick,
  onClose,
}: {
  label: string;
  icon: typeof Users;
  active: boolean;
  unread: number;
  onClick: () => void;
  onClose?: () => void;
}) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 font-display text-[12px] font-semibold transition-colors ${
        active
          ? "border-brand-primary bg-brand-primary/15 text-text-display"
          : "border-transparent text-text-muted hover:text-text-body"
      }`}
    >
      <button type="button" onClick={onClick} className="flex items-center gap-1 max-w-[90px]">
        <Icon size={13} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
      {unread > 0 && (
        <span className="flex min-w-4 h-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold tabular-nums text-text-display">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      {onClose && (
        <button type="button" onClick={onClose} aria-label={`Fechar ${label}`} className="text-text-faded hover:text-error">
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

function DmPicker({
  inbox,
  friends,
  openUserIds,
  onPick,
}: {
  inbox: DmInboxEntry[];
  friends: FriendListEntry[];
  openUserIds: Set<string>;
  onPick: (d: OpenChatDetail) => void;
}) {
  // Conversas recentes + amigos (sem duplicar quem já está aberto).
  const recentIds = new Set(inbox.map((c) => c.otherUserId));
  const extraFriends = friends.filter((f) => !recentIds.has(f.friendUserId));

  return (
    <div className="max-h-[292px] overflow-y-auto">
      {inbox.length === 0 && extraFriends.length === 0 && (
        <p className="px-4 py-8 text-center font-display text-[13px] text-text-faded">
          Adicione amigos pra conversar.
        </p>
      )}
      {inbox.map((c) => (
        <PickRow
          key={c.conversationId}
          name={c.otherName}
          avatar={c.otherAvatarUrl}
          hint={c.lastPreview}
          unread={c.unreadCount}
          open={openUserIds.has(c.otherUserId)}
          onClick={() => onPick({ userId: c.otherUserId, name: c.otherName, avatar: c.otherAvatarUrl })}
        />
      ))}
      {extraFriends.map((f) => (
        <PickRow
          key={f.friendUserId}
          name={f.friendUsername ?? "Amigo"}
          avatar={f.friendAvatarUrl}
          open={openUserIds.has(f.friendUserId)}
          onClick={() =>
            onPick({ userId: f.friendUserId, name: f.friendUsername ?? "Amigo", avatar: f.friendAvatarUrl })
          }
        />
      ))}
    </div>
  );
}

function PickRow({
  name,
  avatar,
  hint,
  unread,
  open,
  onClick,
}: {
  name: string;
  avatar: string | null;
  hint?: string | null;
  unread?: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-elevated/60 transition-colors"
    >
      <UserAvatar src={avatar ?? undefined} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[13px] font-semibold text-text-display">{name}</span>
        {hint && <span className="block truncate font-sans text-[12px] text-text-faded">{hint}</span>}
      </span>
      {open && <span className="font-display text-[11px] text-text-faded">aberta</span>}
      {!!unread && unread > 0 && (
        <span className="flex min-w-5 h-5 items-center justify-center rounded-full bg-brand-primary px-1 font-display text-[11px] font-bold tabular-nums text-text-display">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
