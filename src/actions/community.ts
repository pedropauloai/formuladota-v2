"use server";

// Contadores públicos da comunidade (online + banidos) pro topbar estilo GamersClub.
// RPC community_counters (migration 096) — só agregados, sem PII. Chamado no SSR do
// shell e em polling leve pelo componente client (CommunityCounters).

import { createClient } from "@/lib/supabase/server";

export interface CommunityCounters {
  online: number;
  banned: number;
}

export async function getCommunityCounters(): Promise<CommunityCounters> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("community_counters");
  const d = (data ?? {}) as { online?: number; banned?: number };
  return { online: d.online ?? 0, banned: d.banned ?? 0 };
}
