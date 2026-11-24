import { describe, expect, it } from "vitest";
import { captureConstraintsFor, encodingsFor, isQuality, layerKbps, QUALIDADES } from "./qualidade";

describe("as quatro qualidades da tela (spec, seção 11)", () => {
  it("resolução, quadros e bitrate de cada uma, com a camada leve", () => {
    expect(QUALIDADES.leve).toMatchObject({ width: 1280, height: 720, fps: 30, kbps: 1500, lowKbps: 500 });
    expect(QUALIDADES.padrao).toMatchObject({ width: 1920, height: 1080, fps: 30, kbps: 3000, lowKbps: 800 });
    expect(QUALIDADES.alta).toMatchObject({ width: 1920, height: 1080, fps: 30, kbps: 4500, lowKbps: 800 });
    expect(QUALIDADES.fluida).toMatchObject({ width: 1920, height: 1080, fps: 60, kbps: 6000, lowKbps: 1000 });
  });

  it("bitrate de cada camada", () => {
    expect(layerKbps("padrao", "f")).toBe(3000);
    expect(layerKbps("padrao", "h")).toBe(800);
  });

  it("reconhece só as quatro", () => {
    expect(isQuality("fluida")).toBe(true);
    expect(isQuality("ultra")).toBe(false);
    expect(isQuality(null)).toBe(false);
  });
});

describe("envio em duas camadas (simulcast)", () => {
  it("f na qualidade escolhida e h com metade da resolução", () => {
    expect(encodingsFor("padrao")).toEqual([
      { rid: "f", maxBitrate: 3_000_000, maxFramerate: 30 },
      { rid: "h", maxBitrate: 800_000, maxFramerate: 30, scaleResolutionDownBy: 2 },
    ]);
  });

  it("a captura pede a resolução e os quadros da qualidade", () => {
    expect(captureConstraintsFor("fluida")).toEqual({ width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60, max: 60 } });
    expect(captureConstraintsFor("leve")).toEqual({ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } });
  });
});
