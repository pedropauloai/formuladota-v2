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
  // Campos validados com partida REAL (fixture 8829648086, 2026-06-11):
  /** Segundo slot neutro (patch novo) — vai em items.neutral2. */
  item_neutral2?: number;
  /** Medalha Valve real: dezena = medalha (8=Imortal), unidade = estrelas. 80 = Imortal. */
  rank_tier?: number | null;
  /** 0 = jogou até o fim; >0 = saiu/abandonou (relevante pra conduta). */
  leaver_status?: number;
  aghanims_scepter?: 0 | 1;
  aghanims_shard?: 0 | 1;
  /** Percentis prontos da API (GPM/XPM/kills... vs outros do mesmo herói). */
  benchmarks?: Record<string, { raw?: number; pct?: number }>;
}

export interface OpenDotaMatch {
  match_id: number;
  radiant_win: boolean;
  duration: number; // segundos
  start_time: number; // unix
  players: OpenDotaPlayer[];
  // Metadados validados com partida real (2026-06-11):
  /** 7 = ranked matchmaking oficial; 0 = fila normal/casual. */
  lobby_type?: number;
  /** 22 = All Pick ranked; 23 = Turbo (NÃO vale pra ranked-com-pro). */
  game_mode?: number;
  radiant_score?: number;
  dire_score?: number;
  patch?: number;
  first_blood_time?: number;
}

/** lobby_type oficial Valve pra partida ranked de matchmaking. */
export const LOBBY_TYPE_RANKED = 7;

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
    /** Segundo neutro (patch novo) — null se a API não enviar. */
    neutral2: number | null;
  };
  // Campos reais validados 2026-06-11 (migration 050):
  rank_tier: number | null;
  leaver_status: number | null;
  personaname: string | null;
  aghanims_scepter: boolean;
  aghanims_shard: boolean;
  benchmarks: Record<string, { raw?: number; pct?: number }> | null;
  raw_opendota: OpenDotaPlayer;
}

// =====================================================================
// VALIDAÇÃO DE PARTIDA (fundido de src/lib/opendota.ts em 2026-06-11)
// Usado pelo Server Action finishCoordinatedMatch para confirmar que
// o dota_match_id informado pelo PRO é legítimo e contém os jogadores esperados.
// =====================================================================

// Aguarda até 4 horas antes de considerar partida "velha demais"
const DEFAULT_MAX_AGE_HOURS = 4;

/**
 * Converte Steam ID 64-bit (string) para account_id 32-bit (number).
 * OpenDota usa 32-bit; nós armazenamos 64-bit. id32 = id64 - 76561197960265728.
 * BigInt necessário para evitar overflow (Number.MAX_SAFE_INTEGER).
 */
function steam64To32(steamId64: string): number {
  return Number(BigInt(steamId64) - 76561197960265728n);
}

/** Resultado da validação de uma partida OpenDota. */
export interface ValidateMatchResult {
  valid: boolean;
  reason?: string;
  /** Dados da partida se validação bem-sucedida */
  matchData?: {
    matchId: number;
    startTime: number;
    duration: number;
    radiantWin: boolean;
    participantsFound: number;
    participantsExpected: number;
  };
}

/**
 * Valida que um match Dota contém os SteamIDs participantes e é recente.
 *
 * Regras:
 * - Match deve existir na OpenDota (pode demorar 2-10 min pós-partida pra indexar)
 * - Match deve ser RANKED oficial (lobby_type 7) — fecha o buraco descoberto em
 *   2026-06-11 com partida real: antes uma Turbo/casual era aceita como PT ranked
 * - Match deve ter ocorrido nas últimas `maxAgeHours` horas
 * - Pelo menos 4 dos 5 steam_ids esperados devem estar entre os jogadores
 *   (tolerância de 1 para cobrir casos de perfil privado que OpenDota não expõe)
 *
 * Se OpenDota retornar 404 (match ainda indexando), retorna valid=false com razão
 * explicativa — o caller deve aceitar e marcar dota_match_id_verified=false.
 */
export async function validateOpendotaMatch(
  matchId: string,
  expectedSteamIds64: string[],
  maxAgeHours: number = DEFAULT_MAX_AGE_HOURS,
  requireRanked: boolean = true
): Promise<ValidateMatchResult> {
  try {
    const res = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`, {
      next: { revalidate: 0 }, // nunca cachear — precisa dados frescos
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          valid: false,
          reason:
            "Partida nao encontrada no OpenDota. Aguarde alguns minutos apos o fim da partida e tente novamente.",
        };
      }
      return {
        valid: false,
        reason: `OpenDota API retornou erro ${res.status}. Tente novamente em instantes.`,
      };
    }

    const match = (await res.json()) as OpenDotaMatch;

    if (!match.players || match.players.length === 0) {
      return {
        valid: false,
        reason: "Partida encontrada mas sem dados de jogadores — tente novamente em instantes.",
      };
    }

    // Anti-Turbo/casual: PT do ranked-com-pro só vale em ranked oficial.
    // (lobby_type 7 = ranked matchmaking; Turbo = game_mode 23 com lobby_type 0)
    if (requireRanked && match.lobby_type !== LOBBY_TYPE_RANKED) {
      return {
        valid: false,
        reason:
          "Esta partida nao e ranked oficial (Turbo/casual/lobby nao contam). Apenas partidas RANKED sao aceitas na PT.",
      };
    }

    // Verificar idade da partida
    const matchAgeMs = Date.now() - match.start_time * 1000;
    const maxAgeMs = maxAgeHours * 3600 * 1000;

    if (matchAgeMs > maxAgeMs) {
      const hoursAgo = Math.round(matchAgeMs / 3600000);
      return {
        valid: false,
        reason: `Partida muito antiga (${hoursAgo}h atras). Apenas partidas das ultimas ${maxAgeHours}h sao aceitas.`,
      };
    }

    // Converter steam IDs esperados para formato 32-bit (OpenDota)
    const expectedAccounts = expectedSteamIds64
      .filter((id) => id && id.length > 0)
      .map(steam64To32);

    // Coletar account_ids da partida (ignorar null = perfis privados)
    const matchAccounts = match.players
      .map((p) => p.account_id)
      .filter((id): id is number => id !== null);

    const overlap = expectedAccounts.filter((id) => matchAccounts.includes(id));

    // Tolerância: aceitar 4/5 (cobre perfil privado ou sincronização lenta)
    const minimumOverlap = Math.max(1, expectedAccounts.length - 1);

    if (overlap.length < minimumOverlap) {
      return {
        valid: false,
        reason: `Apenas ${overlap.length}/${expectedAccounts.length} participantes esperados foram encontrados na partida. Verifique se o match ID e correto.`,
      };
    }

    return {
      valid: true,
      matchData: {
        matchId: match.match_id,
        startTime: match.start_time,
        duration: match.duration,
        radiantWin: match.radiant_win,
        participantsFound: overlap.length,
        participantsExpected: expectedAccounts.length,
      },
    };
  } catch (err) {
    console.error("[opendota] Erro na validacao:", (err as Error).message);
    return {
      valid: false,
      reason: `OpenDota indisponivel: ${(err as Error).message}`,
    };
  }
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
        neutral2: p.item_neutral2 ?? null,
      },
      rank_tier: p.rank_tier ?? null,
      leaver_status: p.leaver_status ?? null,
      personaname: p.personaname ?? null,
      aghanims_scepter: p.aghanims_scepter === 1,
      aghanims_shard: p.aghanims_shard === 1,
      benchmarks: p.benchmarks ?? null,
      raw_opendota: p,
    };
  });
}
