// Parsers PUROS do objeto OpenDota por jogador (match_players.raw_opendota, 143 campos)
// → view-models serializáveis por aba do placar. Sem efeitos, sem fetch — só leitura.
// A resolução de ícones de build (itens/skills) fica em match-build.ts.

import type { ScoreboardPlayer } from "@/components/match/match-scoreboard";

// Objeto bruto OpenDota — permissivo; lemos via helpers tipados abaixo.
export type RawOD = Record<string, unknown>;

// Roles de lane do OpenDota (lane_role 1..4) → nome PT.
const LANE_ROLE_PT: Record<number, string> = {
  1: "Rota segura",
  2: "Meio",
  3: "Rota difícil",
  4: "Selva",
};

// -------- leitores tipados (defensivos: dados podem faltar em partidas antigas) --------
function num(r: RawOD, key: string): number {
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function numOrNull(r: RawOD, key: string): number | null {
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function numArr(r: RawOD, key: string): number[] {
  const v = r[key];
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}
function objRec(r: RawOD, key: string): Record<string, number> {
  const v = r[key];
  if (!v || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "number") out[k] = val;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tipos de view-model por aba
// ---------------------------------------------------------------------------
export interface BenchRow {
  label: string;
  raw: number;
  /** Percentil 0..1 (posição vs a base de partidas OpenDota). */
  pct: number;
}

export interface PerformanceStats {
  laneName: string | null;
  isRoaming: boolean;
  laneEfficiencyPct: number | null;
  teamfightPct: number | null; // 0..1
  apm: number | null;
  neutralKills: number;
  ancientKills: number;
  roshanKills: number;
  towerKills: number;
  courierKills: number;
  runePickups: number;
  buybackCount: number;
  campsStacked: number;
  creepsStacked: number;
  stuns: number;
}

export interface CombatStats {
  heroDamage: number;
  damageTaken: number;
  heroHealing: number;
  maxHeroHit: number;
  heroHits: number;
  bestMultiKill: number;
  bestKillStreak: number;
}

export interface VisionStats {
  obsPlaced: number;
  senPlaced: number;
  observerKills: number;
  sentryKills: number;
}

export interface BuildPurchase {
  t: number; // segundos (negativo = pré-jogo)
  img: string | null;
  dname: string;
}
export interface BuildSkill {
  img: string | null;
  dname: string;
  talent: boolean;
}

// Jogador completo que alimenta TODAS as abas (Overview reusa ScoreboardPlayer).
export interface PlayerFull extends ScoreboardPlayer {
  team: "radiant" | "dire";
  slot: number; // 0..4 dentro do time (índice pra matriz de abates)
  heroId: number;
  heroIcon: string | null;
  isWinner: boolean;
  performance: PerformanceStats;
  combat: CombatStats;
  vision: VisionStats;
  benchmarks: BenchRow[];
  purchases: BuildPurchase[];
  skills: BuildSkill[];
  /** Abates contra cada inimigo (índice = slot 0..4 do time adversário). */
  killsVsEnemies: number[];
}

// ---------------------------------------------------------------------------
// Extratores por jogador
// ---------------------------------------------------------------------------
export function parsePerformance(r: RawOD): PerformanceStats {
  const laneRole = num(r, "lane_role");
  return {
    laneName: LANE_ROLE_PT[laneRole] ?? null,
    isRoaming: r["is_roaming"] === true,
    laneEfficiencyPct: numOrNull(r, "lane_efficiency_pct"),
    teamfightPct: numOrNull(r, "teamfight_participation"),
    apm: numOrNull(r, "actions_per_min"),
    neutralKills: num(r, "neutral_kills"),
    ancientKills: num(r, "ancient_kills"),
    roshanKills: num(r, "roshan_kills") || num(r, "roshans_killed"),
    towerKills: num(r, "tower_kills") || num(r, "towers_killed"),
    courierKills: num(r, "courier_kills"),
    runePickups: num(r, "rune_pickups"),
    buybackCount: num(r, "buyback_count"),
    campsStacked: num(r, "camps_stacked"),
    creepsStacked: num(r, "creeps_stacked"),
    stuns: Math.round(num(r, "stuns")),
  };
}

export function parseCombat(r: RawOD): CombatStats {
  const dmgTaken = objRec(r, "damage_taken");
  const damageTaken = Object.values(dmgTaken).reduce((a, b) => a + b, 0);
  const maxHit = r["max_hero_hit"];
  const maxHeroHit =
    maxHit && typeof maxHit === "object" ? num(maxHit as RawOD, "value") : 0;
  const multi = objRec(r, "multi_kills");
  const bestMultiKill = Object.keys(multi).reduce((m, k) => Math.max(m, Number(k) || 0), 0);
  const streaks = objRec(r, "kill_streaks");
  const bestKillStreak = Object.keys(streaks).reduce((m, k) => Math.max(m, Number(k) || 0), 0);
  return {
    heroDamage: num(r, "hero_damage"),
    damageTaken,
    heroHealing: num(r, "hero_healing"),
    maxHeroHit,
    heroHits: num(r, "hero_hits"),
    bestMultiKill,
    bestKillStreak,
  };
}

export function parseVision(r: RawOD): VisionStats {
  return {
    obsPlaced: num(r, "obs_placed") || num(r, "observers_placed"),
    senPlaced: num(r, "sen_placed"),
    observerKills: num(r, "observer_kills"),
    sentryKills: num(r, "sentry_kills"),
  };
}

const BENCH_META: { key: string; label: string }[] = [
  { key: "gold_per_min", label: "GPM" },
  { key: "xp_per_min", label: "XPM" },
  { key: "kills_per_min", label: "Kills/min" },
  { key: "last_hits_per_min", label: "LH/min" },
  { key: "hero_damage_per_min", label: "Dano/min" },
  { key: "hero_healing_per_min", label: "Cura/min" },
  { key: "tower_damage", label: "Dano a torres" },
];

export function parseBenchmarks(r: RawOD): BenchRow[] {
  const b = r["benchmarks"];
  if (!b || typeof b !== "object") return [];
  const bench = b as Record<string, { raw?: number; pct?: number }>;
  return BENCH_META.map(({ key, label }) => {
    const entry = bench[key];
    return {
      label,
      raw: typeof entry?.raw === "number" ? Math.round(entry.raw) : 0,
      pct: typeof entry?.pct === "number" ? entry.pct : 0,
    };
  });
}

// Abates contra cada herói adversário, via kills_log (key = unidade do herói morto).
// enemyUnitToSlot mapeia "npc_dota_hero_x" → slot 0..4 do time adversário.
export function parseKillsVsEnemies(
  r: RawOD,
  enemyUnitToSlot: Map<string, number>
): number[] {
  const out = [0, 0, 0, 0, 0];
  const log = r["kills_log"];
  if (!Array.isArray(log)) return out;
  for (const e of log) {
    const key = (e as { key?: unknown })?.key;
    if (typeof key !== "string") continue;
    const slot = enemyUnitToSlot.get(key);
    if (slot != null && slot >= 0 && slot < 5) out[slot] = (out[slot] ?? 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Agregados de nível-partida (precisam de TODOS os jogadores)
// ---------------------------------------------------------------------------
export interface AdvantageSeries {
  /** Marcas de tempo em minutos (0,1,2,…). */
  minutes: number[];
  /** Vantagem de ouro Iluminados−Temidos por minuto. */
  goldAdv: number[];
  /** Vantagem de XP Iluminados−Temidos por minuto. */
  xpAdv: number[];
}

// Reconstrói a vantagem de ouro/XP somando as séries por time (radiant − dire).
// OpenDota amostra a cada 60s; usamos o menor comprimento comum por segurança.
export function buildAdvantage(
  players: { team: "radiant" | "dire"; goldT: number[]; xpT: number[] }[]
): AdvantageSeries {
  const lens = players.flatMap((p) => [p.goldT.length, p.xpT.length]).filter((n) => n > 0);
  const len = lens.length ? Math.min(...lens) : 0;
  const minutes: number[] = [];
  const goldAdv: number[] = [];
  const xpAdv: number[] = [];
  for (let i = 0; i < len; i++) {
    let g = 0;
    let x = 0;
    for (const p of players) {
      const sign = p.team === "radiant" ? 1 : -1;
      g += sign * (p.goldT[i] ?? 0);
      x += sign * (p.xpT[i] ?? 0);
    }
    minutes.push(i);
    goldAdv.push(g);
    xpAdv.push(x);
  }
  return { minutes, goldAdv, xpAdv };
}

export function goldSeries(r: RawOD): number[] {
  return numArr(r, "gold_t");
}
export function xpSeries(r: RawOD): number[] {
  return numArr(r, "xp_t");
}
