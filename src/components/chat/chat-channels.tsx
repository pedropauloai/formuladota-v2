"use client";
// Painéis de canal da chat bar (fiel ao cliente Dota 2, 2026-06-30). Estilo de
// linha "Nome: mensagem" (não bolha), como o chat do Dota, com a foto de quem escreve
// no começo de cada sequência. Três canais:
//   - PartyChannelPanel  → party_messages (nomes vêm do roster do grupo)
//   - LobbyChannelPanel  → lobby_messages (nome já resolvido no fetch)
//   - DmChannelPanel     → dm_messages (conversa 1-1)

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { UserAvatar } from "@/components/ui/avatar";
import { UserHoverCard } from "@/components/profile/user-hover-card";

export interface ChatLineData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  createdAt: string;
}

// Mensagens da mesma pessoa em até 5 minutos formam uma sequência, aberta pela foto e pelo nome.
const SEQUENCE_MS = 5 * 60_000;

function startsSequence(messages: ChatLineData[], i: number): boolean {
  const prev = messages[i - 1];
  const cur = messages[i];
  if (!prev || !cur) return true;
  return prev.senderId !== cur.senderId || Date.parse(cur.createdAt) - Date.parse(prev.createdAt) > SEQUENCE_MS;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Lista de mensagens estilo Dota (linhas "Nome: msg  hora"), com a foto de quem escreve.
function MessageList({
  messages,
  currentUserId,
  emptyHint,
}: {
  messages: ChatLineData[];
  currentUserId: string;
  emptyHint: string;
}) {
  const t = useTranslations("chat");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={ref} className="h-[240px] overflow-y-auto px-3 py-2">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-center font-display text-[13px] text-text-faded">{emptyHint}</p>
        </div>
      ) : (
        // Ancorado no rodapé: com poucas mensagens elas ficam embaixo (preenchem
        // de baixo pra cima); a mais nova sempre embaixo.
        <div className="flex min-h-full flex-col justify-end">
          {messages.map((m, i) => {
            const mine = m.senderId === currentUserId;
            const name = mine ? t("you") : m.senderName;
            const start = startsSequence(messages, i);
            return (
              <div key={m.id} data-chat-linha={m.id} className={`flex gap-2 ${start && i > 0 ? "mt-2" : "mt-0.5"}`}>
                <span className="w-5 shrink-0 pt-px">
                  {start && (
                    <UserHoverCard userId={m.senderId} className="block">
                      <UserAvatar src={m.senderAvatarUrl ?? undefined} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="xs" className="size-5" />
                    </UserHoverCard>
                  )}
                </span>
                <p className="min-w-0 flex-1 font-sans text-[13px] leading-snug break-words">
                  {start && (
                    <>
                      <span className={`font-display font-semibold ${mine ? "text-brand-primary" : "text-text-display"}`}>
                        <UserHoverCard userId={m.senderId} className="hover:underline">
                          {name}
                        </UserHoverCard>
                        :
                      </span>{" "}
                    </>
                  )}
                  <span className="text-text-body">{m.body}</span>{" "}
                  <span className="text-[10px] text-text-faded tabular-nums">{timeLabel(m.createdAt)}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// onSend devolve o aviso a mostrar quando a mensagem não saiu (null = enviada).
function Composer({ onSend, placeholder }: { onSend: (body: string) => Promise<string | null>; placeholder: string }) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    const body = draft.trim();
    if (!body || pending) return;
    setDraft("");
    setProblem(null);
    startTransition(async () => {
      const result = await onSend(body);
      if (!result) return;
      // Devolve o texto ao campo para a pessoa não perder o que escreveu.
      setDraft((current) => current || body);
      setProblem(result);
    });
  }
  return (
    <div className="border-t border-border-subtle">
      {problem && (
        <p role="alert" className="px-2.5 pt-1.5 font-display text-[12px] text-error">
          {problem}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 p-2"
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
        aria-label={t("send")}
        className="rounded border border-brand-primary bg-brand-primary/15 p-1.5 text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-40"
      >
        <Send size={15} aria-hidden="true" />
      </button>
      </form>
    </div>
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
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatLineData[]>([]);

  // Nome e foto do remetente vêm resolvidos do servidor (fetchPartyMessages): o payload
  // do realtime não traz identidade, então re-busca (baixo volume), igual ao canal Sala.
  const reload = () => fetchPartyMessages().then(setMessages);

  useEffect(() => {
    let active = true;
    void fetchPartyMessages().then((msgs) => {
      if (active) setMessages(msgs);
    });
    return () => {
      active = false;
    };
  }, [partyId]);

  usePartyMessages(partyId, () => void reload());

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint={t("partyEmpty")} />
      <Composer
        placeholder={t("partyPlaceholder")}
        onSend={async (body) => ((await sendPartyMessage(body)).success ? null : t("sendError"))}
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
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatLineData[]>([]);

  const reload = () => fetchLobbyMessages(lobbyId).then(setMessages);

  useEffect(() => {
    let active = true;
    void fetchLobbyMessages(lobbyId).then((msgs) => {
      if (active) setMessages(msgs);
    });
    return () => {
      active = false;
    };
  }, [lobbyId]);

  // Payload não traz nome nem foto: re-busca (baixo volume).
  useLobbyMessages(lobbyId, () => void reload());

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint={t("lobbyEmpty")} />
      <Composer
        placeholder={t("lobbyPlaceholder")}
        onSend={async (body) => ((await sendLobbyMessage({ lobbyId, body })).success ? null : t("sendError"))}
      />
    </>
  );
}

// ---------------- Canal DM (1-1) ----------------
export function DmChannelPanel({
  otherUserId,
  otherName,
  otherAvatarUrl,
  currentUserId,
  currentUserAvatarUrl,
}: {
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  currentUserId: string;
  currentUserAvatarUrl: string | null;
}) {
  const t = useTranslations("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLineData[]>([]);
  // Aviso no lugar da conversa quando ela não abre (null = abriu ou ainda abrindo).
  const [openProblem, setOpenProblem] = useState<string | null>(null);

  const toLine = (m: { id: string; senderId: string; body: string; createdAt: string }): ChatLineData => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderId === currentUserId ? t("you") : otherName,
    senderAvatarUrl: m.senderId === currentUserId ? currentUserAvatarUrl : otherAvatarUrl,
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
        setOpenProblem(res.code === "not_friends" ? t("dmNotFriends") : t("dmError"));
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

  async function send(body: string): Promise<string | null> {
    if (!conversationId) return t("sendError");
    const res = await sendDirectMessage({ conversationId, body });
    if (!res.success) return res.code === "not_friends" ? t("dmNotFriends") : t("sendError");
    setMessages((prev) => (prev.some((x) => x.id === res.message.id) ? prev : [...prev, toLine(res.message)]));
    return null;
  }

  if (openProblem) {
    return (
      <div className="flex h-[292px] items-center justify-center px-4 text-center font-display text-[13px] text-text-faded">
        {openProblem}
      </div>
    );
  }

  return (
    <>
      <MessageList messages={messages} currentUserId={currentUserId} emptyHint={t("dmEmpty", { name: otherName })} />
      <Composer placeholder={t("dmPlaceholder", { name: otherName })} onSend={send} />
    </>
  );
}
