"use client";
// Realtime de mensagens diretas (pacote social 2026-06-30).
//   - useDmMessages: assina UMA conversa (filtro conversation_id) → append no chat.
//   - useDmInboxSignal: assina TODAS as minhas mensagens (RLS do stream entrega só
//     as conversas em que sou membro) → dispara refetch do inbox/badge.
//
// Padrões (RESEARCH): callback em useRef (não re-assina o canal a cada render);
// cleanup obrigatório removeChannel; payload tratado como gatilho/append.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DmMessage } from "@/lib/queries/messages";

interface DmRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Mensagens novas de UMA conversa específica. */
export function useDmMessages(
  conversationId: string | null,
  onMessage: (m: DmMessage) => void
) {
  const cbRef = useRef(onMessage);
  useEffect(() => {
    cbRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const r = payload.new as DmRow;
          cbRef.current({
            id: r.id,
            conversationId: r.conversation_id,
            senderId: r.sender_id,
            body: r.body,
            createdAt: r.created_at,
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);
}

/**
 * Sinaliza quando QUALQUER mensagem nova chega numa das minhas conversas (a RLS
 * do stream entrega só as que sou membro). Passa o sender pra decidir badge.
 */
export function useDmInboxSignal(
  enabled: boolean,
  onInsert: (senderId: string, conversationId: string) => void
) {
  const cbRef = useRef(onInsert);
  useEffect(() => {
    cbRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel("dm-inbox-signal")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload) => {
          const r = payload.new as DmRow;
          cbRef.current(r.sender_id, r.conversation_id);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
