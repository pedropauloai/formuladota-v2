import { describe, expect, it } from "vitest";
import { accountToSteam64, commonRecentMatch, parseMatchId, partyFromMatch, type MatchLike } from "./partida";

const PPA = 1123609219;
const radiant = [0, 1, 2, 3, 4];
const dire = [128, 129, 130, 131, 132];

function match(ppaSlot: number, accounts: (number | null)[]): MatchLike {
  const slots = [...radiant, ...dire];
  return {
    match_id: 8873698944,
    start_time: 1_795_000_000,
    duration: 2400,
    players: slots.map((slot, i) => ({ player_slot: slot, account_id: slot === ppaSlot ? PPA : accounts[i] ?? null })),
  };
}

describe("partida do PPA", () => {
  it("acha o time do PPA (Iluminados) e a hora em que a partida acabou", () => {
    const result = partyFromMatch(match(0, [null, 11, 12, null, 14, 21, 22, 23, 24, 25]));
    expect(result).toEqual({ ok: true, playedAt: new Date((1_795_000_000 + 2400) * 1000).toISOString(), teammates: [11, 12, 14], hidden: 1 });
  });

  it("funciona com o PPA nos Temidos", () => {
    const result = partyFromMatch(match(130, [1, 2, 3, 4, 5, 21, 22, null, 24, 25]));
    expect(result.ok && result.teammates).toEqual([21, 22, 24, 25]);
  });

  it("recusa partida sem o PPA ou incompleta", () => {
    expect(partyFromMatch({ ...match(0, []), players: match(0, []).players.map((p) => ({ ...p, account_id: 7 })) })).toEqual({ ok: false, reason: "sem_ppa" });
    expect(partyFromMatch({ ...match(0, []), players: [] })).toEqual({ ok: false, reason: "incompleta" });
  });

  it("conta anônima (4294967295) fica como perfil privado", () => {
    const result = partyFromMatch(match(0, [null, 4294967295, 12, 13, 14]));
    expect(result.ok && result.hidden).toBe(1);
  });

  it("converte a conta para o SteamID64 da tabela steam_links", () => {
    expect(accountToSteam64(PPA)).toBe("76561199083874947");
  });

  it("aceita o ID puro ou o link que o PPA cola", () => {
    expect(parseMatchId("8873698944")).toBe("8873698944");
    expect(parseMatchId("https://www.opendota.com/matches/8873698944")).toBe("8873698944");
    expect(parseMatchId("https://stratz.com/match/8873698944/playback")).toBe("8873698944");
    expect(parseMatchId("abc")).toBeNull();
  });
});

describe("partida jogada numa smurf do PPA", () => {
  it("acha o time pelos jogadores da party quando a conta do PPA é desconhecida", () => {
    const m = match(-1, [777, 11, 12, 13, 14, 21, 22, 23, 24, 25]);
    const r = partyFromMatch(m, [PPA], [11, 12]);
    expect(r.ok && r.teammates.sort()).toEqual([11, 12, 13, 14, 777]);
  });

  it("sem a conta do PPA e sem ninguém da party, recusa", () => {
    expect(partyFromMatch(match(-1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), [PPA], [99]).ok).toBe(false);
  });

  it("acha a partida em comum mais recente nas partidas recentes da party", () => {
    const a = [{ match_id: 3, start_time: 300, duration: 10 }, { match_id: 1, start_time: 100, duration: 10 }];
    const b = [{ match_id: 3, start_time: 300, duration: 10 }, { match_id: 2, start_time: 200, duration: 10 }];
    const c = [{ match_id: 4, start_time: 400, duration: 10 }];
    expect(commonRecentMatch([a, b, c], 2)?.match_id).toBe(3);
    expect(commonRecentMatch([a, b, c], 3)).toBeNull();
  });
});
