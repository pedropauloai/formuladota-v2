// OpenDota API client — fetch + normalize de match data.
//
// Free tier sem chave: 60 req/min, suficiente pro MVP.
// Endpoint: https://api.opendota.com/api/matches/{match_id}
//
// Convenções OpenDota:
//   - player_slot 0..4 = Radiant (slots 0,1,2,3,4)
//   - player_slot 128..132 = Dire (mapeamos pra 5..9 no DB pra caber em CHECK < 10)
//   - radiant_win: boolean determina vencedor
//   - player.win: 1 ou 0 (já calculado pela API)
//   - itens: item_0..item_5 (inventário) + backpack_0..2 + item_neutral

const OPENDOTA_BASE = "https://api.opendota.com/api";

export interface OpenDotaPlayer {
  account_id: number | null; // null se anônimo
  player_slot: number;
  hero_id: number;
  hero_variant?: number;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  denies: number;
  level: number;
  net_worth: number;
  hero_damage: number;
  hero_healing: number;
  tower_damage: number;
  win: 0 | 1;
  personaname?: string;
  item_0: number;
  item_1: number;
  item_2: number;
  item_3: number;
  item_4: number;
  item_5: number;
  backpack_0: number;
  backpack_1: number;
  backpack_2: number;
  item_neutral: number;
}

export interface OpenDotaMatch {
  match_id: number;
  radiant_win: boolean;
  duration: number; // segundos
  start_time: number; // unix
  players: OpenDotaPlayer[];
}

export class OpenDotaError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "OpenDotaError";
  }
}

/**
 * Busca dados crus de uma partida na OpenDota.
 * Aceita matchId em qualquer formato (string ou number).
 */
export async function fetchOpenDotaMatch(matchId: string | number): Promise<OpenDotaMatch> {
  const url = `${OPENDOTA_BASE}/matches/${matchId}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    // Forçar SSR sem cache do Next pra dados frescos
    cache: "no-store",
  });
  if (!res.ok) {
    throw new OpenDotaError(`OpenDota retornou ${res.status} pra match ${matchId}`, res.status);
  }
  const data = (await res.json()) as OpenDotaMatch;
  if (!data.players || data.players.length !== 10) {
    throw new OpenDotaError(`Match ${matchId} sem 10 jogadores na resposta (got ${data.players?.length ?? 0})`);
  }
  return data;
}

/**
 * Player normalizado pra insert em match_players.
 * player_slot do DB é 0..9 (5 radiant + 5 dire), diferente do raw da OpenDota.
 */
export interface NormalizedPlayer {
  steam_account_id: number;
  team: "radiant" | "dire";
  player_slot: number; // 0..9
  is_winner: boolean;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  denies: number;
  net_worth: number;
  level: number;
  hero_damage: number;
  hero_healing: number;
  tower_damage: number;
  items: {
    inventory: number[];
    backpack: number[];
    neutral: number;
  };
  raw_opendota: OpenDotaPlayer;
}

/**
 * Normaliza os 10 players da OpenDota pra formato pronto pra insert em match_players.
 */
export function normalizePlayers(match: OpenDotaMatch): NormalizedPlayer[] {
  return match.players.map((p) => {
    const team: "radiant" | "dire" = p.player_slot < 128 ? "radiant" : "dire";
    // Mapeia slot OpenDota (0..4 radiant, 128..132 dire) pra slot DB (0..9)
    const dbSlot = team === "radiant" ? p.player_slot : p.player_slot - 123;
    return {
      steam_account_id: p.account_id ?? 0, // 0 = anônimo (Dota oculta account_id)
      team,
      player_slot: dbSlot,
      is_winner: p.win === 1,
      hero_id: p.hero_id,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      gold_per_min: p.gold_per_min,
      xp_per_min: p.xp_per_min,
      last_hits: p.last_hits,
      denies: p.denies,
      net_worth: p.net_worth,
      level: p.level,
      hero_damage: p.hero_damage,
      hero_healing: p.hero_healing,
      tower_damage: p.tower_damage,
      items: {
        inventory: [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5],
        backpack: [p.backpack_0, p.backpack_1, p.backpack_2],
        neutral: p.item_neutral,
      },
      raw_opendota: p,
    };
  });
}
