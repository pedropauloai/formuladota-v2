// Leaderboard de Imortais — acima do piso Imortal (5620) o que vale é a POSIÇÃO,
// não o número (Pedro 2026-07-02). Cada Imortal tem um lugar (#N) na temporada
// ativa; os TOP IMMORTAL_ELITE_TOP ganham a medalha vermelha (elite).

import { createClient } from "@/lib/supabase/server";
import { IMMORTAL_FLOOR, IMMORTAL_ELITE_TOP } from "@/lib/mmr";

export interface ImmortalRank {
  /** Posição 1-based entre os Imortais da temporada (1 = melhor). */
  position: number;
  /** Total de Imortais na temporada. */
  total: number;
  /** Está no elite (top N) → medalha vermelha. */
  elite: boolean;
}

/**
 * Posição do jogador no leaderboard de Imortais da temporada ATIVA.
 * `null` se não há temporada, o jogador não tem MMR ou está abaixo do piso Imortal.
 */
export async function getImmortalRank(userId: string): Promise<ImmortalRank | null> {
  const supabase = await createClient();
  const seasonRes = await supabase
    .from("seasons")
    .select("id")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const seasonId = seasonRes.data?.id;
  if (!seasonId) return null;

  const meRes = await supabase
    .from("player_season_mmr")
    .select("mmr")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .maybeSingle();
  const mmr = meRes.data?.mmr;
  if (mmr == null || mmr < IMMORTAL_FLOOR) return null;

  // Posição = 1 + quantos Imortais têm MMR ESTRITAMENTE maior (empate → mesma faixa,
  // desempata pra cima). Total = todos os Imortais da temporada.
  const [aheadRes, totalRes] = await Promise.all([
    supabase
      .from("player_season_mmr")
      .select("user_id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .gt("mmr", mmr),
    supabase
      .from("player_season_mmr")
      .select("user_id", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .gte("mmr", IMMORTAL_FLOOR),
  ]);

  const position = (aheadRes.count ?? 0) + 1;
  const total = totalRes.count ?? 0;
  return { position, total, elite: position <= IMMORTAL_ELITE_TOP };
}
