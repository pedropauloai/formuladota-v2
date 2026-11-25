import { describe, expect, it } from "vitest";
import { dotaIdFromSteam64, personMenuItems } from "./person-menu-model";

const base = { loggedIn: true, hasDota: false, requested: false };

describe("personMenuItems", () => {
  it("entre amigos, mensagem e convite para o grupo; sem amizade, só o pedido", () => {
    expect(personMenuItems({ ...base, status: "friends" })).toEqual(["perfil", "mensagem", "grupo", "copiarNome"]);
    expect(personMenuItems({ ...base, status: "none" })).toEqual(["perfil", "amizade", "copiarNome"]);
  });

  it("o pedido já feito (antes ou agora) aparece como enviado, sem repetir", () => {
    expect(personMenuItems({ ...base, status: "pending" })).toContain("pedido");
    expect(personMenuItems({ ...base, status: "none", requested: true })).toEqual(["perfil", "pedido", "copiarNome"]);
  });

  it("visitante, a própria pessoa e quem bloqueou não recebem ações sociais", () => {
    for (const status of ["self", "blocked"] as const) expect(personMenuItems({ ...base, status })).toEqual(["perfil", "copiarNome"]);
    expect(personMenuItems({ ...base, loggedIn: false, status: "none" })).toEqual(["perfil", "copiarNome"]);
  });

  it("enquanto o perfil não chega, só o que não depende dele; o ID do Dota quando há Steam", () => {
    expect(personMenuItems({ ...base, status: null })).toEqual(["perfil"]);
    expect(personMenuItems({ ...base, status: "friends", hasDota: true }).at(-1)).toBe("copiarDota");
  });
});

describe("dotaIdFromSteam64", () => {
  it("converte o SteamID64 no ID de convite do Dota e recusa o que não é SteamID64", () => {
    expect(dotaIdFromSteam64("76561198027231451")).toBe("66965723");
    expect(dotaIdFromSteam64(null)).toBeNull();
    expect(dotaIdFromSteam64("123")).toBeNull();
  });
});
