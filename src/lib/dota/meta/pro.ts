// Meta profissional do patch pela OpenDota (/explorer, SQL só de leitura no banco de partidas de liga):
// escolhas, vitórias e proibições por herói desde o início do patch, nas ligas profissionais e premium.
// Lógica pura: monta o SQL e lê a resposta. A busca fica em store.ts.

import type { DotaPatch } from "../meta-period";

export interface ProHero {
  heroId: number;
  picks: number;
  wins: number;
  bans: number;
}

export interface ProMeta {
  patch: string;
  /** Início do patch, ISO em UTC. */
  startedAt: string;
  matches: number;
  leagues: number;
  heroes: ProHero[];
}

/** SQL de leitura: uma linha por herói, com o total de partidas e de ligas repetido em cada linha. */
export function proMetaSql(startedAt: string): string {
  const startSec = Math.floor(Date.parse(startedAt) / 1000);
  if (!Number.isFinite(startSec)) throw new Error(`início de patch inválido: ${startedAt}`);
  return [
    "WITH m AS (SELECT matches.match_id, matches.radiant_win, matches.leagueid FROM matches",
    `JOIN leagues USING (leagueid) WHERE matches.start_time >= ${startSec} AND leagues.tier IN ('premium', 'professional')),`,
    "p AS (SELECT pm.hero_id, count(*) AS picks, sum(CASE WHEN (pm.player_slot < 128) = m.radiant_win THEN 1 ELSE 0 END) AS wins",
    "FROM m JOIN player_matches pm ON pm.match_id = m.match_id GROUP BY pm.hero_id),",
    "b AS (SELECT pb.hero_id, count(*) AS bans FROM m JOIN picks_bans pb ON pb.match_id = m.match_id",
    "WHERE pb.is_pick = false GROUP BY pb.hero_id)",
    "SELECT coalesce(p.hero_id, b.hero_id) AS hero_id, coalesce(p.picks, 0) AS picks, coalesce(p.wins, 0) AS wins,",
    "coalesce(b.bans, 0) AS bans, (SELECT count(*) FROM m) AS matches, (SELECT count(DISTINCT leagueid) FROM m) AS leagues",
    "FROM p FULL OUTER JOIN b ON b.hero_id = p.hero_id",
  ].join(" ");
}

// O Postgres devolve count/sum como texto quando o número é bigint; aceita os dois.
function toCount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** Lê a resposta do /explorer. Erro do SQL vira exceção; linha fora do formato fica de fora. */
export function parseProRows(raw: unknown, patch: DotaPatch): ProMeta {
  if (!raw || typeof raw !== "object") throw new Error("OpenDota /explorer: resposta vazia");
  const { rows, err } = raw as { rows?: unknown; err?: unknown };
  if (err) throw new Error(`OpenDota /explorer: ${typeof err === "string" ? err : JSON.stringify(err)}`);
  if (!Array.isArray(rows)) throw new Error("OpenDota /explorer: sem linhas");
  let matches = 0;
  let leagues = 0;
  const heroes: ProHero[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const [heroId, picks, wins, bans] = [r.hero_id, r.picks, r.wins, r.bans].map(toCount);
    matches = Math.max(matches, toCount(r.matches) ?? 0);
    leagues = Math.max(leagues, toCount(r.leagues) ?? 0);
    if (heroId == null || heroId === 0 || picks == null || wins == null || bans == null) continue;
    heroes.push({ heroId, picks, wins, bans });
  }
  heroes.sort((a, b) => b.picks + b.bans - (a.picks + a.bans) || b.picks - a.picks);
  return { patch: patch.name, startedAt: patch.startedAt, matches, leagues, heroes };
}

export function isProMeta(value: unknown): value is ProMeta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.patch === "string" &&
    typeof v.startedAt === "string" &&
    typeof v.matches === "number" &&
    typeof v.leagues === "number" &&
    Array.isArray(v.heroes) &&
    v.heroes.every((h) => {
      const x = h as Record<string, unknown>;
      return !!h && ["heroId", "picks", "wins", "bans"].every((k) => typeof x[k] === "number");
    })
  );
}
