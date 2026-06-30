"use client";
// Janela de conversa 1-1 (estilo Steam, ancorada bottom-right) — pacote social
// 2026-06-30. Abre via openConversation (cria/pega a conversa + histórico),
// escuta mensagens novas via realtime e envia com append otimista (dedup por id).

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Send, Loader2, Minus } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import {
  openConversation,
  sendDirectMessage,
  markConversationRead,
} from "@/actions/messages";
import { useDmMessages } from "@/lib/realtime/use-dm-realtime";
import type { DmMessage } from "@/lib/queries/messages";

interface Props {
  currentUserId: string;
  otherUserId: string;
  otherName: string;
  otherAvatar: string | null;
  minimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  /** Avisa o dock que a conversa foi resolvida (pra contagem de não-lidas). */
  onResolved?: (conversationId: string) => void;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatWindow({
  currentUserId,
  otherUserId,
  otherName,
  otherAvatar,
  minimized,
  onToggleMinimize,
  onClose,
  onResolved,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve a conversa + histórico no mount.
  useEffect(() => {
    let active = true;
    void openConversation(otherUserId).then((res) => {
      if (!active) return;
      if (res.success) {
        setConversationId(res.conversationId);
        setMessages(res.messages);
        onResolved?.(res.conversationId);
      } else {
        setErrored(true);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  // Append realtime (dedup por id — minha própria msg já entrou otimista).
  useDmMessages(conversationId, (m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    if (!minimized && m.senderId !== currentUserId && conversationId) {
      void markConversationRead(conversationId);
    }
  });

  // Auto-scroll pro fim quando chega/entra mensagem (se não minimizado).
  useEffect(() => {
    if (!minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, minimized]);

  function handleSend() {
    const body = draft.trim();
    if (!body || !conversationId) return;
    setDraft("");
    startTransition(async () => {
      const res = await sendDirectMessage({ conversationId, body });
      if (res.success) {
        setMessages((prev) =>
          prev.some((x) => x.id === res.message.id) ? prev : [...prev, res.message]
        );
      } else {
        setDraft(body); // devolve o texto se falhou
      }
    });
  }

  return (
    <div className="pointer-events-auto flex w-[300px] flex-col overflow-hidden rounded-t-md border border-b-0 border-brand-primary/40 bg-bg-deep/95 backdrop-blur-md shadow-2xl shadow-black/70">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-elevated/60 px-2.5 py-2">
        <UserAvatar
          src={otherAvatar ?? undefined}
          alt={`Avatar de ${otherName}`}
          fallback={otherName.slice(0, 2).toUpperCase()}
          size="sm"
        />
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex-1 min-w-0 text-left"
          aria-label={minimized ? `Abrir chat com ${otherName}` : `Minimizar chat com ${otherName}`}
        >
          <p className="truncate font-display text-[13px] font-semibold text-text-display">
            {otherName}
          </p>
        </button>
        <button
          type="button"
          onClick={onToggleMinimize}
          aria-label="Minimizar"
          className="p-1 text-text-faded hover:text-text-display"
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar chat"
          className="p-1 text-text-faded hover:text-error"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {!minimized && (
        <>
          {/* Mensagens */}
          <div ref={scrollRef} className="h-[300px] overflow-y-auto px-2.5 py-2 space-y-1.5">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 size={18} className="animate-spin text-text-faded" aria-hidden="true" />
              </div>
            ) : errored ? (
              <p className="px-2 py-4 text-center font-display text-[13px] text-text-faded">
                Só dá pra conversar com amigos aceitos.
              </p>
            ) : messages.length === 0 ? (
              <p className="px-2 py-4 text-center font-display text-[13px] text-text-faded">
                Diga oi pra {otherName}.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-md px-2.5 py-1.5 ${
                        mine
                          ? "bg-brand-primary/20 border border-brand-primary/30"
                          : "bg-bg-elevated border border-border-subtle"
                      }`}
                    >
                      <p className="font-sans text-[13px] text-text-body break-words whitespace-pre-wrap">
                        {m.body}
                      </p>
                      <p className="mt-0.5 text-right font-display text-[10px] text-text-faded tabular-nums">
                        {timeLabel(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border-subtle p-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading || errored}
              maxLength={2000}
              placeholder="Mensagem..."
              aria-label={`Mensagem para ${otherName}`}
              className="flex-1 min-w-0 rounded border border-border-subtle bg-bg-base px-2.5 py-1.5 font-sans text-[13px] text-text-body placeholder:text-text-faded focus:border-brand-primary/60 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading || errored}
              aria-label="Enviar"
              className="rounded border border-brand-primary bg-brand-primary/15 p-1.5 text-brand-primary hover:bg-brand-primary/25 transition-colors disabled:opacity-40"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
