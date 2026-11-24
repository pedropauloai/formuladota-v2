import { describe, expect, it } from "vitest";
import { isPresent, PRESENTE_MS } from "./presenca";

const now = new Date("2026-11-24T20:00:00Z");
const ha = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("isPresent", () => {
  it("sem linha de membro, a pessoa não está na sala", () => {
    expect(isPresent(null, now)).toBe(false);
  });

  it("ativo que bateu há 10 s está na sala", () => {
    expect(isPresent({ status: "ativo", lastSeenAt: ha(10_000) }, now)).toBe(true);
  });

  it("ativo que não bate há mais de 30 s saiu", () => {
    expect(isPresent({ status: "ativo", lastSeenAt: ha(PRESENTE_MS + 1_000) }, now)).toBe(false);
  });

  it("ativo que nunca bateu (saiu pelo botão) não está na sala", () => {
    expect(isPresent({ status: "ativo", lastSeenAt: null }, now)).toBe(false);
  });

  it("expulso não está na sala, mesmo com batimento recente", () => {
    expect(isPresent({ status: "expulso", lastSeenAt: ha(1_000) }, now)).toBe(false);
  });
});
