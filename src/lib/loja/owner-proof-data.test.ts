import { describe, it, expect } from "vitest";
import { buildOwnerProofData, parseOwnerProofData, PARTY_MATCHES_CACHED, reuseSummary } from "./owner-proof-data";

const NOW = new Date("2026-11-18T15:00:00Z");
const resumo = (matchId: number) => ({ matchId, startTime: 1795460000, duration: 2400, won: true, radiant: false, radiantScore: 21, direScore: 36, ppaHeroId: 34 });

describe("buildOwnerProofData", () => {
  it("lê a medalha e a posição no ranking do OpenDota", () => {
    expect(buildOwnerProofData({ rank_tier: 80, leaderboard_rank: 3496 }, NOW)).toEqual({
      rankTier: 80,
      leaderboardRank: 3496,
      partyMatches: [],
      syncedAt: "2026-11-18T15:00:00.000Z",
    });
  });

  it("resposta vazia ou estranha vira medalha vazia, sem quebrar", () => {
    expect(buildOwnerProofData(null, NOW)).toMatchObject({ rankTier: null, leaderboardRank: null, partyMatches: [] });
    expect(buildOwnerProofData({ rank_tier: "80" }, NOW)).toMatchObject({ rankTier: null });
  });

  it(`guarda os resumos das partidas registradas, no máximo ${PARTY_MATCHES_CACHED}`, () => {
    const lista = Array.from({ length: PARTY_MATCHES_CACHED + 5 }, (_, i) => resumo(100 + i));
    const guardadas = buildOwnerProofData({}, NOW, lista).partyMatches.map((m) => m.matchId);
    expect(guardadas).toHaveLength(PARTY_MATCHES_CACHED);
    expect(guardadas[0]).toBe(100);
  });
});

describe("reuseSummary", () => {
  const fim = (r: { startTime: number; duration: number }) => (r.startTime + r.duration) * 1000;
  const horas = (h: number) => h * 60 * 60 * 1000;

  it("partida nova (sem resumo) vai ao OpenDota", () => {
    expect(reuseSummary(undefined, NOW.getTime())).toBe(false);
  });

  it("resumo com resultado não volta ao OpenDota", () => {
    const r = resumo(1);
    expect(reuseSummary(r, fim(r) + horas(1))).toBe(true);
  });

  it("sem resultado, tenta de novo no primeiro dia e para depois dele", () => {
    const r = { ...resumo(1), won: null, radiant: null };
    expect(reuseSummary(r, fim(r) + horas(23))).toBe(false);
    expect(reuseSummary(r, fim(r) + horas(25))).toBe(true);
  });
});

describe("parseOwnerProofData", () => {
  it("lê o registro gravado e recusa formato sem data", () => {
    expect(parseOwnerProofData({ rankTier: 80, leaderboardRank: 3496, syncedAt: "x" })).toEqual({ rankTier: 80, leaderboardRank: 3496, partyMatches: [], syncedAt: "x" });
    expect(parseOwnerProofData({ rankTier: 80 })).toBeNull();
    expect(parseOwnerProofData([])).toBeNull();
  });

  it("lê os resumos gravados e ignora os que vieram estragados", () => {
    const lido = parseOwnerProofData({ rankTier: 80, leaderboardRank: 1, syncedAt: "x", partyMatches: [resumo(1), { matchId: "2" }, null] });
    expect(lido?.partyMatches).toEqual([resumo(1)]);
  });
});
