"use client";
// Chat do grupo (pacote social 2026-06-30). Histórico via fetchPartyMessages +
// append realtime (usePartyMessages). Envio confia no echo realtime (sou membro →
// recebo a própria mensagem de volta), sem otimismo pra evitar dedup complexo.

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import {
  fetchPartyMessages,
  sendPartyMessage,
  type PartyChatMessageView,
} from "@/actions/party";
import { usePartyMessages } from "@/lib/realtime/use-party-realtime";

interface Props {
  partyId: string;
  currentUserId: string;
  /** user_id → nome de exibição (dos membros). */
  nameById: Record<string, string>;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PartyChat({ partyId, currentUserId, nameById }: Props) {
  const [messages, setMessages] = useState<PartyChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetchPartyMessages().then((m) => {
      if (active) setMessages(m);
    });
    return () => {
      active = false;
    };
  }, [partyId]);

  usePartyMessages(partyId, (m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startTransition(async () => {
      const res = await sendPartyMessage(body);
      if (!res.success) setDraft(body);
    });
  }

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className="h-[140px] overflow-y-auto px-1 py-1 space-y-1">
        {messages.length === 0 ? (
          <p className="px-1 py-3 text-center font-display text-[12px] text-text-faded">
            Chat do grupo — só vocês veem.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <p key={m.id} className="font-sans text-[12px] leading-snug break-words">
                <span
                  className={`font-display font-semibold ${mine ? "text-brand-primary" : "text-text-display"}`}
                >
                  {nameById[m.senderId] ?? "Jogador"}:
                </span>{" "}
                <span className="text-text-body">{m.body}</span>{" "}
                <span className="text-[10px] text-text-faded tabular-nums">{timeLabel(m.createdAt)}</span>
              </p>
            );
          })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-1.5 border-t border-border-subtle pt-1.5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Mensagem pro grupo..."
          aria-label="Mensagem pro grupo"
          className="flex-1 min-w-0 rounded border border-border-subtle bg-bg-base px-2 py-1 font-sans text-[12px] text-text-body placeholder:text-text-faded focus:border-brand-primary/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Enviar"
          className="rounded border border-brand-primary bg-brand-primary/15 p-1 text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-40"
        >
          <Send size={13} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
