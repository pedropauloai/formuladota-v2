"use client";

// Escuta postgres_changes em coach_queue_entries e força refresh do router
// quando algum evento (insert/update/delete) dispara. UI atualiza sem
// precisar de revalidate periódico.
//
// Montado uma vez no root layout — listener compartilhado pra todas rotas.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function QueueRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coach_queue_entries",
        },
        () => {
          // Qualquer mudança força re-fetch dos Server Components da rota atual
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coaches",
        },
        () => {
          // Refresh também quando fila aberta/fechada (coaches.fila_aberta muda)
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
