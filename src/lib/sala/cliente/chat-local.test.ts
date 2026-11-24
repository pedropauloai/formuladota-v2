import { describe, expect, it } from "vitest";
import type { MensagemEstado } from "../estado";
import { cursorDoChat, juntarChat } from "./chat-local";

const m = (id: number): MensagemEstado => ({ id, userId: "u", texto: `t${id}`, em: "2026-11-24T20:00:00Z" });

describe("juntarChat (o chat guardado no navegador)", () => {
  it("acrescenta as novas em ordem, sem repetir, e guarda só as últimas", () => {
    expect(juntarChat([m(1), m(2)], [m(4), m(3), m(2)], [], false, 3).map((x) => x.id)).toEqual([2, 3, 4]);
  });

  it("tira as apagadas pelo dono", () => {
    expect(juntarChat([m(1), m(2), m(3)], [], [2], false, 100).map((x) => x.id)).toEqual([1, 3]);
  });

  it("sem novidade, devolve a mesma lista (a tela não redesenha à toa)", () => {
    const base = [m(1)];
    expect(juntarChat(base, [], [9], false, 100)).toBe(base);
  });

  it("depois de ficar sem conexão, recomeça do que o servidor mandou", () => {
    expect(juntarChat([m(1), m(2)], [m(5)], [], true, 100).map((x) => x.id)).toEqual([5]);
  });
});

describe("cursorDoChat (até onde o servidor já mandou)", () => {
  it("anda só com as mensagens que vieram do servidor", () => {
    expect(cursorDoChat(5, [m(7), m(6)])).toBe(7);
  });

  it("sem novidade, fica onde estava, e nunca volta", () => {
    expect(cursorDoChat(7, [])).toBe(7);
    expect(cursorDoChat(9, [m(8)])).toBe(9);
  });
});
