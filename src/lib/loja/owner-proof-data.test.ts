import { describe, it, expect } from "vitest";
import { buildOwnerProofData, parseOwnerProofData, PARTY_MATCHES_SHOWN } from "./owner-proof-data";

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

  it(`guarda os resumos das partidas registradas, no máximo ${PARTY_MATCHES_SHOWN}`, () => {
    const lista = Array.from({ length: 8 }, (_, i) => resumo(100 + i));
    expect(buildOwnerProofData({}, NOW, lista).partyMatches.map((m) => m.matchId)).toEqual([100, 101, 102, 103, 104]);
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
