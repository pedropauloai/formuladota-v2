// Agregado das partidas FORMULADOTA de um jogador (match_players, leitura pública).
// Base do hexágono "FormulaDota" — comparável ao hexágono "Conta geral" (STRATZ),
// pois usa as MESMAS métricas por partida.

import { createClient } from "@/lib/supabase/server";

export interface FdotaProfileStats {
  matches: number;
  wins: number;
  losses: number;
  avgKDA: number;
  avgGPM: number;
  avgXPM: number;
  avgLastHits: number;
  avgHeroDamage: number;
}

interface Row {
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  hero_damage: number;
  is_winner: boolean;
}

export async function getFormulaDotaProfileStats(
  userId: string
): Promise<FdotaProfileStats | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_players")
    .select("kills, deaths, assists, gold_per_min, xp_per_min, last_hits, hero_damage, is_winner")
    .eq("user_id", userId);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const n = rows.length;
  const sum = rows.reduce(
    (a, r) => ({
      kda: a.kda + (r.kills + r.assists) / Math.max(1, r.deaths),
      gpm: a.gpm + r.gold_per_min,
      xpm: a.xpm + r.xp_per_min,
      lh: a.lh + r.last_hits,
      dmg: a.dmg + r.hero_damage,
      wins: a.wins + (r.is_winner ? 1 : 0),
    }),
    { kda: 0, gpm: 0, xpm: 0, lh: 0, dmg: 0, wins: 0 }
  );

  return {
    matches: n,
    wins: sum.wins,
    losses: n - sum.wins,
    avgKDA: Number((sum.kda / n).toFixed(2)),
    avgGPM: Number((sum.gpm / n).toFixed(1)),
    avgXPM: Number((sum.xpm / n).toFixed(1)),
    avgLastHits: Number((sum.lh / n).toFixed(1)),
    avgHeroDamage: Number((sum.dmg / n).toFixed(0)),
  };
}
