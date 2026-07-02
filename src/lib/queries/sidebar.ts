// Dados dos cards da coluna direita (right-sidebar) — tudo com conteúdo REAL que já
// existe no sistema: últimas partidas, top do ranking, temporada e Mural da Vergonha.
// Um único ponto de fetch pra a sidebar ficar puramente apresentacional.

import { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";
import { getRecentMatches, type HistoryMatch } from "@/lib/queries/matches-feed";
import { getWallOfShame, type WallEntry } from "@/lib/queries/wall-of-shame";

export interface SidebarRankRow {
  userId: string;
  name: string;
  avatar: string | null;
  level: number;
  mmr: number;
}

export interface SidebarSeason {
  name: string;
  /** Dias restantes até o fim da temporada (>= 0). */
  daysLeft: number;
  /** É pré-temporada (beta)? */
  beta: boolean;
}

export interface SidebarData {
  recentMatches: HistoryMatch[];
  topRanking: SidebarRankRow[];
  bans: WallEntry[];
  season: SidebarSeason | null;
}

const DAY_MS = 86_400_000;
const SEASON_LEN_MS = 60 * DAY_MS; // 2 meses (fallback quando ended_at é nulo)

export async function getSidebarData(): Promise<SidebarData> {
  const supabase = await createClient();

  // Season ativa (nome + janela pro countdown).
  const seasonRes = await supabase
    .from("seasons")
    .select("id, name, started_at, ended_at, beta")
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  const seasonRow = seasonRes.data;

  // Top 3 por MMR da season ativa.
  const top3Res = seasonRow
    ? await supabase
        .from("player_season_mmr")
        .select("user_id, mmr")
        .eq("season_id", seasonRow.id)
        .order("mmr", { ascending: false })
        .limit(3)
    : { data: [] as { user_id: string; mmr: number }[] };
  const top3 = top3Res.data ?? [];

  // Hidrata identidade (Steam > Discord) + nível dos top 3.
  const ids = top3.map((r) => r.user_id);
  const [profilesRes, steamMap, levelsRes] = await Promise.all([
    ids.length > 0
      ? supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      : Promise.resolve({ data: null }),
    getSteamIdentityMap(supabase, ids),
    ids.length > 0
      ? supabase.from("user_levels").select("user_id, current_level").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; current_level: number }[] }),
  ]);
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const levelMap = new Map((levelsRes.data ?? []).map((l) => [l.user_id, l.current_level]));
  const topRanking: SidebarRankRow[] = top3.map((r) => {
    const p = profileMap.get(r.user_id);
    const ident = resolveIdentity(steamMap, r.user_id, p?.username, p?.avatar_url);
    return {
      userId: r.user_id,
      name: ident.name,
      avatar: ident.avatarUrl,
      level: levelMap.get(r.user_id) ?? 1,
      mmr: r.mmr,
    };
  });

  // Últimas 3 partidas + Mural (banidos primeiro) em paralelo.
  const [recentMatches, bans] = await Promise.all([getRecentMatches(3), getWallOfShame()]);

  let season: SidebarSeason | null = null;
  if (seasonRow) {
    const end = seasonRow.ended_at
      ? new Date(seasonRow.ended_at).getTime()
      : new Date(seasonRow.started_at).getTime() + SEASON_LEN_MS;
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
    season = { name: seasonRow.name, daysLeft, beta: Boolean(seasonRow.beta) };
  }

  return { recentMatches, topRanking, bans, season };
}
