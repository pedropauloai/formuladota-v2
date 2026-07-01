"use client";
// Realtime do canal de chat da SALA (lobby_messages) — pacote fidelidade Dota 2.
// Dispara onChange no INSERT (filtro lobby_id); o caller re-busca o histórico
// (o payload não traz o nome do remetente). Cleanup removeChannel.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLobbyMessages(lobbyId: string | null, onChange: () => void) {
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!lobbyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`lobby-chat-${lobbyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lobby_messages", filter: `lobby_id=eq.${lobbyId}` },
        () => cbRef.current()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);
}
