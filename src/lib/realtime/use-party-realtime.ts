"use client";
// Realtime do sistema de PARTY (pacote social 2026-06-30).
//   - usePartyRealtime: mudanças em party_members / parties / match_queue da MINHA
//     party → refetch do snapshot (payload só tem ids; a view precisa de joins).
//   - usePartyMessages: chat do grupo (filtro party_id) → append.
//
// Padrões: callback em useRef; cleanup removeChannel; refetch via action.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface PartyMsgRow {
  id: string;
  party_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface PartyChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** Qualquer mudança estrutural na minha party (membros/líder/fila) → onChange. */
export function usePartyRealtime(partyId: string | null, onChange: () => void) {
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!partyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`party-${partyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` },
        () => cbRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parties", filter: `id=eq.${partyId}` },
        () => cbRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_queue", filter: `party_id=eq.${partyId}` },
        () => cbRef.current()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [partyId]);
}

/** Mensagens novas no chat do grupo. */
export function usePartyMessages(
  partyId: string | null,
  onMessage: (m: PartyChatMessage) => void
) {
  const cbRef = useRef(onMessage);
  useEffect(() => {
    cbRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!partyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`party-chat-${partyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "party_messages", filter: `party_id=eq.${partyId}` },
        (payload) => {
          const r = payload.new as PartyMsgRow;
          cbRef.current({
            id: r.id,
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
  }, [partyId]);
}
