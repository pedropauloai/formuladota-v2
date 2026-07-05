"use server";

// Telemetria AO VIVO da partida (heróis + net worth/KDA em tempo real, delay DotaTV).
// Lê lobbies.live_stats (gravado pelo bot via GetRealtimeStats), enriquece cada
// jogador com o herói (catálogo server-side, fora do bundle client) e mapeia pro
// nosso jogador por account_id (= steam_id_64 - 76561197960265728). O componente
// client só POLLA esta action e desenha.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getHeroById } from "@/lib/queries/heroes";

const STEAM64_BASE = 76561197960265728n;

export interface LivePlayerT {
  accountId: string | null;
  heroId: number;
  heroName: string | null;
  heroImage: string | null;
  level: number;
  k: number;
  d: number;
  a: number;
  netWorth: number;
  nick: string | null;
  avatar: string | null;
}
export interface LiveTeamT {
  netWorth: number;
  score: number;
  players: LivePlayerT[];
}
export interface LiveMatchT {
  gameTime: number;
  radiant: LiveTeamT | null;
  dire: LiveTeamT | null;
  updatedAt: string;
  /** Snapshot velho (poll parou / partida acabou) — o site pode esconder. */
  stale: boolean;
}

// Considera velho após 45s sem atualização (o bot polla a cada ~8s).
const STALE_MS = 45_000;

type RawPlayer = {
  account_id?: string | null;
  hero_id?: number;
  level?: number;
  k?: number;
  d?: number;
  a?: number;
  net_worth?: number;
};
type RawTeam = { net_worth?: number; score?: number; players?: RawPlayer[] };
type RawLive = { game_time?: number; radiant?: RawTeam | null; dire?: RawTeam | null };

export async function getLiveMatchStats(lobbyUuid: string): Promise<LiveMatchT | null> {
  const supabase = await createClient();
  const { data: lobby } = await supabase
    .from("lobbies")
    .select("live_stats, live_stats_at")
    .eq("id", lobbyUuid)
    .maybeSingle();

  const raw = (lobby?.live_stats ?? null) as RawLive | null;
  const at = (lobby?.live_stats_at ?? null) as string | null;
  if (!raw || !at) return null;

  // Mapa account_id -> { nick, avatar } dos NOSSOS jogadores desta sala.
  const { data: lps } = await supabase
    .from("lobby_players")
    .select("user_id")
    .eq("lobby_id", lobbyUuid);
  const userIds = (lps ?? []).map((r) => r.user_id).filter(Boolean) as string[];
  const identity = await getIdentityMap(supabase, userIds);
  const { data: links } = userIds.length
    ? await supabase.from("steam_links").select("user_id, steam_id_64").in("user_id", userIds)
    : { data: [] as { user_id: string; steam_id_64: string }[] };
  const byAccountId = new Map<string, { nick: string | null; avatar: string | null }>();
  for (const l of links ?? []) {
    try {
      const accId = (BigInt(l.steam_id_64) - STEAM64_BASE).toString();
      const id = identity.get(l.user_id);
      byAccountId.set(accId, { nick: id?.name ?? null, avatar: id?.avatarUrl ?? null });
    } catch {
      // steam_id_64 inválido — ignora
    }
  }

  const mapTeam = (t: RawTeam | null | undefined): LiveTeamT | null => {
    if (!t) return null;
    return {
      netWorth: Number(t.net_worth ?? 0),
      score: Number(t.score ?? 0),
      players: (t.players ?? []).map((p) => {
        const hero = p.hero_id ? getHeroById(p.hero_id) : null;
        const mine = p.account_id ? byAccountId.get(String(p.account_id)) : undefined;
        return {
          accountId: p.account_id ?? null,
          heroId: Number(p.hero_id ?? 0),
          heroName: hero?.name_pt ?? null,
          heroImage: hero?.image_icon ?? null,
          level: Number(p.level ?? 0),
          k: Number(p.k ?? 0),
          d: Number(p.d ?? 0),
          a: Number(p.a ?? 0),
          netWorth: Number(p.net_worth ?? 0),
          nick: mine?.nick ?? null,
          avatar: mine?.avatar ?? null,
        };
      }),
    };
  };

  return {
    gameTime: Number(raw.game_time ?? 0),
    radiant: mapTeam(raw.radiant),
    dire: mapTeam(raw.dire),
    updatedAt: at,
    stale: Date.now() - new Date(at).getTime() > STALE_MS,
  };
}
