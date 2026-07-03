// Feed de partidas (rota /partidas): "acontecendo agora" (live) + histórico.
// Lê via RPCs públicas live_matches() / recent_matches() (migration 099) — matches
// tem RLS restrita, as RPCs (SECURITY DEFINER) expõem só o preview público.

import { createClient } from "@/lib/supabase/server";

export interface LivePlayer {
  userId: string | null;
  team: "radiant" | "dire" | "spectator";
  name: string;
  avatar: string | null;
  level: number;
  /** MMR atual da temporada (pra medalha do rank). null = sem MMR. */
  mmr: number | null;
  /** Jogador banido (behavior_status='banned') — marca pública no card. */
  banned: boolean;
}

export interface LiveMatch {
  dotaMatchId: string;
  name: string | null;
  startedAt: string | null;
  players: LivePlayer[];
  /** Média de MMR de cada time (dos jogadores com MMR). null = sem dado. */
  radiantAvg: number | null;
  direAvg: number | null;
}

export interface HistoryPlayer {
  userId: string | null;
  team: "radiant" | "dire" | "spectator";
  heroId: number | null;
  isWinner: boolean;
  kills: number;
  deaths: number;
  assists: number;
  mmrChange: number | null;
  name: string;
  avatar: string | null;
  level: number;
  /** MMR atual da temporada (pra medalha do rank). null = sem MMR. */
  mmr: number | null;
  /** Jogador banido (behavior_status='banned') — marca pública no card. */
  banned: boolean;
}

export interface HistoryMatch {
  dotaMatchId: string;
  radiantWin: boolean | null;
  radiantScore: number | null;
  direScore: number | null;
  durationMin: number | null;
  date: string | null;
  /** Média de MMR de cada time no momento da partida (favorito/zebra). */
  radiantAvg: number | null;
  direAvg: number | null;
  players: HistoryPlayer[];
}

export async function getLiveMatches(): Promise<LiveMatch[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("live_matches");
  const rows = (data ?? []) as {
    dota_match_id: string;
    name: string | null;
    started_at: string | null;
    players: {
      user_id: string | null;
      team: string;
      name: string;
      avatar: string | null;
      level: number | null;
      mmr: number | null;
      banned?: boolean;
    }[];
  }[];
  return rows.map((r) => {
    const players = (r.players ?? []).map((p) => ({
      userId: p.user_id,
      team: (p.team === "dire" ? "dire" : p.team === "spectator" ? "spectator" : "radiant") as
        | "radiant"
        | "dire"
        | "spectator",
      name: p.name,
      avatar: p.avatar,
      level: p.level ?? 1,
      mmr: p.mmr ?? null,
      banned: Boolean(p.banned),
    }));
    return {
      dotaMatchId: r.dota_match_id,
      name: r.name,
      startedAt: r.started_at,
      players,
      // Ao vivo o MMR do momento não está gravado → média do MMR atual dos jogadores.
      radiantAvg: teamAvg(players, "radiant"),
      direAvg: teamAvg(players, "dire"),
    };
  });
}

/** Média (arredondada) do MMR dos jogadores de um time; null se ninguém tem MMR. */
function teamAvg(
  players: { team: string; mmr: number | null }[],
  team: "radiant" | "dire"
): number | null {
  const xs = players.filter((p) => p.team === team && typeof p.mmr === "number").map((p) => p.mmr as number);
  if (xs.length === 0) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

export async function getRecentMatches(limit = 20, offset = 0): Promise<HistoryMatch[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("recent_matches", { p_limit: limit, p_offset: offset });
  const rows = (data ?? []) as {
    dota_match_id: string;
    radiant_win: boolean | null;
    radiant_score: number | null;
    dire_score: number | null;
    duration_min: number | null;
    date: string | null;
    radiant_avg_mmr: number | null;
    dire_avg_mmr: number | null;
    players: {
      user_id: string | null;
      team: string;
      hero_id: number | null;
      is_winner: boolean;
      kills: number;
      deaths: number;
      assists: number;
      mmr_change: number | null;
      name: string;
      avatar: string | null;
      level: number | null;
      mmr: number | null;
      banned?: boolean;
    }[];
  }[];
  return rows.map((r) => ({
    dotaMatchId: r.dota_match_id,
    radiantWin: r.radiant_win,
    radiantScore: r.radiant_score,
    direScore: r.dire_score,
    durationMin: r.duration_min,
    date: r.date,
    radiantAvg: r.radiant_avg_mmr ?? null,
    direAvg: r.dire_avg_mmr ?? null,
    players: (r.players ?? []).map((p) => ({
      userId: p.user_id,
      team: p.team === "dire" ? "dire" : p.team === "spectator" ? "spectator" : "radiant",
      heroId: p.hero_id,
      isWinner: p.is_winner,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      mmrChange: p.mmr_change,
      name: p.name,
      avatar: p.avatar,
      level: p.level ?? 1,
      mmr: p.mmr ?? null,
      banned: Boolean(p.banned),
    })),
  }));
}
