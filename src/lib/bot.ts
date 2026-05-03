// Cliente HTTP do bot Steam FORMULADOTA — Phase 5.
// Usado em Server Actions (cookie client autorizado) pra criar/cancelar lobby via bot Railway.
//
// Bot expõe API key-auth em BOT_API_URL. Sem service-role aqui — bot tem seu próprio
// supabase service-role pra atualizar lobbies row.

import { requireServerEnv } from "@/lib/env";

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
}

export async function botCreateLobby(input: {
  lobbyId: string;
  name: string;
  password: string;
  gameMode: "all_pick" | "captains_mode" | "random_draft" | "single_draft";
}): Promise<BotApiResult<CreateLobbyResponse>> {
  const baseUrl = requireServerEnv("BOT_API_URL");
  const apiKey = requireServerEnv("BOT_API_KEY");

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
