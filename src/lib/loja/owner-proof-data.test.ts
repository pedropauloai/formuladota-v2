import { describe, it, expect } from "vitest";
import { buildOwnerProofData, parseOwnerProofData, RECENT_MATCHES } from "./owner-proof-data";

const NOW = new Date("2026-11-18T15:00:00Z");

// Formato do OpenDota /players/{id}/recentMatches: player_slot abaixo de 128 joga pelos Iluminados.
const partida = (over: Record<string, unknown> = {}) => ({
  match_id: 8883379496,
  player_slot: 2,
  radiant_win: true,
  hero_id: 34,
  kills: 12,
  deaths: 3,
  assists: 9,
  duration: 2131,
  start_time: 1795400000,
  ...over,
});

describe("buildOwnerProofData", () => {
  it("lê a medalha e a posição no ranking do OpenDota", () => {
    expect(buildOwnerProofData({ rank_tier: 80, leaderboard_rank: 3496 }, NOW)).toEqual({
      rankTier: 80,
      leaderboardRank: 3496,
      recentMatches: [],
      syncedAt: "2026-11-18T15:00:00.000Z",
    });
  });

  it("resposta vazia ou estranha vira medalha vazia, sem quebrar", () => {
    expect(buildOwnerProofData(null, NOW)).toMatchObject({ rankTier: null, leaderboardRank: null, recentMatches: [] });
    expect(buildOwnerProofData({ rank_tier: "80" }, NOW)).toMatchObject({ rankTier: null });
  });

  it("guarda as últimas partidas do PPA com herói, resultado e KDA", () => {
    const data = buildOwnerProofData({}, NOW, [partida(), partida({ match_id: 2, player_slot: 130, radiant_win: true })]);
    expect(data.recentMatches).toEqual([
      { matchId: 8883379496, heroId: 34, won: true, kills: 12, deaths: 3, assists: 9, duration: 2131, startTime: 1795400000 },
      { matchId: 2, heroId: 34, won: false, kills: 12, deaths: 3, assists: 9, duration: 2131, startTime: 1795400000 },
    ]);
  });

  it(`fica com as ${RECENT_MATCHES} mais recentes e descarta linha sem partida ou sem herói`, () => {
    const lista = [partida({ match_id: null }), partida({ hero_id: 0 }), ...Array.from({ length: 8 }, (_, i) => partida({ match_id: 100 + i }))];
    const data = buildOwnerProofData({}, NOW, lista);
    expect(data.recentMatches.map((m) => m.matchId)).toEqual([100, 101, 102, 103, 104]);
  });

  it("resultado sem radiant_win não vira vitória inventada: a linha sai", () => {
    expect(buildOwnerProofData({}, NOW, [partida({ radiant_win: null })]).recentMatches).toEqual([]);
  });
});

describe("parseOwnerProofData", () => {
  it("lê o registro gravado e recusa formato sem data", () => {
    expect(parseOwnerProofData({ rankTier: 80, leaderboardRank: 3496, syncedAt: "x" })).toEqual({ rankTier: 80, leaderboardRank: 3496, recentMatches: [], syncedAt: "x" });
    expect(parseOwnerProofData({ rankTier: 80 })).toBeNull();
    expect(parseOwnerProofData([])).toBeNull();
  });

  it("lê as partidas gravadas e ignora as que vieram estragadas", () => {
    const gravada = { matchId: 1, heroId: 34, won: false, kills: 1, deaths: 2, assists: 3, duration: 1800, startTime: 1795400000 };
    const lido = parseOwnerProofData({ rankTier: 80, leaderboardRank: 1, syncedAt: "x", recentMatches: [gravada, { matchId: "2" }, null] });
    expect(lido?.recentMatches).toEqual([gravada]);
  });
});
