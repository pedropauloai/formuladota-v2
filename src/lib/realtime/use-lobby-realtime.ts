"use client";
// Realtime do canal de chat da SALA (lobby_messages) — pacote fidelidade Dota 2.
// Dispara onChange no INSERT (filtro lobby_id); o caller re-busca o histórico
// (o payload não traz o nome do remetente). Cleanup removeChannel.

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLobbyMessages(lobbyId: string | null, onChange: () => void) {
  const uid = useId();
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!lobbyId) return;
    const supabase = createClient();
    // Nome ÚNICO por instância (useId) — evita colisão de canal (ChatBar + painel).
    const channel = supabase
      .channel(`lobby-chat-${lobbyId}-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lobby_messages", filter: `lobby_id=eq.${lobbyId}` },
        () => cbRef.current()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lobbyId, uid]);
}
