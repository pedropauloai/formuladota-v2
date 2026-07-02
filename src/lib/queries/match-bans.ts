// Banimentos ligados a UMA partida — aviso público no placar do histórico
// (accountability: todos veem quem foi punido naquela partida e por quê).
// Lê via RPC match_bans() (SECURITY DEFINER, migration 098) — público.

import { createClient } from "@/lib/supabase/server";
import { PRINCIPLES, ANTIPATTERNS } from "@/lib/doctrine";

export interface MatchBan {
  userId: string;
  username: string | null;
  antipattern: string | null;
  principle: string | null;
  notes: string | null;
}

export async function getMatchBans(dotaMatchId: string): Promise<MatchBan[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("match_bans", { p_dota_match_id: dotaMatchId });
  const rows = (data ?? []) as {
    user_id: string;
    username: string | null;
    antipattern_violated: number | null;
    principle_violated: number | null;
    notes: string | null;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    antipattern:
      r.antipattern_violated != null
        ? ANTIPATTERNS.find((a) => a.id === r.antipattern_violated)?.title ?? null
        : null,
    principle:
      r.principle_violated != null
        ? PRINCIPLES.find((p) => p.id === r.principle_violated)?.title ?? null
        : null,
    notes: r.notes,
  }));
}
