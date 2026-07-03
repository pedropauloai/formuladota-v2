// Parser de MAPA DE CALOR de posição — extrai o `lane_pos` do raw_opendota (contagem
// de presença por célula do mapa durante a fase de rota) e converte em pontos
// percentuais sobre o minimapa, com intensidade normalizada 0..1.
//
// Fonte: OpenDota `lane_pos` = { x: { y: count } } em coordenadas de mundo (~64..192).
// É a MESMA base dos heatmaps do STRATZ/OpenDota. Cobre principalmente a laning phase
// (primeiros ~10 min), não a partida inteira — por isso o rótulo "fase de rota".

import type { RawOD } from "@/lib/dota/match-stats";
import { gameCoordToPct } from "@/lib/dota/match-vision";

export interface HeatCell {
  /** Posição percentual (0..100) sobre o minimapa. */
  leftPct: number;
  topPct: number;
  /** Intensidade relativa 0..1 (célula mais visitada = 1). */
  intensity: number;
}

export interface PlayerHeatmap {
  /** user_id da plataforma (null = jogador de fora). */
  userId: string | null;
  /** player_slot (chave estável mesmo sem user_id). */
  slot: number;
  team: "radiant" | "dire";
  /** Nome do jogador (identidade) — usado no seletor. */
  playerName: string;
  heroName: string;
  heroIcon: string | null;
  cells: HeatCell[];
  /** true se há dados (partida parseada com lane_pos). */
  hasData: boolean;
}

/**
 * Converte o lane_pos de um jogador em células do minimapa. Normaliza a intensidade
 * pela célula mais visitada (a lane costuma dominar). Retorna [] se não parseado.
 */
export function parsePlayerHeatmap(raw: RawOD | null | undefined): HeatCell[] {
  const lanePos = (raw as { lane_pos?: unknown } | null | undefined)?.lane_pos;
  if (!lanePos || typeof lanePos !== "object") return [];

  const raws: { leftPct: number; topPct: number; count: number }[] = [];
  let maxCount = 0;
  for (const [xStr, col] of Object.entries(lanePos as Record<string, unknown>)) {
    const x = Number(xStr);
    if (!Number.isFinite(x) || !col || typeof col !== "object") continue;
    for (const [yStr, cRaw] of Object.entries(col as Record<string, unknown>)) {
      const y = Number(yStr);
      const count = typeof cRaw === "number" ? cRaw : Number(cRaw);
      if (!Number.isFinite(y) || !Number.isFinite(count) || count <= 0) continue;
      const { leftPct, topPct } = gameCoordToPct(x, y);
      raws.push({ leftPct, topPct, count });
      if (count > maxCount) maxCount = count;
    }
  }
  if (maxCount === 0) return [];

  // Normaliza com raiz quadrada: comprime o pico (uma célula de 30 não apaga as de 1)
  // e deixa o rastro de movimento visível — padrão de heatmap.
  return raws.map((r) => ({
    leftPct: r.leftPct,
    topPct: r.topPct,
    intensity: Math.sqrt(r.count / maxCount),
  }));
}
