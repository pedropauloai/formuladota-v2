"use client";

// useProQueueRealtime — assina mudanças da fila do PRO via Supabase Realtime.
//
// Padrão copiado de use-lobby-realtime: qualquer INSERT/UPDATE/DELETE em
// coach_queue_entries (deste coach) dispara onChange → caller refetcha o
// snapshot (router.refresh). Cobre todas as transições relevantes:
//   aluno entra (INSERT waiting) · sai/é removido (UPDATE cancelled) ·
//   PT inicia (UPDATE in_match) · PT confirmada (UPDATE consumed via trigger).
//
// A tabela coach_queue_entries JÁ está na publication supabase_realtime —
// nenhuma migration necessária. Cleanup automático ao desmontar.

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProQueueRealtime(coachId: string, onChange: () => void) {
  // ref evita re-assinar o canal quando o caller recria o callback por render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pro-queue-${coachId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coach_queue_entries",
          filter: `coach_id=eq.${coachId}`,
        },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coachId]);
}
