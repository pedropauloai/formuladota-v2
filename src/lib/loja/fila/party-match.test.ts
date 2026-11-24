import { describe, expect, it } from "vitest";
import { parsePartyMatchSummary, summarizePartyMatch } from "./party-match";

const PPA = 1123609219;
const AMIGO = 98765;

// Formato do OpenDota /matches/{id}: player_slot abaixo de 128 joga pelos Iluminados.
const partida = (over: Record<string, unknown> = {}) => ({
  match_id: 9097240074,
  start_time: 1795460000,
  duration: 2400,
  radiant_win: false,
  radiant_score: 21,
  dire_score: 36,
  players: [
    { account_id: PPA, player_slot: 130, hero_id: 34 },
    { account_id: AMIGO, player_slot: 131, hero_id: 5 },
    { account_id: 4242, player_slot: 1, hero_id: 1 },
  ],
  ...over,
});

describe("summarizePartyMatch", () => {
  it("com a conta do PPA na partida: o lado, o resultado, o placar e o herói dele", () => {
    expect(summarizePartyMatch(partida(), PPA, [AMIGO])).toEqual({
      matchId: 9097240074,
      startTime: 1795460000,
      duration: 2400,
      won: true,
      radiant: false,
      radiantScore: 21,
      direScore: 36,
      ppaHeroId: 34,
    });
  });

  it("PPA numa smurf: o lado sai de quem da party aparece, e o herói dele fica em aberto", () => {
    const smurf = partida({ players: [{ account_id: 555, player_slot: 130, hero_id: 34 }, { account_id: AMIGO, player_slot: 131, hero_id: 5 }] });
    expect(summarizePartyMatch(smurf, PPA, [AMIGO])).toMatchObject({ won: true, radiant: false, ppaHeroId: null });
  });

  it("sem ninguém conhecido na partida, o resultado não é inventado", () => {
    expect(summarizePartyMatch(partida(), 1, [2])).toMatchObject({ won: null, radiant: null, ppaHeroId: null });
  });

  it("resposta sem o ID da partida não vira resumo", () => {
    expect(summarizePartyMatch({ players: [] }, PPA, [])).toBeNull();
    expect(summarizePartyMatch(null, PPA, [])).toBeNull();
  });
});

describe("parsePartyMatchSummary", () => {
  it("lê o resumo gravado e recusa o que veio estragado", () => {
    const gravado = { matchId: 1, startTime: 2, duration: 3, won: false, radiant: true, radiantScore: 4, direScore: 5, ppaHeroId: null };
    expect(parsePartyMatchSummary(gravado)).toEqual(gravado);
    expect(parsePartyMatchSummary({ matchId: "1" })).toBeNull();
  });
});
