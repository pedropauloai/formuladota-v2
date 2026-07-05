"use server";

// Dados dos hovers do topbar: lista de quem está online + posições de season
// (numeração da medalha dos Imortais). Fetchados sob demanda quando o hover abre.

import { createClient } from "@/lib/supabase/server";

export interface OnlinePlayer {
  userId: string;
  name: string;
  avatar: string | null;
  mmr: number | null;
  level: number;
  /** Colocação 1-based na season (pro número na medalha). null = fora do ranking. */
  seasonPos: number | null;
}

export async function getOnlinePlayers(): Promise<OnlinePlayer[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("online_players" as never);
  const rows = (data ?? []) as {
    user_id: string;
    name: string;
    avatar: string | null;
    mmr: number | null;
    level: number;
    season_pos: number | null;
  }[];
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    avatar: r.avatar,
    mmr: r.mmr,
    level: r.level,
    seasonPos: r.season_pos,
  }));
}

/** Colocação de season (1-based) por user_id — pra numerar a medalha dos Imortais. */
export async function getSeasonPositions(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.rpc("season_positions" as never, { p_ids: userIds } as never);
  const rows = (data ?? []) as { user_id: string; pos: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.user_id] = r.pos;
  return out;
}
