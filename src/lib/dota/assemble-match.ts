// Monta o view-model COMPLETO do placar a partir das linhas de match_players
// (incluindo raw_opendota) + identidade resolvida. Server-side, puro.

import { getHeroById } from "@/lib/queries/heroes";
import {
  type RawOD,
  type PlayerFull,
  type AdvantageSeries,
  parsePerformance,
  parseCombat,
  parseVision,
  parseBenchmarks,
  parseKillsVsEnemies,
  buildAdvantage,
  goldSeries,
  xpSeries,
} from "@/lib/dota/match-stats";
import { parsePurchases, parseSkills } from "@/lib/dota/match-build";

export interface MatchPlayerRow {
  user_id: string | null;
  team: "radiant" | "dire";
  player_slot: number; // DB: radiant 0..4, dire 5..9
  is_winner: boolean;
  hero_id: number;
  personaname: string | null;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  net_worth: number;
  level: number;
  hero_damage: number;
  hero_healing: number;
  tower_damage: number;
  items: {
    inventory?: (number | null)[];
    neutral?: number | null;
  } | null;
  raw_opendota: RawOD | null;
}

export interface Identity {
  persona: string | null;
  avatar_url: string | null;
  username: string | null;
}

// Slot dentro do time (0..4) — alinha as duas metades pra matriz de abates.
function teamSlot(row: MatchPlayerRow): number {
  return row.team === "radiant" ? row.player_slot : row.player_slot - 5;
}

// Mapa "npc_dota_hero_<slug>" → slot do time, por time (pra matriz de abates).
function unitMap(rows: MatchPlayerRow[], team: "radiant" | "dire"): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows.filter((x) => x.team === team)) {
    const hero = getHeroById(r.hero_id);
    if (hero) m.set(`npc_dota_hero_${hero.slug}`, teamSlot(r));
  }
  return m;
}

export function assembleMatch(
  rows: MatchPlayerRow[],
  identityById: Map<string, Identity>
): { players: PlayerFull[]; advantage: AdvantageSeries } {
  const radiantUnits = unitMap(rows, "radiant");
  const direUnits = unitMap(rows, "dire");

  const players: PlayerFull[] = rows.map((r) => {
    const id = r.user_id ? identityById.get(r.user_id) : undefined;
    const hero = getHeroById(r.hero_id);
    const raw: RawOD = r.raw_opendota ?? {};
    const enemyMap = r.team === "radiant" ? direUnits : radiantUnits;
    const inv = (r.items?.inventory ?? []).map((x) => x ?? 0);

    return {
      // identidade + herói (ScoreboardPlayer)
      userId: r.user_id,
      name: id?.persona || id?.username || r.personaname || "Jogador anônimo",
      avatar: id?.avatar_url || null,
      profileHref: r.user_id ? `/perfil/u/${r.user_id}` : null,
      heroName: hero?.name_pt ?? `Herói ${r.hero_id}`,
      heroPortrait: hero?.portrait_url ?? null,
      level: r.level,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      lastHits: r.last_hits,
      denies: r.denies,
      gpm: r.gold_per_min,
      xpm: r.xp_per_min,
      netWorth: r.net_worth,
      heroDamage: r.hero_damage,
      towerDamage: r.tower_damage,
      heroHealing: r.hero_healing,
      inventory: inv,
      neutral: r.items?.neutral ?? null,
      // extras pra abas
      team: r.team,
      slot: teamSlot(r),
      heroId: r.hero_id,
      heroIcon: hero?.image_icon ?? null,
      isWinner: r.is_winner,
      performance: parsePerformance(raw),
      combat: parseCombat(raw),
      vision: parseVision(raw),
      benchmarks: parseBenchmarks(raw),
      purchases: parsePurchases(raw),
      skills: parseSkills(raw),
      killsVsEnemies: parseKillsVsEnemies(raw, enemyMap),
    };
  });

  const advantage = buildAdvantage(
    rows.map((r) => ({
      team: r.team,
      goldT: goldSeries(r.raw_opendota ?? {}),
      xpT: xpSeries(r.raw_opendota ?? {}),
    }))
  );

  return { players, advantage };
}
