"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

// Cliente Supabase para componentes "use client" no browser.
// Usa anon key — RLS policies do banco protegem os dados.
//
// SINGLETON (2026-06-30): antes cada chamada criava um client NOVO (e uma conexão
// de realtime nova, sem auth). Isso quebrava a entrega realtime cross-usuário —
// a RLS de postgres_changes via auth.uid() nulo e não entregava eventos a outros.
// Agora há UMA instância compartilhada; o token de realtime é setado por
// RealtimeAuthSync (montado no layout) e vale pra todos os canais.
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return browserClient;
}
