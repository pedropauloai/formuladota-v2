// Dados dos cards da coluna direita (right-sidebar) — tudo com conteúdo REAL que já
// existe no sistema: últimas partidas, top do ranking, temporada e Mural da Vergonha.
// Um único ponto de fetch pra a sidebar ficar puramente apresentacional.

import { createClient } from "@/lib/supabase/server";
import { getIdentityMap } from "@/lib/queries/identities";
import { getRecentMatches, type HistoryMatch } from "@/lib/queries/matches-feed";
import { getWallOfShame, type WallEntry } from "@/lib/queries/wall-of-shame";
import { xpProgress } from "@/lib/levels";

export interface SidebarRankRow {
  userId: string;
  name: string;
  avatar: string | null;
  level: number;
  /** Progresso 0..1 do nível atual (pro anel de XP preencher). */
  xpPct: number;
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
const SEASON_LEN_MS = 90 * DAY_MS; // fallback só se não houver ended_at NEM próxima season

export async function getSidebarData(): Promise<SidebarData> {
  const supabase = await createClient();

  // Season ativa (nome + janela pro countdown) + a PRÓXIMA agendada (define o fim
  // real da beta, que não tem ended_at — ela roda até a próxima temporada começar).
  const [seasonRes, nextSeasonRes] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, started_at, ended_at, beta")
      .eq("active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("seasons")
      .select("started_at")
      .eq("active", false)
      .gt("started_at", new Date().toISOString())
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const seasonRow = seasonRes.data;
  const nextStart = nextSeasonRes.data?.started_at ?? null;

  // Top 15 por MMR da season ativa (mais linhas pro card ter o que rolar; o card
  // faz auto-scroll vertical sutil — ver RankingCard em right-sidebar.tsx).
  const topRes = seasonRow
    ? await supabase
        .from("player_season_mmr")
        .select("user_id, mmr")
        .eq("season_id", seasonRow.id)
        .order("mmr", { ascending: false })
        .limit(15)
    : { data: [] as { user_id: string; mmr: number }[] };
  const topRows = topRes.data ?? [];

  // Identidade via FONTE ÚNICA (getIdentityMap): Discord-first pra qualquer viewer.
  const ids = topRows.map((r) => r.user_id);
  const [identityMap, levelsRes] = await Promise.all([
    getIdentityMap(supabase, ids),
    ids.length > 0
      ? supabase.from("user_levels").select("user_id, total_xp_earned").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; total_xp_earned: number }[] }),
  ]);
  // Nível E progresso do anel vêm da MESMA fonte (total_xp_earned → xpProgress),
  // como no /ranking e no hover — o anel preenche "de forma global".
  const xpMap = new Map(
    (levelsRes.data ?? []).map((l) => [l.user_id, xpProgress(l.total_xp_earned ?? 0)])
  );
  const topRanking: SidebarRankRow[] = topRows.map((r) => {
    const ident = identityMap.get(r.user_id);
    const xp = xpMap.get(r.user_id);
    return {
      userId: r.user_id,
      name: ident?.name ?? "Jogador",
      avatar: ident?.avatarUrl ?? null,
      level: xp?.level ?? 1,
      xpPct: xp?.pct ?? 0,
      mmr: r.mmr,
    };
  });

  // Últimas 3 partidas + Mural (banidos primeiro) em paralelo.
  const [recentMatches, bans] = await Promise.all([getRecentMatches(3), getWallOfShame()]);

  let season: SidebarSeason | null = null;
  if (seasonRow) {
    // Fim = ended_at explícito → início da próxima temporada → fallback +90d.
    const end = seasonRow.ended_at
      ? new Date(seasonRow.ended_at).getTime()
      : nextStart
        ? new Date(nextStart).getTime()
        : new Date(seasonRow.started_at).getTime() + SEASON_LEN_MS;
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
    season = { name: seasonRow.name, daysLeft, beta: Boolean(seasonRow.beta) };
  }

  return { recentMatches, topRanking, bans, season };
}
