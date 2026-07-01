"use client";
// Painéis de canal da chat bar (fiel ao cliente Dota 2, 2026-06-30). Estilo de
// linha "Nome: mensagem" (não bolha) — como o chat do Dota. Três canais:
//   - PartyChannelPanel  → party_messages (nomes vêm do roster do grupo)
//   - LobbyChannelPanel  → lobby_messages (nome já resolvido no fetch)
//   - DmChannelPanel     → dm_messages (conversa 1-1)

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import {
  fetchPartyMessages,
  sendPartyMessage,
} from "@/actions/party";
import { sendLobbyMessage, fetchLobbyMessages } from "@/actions/lobby-chat";
import {
  openConversation,
  sendDirectMessage,
  markConversationRead,
} from "@/actions/messages";
import { usePartyMessages } from "@/lib/realtime/use-party-realtime";
import { useLobbyMessages } from "@/lib/realtime/use-lobby-realtime";
import { useDmMessages } from "@/lib/realtime/use-dm-realtime";

export interface ChatLineData {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Lista de mensagens estilo Dota (linhas "Nome: msg  hora").
function MessageList({
  messages,
  currentUserId,
  emptyHint,
}: {
  messages: ChatLineData[];
  currentUserId: string;
  emptyHint: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={ref} className="h-[240px] overflow-y-auto px-3 py-2 space-y-1">
      {messages.length === 0 ? (
        <p className="px-1 py-6 text-center font-display text-[13px] text-text-faded">{emptyHint}</p>
      ) : (
        messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <p key={m.id} className="font-sans text-[13px] leading-snug break-words">
              <span className={`font-display font-semibold ${mine ? "text-brand-primary" : "text-text-display"}`}>
                {mine ? "Você" : m.senderName}:
              </span>{" "}
              <span className="text-text-body">{m.body}</span>{" "}
              <span className="text-[10px] text-text-faded tabular-nums">{timeLabel(m.createdAt)}</span>
            </p>
          );
        })
      )}
    </div>
  );
}

function Composer({ onSend, placeholder }: { onSend: (body: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function submit() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    onSend(body);
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-center gap-2 border-t border-border-subtle p-2"
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={2000}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 rounded border border-border-subtle bg-bg-base px-2.5 py-1.5 font-sans text-[13px] text-text-body placeholder:text-text-faded focus:border-brand-primary/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        aria-label="Enviar"
        className="rounded border border-brand-primary bg-brand-primary/15 p-1.5 text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-40"
      >
        <Send size={15} aria-hidden="true" />
      </button>
    </form>
  );
}

// ---------------- Canal GRUPO ----------------
export function PartyChannelPanel({
  partyId,
  currentUserId,
}: {
  partyId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatLineData[]>([]);
  const [, startTransition] = useTransition();

  // Nome do remetente vem RESOLVIDO do servidor (fetchPartyMessages) — o payload
  // do realtime não traz nome, então re-busca (baixo volume), igual ao canal Sala.
  const reload = () =>
    fetchPartyMessages().then((msgs) =>
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          body: m.body,
          createdAt: m.createdAt,
        }))
      )
    );

  useEffect(() => {
    let active = true;
    void fetchPartyMessages().then((msgs) => {
      if (active)
        setMessages(
          msgs.map((m) => ({ id: m.id, senderId: m.senderId, senderName: m.senderName, body: m.body, createdAt: m.createdAt }))
        );
    });
    return () => {
      active = false;
    };
  }, [partyId]);

  usePartyMessages(partyId, () => void reload());

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint="Chat do grupo — só vocês veem." />
      <Composer
        placeholder="Mensagem pro grupo..."
        onSend={(body) => startTransition(() => void sendPartyMessage(body))}
      />
    </>
  );
}

// ---------------- Canal SALA ----------------
export function LobbyChannelPanel({
  lobbyId,
  currentUserId,
}: {
  lobbyId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatLineData[]>([]);
  const [, startTransition] = useTransition();

  const reload = () =>
    fetchLobbyMessages(lobbyId).then((msgs) =>
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          body: m.body,
          createdAt: m.createdAt,
        }))
      )
    );

  useEffect(() => {
    let active = true;
    void fetchLobbyMessages(lobbyId).then((msgs) => {
      if (active)
        setMessages(msgs.map((m) => ({ id: m.id, senderId: m.senderId, senderName: m.senderName, body: m.body, createdAt: m.createdAt })));
    });
    return () => {
      active = false;
    };
  }, [lobbyId]);

  // Payload não traz nome → re-busca (baixo volume).
  useLobbyMessages(lobbyId, () => void reload());

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint="Chat da sala." />
      <Composer
        placeholder="Mensagem pra sala..."
        onSend={(body) => startTransition(() => void sendLobbyMessage({ lobbyId, body }))}
      />
    </>
  );
}

// ---------------- Canal DM (1-1) ----------------
export function DmChannelPanel({
  otherUserId,
  otherName,
  currentUserId,
}: {
  otherUserId: string;
  otherName: string;
  currentUserId: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLineData[]>([]);
  const [errored, setErrored] = useState(false);
  const [, startTransition] = useTransition();

  const toLine = (m: { id: string; senderId: string; body: string; createdAt: string }): ChatLineData => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderId === currentUserId ? "Você" : otherName,
    body: m.body,
    createdAt: m.createdAt,
  });

  useEffect(() => {
    let active = true;
    void openConversation(otherUserId).then((res) => {
      if (!active) return;
      if (res.success) {
        setConversationId(res.conversationId);
        setMessages(res.messages.map(toLine));
      } else {
        setErrored(true);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useDmMessages(conversationId, (m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, toLine(m)]));
    if (conversationId && m.senderId !== currentUserId) void markConversationRead(conversationId);
  });

  function send(body: string) {
    if (!conversationId) return;
    startTransition(async () => {
      const res = await sendDirectMessage({ conversationId, body });
      if (res.success) {
        setMessages((prev) => (prev.some((x) => x.id === res.message.id) ? prev : [...prev, toLine(res.message)]));
      }
    });
  }

  if (errored) {
    return (
      <div className="flex h-[292px] items-center justify-center px-4 text-center font-display text-[13px] text-text-faded">
        Só dá pra conversar com amigos aceitos.
      </div>
    );
  }

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint={`Diga oi pra ${otherName}.`} />
      <Composer placeholder={`Mensagem para ${otherName}...`} onSend={send} />
    </>
  );
}
