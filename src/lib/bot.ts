// Cliente HTTP do bot Steam FORMULADOTA — Phase 5.
// Usado em Server Actions (cookie client autorizado) pra criar/cancelar lobby via bot Railway.
//
// Bot expõe API key-auth em BOT_API_URL. Sem service-role aqui — bot tem seu próprio
// supabase service-role pra atualizar lobbies row.
//
// IMPORTANT: caller deve checar `error === "BOT_NOT_CONFIGURED"` pra fluxo dev/staging
// onde bot ainda não foi deployado no Railway (Pedro pendência em PENDING_PEDRO.md).

import { serverEnv } from "@/lib/env";

interface BotResult<T> {
  success: true;
  data: T;
}
interface BotError {
  success: false;
  /** "BOT_NOT_CONFIGURED" quando env vars ausentes (dev mode antes do deploy Railway). */
  error: string;
}
type BotApiResult<T> = BotResult<T> | BotError;

interface CreateLobbyResponse {
  steamLobbyId: string;
}

export function isBotConfigured(): boolean {
  return Boolean(serverEnv.BOT_API_URL && serverEnv.BOT_API_KEY);
}

export async function botCreateLobby(input: {
  lobbyId: string;
  name: string;
  password: string;
  gameMode: "all_pick" | "captains_mode" | "random_draft" | "single_draft";
}): Promise<BotApiResult<CreateLobbyResponse>> {
  // Bot ainda não deployado (Railway pendência) → caller decide fallback.
  if (!isBotConfigured()) {
    return { success: false, error: "BOT_NOT_CONFIGURED" };
  }

  const baseUrl = serverEnv.BOT_API_URL!;
  const apiKey = serverEnv.BOT_API_KEY!;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/lobby/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[bot] fetch /lobby/create falhou:", err);
    return { success: false, error: "Bot Steam offline. Tente novamente em instantes." };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { success: false, error: "Resposta inválida do bot." };
  }

  if (!res.ok) {
    const errMsg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
    return { success: false, error: errMsg };
  }

  const ok = (json as { ok?: boolean; steamLobbyId?: string }).ok === true;
  const lobbyId = (json as { steamLobbyId?: string }).steamLobbyId;
  if (!ok || !lobbyId) {
    return { success: false, error: "Bot não retornou steamLobbyId." };
  }
  return { success: true, data: { steamLobbyId: lobbyId } };
}

/**
 * Manda invite GC pro user via SteamID 64-bit. node-dota2 inviteToLobby NÃO
 * exige friendship — user recebe popup dentro do cliente Dota 2 e pode aceitar
 * diretamente. Pré-requisito: bot já dentro do lobby (após botCreateLobby).
 *
 * Fire-and-forget recomendado no caller — invite é melhor-esforço; se falhar,
 * fluxo continua válido (senha disponível no painel da sala).
 */
export async function botInviteToLobby(input: {
  lobbyId: string;
  steamId64: string;
}): Promise<BotApiResult<{ ok: true }>> {
  if (!isBotConfigured()) {
    return { success: false, error: "BOT_NOT_CONFIGURED" };
  }

  const baseUrl = serverEnv.BOT_API_URL!;
  const apiKey = serverEnv.BOT_API_KEY!;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/lobby/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
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
