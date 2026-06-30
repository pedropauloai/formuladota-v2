"use client";
// ChatDock — dock de mensagens estilo Steam (bottom-right) montado no shell.
// Pacote social 2026-06-30. Gerencia: botão launcher com badge de não-lidas,
// lista de conversas (inbox), e janelas de chat abertas. Abre conversa via evento
// global (openChatWith — disparado pela lista de amigos) ou clicando no inbox.

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { ChatWindow } from "./chat-window";
import { fetchDmInbox } from "@/actions/messages";
import { useDmInboxSignal } from "@/lib/realtime/use-dm-realtime";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "@/lib/chat/open-chat";
import type { DmInboxEntry } from "@/lib/queries/messages";

interface Props {
  currentUserId: string;
  initialInbox: DmInboxEntry[];
}

interface OpenWindow {
  userId: string;
  name: string;
  avatar: string | null;
  minimized: boolean;
}

const MAX_WINDOWS = 3;

export function ChatDock({ currentUserId, initialInbox }: Props) {
  const [inbox, setInbox] = useState<DmInboxEntry[]>(initialInbox);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);

  const totalUnread = inbox.reduce((sum, c) => sum + c.unreadCount, 0);

  const openWindow = useCallback((detail: OpenChatDetail) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.userId === detail.userId);
      if (existing) {
        return prev.map((w) =>
          w.userId === detail.userId ? { ...w, minimized: false } : w
        );
      }
      const next: OpenWindow = {
        userId: detail.userId,
        name: detail.name,
        avatar: detail.avatar,
        minimized: false,
      };
      // Cap de janelas: derruba a mais antiga.
      return [...prev.slice(-(MAX_WINDOWS - 1)), next];
    });
    setInboxOpen(false);
  }, []);

  // Abre conversa via evento global (lista de amigos / hover card).
  useEffect(() => {
    function handler(e: Event) {
      openWindow((e as CustomEvent<OpenChatDetail>).detail);
    }
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, [openWindow]);

  // Mensagem nova em qualquer conversa → re-busca o inbox (preview + não-lidas).
  useDmInboxSignal(true, (senderId) => {
    if (senderId === currentUserId) return;
    void fetchDmInbox().then(setInbox);
  });

  function closeWindow(userId: string) {
    setWindows((prev) => prev.filter((w) => w.userId !== userId));
    void fetchDmInbox().then(setInbox); // re-sincroniza não-lidas (a janela marcou lida)
  }

  function toggleMinimize(userId: string) {
    setWindows((prev) =>
      prev.map((w) => (w.userId === userId ? { ...w, minimized: !w.minimized } : w))
    );
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-2 z-[var(--z-overlay)] hidden items-end gap-2 sm:flex flex-row-reverse">
      {/* Launcher + inbox */}
      <div className="pointer-events-auto relative flex flex-col items-end">
        {inboxOpen && (
          <InboxPanel
            inbox={inbox}
            currentUserId={currentUserId}
            onPick={(c) =>
              openWindow({ userId: c.otherUserId, name: c.otherName, avatar: c.otherAvatarUrl })
            }
            onClose={() => setInboxOpen(false)}
          />
        )}
        <button
          type="button"
          onClick={() => setInboxOpen((v) => !v)}
          aria-label={inboxOpen ? "Fechar mensagens" : "Abrir mensagens"}
          className={`relative flex size-12 items-center justify-center rounded-md border backdrop-blur-md shadow-lg shadow-black/60 transition-all ${
            inboxOpen
              ? "border-brand-primary bg-brand-primary/20 text-text-display"
              : "border-brand-primary/30 bg-bg-deep/90 text-text-muted hover:border-brand-primary/60 hover:text-text-display"
          }`}
        >
          <MessageCircle size={20} aria-hidden="true" />
          {totalUnread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 flex min-w-5 h-5 items-center justify-center rounded-full border border-bg-deep bg-brand-primary px-1 font-display text-[11px] font-bold tabular-nums text-text-display"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* Janelas abertas (mais recente à esquerda do launcher) */}
      {windows.map((w) => (
        <ChatWindow
          key={w.userId}
          currentUserId={currentUserId}
          otherUserId={w.userId}
          otherName={w.name}
          otherAvatar={w.avatar}
          minimized={w.minimized}
          onToggleMinimize={() => toggleMinimize(w.userId)}
          onClose={() => closeWindow(w.userId)}
        />
      ))}
    </div>
  );
}

function InboxPanel({
  inbox,
  currentUserId,
  onPick,
  onClose,
}: {
  inbox: DmInboxEntry[];
  currentUserId: string;
  onPick: (c: DmInboxEntry) => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-2 w-[300px] overflow-hidden rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-md shadow-2xl shadow-black/70 animate-in slide-in-from-bottom-2 fade-in duration-150">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-elevated/60 px-3 py-2">
        <p className="font-display text-[13px] font-bold uppercase tracking-wide text-text-display">
          Mensagens
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="p-1 text-text-faded hover:text-text-display"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {inbox.length === 0 ? (
          <p className="px-3 py-6 text-center font-display text-[13px] text-text-faded">
            Nenhuma conversa ainda. Mande uma mensagem pra um amigo na lista.
          </p>
        ) : (
          inbox.map((c) => {
            const prefix = c.lastSenderId === currentUserId ? "Você: " : "";
            return (
              <button
                key={c.conversationId}
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-elevated/60 transition-colors"
              >
                <UserAvatar
                  src={c.otherAvatarUrl ?? undefined}
                  alt={`Avatar de ${c.otherName}`}
                  fallback={c.otherName.slice(0, 2).toUpperCase()}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-display text-[13px] font-semibold text-text-display">
                    {c.otherName}
                  </p>
                  <p className="truncate font-sans text-[12px] text-text-faded">
                    {prefix}
                    {c.lastPreview ?? "—"}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex min-w-5 h-5 items-center justify-center rounded-full bg-brand-primary px-1 font-display text-[11px] font-bold tabular-nums text-text-display">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
