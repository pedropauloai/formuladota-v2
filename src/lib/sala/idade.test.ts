import { describe, expect, it } from "vitest";
import { ageOn, isMinor } from "./idade";

describe("ageOn (calendário de São Paulo)", () => {
  it("conta 18 anos a partir da meia-noite do aniversário em São Paulo", () => {
    // 24/11/2026 00h10 em São Paulo = 03h10 UTC.
    expect(ageOn("2008-11-24", new Date("2026-11-24T03:10:00Z"))).toBe(18);
  });

  it("ainda conta 17 às 23h50 da véspera em São Paulo, mesmo já sendo o dia seguinte em UTC", () => {
    // 23/11/2026 23h50 em São Paulo = 24/11 02h50 UTC.
    expect(ageOn("2008-11-24", new Date("2026-11-24T02:50:00Z"))).toBe(17);
  });

  it("quem nasceu em 29 de fevereiro faz aniversário em 1º de março nos anos sem 29", () => {
    expect(ageOn("2008-02-29", new Date("2026-02-28T15:00:00Z"))).toBe(17);
    expect(ageOn("2008-02-29", new Date("2026-03-01T15:00:00Z"))).toBe(18);
  });

  it("recusa data em formato errado", () => {
    expect(() => ageOn("24/11/2008", new Date("2026-11-24T15:00:00Z"))).toThrow();
  });
});

describe("isMinor", () => {
  it("é menor um dia antes dos 18 e deixa de ser no dia", () => {
    expect(isMinor("2008-11-25", new Date("2026-11-24T15:00:00Z"))).toBe(true);
    expect(isMinor("2008-11-24", new Date("2026-11-24T15:00:00Z"))).toBe(false);
  });
});
