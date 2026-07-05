// Salas de voz DINÂMICAS por time (Iluminados/Temidos). Chamado pelo cron:
// - ensureTeamVoiceRooms: partida em andamento SEM salas → cria via bot + guarda IDs.
// - teardownTeamVoiceRooms: partida finalizada COM salas → apaga via bot + limpa IDs.
// Fala com o bot Discord (x-api-key). No-op sem as envs. Isolado (não quebra o cron).

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

const MAX_PER_RUN = 3;

function botConfig(): { url: string; key: string } | null {
  const url = serverEnv.DISCORD_BOT_API_URL;
  const key = serverEnv.DISCORD_BOT_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function botPost(path: string, body: unknown): Promise<Record<string, unknown> | null> {
  const cfg = botConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.key },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

/** discord_ids dos jogadores de um lobby, separados por time. */
async function teamDiscordIds(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<{ radiant: string[]; dire: string[] }> {
  const { data: lp } = await supabase
    .from("lobby_players")
    .select("user_id, team")
    .eq("lobby_id", lobbyId);
  const rows = (lp ?? []) as { user_id: string | null; team: string }[];
  const uids = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  const { data: profs } = await supabase.from("profiles").select("id, discord_id").in("id", uids);
  const discordById = new Map(
    ((profs ?? []) as { id: string; discord_id: string | null }[])
      .filter((p) => p.discord_id)
      .map((p) => [p.id, p.discord_id as string]),
  );
  const radiant: string[] = [];
  const dire: string[] = [];
  for (const r of rows) {
    const d = r.user_id ? discordById.get(r.user_id) : undefined;
    if (!d) continue;
    (r.team === "dire" ? dire : radiant).push(d);
  }
  return { radiant, dire };
}

export async function ensureTeamVoiceRooms(supabase: SupabaseClient): Promise<{ created: number }> {
  if (!botConfig()) return { created: 0 };
  const { data } = await supabase
    .from("lobbies")
    .select("id, dota_match_id")
    .eq("status", "in_progress")
    .not("dota_match_id", "is", null)
    .is("iluminados_voice_id", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  const pending = (data ?? []) as { id: string; dota_match_id: string }[];
  let created = 0;
  for (const lobby of pending) {
    const { radiant, dire } = await teamDiscordIds(supabase, lobby.id);
    const out = await botPost("/api/match-room/teams", {
      matchId: String(lobby.dota_match_id),
      radiantDiscordIds: radiant,
      direDiscordIds: dire,
    });
    const iluminadosId = out?.iluminadosId;
    const temidosId = out?.temidosId;
    if (typeof iluminadosId !== "string" || typeof temidosId !== "string") continue;
    await supabase
      .from("lobbies")
      .update({ iluminados_voice_id: iluminadosId, temidos_voice_id: temidosId } as never)
      .eq("id", lobby.id);
    created++;
  }
  return { created };
}

export async function teardownTeamVoiceRooms(supabase: SupabaseClient): Promise<{ removed: number }> {
  if (!botConfig()) return { removed: 0 };
  const { data } = await supabase
    .from("lobbies")
    .select("id, iluminados_voice_id, temidos_voice_id")
    .eq("status", "completed")
    .not("iluminados_voice_id", "is", null)
    .limit(MAX_PER_RUN);

  const pending = (data ?? []) as {
    id: string;
    iluminados_voice_id: string | null;
    temidos_voice_id: string | null;
  }[];
  let removed = 0;
  for (const lobby of pending) {
    const channelIds = [lobby.iluminados_voice_id, lobby.temidos_voice_id].filter(
      (v): v is string => Boolean(v),
    );
    const out = await botPost("/api/match-room/teams/destroy", { channelIds });
    if (out == null) continue; // bot offline → tenta no próximo ciclo
    await supabase
      .from("lobbies")
      .update({ iluminados_voice_id: null, temidos_voice_id: null } as never)
      .eq("id", lobby.id);
    removed++;
  }
  return { removed };
}
