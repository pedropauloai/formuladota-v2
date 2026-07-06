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
  lhSeries,
} from "@/lib/dota/match-stats";
import {
  parseBoots,
  parseImportant,
  parseNeutral,
  parseSkills,
} from "@/lib/dota/match-build";
import { parsePlayerWards, type Ward } from "@/lib/dota/match-vision";
import { type PlayerSeries, colorFor } from "@/lib/dota/match-series";
import { assignRolesByNetWorth, positionToRole, type PlayerRole } from "@/lib/mmr";

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
  mmr_change: number | null;
  raw_opendota: RawOD | null;
}

export interface Identity {
  persona: string | null;
  avatar_url: string | null;
  username: string | null;
  /** Nível da conta FormulaDota (identidade). */
  level?: number | null;
  /** Progresso 0..1 do nível atual — pro anel de XP preencher. */
  xpPct?: number | null;
  /** MMR FormulaDota da temporada ativa (identidade). */
  mmr?: number | null;
  /** Colocação 1-based na season — pra medalha de leaderboard (#N) igual ao /ranking. */
  position?: number | null;
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

export interface MatchView {
  players: PlayerFull[];
  advantage: AdvantageSeries;
  wards: Ward[];
  series: PlayerSeries[];
}

export function assembleMatch(
  rows: MatchPlayerRow[],
  identityById: Map<string, Identity>,
  /** Posições 1-5 ATRIBUÍDAS no matchmaking (lobby_players.role), por user_id.
   *  Fonte CORRETA da role — net worth é só fallback pra quem não tem atribuição. */
  assignedPos: Map<string, number> = new Map()
): MatchView {
  const radiantUnits = unitMap(rows, "radiant");
  const direUnits = unitMap(rows, "dire");

  // FALLBACK por net worth (usado só quando não há role atribuída).
  const nwRoles = assignRolesByNetWorth(rows.map((r) => ({ team: r.team, netWorth: r.net_worth })));
  const nwPos = new Map<MatchPlayerRow, number>();
  for (const team of ["radiant", "dire"] as const) {
    rows
      .filter((r) => r.team === team)
      .sort((a, b) => b.net_worth - a.net_worth)
      .forEach((r, i) => nwPos.set(r, i + 1));
  }
  // Função/posição = role ATRIBUÍDA (assignedPos) quando existe; senão fallback NW.
  const roleByIndex = new Map<MatchPlayerRow, PlayerRole>();
  const posByRow = new Map<MatchPlayerRow, number>();
  rows.forEach((r, i) => {
    const assigned = r.user_id ? assignedPos.get(r.user_id) : undefined;
    posByRow.set(r, assigned ?? nwPos.get(r) ?? 1);
    roleByIndex.set(r, assigned ? positionToRole(assigned) : nwRoles[i] ?? "core");
  });

  const wards: Ward[] = [];
  const series: PlayerSeries[] = [];

  const players: PlayerFull[] = rows.map((r) => {
    const id = r.user_id ? identityById.get(r.user_id) : undefined;
    const hero = getHeroById(r.hero_id);
    const raw: RawOD = r.raw_opendota ?? {};
    const enemyMap = r.team === "radiant" ? direUnits : radiantUnits;
    const inv = (r.items?.inventory ?? []).map((x) => x ?? 0);
    const heroName = hero?.name_pt ?? `Herói ${r.hero_id}`;
    const heroIcon = hero?.image_icon ?? null;
    const slot = teamSlot(r);
    const perf = parsePerformance(raw);

    // Coleta wards (minimapa) e série temporal (gráficos) deste jogador.
    wards.push(...parsePlayerWards(raw, r.team, heroName, heroIcon));
    series.push({
      name: heroName,
      heroIcon,
      team: r.team,
      color: colorFor(r.team, slot),
      gold: goldSeries(raw),
      xp: xpSeries(raw),
      lh: lhSeries(raw),
    });

    return {
      // identidade + herói (ScoreboardPlayer)
      userId: r.user_id,
      name: id?.username || id?.persona || r.personaname || "Jogador anônimo",
      avatar: id?.avatar_url || null,
      profileHref: r.user_id ? `/perfil/u/${r.user_id}` : null,
      heroName,
      // Imagem OFICIAL do CDN (landscape), não o corte portrait.
      heroPortrait: hero?.image_full ?? null,
      level: r.level, // nível do herói na partida
      accountLevel: id?.level ?? 1, // nível da conta (identidade)
      accountXpPct: id?.xpPct ?? 0, // progresso do nível → anel de XP

      mmr: id?.mmr ?? null, // MMR FormulaDota (identidade)
      position: id?.position ?? null, // colocação na season (medalha de leaderboard #N)
      role: roleByIndex.get(r) ?? "core", // função (core/support) por net worth
      positionSlot: posByRow.get(r) ?? 1, // posição 1-5 (ícone da role específica)
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
      slot,
      heroId: r.hero_id,
      heroIcon,
      isWinner: r.is_winner,
      performance: perf,
      combat: parseCombat(raw),
      vision: parseVision(raw),
      benchmarks: parseBenchmarks(raw),
      boots: parseBoots(raw),
      importantItems: parseImportant(raw),
      neutralItem: parseNeutral(r.items?.neutral ?? null),
      skills: parseSkills(raw),
      teamfightPct: perf.teamfightPct,
      mmrChange: r.mmr_change ?? null,
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

  return { players, advantage, wards, series };
}
