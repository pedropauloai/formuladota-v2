import "server-only";

// Gate de voz do matchmaking (anti-anonimato): só entra na fila quem está no canal
// de voz 🎧丨Buscando Partida do Discord — e, em grupo, TODOS os membros.
//
// FAIL-OPEN por decisão do Pedro: se as envs do bot Discord não estiverem setadas,
// ou o bot estiver offline, o gate NÃO bloqueia ninguém (a fila continua funcionando).
// A prova de presença lê o voiceState cache do bot (rota /api/voice/presence).

import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Convite oficial (mesmo hardcode usado no resto do app).
export const DISCORD_INVITE_URL = "https://discord.com/invite/USntaFRS6x";

function gateConfig(): { url: string; key: string; channelId: string } | null {
  const url = serverEnv.DISCORD_BOT_API_URL;
  const key = serverEnv.DISCORD_BOT_API_KEY;
  const channelId = serverEnv.DISCORD_QUEUE_VOICE_CHANNEL_ID;
  if (!url || !key || !channelId) return null;
  return { url, key, channelId };
}

/** O gate está configurado (todas as envs presentes)? Se não, é no-op. */
export function isVoiceGateEnabled(): boolean {
  return gateConfig() !== null;
}

/** discordIds que NÃO estão no canal agora. Fail-open: [] em qualquer problema. */
async function missingFromVoice(discordIds: string[]): Promise<string[]> {
  const cfg = gateConfig();
  if (!cfg || discordIds.length === 0) return [];
  try {
    const res = await fetch(`${cfg.url}/api/voice/presence`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.key },
      body: JSON.stringify({ channelId: cfg.channelId, discordIds }),
      cache: "no-store",
    });
    if (!res.ok) return []; // bot offline / erro → fail-open (não bloqueia a fila)
    const json = (await res.json()) as { missing?: unknown };
    return Array.isArray(json.missing)
      ? json.missing.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return []; // rede caiu → fail-open
  }
}

export interface VoiceGateResult {
  ok: boolean;
  inviteUrl: string;
  /** Nomes dos usuários que faltam no canal (pra mensagem de erro). */
  missingNames: string[];
}

/**
 * Garante que TODOS os userIds estão no canal de voz da fila. Resolve o snowflake
 * do Discord + o nome de cada um via service client (RLS-safe). Fail-open.
 */
export async function assertUsersInQueueVoice(userIds: string[]): Promise<VoiceGateResult> {
  const base: VoiceGateResult = { ok: true, inviteUrl: DISCORD_INVITE_URL, missingNames: [] };
  if (!isVoiceGateEnabled() || userIds.length === 0) return base;

  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("id, discord_id, username")
    .in("id", userIds);
  const rows = data ?? [];

  // Mapa discordId → nome de exibição (fallback username / "Alguém").
  const nameByDiscord = new Map<string, string>();
  const discordIds: string[] = [];
  for (const r of rows) {
    const discordId = (r as { discord_id?: string | null }).discord_id ?? null;
    if (!discordId) continue; // sem vínculo Discord legível → não dá pra verificar (fail-open p/ ele)
    discordIds.push(discordId);
    nameByDiscord.set(discordId, (r as { username?: string | null }).username ?? "Alguém");
  }

  const missingDiscord = await missingFromVoice(discordIds);
  if (missingDiscord.length === 0) return base;

  const missingNames = missingDiscord.map((d) => nameByDiscord.get(d) ?? "Alguém");
  return { ok: false, inviteUrl: DISCORD_INVITE_URL, missingNames };
}
