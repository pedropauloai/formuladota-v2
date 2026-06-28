"use client";

// AdminLobbiesLive — atualização AO VIVO da lista de lobbies do admin.
//
// A página é server component (usa service client pra ver pending/bot_unavailable,
// que o RLS público do cliente não traria do mesmo jeito). Aqui assinamos
// lobbies postgres_changes e damos router.refresh() a cada mudança → o server
// component re-renderiza com dados frescos. Sem polling, sem mover a query pro
// cliente. Renderiza nada (só o efeito de assinatura).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminLobbiesLive() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-lobbies")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobbies" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
