import { describe, expect, it } from "vitest";
import { isProMeta, parseProRows, proMetaSql } from "./pro";

const PATCH = { name: "7.42", startedAt: "2026-11-18T21:28:07.019Z" };

describe("proMetaSql", () => {
  it("filtra desde o início do patch, em segundos, e só ligas profissionais e premium", () => {
    const sql = proMetaSql(PATCH.startedAt);
    expect(sql).toContain("matches.start_time >= 1795037287");
    expect(sql).toContain("leagues.tier IN ('premium', 'professional')");
    expect(sql).toContain("pb.is_pick = false");
    expect(sql).not.toMatch(/\b(insert|update|delete|drop)\b/i);
  });

  it("recusa data inválida em vez de montar SQL quebrado", () => {
    expect(() => proMetaSql("não é data")).toThrow(/inválido/);
  });
});

describe("parseProRows", () => {
  // Primeiras linhas reais do /explorer em 24/11/2026 (74 partidas desde o 7.42, em 5 ligas).
  const raw = {
    rowCount: 4,
    rows: [
      { hero_id: 77, picks: 11, wins: 3, bans: 47, matches: 74, leagues: 5 },
      { hero_id: 38, picks: 16, wins: 6, bans: 47, matches: 74, leagues: 5 },
      { hero_id: "62", picks: "15", wins: "6", bans: "41", matches: "74", leagues: "5" },
      { hero_id: 0, picks: 1, wins: 0, bans: 0, matches: 74, leagues: 5 },
      { hero_id: 5, picks: -1, wins: 0, bans: 0, matches: 74, leagues: 5 },
    ],
    err: null,
  };

  it("lê herói, escolhas, vitórias e proibições, com número em texto ou não", () => {
    const pro = parseProRows(raw, PATCH);
    expect(pro.matches).toBe(74);
    expect(pro.leagues).toBe(5);
    expect(pro.patch).toBe("7.42");
    expect(pro.heroes).toEqual([
      { heroId: 38, picks: 16, wins: 6, bans: 47 },
      { heroId: 77, picks: 11, wins: 3, bans: 47 },
      { heroId: 62, picks: 15, wins: 6, bans: 41 },
    ]);
    expect(isProMeta(pro)).toBe(true);
  });

  it("erro do SQL vira exceção", () => {
    expect(() => parseProRows({ rows: [], err: "syntax error" }, PATCH)).toThrow(/syntax error/);
    expect(() => parseProRows(null, PATCH)).toThrow();
  });

  it("sem partida no patch ainda devolve o bloco vazio", () => {
    expect(parseProRows({ rows: [] }, PATCH)).toEqual({ patch: "7.42", startedAt: PATCH.startedAt, matches: 0, leagues: 0, heroes: [] });
  });
});
