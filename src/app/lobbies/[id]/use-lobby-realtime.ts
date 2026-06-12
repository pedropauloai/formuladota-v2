"use client";

// useLobbyRealtime — assina mudanças da sala via Supabase Realtime.
// Qualquer INSERT/UPDATE/DELETE em lobby_players (deste lobby) ou UPDATE na
// própria lobbies dispara onChange → caller re-fetcha o estado da sala.
// Latência típica de push: 100-300ms (vs. "só atualiza quando EU mexo" antes).
//
// Cleanup automático ao desmontar/trocar de sala. Eventos da PRÓPRIA ação
// chegam também — refetch duplicado é barato e idempotente (setState igual).

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLobbyRealtime(lobbyId: string, onChange: () => void) {
  // ref evita re-assinar o canal quando o caller recria o callback por render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`lobby-room-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => onChangeRef.current()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobbies",
          filter: `id=eq.${lobbyId}`,
        },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);
}
