// Histórico das partidas da party para o painel do Pedro: cada partida registrada em "Partida
// terminou" (party_participacoes), com quem jogou, quem não apareceu e quem a OpenDota conferiu.
// Service role; a página do painel já é só do admin.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";

export interface HistoryPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** jogou ou não apareceu (a vez conta nos dois casos). */
  kind: "jogou" | "nao_apareceu";
  /** A OpenDota mostrou a pessoa no time do PPA. */
  confirmed: boolean;
}

export interface HistoryMatch {
  key: string;
  matchId: string | null;
  playedAt: string;
  players: HistoryPlayer[];
}

interface Row {
  user_id: string;
  kind: string;
  dota_match_id: number | null;
  played_at: string;
  confirmed: boolean;
  live_session_id: string | null;
}

export async function getMatchHistory(isTest: boolean, limit = 15): Promise<HistoryMatch[]> {
  const { data, error } = await createServiceClient()
    .from("party_participacoes")
    .select("user_id, kind, dota_match_id, played_at, confirmed, live_session_id")
    .eq("is_test", isTest)
    .order("played_at", { ascending: false })
    .limit(limit * 6);
  if (error) throw new Error(`ler o histórico da party falhou: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const identities = await getIdentityMap(await createClient(), [...new Set(rows.map((r) => r.user_id))]);
  const groups = new Map<string, HistoryMatch>();
  for (const r of rows) {
    // Sem o ID, a partida se reconhece pela live e pela hora em que foi marcada.
    const key = r.dota_match_id ? String(r.dota_match_id) : `${r.live_session_id ?? "sem-live"}-${r.played_at}`;
    const group = groups.get(key) ?? { key, matchId: r.dota_match_id ? String(r.dota_match_id) : null, playedAt: r.played_at, players: [] };
    const who = identities.get(r.user_id);
    group.players.push({
      userId: r.user_id,
      name: who?.name ?? "Jogador",
      avatarUrl: who?.avatarUrl ?? null,
      kind: r.kind === "nao_apareceu" ? "nao_apareceu" : "jogou",
      confirmed: r.confirmed,
    });
    groups.set(key, group);
  }
  return [...groups.values()].slice(0, limit);
}
