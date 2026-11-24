// Agregação do meta de heróis — lógica PURA (sem fetch, sem UI).
// Combina o catálogo estático de heróis (nome/face/atributo, src/data/dota-heroes.json) com os
// números POR POSIÇÃO da Stratz, e produz linhas prontas pra tabela filtradas por função.
//
// Filosofia FormulaDota: META = padrão objetivo (o que mais se repete e vence).
// Sem curadoria — só o dado, ordenado por win rate. O dado fala por si.
// Filtro só por FUNÇÃO (como o dota2protracker) — atributo é só info na linha.

import type { PositionStat } from "./stratz-meta";

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
  pickRate: number; // % das partidas da função (em "Todas", % das partidas do período)
  matches: number; // amostra (nº de partidas)
}

export interface MetaResult {
  rows: MetaRow[];
  /** Win rate médio das linhas — base pra coloração relativa à média. */
  avgWinRate: number;
}

// Abaixo de 1% das partidas a amostra é pequena demais para a vitória valer; o corte é o mesmo na função e em "Todas".
const MIN_PICK_RATE = 1;
// Na STRATZ, cada função tem 2 linhas por partida (um herói por time); a partida inteira tem 10.
const ROWS_PER_MATCH_IN_ROLE = 2;
const ROWS_PER_MATCH = 10;

function normalizeAttr(primaryAttr: string): HeroAttr {
  if (primaryAttr === "str" || primaryAttr === "agi" || primaryAttr === "int") {
    return primaryAttr;
  }
  return "uni"; // "all" (OpenDota) ou "uni" (catálogo) = Universal
}

/** O que a tabela precisa saber de cada herói. */
export interface HeroMetaSource {
  id: number;
  name: string;
  /** URL da face quadrada (minimapa) oficial. */
  face: string;
  attr: HeroAttr;
}

/** Linha do catálogo estático de heróis (src/data/dota-heroes.json) que o meta usa. */
interface CatalogHero {
  id: number;
  name_en: string;
  primary_attr: string;
  image_icon: string;
}

/**
 * Converte o catálogo estático no que a tabela usa. Antes isto vinha do /heroStats da OpenDota
 * a cada visita, e o 429 dela derrubava a /meta inteira (revisão de 18/11/2026).
 */
export function heroSourcesFromCatalog(heroes: CatalogHero[]): HeroMetaSource[] {
  return heroes.map((h) => ({ id: h.id, name: h.name_en, face: h.image_icon, attr: normalizeAttr(h.primary_attr) }));
}

function buildMetaMap(heroes: HeroMetaSource[]): Map<number, HeroMetaSource> {
  return new Map(heroes.map((h) => [h.id, h]));
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

/** Partidas da função na soma da STRATZ; em "Todas", as partidas do período inteiro. */
export function matchesInPeriod(stats: PositionStat[], position: MetaPosition): number {
  let rows = 0;
  for (const s of stats) {
    if (position !== "all" && s.position !== Number(position)) continue;
    rows += s.matchCount;
  }
  return rows / (position === "all" ? ROWS_PER_MATCH : ROWS_PER_MATCH_IN_ROLE);
}

/**
 * Constrói as linhas da tabela de meta, filtradas por função e ordenadas por win
 * rate decrescente. pickRate = partidas do herói ÷ partidas da função (ou do período, em "Todas").
 */
export function buildMetaRows(
  heroes: HeroMetaSource[],
  stats: PositionStat[],
  position: MetaPosition
): MetaResult {
  const meta = buildMetaMap(heroes);
  const byHero = aggregateByHero(stats, position);
  const totalMatches = matchesInPeriod(stats, position);

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
