// Loader ENXUTO do card de partida (placar resumido) — usado pelo og:image
// (opengraph-image) e pelo post do Discord (📊 resultados). Roda no servidor com
// service client (a leitura do og:image é anônima; service driba RLS de matches/mmr).
//
// Retorna os 2 times já montados: nome, portrait do herói, medalha da season,
// posição (matchmaking), K/D/A, delta de MMR e MVP.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getHeroById } from "@/lib/queries/heroes";
import { mmrToDotaRank } from "@/lib/dota/rank-badges";
import { mmrToTier } from "@/lib/mmr";
import { getAssignedPositionsByDotaMatchId } from "@/lib/queries/assigned-roles";
import type { DotaRank } from "@/components/ui/dota-rank-medal";

export interface MatchCardPlayer {
  name: string;
  heroIcon: string | null;
  heroName: string;
  rank: DotaRank;
  stars: number | undefined;
  pos: number | null; // 1-5 (matchmaking)
  kills: number;
  deaths: number;
  assists: number;
  mmrDelta: number | null;
  isMvp: boolean;
  isWinner: boolean;
}

export interface MatchCard {
  dotaMatchId: string;
  radiantScore: number;
  direScore: number;
  radiantWin: boolean | null;
  durationMin: number | null;
  dateStr: string | null;
  radiant: MatchCardPlayer[];
  dire: MatchCardPlayer[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PlayerRow = {
  user_id: string | null;
  team: string;
  player_slot: number;
  is_winner: boolean | null;
  hero_id: number;
  personaname: string | null;
  kills: number;
  deaths: number;
  assists: number;
  net_worth: number | null;
  mmr_change: number | null;
};

export async function getMatchCardData(id: string): Promise<MatchCard | null> {
  const svc = createServiceClient();

  // Resolve dota_match_id (URL canônica) → match_id interno (uuid).
  let matchUuid = id;
  let dotaMatchId = id;
  if (!UUID_RE.test(id)) {
    const md = svc.from("match_details" as never) as unknown as {
      select: (q: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => PromiseLike<{ data: { match_id?: string } | null }>;
        };
      };
    };
    const { data } = await md.select("match_id").eq("dota_match_id", id).maybeSingle();
    if (!data?.match_id) return null;
    matchUuid = data.match_id;
  }

  const [{ data: playersData }, { data: matchMeta }, { data: details }] = await Promise.all([
    svc
      .from("match_players")
      .select(
        "user_id, team, player_slot, is_winner, hero_id, personaname, kills, deaths, assists, net_worth, mmr_change",
      )
      .eq("match_id", matchUuid)
      .order("player_slot", { ascending: true }),
    svc
      .from("matches")
      .select("dota_match_id, duracao_min, radiant_win, radiant_score, dire_score, enriched_at")
      .eq("id", matchUuid)
      .maybeSingle(),
    (
      svc.from("match_details" as never) as unknown as {
        select: (q: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => PromiseLike<{ data: { mvp_user_id?: string | null } | null }>;
          };
        };
      }
    )
      .select("mvp_user_id")
      .eq("match_id", matchUuid)
      .maybeSingle(),
  ]);

  const rows = (playersData ?? []) as unknown as PlayerRow[];
  if (rows.length === 0) return null;

  if (matchMeta?.dota_match_id) dotaMatchId = String(matchMeta.dota_match_id);
  const mvpUserId = details?.mvp_user_id ?? null;

  // Identidade + MMR da season (medalha) por jogador.
  const userIds = rows.map((r) => r.user_id).filter((v): v is string => Boolean(v));
  const nameById = new Map<string, string>();
  const mmrById = new Map<string, number>();
  if (userIds.length) {
    const { data: season } = await svc.from("seasons").select("id").eq("active", true).maybeSingle();
    const [{ data: idents }, { data: links }, { data: mmrs }] = await Promise.all([
      svc.from("public_player_identities").select("id, username").in("id", userIds),
      svc.from("steam_links").select("user_id, persona").in("user_id", userIds),
      season?.id
        ? svc.from("player_season_mmr").select("user_id, mmr").eq("season_id", season.id).in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; mmr: number }[] }),
    ]);
    for (const l of links ?? []) if (l.persona) nameById.set(l.user_id, l.persona);
    for (const i of idents ?? []) if (i.id && i.username) nameById.set(i.id, i.username); // username tem prioridade
    for (const m of mmrs ?? []) mmrById.set(m.user_id, m.mmr);
  }

  const assignedPos = await getAssignedPositionsByDotaMatchId(svc, dotaMatchId);

  const toPlayer = (r: PlayerRow): MatchCardPlayer => {
    const uid = r.user_id;
    const hero = getHeroById(r.hero_id);
    const mmr = uid ? mmrById.get(uid) ?? null : null;
    return {
      name: (uid ? nameById.get(uid) : null) || r.personaname || "Jogador",
      heroIcon: hero?.image_icon ?? null,
      heroName: hero?.name_pt ?? `Herói ${r.hero_id}`,
      rank: mmrToDotaRank(mmr),
      stars: mmr != null ? mmrToTier(mmr).stars : undefined,
      pos: uid ? assignedPos.get(uid) ?? null : null,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      mmrDelta: r.mmr_change ?? null,
      isMvp: !!mvpUserId && r.user_id === mvpUserId,
      isWinner: r.is_winner ?? false,
    };
  };

  const radiant = rows.filter((r) => r.team === "radiant").map(toPlayer);
  const dire = rows.filter((r) => r.team === "dire").map(toPlayer);

  const sumKills = (list: MatchCardPlayer[]) => list.reduce((a, p) => a + p.kills, 0);
  const radiantWin = matchMeta?.radiant_win ?? (radiant[0]?.isWinner ? true : dire[0]?.isWinner ? false : null);
  const radiantScore = matchMeta?.radiant_score ?? sumKills(radiant);
  const direScore = matchMeta?.dire_score ?? sumKills(dire);

  const dateStr = matchMeta?.enriched_at
    ? new Date(matchMeta.enriched_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return {
    dotaMatchId,
    radiantScore,
    direScore,
    radiantWin,
    durationMin: matchMeta?.duracao_min ?? null,
    dateStr,
    radiant,
    dire,
  };
}
