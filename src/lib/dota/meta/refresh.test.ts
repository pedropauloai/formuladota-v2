import { describe, expect, it } from "vitest";
import { PRO_EVERY_MS, PUBLIC_EVERY_MS, refreshDecision } from "./refresh";

const at = (iso: string) => new Date(iso);

describe("refreshDecision", () => {
  it("sem nada guardado, busca na hora", () => {
    expect(refreshDecision(null, PUBLIC_EVERY_MS, at("2026-11-24T12:03:00Z"))).toBeNull();
  });

  it("o público fica fresco por 6 horas e o profissional por 1 hora", () => {
    const last = "2026-11-24T12:00:00Z";
    expect(refreshDecision(last, PUBLIC_EVERY_MS, at("2026-11-24T17:59:00Z"))).toBe("fresco");
    expect(refreshDecision(last, PRO_EVERY_MS, at("2026-11-24T12:59:00Z"))).toBe("fresco");
  });

  it("vencido, só tenta nos minutos redondos de 10 em 10 (a falha não martela a API)", () => {
    const last = "2026-11-24T12:00:00Z";
    expect(refreshDecision(last, PRO_EVERY_MS, at("2026-11-24T13:04:00Z"))).toBe("aguardando");
    expect(refreshDecision(last, PRO_EVERY_MS, at("2026-11-24T13:10:00Z"))).toBeNull();
    expect(refreshDecision(last, PUBLIC_EVERY_MS, at("2026-11-24T18:00:00Z"))).toBeNull();
  });
});
