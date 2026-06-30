// Parsers de dados NÍVEL-PARTIDA (match_details): objetivos (torres/roshan),
// teamfights e draft (picks_bans). Tudo puro e serializável.

import { getHeroById } from "@/lib/queries/heroes";

type Team = "radiant" | "dire";

// ---------------------------------------------------------------------------
// Objetivos (timeline de torres, barracas, roshan, first blood)
// ---------------------------------------------------------------------------
export interface ObjectiveEvent {
  min: number;
  /** Time que REALIZOU o objetivo (destruiu a estrutura / matou roshan). */
  team: Team | null;
  kind: "tower" | "barracks" | "roshan" | "firstblood" | "aegis";
  text: string;
}

const LANE_PT: Record<string, string> = { top: "topo", mid: "meio", bot: "base" };

// "npc_dota_badguys_tower1_top" → estrutura do dire (destruída pelos Iluminados).
function parseBuilding(key: string): { team: Team; kind: "tower" | "barracks"; text: string } | null {
  const owner: Team | null = key.includes("badguys")
    ? "dire"
    : key.includes("goodguys")
      ? "radiant"
      : null;
  if (!owner) return null;
  const destroyer: Team = owner === "dire" ? "radiant" : "dire";

  const tower = key.match(/tower(\d)_?(top|mid|bot)?/);
  if (tower) {
    const tier = tower[1];
    const lane = tower[2] ? ` (${LANE_PT[tower[2]] ?? tower[2]})` : "";
    return { team: destroyer, kind: "tower", text: `Torre T${tier}${lane}` };
  }
  if (/rax|barracks/.test(key)) {
    const lane = key.match(/top|mid|bot/);
    const type = key.includes("melee") ? "corpo-a-corpo" : key.includes("range") ? "à distância" : "";
    return {
      team: destroyer,
      kind: "barracks",
      text: `Barraca ${type}${lane ? ` (${LANE_PT[lane[0]] ?? lane[0]})` : ""}`.trim(),
    };
  }
  if (/fort/.test(key)) {
    return { team: destroyer, kind: "barracks", text: "Trono" };
  }
  return null;
}

export function parseObjectives(raw: unknown): ObjectiveEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: ObjectiveEvent[] = [];
  for (const o of raw) {
    const e = o as { time?: number; type?: string; key?: string; team?: number; player_slot?: number };
    const min = typeof e.time === "number" ? Math.round(e.time / 60) : 0;
    if (e.type === "building_kill" && typeof e.key === "string") {
      const b = parseBuilding(e.key);
      if (b) out.push({ min, team: b.team, kind: b.kind, text: b.text });
    } else if (e.type === "CHAT_MESSAGE_ROSHAN_KILL") {
      // team 2 = radiant, 3 = dire
      const team: Team | null = e.team === 2 ? "radiant" : e.team === 3 ? "dire" : null;
      out.push({ min, team, kind: "roshan", text: "Roshan abatido" });
    } else if (e.type === "CHAT_MESSAGE_FIRSTBLOOD") {
      const team: Team | null =
        typeof e.player_slot === "number" ? (e.player_slot < 128 ? "radiant" : "dire") : null;
      out.push({ min, team, kind: "firstblood", text: "First Blood" });
    } else if (e.type === "CHAT_MESSAGE_AEGIS_STOLEN" || e.type === "CHAT_MESSAGE_AEGIS") {
      out.push({ min, team: null, kind: "aegis", text: "Aegis pego" });
    }
  }
  return out.sort((a, b) => a.min - b.min);
}

// ---------------------------------------------------------------------------
// Teamfights (cada confronto: tempo, mortes, saldo de ouro/XP por time)
// ---------------------------------------------------------------------------
export interface TeamfightView {
  startMin: number;
  endMin: number;
  deaths: number;
  radiantGold: number;
  direGold: number;
  radiantXp: number;
  direXp: number;
}

export function parseTeamfights(raw: unknown): TeamfightView[] {
  if (!Array.isArray(raw)) return [];
  const out: TeamfightView[] = [];
  for (const f of raw) {
    const tf = f as {
      start?: number;
      end?: number;
      deaths?: number;
      players?: { gold_delta?: number; xp_delta?: number }[];
    };
    const players = Array.isArray(tf.players) ? tf.players : [];
    let rg = 0, dg = 0, rx = 0, dx = 0;
    players.forEach((p, i) => {
      const radiant = i < 5; // 0..4 = radiant, 5..9 = dire
      const g = p.gold_delta ?? 0;
      const x = p.xp_delta ?? 0;
      if (radiant) { rg += g; rx += x; } else { dg += g; dx += x; }
    });
    out.push({
      startMin: Math.round((tf.start ?? 0) / 60),
      endMin: Math.round((tf.end ?? 0) / 60),
      deaths: tf.deaths ?? 0,
      radiantGold: rg,
      direGold: dg,
      radiantXp: rx,
      direXp: dx,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Draft (picks/bans)
// ---------------------------------------------------------------------------
export interface DraftPick {
  isPick: boolean;
  order: number;
  heroName: string;
  heroIcon: string | null;
}

export function parseDraft(raw: unknown): { radiant: DraftPick[]; dire: DraftPick[] } {
  const radiant: DraftPick[] = [];
  const dire: DraftPick[] = [];
  if (!Array.isArray(raw)) return { radiant, dire };
  for (const p of raw) {
    const pb = p as { is_pick?: boolean; hero_id?: number; team?: number; order?: number };
    const hero = getHeroById(pb.hero_id ?? 0);
    const pick: DraftPick = {
      isPick: pb.is_pick === true,
      order: pb.order ?? 0,
      heroName: hero?.name_pt ?? `Herói ${pb.hero_id}`,
      heroIcon: hero?.image_icon ?? null,
    };
    // team 0 = radiant, 1 = dire
    if (pb.team === 0) radiant.push(pick);
    else if (pb.team === 1) dire.push(pick);
  }
  const byOrder = (a: DraftPick, b: DraftPick) => a.order - b.order;
  return { radiant: radiant.sort(byOrder), dire: dire.sort(byOrder) };
}
