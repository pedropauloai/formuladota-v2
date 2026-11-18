import { describe, it, expect } from "vitest";
import { buildOwnerProofData, parseOwnerProofData } from "./owner-proof-data";

const NOW = new Date("2026-11-18T15:00:00Z");

describe("buildOwnerProofData", () => {
  it("lê a medalha e a posição no ranking do OpenDota", () => {
    expect(buildOwnerProofData({ rank_tier: 80, leaderboard_rank: 3496 }, NOW)).toEqual({
      rankTier: 80,
      leaderboardRank: 3496,
      syncedAt: "2026-11-18T15:00:00.000Z",
    });
  });

  it("resposta vazia ou estranha vira medalha vazia, sem quebrar", () => {
    expect(buildOwnerProofData(null, NOW)).toMatchObject({ rankTier: null, leaderboardRank: null });
    expect(buildOwnerProofData({ rank_tier: "80" }, NOW)).toMatchObject({ rankTier: null });
  });
});

describe("parseOwnerProofData", () => {
  it("lê o registro gravado e recusa formato sem data", () => {
    expect(parseOwnerProofData({ rankTier: 80, leaderboardRank: 3496, syncedAt: "x" })).toEqual({ rankTier: 80, leaderboardRank: 3496, syncedAt: "x" });
    expect(parseOwnerProofData({ rankTier: 80 })).toBeNull();
    expect(parseOwnerProofData([])).toBeNull();
  });
});
