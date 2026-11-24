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
    expect(summarizePartyMatch(partida(), [PPA], [AMIGO])).toEqual({
      matchId: 9097240074,
      startTime: 1795460000,
      duration: 2400,
      won: true,
      radiant: false,
      radiantScore: 21,
      direScore: 36,
      ppaHeroId: 34,
      partyHeroIds: [34, 5],
      teammates: [AMIGO],
    });
  });

  it("PPA numa smurf: o lado sai de quem da party aparece, e o herói dele fica em aberto", () => {
    const smurf = partida({ players: [{ account_id: 555, player_slot: 130, hero_id: 34 }, { account_id: AMIGO, player_slot: 131, hero_id: 5 }] });
    expect(summarizePartyMatch(smurf, [PPA], [AMIGO])).toMatchObject({ won: true, radiant: false, ppaHeroId: null, partyHeroIds: [5] });
  });

  it("PPA em outra conta dele (a da lista): o lado, o resultado e o herói saem dessa conta", () => {
    const outraConta = 1667196039;
    const partidaNaOutra = partida({ players: [{ account_id: outraConta, player_slot: 130, hero_id: 34 }, { account_id: AMIGO, player_slot: 131, hero_id: 5 }] });
    expect(summarizePartyMatch(partidaNaOutra, [PPA, outraConta], [AMIGO])).toMatchObject({ won: true, radiant: false, ppaHeroId: 34 });
  });

  it("na mesma partida, a conta dele vale antes da emprestada, e o dono da emprestada entra no time", () => {
    const propria = 1667196039;
    const emprestada = 1865993258;
    const p9097 = partida({
      radiant_win: true,
      players: [
        { account_id: emprestada, player_slot: 0, hero_id: 98 },
        { account_id: 26998715, player_slot: 1, hero_id: 46 },
        { account_id: propria, player_slot: 2, hero_id: 34 },
        { account_id: 4294967295, player_slot: 3, hero_id: 64 },
        { account_id: 110647864, player_slot: 128, hero_id: 106 },
      ],
    });
    expect(summarizePartyMatch(p9097, [propria, emprestada], [])).toMatchObject({ won: true, radiant: true, ppaHeroId: 34, teammates: [emprestada, 26998715] });
  });

  it("numa partida só com a conta emprestada, ela é o PPA", () => {
    const emprestada = 1865993258;
    const p = partida({ radiant_win: true, players: [{ account_id: emprestada, player_slot: 0, hero_id: 34 }, { account_id: AMIGO, player_slot: 1, hero_id: 5 }] });
    expect(summarizePartyMatch(p, [PPA, emprestada], [])).toMatchObject({ won: true, ppaHeroId: 34, teammates: [AMIGO] });
  });

  it("sem ninguém conhecido na partida, o resultado não é inventado", () => {
    expect(summarizePartyMatch(partida(), [1], [2])).toMatchObject({ won: null, radiant: null, ppaHeroId: null, partyHeroIds: [] });
  });

  it("só entram heróis do lado da party: um conhecido do outro time fica de fora", () => {
    const misturada = partida({ players: [{ account_id: PPA, player_slot: 130, hero_id: 34 }, { account_id: AMIGO, player_slot: 2, hero_id: 5 }] });
    expect(summarizePartyMatch(misturada, [PPA], [AMIGO])).toMatchObject({ partyHeroIds: [34] });
  });

  it("resposta sem o ID da partida não vira resumo", () => {
    expect(summarizePartyMatch({ players: [] }, [PPA], [])).toBeNull();
    expect(summarizePartyMatch(null, [PPA], [])).toBeNull();
  });
});

describe("parsePartyMatchSummary", () => {
  it("lê o resumo gravado e recusa o que veio estragado", () => {
    const gravado = { matchId: 1, startTime: 2, duration: 3, won: false, radiant: true, radiantScore: 4, direScore: 5, ppaHeroId: null, partyHeroIds: [7, 8], teammates: [7] };
    expect(parsePartyMatchSummary(gravado)).toEqual(gravado);
    // Resumo antigo, sem os heróis ou sem a lista do time: fica marcado como incompleto para o cron completar.
    expect(parsePartyMatchSummary({ ...gravado, partyHeroIds: undefined })?.partyHeroIds).toBeNull();
    expect(parsePartyMatchSummary({ ...gravado, teammates: undefined })).toMatchObject({ teammates: null });
    expect(parsePartyMatchSummary({ matchId: "1" })).toBeNull();
  });
});
