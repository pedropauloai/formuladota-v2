import { describe, expect, it } from "vitest";
import { describePatches, formatMetaDay, formatUpdatedAt, parseOpenDotaPatches, patchesInWindow } from "./meta-period";

// Recorte real do /constants/patch da OpenDota em 24/11/2026.
const OPENDOTA_PATCHES = [
  { name: "7.39", date: "2025-05-22T23:36:01.602Z", id: 58 },
  { name: "7.40", date: "2025-12-16T00:50:40.281Z", id: 59 },
  { name: "7.41", date: "2026-03-24T00:50:59.580Z", id: 60 },
  { name: "7.42", date: "2026-11-18T21:28:07.019Z", id: 61 },
];
const patches = parseOpenDotaPatches(OPENDOTA_PATCHES);

describe("parseOpenDotaPatches", () => {
  it("lê nome e início e descarta linha sem data válida", () => {
    const lidos = parseOpenDotaPatches([...OPENDOTA_PATCHES, { name: "x", date: "não é data" }, { date: "2026-01-01" }, null]);
    expect(lidos.map((p) => p.name)).toEqual(["7.39", "7.40", "7.41", "7.42"]);
    expect(lidos[3]?.startedAt).toBe("2026-11-18T21:28:07.019Z");
  });

  it("resposta que não é lista vira lista vazia", () => {
    expect(parseOpenDotaPatches({ erro: "fora do ar" })).toEqual([]);
  });
});

describe("patchesInWindow", () => {
  it("05 a 18/11 pega o fim do 7.41 e o começo do 7.42", () => {
    const inside = patchesInWindow(patches, { start: "2026-11-05", end: "2026-11-18" });
    expect(inside.map((p) => p.name)).toEqual(["7.41", "7.42"]);
  });

  it("janela toda depois do lançamento fica só no patch novo", () => {
    const inside = patchesInWindow(patches, { start: "2026-11-19", end: "2026-12-02" });
    expect(inside.map((p) => p.name)).toEqual(["7.42"]);
  });

  it("patch que sai no dia seguinte ao fim da janela não entra", () => {
    const inside = patchesInWindow(patches, { start: "2026-11-04", end: "2026-11-17" });
    expect(inside.map((p) => p.name)).toEqual(["7.41"]);
  });

  it("aceita a lista fora de ordem", () => {
    const inside = patchesInWindow([...patches].reverse(), { start: "2026-11-05", end: "2026-11-18" });
    expect(inside.map((p) => p.name)).toEqual(["7.41", "7.42"]);
  });
});

describe("describePatches", () => {
  const window = { start: "2026-11-05", end: "2026-11-18" };

  it("um patch na janela inteira", () => {
    expect(describePatches(patchesInWindow(patches, { start: "2026-11-19", end: "2026-12-02" }))).toEqual({
      kind: "one",
      patch: "7.42",
    });
  });

  it("virada de patch dentro da janela", () => {
    expect(describePatches(patchesInWindow(patches, window))).toEqual({
      kind: "turn",
      previous: "7.41",
      current: "7.42",
      currentStartedAt: "2026-11-18T21:28:07.019Z",
    });
  });

  it("três ou mais patches viram lista", () => {
    expect(describePatches(patches.slice(1))).toEqual({ kind: "many", patches: ["7.40", "7.41", "7.42"] });
  });

  it("sem patch não há descrição", () => {
    expect(describePatches([])).toBeNull();
  });
});

describe("formatMetaDay", () => {
  // A máquina de teste pode estar no fuso de Brasília: o dia da STRATZ é UTC e não pode virar o anterior.
  it("escreve o dia UTC sem trocar de dia, no formato de cada idioma", () => {
    expect(formatMetaDay("2026-11-05", "pt")).toBe("05/11");
    expect(formatMetaDay("2026-11-05", "es")).toBe("5/11");
    expect(formatMetaDay("2026-11-05", "en")).toBe("Nov 5");
  });
});

describe("formatUpdatedAt", () => {
  it("escreve dia e hora no horário de Brasília", () => {
    expect(formatUpdatedAt("2026-11-24T09:12:40Z", "pt")).toEqual({ day: "24/11", time: "06:12" });
    expect(formatUpdatedAt("2026-11-24T09:12:40Z", "en")).toEqual({ day: "Nov 24", time: "06:12" });
  });

  it("perto da meia-noite UTC o dia é o de Brasília", () => {
    expect(formatUpdatedAt("2026-11-25T01:30:00Z", "pt")).toEqual({ day: "24/11", time: "22:30" });
  });
});
