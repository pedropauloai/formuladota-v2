// Cliente OpenDota — valida partidas Dota 2 pós-jogo.
//
// Usado pelo Server Action finishCoordinatedMatch para confirmar que
// o dota_match_id informado pelo PRO é legítimo e contém os jogadores esperados.
//
// OpenDota usa account_id em 32-bit (Steam ID32).
// Nós armazenamos steam_id em 64-bit (formato padrão Steam).
// Conversão: id32 = id64 - 76561197960265728

const OPENDOTA_BASE = "https://api.opendota.com/api";

// Aguarda até 4 horas antes de considerar partida "velha demais"
const DEFAULT_MAX_AGE_HOURS = 4;

interface OpenDotaPlayer {
  account_id: number | null; // Steam ID 32-bit (null se perfil privado/anônimo)
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  isRadiant?: boolean;
  player_slot?: number;
}

interface OpenDotaMatch {
  match_id: number;
  start_time: number; // Unix timestamp (segundos)
  duration: number; // duração em segundos
  radiant_win: boolean;
  players: OpenDotaPlayer[];
}

/**
 * Converte Steam ID 64-bit (string) para account_id 32-bit (number).
 * Formato OpenDota usa 32-bit.
 */
function steam64To32(steamId64: string): number {
  // BigInt necessário para evitar overflow em JavaScript (Number.MAX_SAFE_INTEGER)
  return Number(BigInt(steamId64) - 76561197960265728n);
}

/**
 * Resultado da validação de uma partida OpenDota.
 */
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
  maxAgeHours: number = DEFAULT_MAX_AGE_HOURS
): Promise<ValidateMatchResult> {
  try {
    const res = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`, {
      // Timeout implícito via AbortController não necessário aqui — Next.js já tem timeout
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

    const match: OpenDotaMatch = await res.json() as OpenDotaMatch;

    // Verificar se é uma partida real (has players)
    if (!match.players || match.players.length === 0) {
      return {
        valid: false,
        reason: "Partida encontrada mas sem dados de jogadores — tente novamente em instantes.",
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

    // Contar quantos dos esperados estão na partida
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
