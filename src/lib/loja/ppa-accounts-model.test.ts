import { describe, expect, it } from "vitest";
import { accountSearchOrder, parseAccountInput, type PpaAccount } from "./ppa-accounts-model";

describe("parseAccountInput", () => {
  it("aceita o número da conta, o Steam64 e os links que o PPA costuma colar", () => {
    expect(parseAccountInput("1667196039")).toBe(1667196039);
    expect(parseAccountInput(" 1667196039 ")).toBe(1667196039);
    expect(parseAccountInput("76561199627461767")).toBe(1667196039);
    expect(parseAccountInput("https://www.opendota.com/players/1865993258")).toBe(1865993258);
    expect(parseAccountInput("https://www.dotabuff.com/players/1865993258/matches")).toBe(1865993258);
    expect(parseAccountInput("https://stratz.com/players/1865993258")).toBe(1865993258);
    expect(parseAccountInput("https://steamcommunity.com/profiles/76561199627461767/")).toBe(1667196039);
  });

  it("recusa o que não é conta: texto, zero, conta anônima e número grande demais", () => {
    expect(parseAccountInput("n tenho inimigos")).toBeNull();
    expect(parseAccountInput("")).toBeNull();
    expect(parseAccountInput("0")).toBeNull();
    expect(parseAccountInput("4294967295")).toBeNull();
    expect(parseAccountInput("999999999999")).toBeNull();
  });
});

describe("accountSearchOrder", () => {
  const conta = (accountId: number, kind: PpaAccount["kind"], createdAt: string): PpaAccount => ({ accountId, label: "", kind, createdAt });

  it("as contas do PPA vêm antes das emprestadas, e dentro de cada grupo a mais antiga primeiro", () => {
    const lista = [
      conta(1865993258, "emprestada", "2026-11-24T10:00:00Z"),
      conta(1667196039, "propria", "2026-11-24T09:00:00Z"),
      conta(1123609219, "propria", "2026-11-24T08:00:00Z"),
    ];
    expect(accountSearchOrder(lista)).toEqual([1123609219, 1667196039, 1865993258]);
  });
});
