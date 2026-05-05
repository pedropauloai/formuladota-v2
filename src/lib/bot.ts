// Cliente HTTP do bot Steam FORMULADOTA — Phase 5 + bot pool (Migration 017).
// Usado em Server Actions (cookie client autorizado) pra criar/cancelar lobby via bot Railway.
//
// Bot pool: V1 single bot 'main', mas arquitetura suporta N bots em V2.
// reserve_bot_for_lobby (RPC SQL FOR UPDATE SKIP LOCKED) garante atomic pickup.
// Quando lobby vai pra completed/cancelled, trigger SQL libera o bot automaticamente.
//
// Error codes:
// - BOT_NOT_CONFIGURED: env vars ausentes (dev mode antes do deploy Railway)
// - BOT_POOL_FULL: todos bots ocupados — caller pode mostrar "aguarde, próximo livre em ~Xmin"

import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

interface BotResult<T> {
  success: true;
  data: T;
}
interface BotError {
  success: false;
  error: string;
}
type BotApiResult<T> = BotResult<T> | BotError;

interface CreateLobbyResponse {
  steamLobbyId: string;
  botAccount: string;
}

export function isBotConfigured(): boolean {
  return Boolean(serverEnv.BOT_API_URL && serverEnv.BOT_API_KEY);
}

/**
 * Reserva 1 bot do pool atomicamente via RPC. Retorna account_name ou null
 * se todos os bots estão ocupados. Idempotente — caller deve liberar bot
 * (UPDATE bots set status=idle) se HTTP do Railway falhar.
 */
async function reserveBot(lobbyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_bot_for_lobby", {
    p_lobby_id: lobbyId,
  });
  if (error) {
    console.error("[bot] reserve_bot_for_lobby falhou:", error.message);
    return null;
  }
  return data;
}

/**
 * Libera bot manualmente (rollback quando HTTP Railway falha após reserve).
 * Trigger SQL release_bot_on_lobby_end já cobre o caso "lobby vira cancelled",
 * mas pra rollback antes do lobby ser marcado, chamamos esta função.
 */
async function releaseBotByLobbyId(lobbyId: string): Promise<void> {
  const supabase = await createClient();
  // Usa update direto ao invés de RPC pra simplificar (RLS bots policy permite select,
  // update vai por service_role do bot Railway em prod — em dev mode esse cleanup
  // é melhor-esforço; trigger pega quando lobby finaliza).
  await supabase
    .from("bots")
    .update({ status: "idle", current_lobby_id: null })
    .eq("current_lobby_id", lobbyId);
}

export async function botCreateLobby(input: {
  lobbyId: string;
  name: string;
  password: string;
  gameMode: "all_pick" | "captains_mode" | "random_draft" | "single_draft";
}): Promise<BotApiResult<CreateLobbyResponse>> {
  if (!isBotConfigured()) {
    return { success: false, error: "BOT_NOT_CONFIGURED" };
  }

  // 1. Reserva 1 bot do pool atomicamente
  const botAccount = await reserveBot(input.lobbyId);
  if (!botAccount) {
    return { success: false, error: "BOT_POOL_FULL" };
  }

  const baseUrl = serverEnv.BOT_API_URL!;
  const apiKey = serverEnv.BOT_API_KEY!;

  // 2. POST /lobby/create no Railway. Header X-Bot-Account roteia em V2 multi-bot
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/lobby/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Bot-Account": botAccount,
      },
      body: JSON.stringify({ ...input, botAccount }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[bot] fetch /lobby/create falhou:", err);
    await releaseBotByLobbyId(input.lobbyId);
    return {
      success: false,
      error: "Bot Steam offline. Tente novamente em instantes.",
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    await releaseBotByLobbyId(input.lobbyId);
    return { success: false, error: "Resposta inválida do bot." };
  }

  if (!res.ok) {
    await releaseBotByLobbyId(input.lobbyId);
    const errMsg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
    return { success: false, error: errMsg };
  }

  const ok = (json as { ok?: boolean; steamLobbyId?: string }).ok === true;
  const lobbyId = (json as { steamLobbyId?: string }).steamLobbyId;
  if (!ok || !lobbyId) {
    await releaseBotByLobbyId(input.lobbyId);
    return { success: false, error: "Bot não retornou steamLobbyId." };
  }
  return {
    success: true,
    data: { steamLobbyId: lobbyId, botAccount },
  };
}

/**
 * Manda invite GC pro user via SteamID 64-bit. node-dota2 inviteToLobby NÃO
 * exige friendship — user recebe popup dentro do cliente Dota 2 e pode aceitar
 * diretamente. Pré-requisito: bot já dentro do lobby (após botCreateLobby).
 *
 * Fire-and-forget recomendado no caller — invite é melhor-esforço; se falhar,
 * fluxo continua válido (senha disponível no painel da sala).
 *
 * Multi-bot V2: passa botAccount no body se quiser rotear pra bot específico
 * (default = bot que está no lobby, identificado por lobby_id).
 */
export async function botInviteToLobby(input: {
  lobbyId: string;
  steamId64: string;
  botAccount?: string;
}): Promise<BotApiResult<{ ok: true }>> {
  if (!isBotConfigured()) {
    return { success: false, error: "BOT_NOT_CONFIGURED" };
  }

  const baseUrl = serverEnv.BOT_API_URL!;
  const apiKey = serverEnv.BOT_API_KEY!;

  // Resolve botAccount automaticamente do lobbies row se não foi passado
  let botAccount: string = input.botAccount ?? "main";
  if (!input.botAccount) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("lobbies")
      .select("bot_account_name")
      .eq("id", input.lobbyId)
      .single();
    botAccount = data?.bot_account_name ?? "main";
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/lobby/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Bot-Account": botAccount,
      },
      body: JSON.stringify({ ...input, botAccount }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[bot] fetch /lobby/invite falhou:", err);
    return { success: false, error: "Bot Steam offline." };
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) errMsg = j.error;
    } catch {
      // ignora — usa HTTP status como fallback
    }
    return { success: false, error: errMsg };
  }

  return { success: true, data: { ok: true } };
}

/**
 * Status agregado do pool de bots (consumido pelo UI pra mostrar
 * "Bot disponível ✓" ou "Bot ocupado · aguardando").
 */
export async function getBotPoolStatus(): Promise<{
  idle: number;
  busy: number;
  total: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bot_pool_status")
    .select("bots_idle, bots_busy, bots_total")
    .single();
  return {
    idle: data?.bots_idle ?? 0,
    busy: data?.bots_busy ?? 0,
    total: data?.bots_total ?? 0,
  };
}
