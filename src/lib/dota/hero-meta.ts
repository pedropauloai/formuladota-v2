// Agregação do meta de heróis — lógica PURA (sem fetch, sem UI).
// Combina metadata do OpenDota (nome/face/atributo) com os números POR POSIÇÃO
// da Stratz, e produz linhas prontas pra tabela filtradas por função.
//
// Filosofia FormulaDota: META = padrão objetivo (o que mais se repete e vence).
// Sem curadoria — só o dado, ordenado por win rate. O dado fala por si.
// Filtro só por FUNÇÃO (como o dota2protracker) — atributo é só info na linha.

import type { OpenDotaHeroStat } from "./opendota";
import type { PositionStat } from "./stratz-meta";
import { heroFaceUrl } from "./hero-assets";

/** Função/posição: todas, ou pos 1 (Carry) ... pos 5 (Hard Support). */
export type MetaPosition = "all" | "1" | "2" | "3" | "4" | "5";
/** Atributo primário (uni = Universal, "all" da OpenDota). */
export type HeroAttr = "str" | "agi" | "int" | "uni";

export interface MetaRow {
  id: number;
  name: string;
  /** URL da face quadrada (minimapa) oficial. */
  face: string;
  attr: HeroAttr;
  winRate: number; // %
  pickRate: number; // % de participação na função selecionada
  matches: number; // amostra (nº de partidas)
}

export interface MetaResult {
  rows: MetaRow[];
  /** Win rate médio das linhas — base pra coloração relativa à média. */
  avgWinRate: number;
}

// Participação mínima na função — corta o off-meta raríssimo (ex: Leshrac carry
// com 100 jogos e WR inflado) que distorceria o topo. Não é opinião: é validade
// estatística (auto-ajusta por posição, pois é % do total de picks).
const MIN_PICK_RATE = 0.5;

function normalizeAttr(primaryAttr: string): HeroAttr {
  if (primaryAttr === "str" || primaryAttr === "agi" || primaryAttr === "int") {
    return primaryAttr;
  }
  return "uni"; // "all" da OpenDota = Universal
}

interface HeroMeta {
  name: string;
  face: string;
  attr: HeroAttr;
}

function buildMetaMap(heroes: OpenDotaHeroStat[]): Map<number, HeroMeta> {
  return new Map(
    heroes.map((h) => [
      h.id,
      {
        name: h.localized_name,
        face: heroFaceUrl(h.icon),
        attr: normalizeAttr(h.primary_attr),
      },
    ])
  );
}

/** Soma matches/wins por herói, filtrando a posição selecionada (ou todas). */
function aggregateByHero(
  stats: PositionStat[],
  position: MetaPosition
): Map<number, { matches: number; wins: number }> {
  const acc = new Map<number, { matches: number; wins: number }>();
  for (const s of stats) {
    if (position !== "all" && s.position !== Number(position)) continue;
    const cur = acc.get(s.heroId) ?? { matches: 0, wins: 0 };
    cur.matches += s.matchCount;
    cur.wins += s.winCount;
    acc.set(s.heroId, cur);
  }
  return acc;
}

/**
 * Constrói as linhas da tabela de meta, filtradas por função e ordenadas por win
 * rate decrescente. pickRate = participação do herói no total de picks da função.
 */
export function buildMetaRows(
  heroes: OpenDotaHeroStat[],
  stats: PositionStat[],
  position: MetaPosition
): MetaResult {
  const meta = buildMetaMap(heroes);
  const byHero = aggregateByHero(stats, position);
  const totalMatches = [...byHero.values()].reduce((s, v) => s + v.matches, 0);

  const rows: MetaRow[] = [];
  for (const [heroId, agg] of byHero) {
    const m = meta.get(heroId);
    if (!m) continue;
    const pickRate = totalMatches > 0 ? (agg.matches / totalMatches) * 100 : 0;
    if (pickRate < MIN_PICK_RATE) continue;
    rows.push({
      id: heroId,
      name: m.name,
      face: m.face,
      attr: m.attr,
      winRate: (agg.wins / agg.matches) * 100,
      pickRate,
      matches: agg.matches,
    });
  }

  rows.sort((a, b) => b.winRate - a.winRate);
  const avgWinRate =
    rows.length > 0 ? rows.reduce((s, r) => s + r.winRate, 0) / rows.length : 50;

  return { rows, avgWinRate };
}
