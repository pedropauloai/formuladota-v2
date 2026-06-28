"use client";

// useQueueStatusRealtime — push do status da PRÓPRIA entry na fila (match_queue).
//
// Padrão copiado de use-pro-queue-realtime: qualquer INSERT/UPDATE/DELETE na
// match_queue do user (filter user_id=eq.<userId>) dispara onChange → o caller
// refetcha getQueueStatus. Cobre: partida formada (status matched, via
// try_form_match) e fila cancelada (admin/usuário). RLS self garante que cada
// cliente só recebe push da própria linha. match_queue entra na publication na 061.
//
// Passar userId=null (visitante / ainda carregando) deixa o hook no-op.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useQueueStatusRealtime(
  userId: string | null,
  onChange: () => void
) {
  // ref evita re-assinar o canal quando o caller recria o callback por render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_queue",
          filter: `user_id=eq.${userId}`,
        },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
