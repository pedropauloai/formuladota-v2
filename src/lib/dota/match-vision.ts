// Parser de VISÃO — extrai wards (obs_log/sen_log) do raw_opendota e converte as
// coordenadas de mundo (x,y) em posição percentual sobre a imagem do minimapa.
//
// Sistema de coordenadas OpenDota: o mapa jogável ocupa [64, 192] em cada eixo
// (span de 128). Y é invertido (no jogo cresce pra cima; na imagem, pra baixo).

import type { RawOD } from "@/lib/dota/match-stats";

// Transform idêntico ao do OpenDota (gameCoordToUV): offset 64, grade 0..127,
// Y invertido (origem do jogo é embaixo-esquerda; da imagem é cima-esquerda).
// Usar a MESMA fórmula garante que os wards casem com a imagem minimap.jpg deles.
const MAP_MIN = 64;
const MAP_GRID = 127;

export interface Ward {
  /** Posição percentual (0..100) sobre o minimapa. */
  leftPct: number;
  topPct: number;
  /** true = observadora (visão); false = sentinela (anti-visão). */
  isObs: boolean;
  team: "radiant" | "dire";
  heroName: string;
  heroIcon: string | null;
  /** Minuto em que foi plantada. */
  placedMin: number;
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function toPct(x: number, y: number): { leftPct: number; topPct: number } {
  return {
    leftPct: clampPct(((x - MAP_MIN) / MAP_GRID) * 100),
    topPct: clampPct(((MAP_GRID - (y - MAP_MIN)) / MAP_GRID) * 100),
  };
}

function readLog(
  raw: RawOD,
  key: "obs_log" | "sen_log",
  isObs: boolean,
  team: "radiant" | "dire",
  heroName: string,
  heroIcon: string | null
): Ward[] {
  const log = raw[key];
  if (!Array.isArray(log)) return [];
  const out: Ward[] = [];
  for (const e of log) {
    const entry = e as { x?: unknown; y?: unknown; time?: unknown };
    if (typeof entry.x !== "number" || typeof entry.y !== "number") continue;
    const { leftPct, topPct } = toPct(entry.x, entry.y);
    out.push({
      leftPct,
      topPct,
      isObs,
      team,
      heroName,
      heroIcon,
      placedMin: typeof entry.time === "number" ? Math.round(entry.time / 60) : 0,
    });
  }
  return out;
}

/** Todos os wards de um jogador (observadoras + sentinelas). */
export function parsePlayerWards(
  raw: RawOD,
  team: "radiant" | "dire",
  heroName: string,
  heroIcon: string | null
): Ward[] {
  return [
    ...readLog(raw, "obs_log", true, team, heroName, heroIcon),
    ...readLog(raw, "sen_log", false, team, heroName, heroIcon),
  ];
}
