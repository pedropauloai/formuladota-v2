import { describe, it, expect } from "vitest";
import { monthStartUtc, nextMonthStartUtc, saoPauloMonth, slotsLeft, slotsTaken, type SlotOrder } from "./capacity";

const NOW = new Date("2026-11-07T15:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const order = (over: Partial<SlotOrder>): SlotOrder => ({ status: "pago", quantity: 1, createdAt: minutesAgo(60), ...over });

describe("mês de São Paulo", () => {
  it("o mês vira à meia-noite de Brasília, não à meia-noite UTC", () => {
    // 01/12 às 01:00 UTC ainda é 30/11 às 22:00 em São Paulo.
    expect(saoPauloMonth(new Date("2026-12-01T01:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(saoPauloMonth(new Date("2026-12-01T03:00:00Z"))).toEqual({ year: 2026, month: 11 });
  });

  it("início do mês e do mês seguinte em UTC", () => {
    expect(monthStartUtc(NOW).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(nextMonthStartUtc(NOW).toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(nextMonthStartUtc(new Date("2026-12-20T12:00:00Z")).toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("slotsTaken", () => {
  it("pedido pago e em conferência ocupam a vaga", () => {
    expect(slotsTaken([order({ status: "pago" }), order({ status: "em_revisao" })], NOW)).toBe(2);
  });

  it("pendente segura a vaga só nos 30 minutos do pagamento", () => {
    expect(slotsTaken([order({ status: "pendente", createdAt: minutesAgo(10) })], NOW)).toBe(1);
    expect(slotsTaken([order({ status: "pendente", createdAt: minutesAgo(31) })], NOW)).toBe(0);
  });

  it("expirado, cancelado e reembolsado devolvem a vaga", () => {
    expect(slotsTaken([order({ status: "expirado" }), order({ status: "cancelado" }), order({ status: "reembolsado" })], NOW)).toBe(0);
  });

  it("venda do mês passado não conta", () => {
    expect(slotsTaken([order({ createdAt: "2026-11-01T02:59:00Z" }), order({ createdAt: "2026-11-01T03:00:00Z" })], NOW)).toBe(1);
  });

  it("a quantidade do pedido conta inteira", () => {
    expect(slotsTaken([order({ quantity: 2 })], NOW)).toBe(2);
  });
});

describe("slotsLeft", () => {
  it("nunca fica negativo, mesmo com venda acima do teto", () => {
    const sold = Array.from({ length: 4 }, () => order({}));
    expect(slotsLeft(3, sold, NOW)).toBe(0);
    expect(slotsLeft(8, sold, NOW)).toBe(4);
  });
});
