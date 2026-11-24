import { describe, expect, it } from "vitest";
import { parseOpenDotaPatches } from "../meta-period";
import { currentPatchStartDay, firstFullDay, lastFullDayBefore, metaWindows } from "./windows";

// Recorte real do /constants/patch da OpenDota em 24/11/2026.
const PATCHES = parseOpenDotaPatches([
  { name: "7.40", date: "2025-12-16T00:50:40.281Z", id: 59 },
  { name: "7.41", date: "2026-03-24T00:50:59.580Z", id: 60 },
  { name: "7.42", date: "2026-11-18T21:28:07.019Z", id: 61 },
]);

describe("dias inteiros do patch", () => {
  it("o 7.42 saiu às 21h28 de 18/11 (UTC): o dia 18 mistura os dois e fica de fora", () => {
    expect(firstFullDay("2026-11-18T21:28:07.019Z")).toBe("2026-11-19");
    expect(lastFullDayBefore("2026-11-18T21:28:07.019Z")).toBe("2026-11-17");
  });

  it("patch que começa à meia-noite em ponto já conta o próprio dia", () => {
    expect(firstFullDay("2026-12-01T00:00:00.000Z")).toBe("2026-12-01");
    expect(lastFullDayBefore("2026-12-01T00:00:00.000Z")).toBe("2026-11-30");
  });
});

describe("metaWindows", () => {
  it("em 24/11 (último dia fechado 23/11): patch 7.42 de 19 a 23, 7 dias de 17 a 23, fim do 7.41 de 11 a 17", () => {
    expect(metaWindows(PATCHES, "2026-11-23")).toEqual([
      { kind: "patch", start: "2026-11-19", end: "2026-11-23", patch: "7.42" },
      { kind: "recent", start: "2026-11-17", end: "2026-11-23", patch: null },
      { kind: "previous", start: "2026-11-11", end: "2026-11-17", patch: "7.41" },
    ]);
  });

  it("no dia em que o patch sai ainda não há dia inteiro dele: fica sem a janela do patch", () => {
    const kinds = metaWindows(PATCHES, "2026-11-18").map((w) => `${w.kind} ${w.start} ${w.end}`);
    expect(kinds).toEqual(["recent 2026-11-12 2026-11-18", "previous 2026-11-11 2026-11-17"]);
  });

  it("antes do 7.42 o patch atual é o 7.41 inteiro e o anterior é o fim do 7.40", () => {
    const [patch, , previous] = metaWindows(PATCHES, "2026-11-17");
    expect(patch).toEqual({ kind: "patch", start: "2026-03-25", end: "2026-11-17", patch: "7.41" });
    expect(previous).toEqual({ kind: "previous", start: "2026-03-17", end: "2026-03-23", patch: "7.40" });
  });

  it("patch anterior mais curto que 7 dias entra inteiro, sem passar do começo dele", () => {
    const curtos = parseOpenDotaPatches([
      { name: "A", date: "2026-01-01T12:00:00Z" },
      { name: "B", date: "2026-01-04T12:00:00Z" },
      { name: "C", date: "2026-01-20T12:00:00Z" },
    ]);
    const anteriorDoB = metaWindows(curtos.slice(0, 2), "2026-01-10").find((w) => w.kind === "previous");
    expect(anteriorDoB).toEqual({ kind: "previous", start: "2026-01-02", end: "2026-01-03", patch: "A" });
  });

  it("sem patch conhecido ainda há os últimos 7 dias", () => {
    expect(metaWindows([], "2026-11-23")).toEqual([{ kind: "recent", start: "2026-11-17", end: "2026-11-23", patch: null }]);
  });

  it("marca o dia da troca de patch", () => {
    expect(currentPatchStartDay(PATCHES, "2026-11-23")).toBe("2026-11-18");
    expect(currentPatchStartDay([], "2026-11-23")).toBeNull();
  });
});
