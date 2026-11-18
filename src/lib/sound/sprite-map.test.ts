import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { REWARD_LAYER_IDS, SPRITE_MAP, toHowlerSprite, type SoundId } from "./sprite-map";

vi.mock("howler", () => ({}));
const { effectiveVolume } = await import("./manager");

const ids = Object.keys(SPRITE_MAP) as SoundId[];
const fontes = fileURLToPath(new URL("../../../scripts/sound/dota-sfx/", import.meta.url));

describe("sprite de sons", () => {
  it("tem os sons de clique, aba e fila, cada um com duração positiva", () => {
    for (const id of ["click", "tab", "queue_start", "queue_stop", "match_found"] as SoundId[]) {
      expect(SPRITE_MAP[id].duration).toBeGreaterThan(0);
    }
  });

  it("os trechos não se sobrepõem no arquivo", () => {
    const ordenados = [...ids].sort((a, b) => SPRITE_MAP[a].start - SPRITE_MAP[b].start);
    for (let i = 1; i < ordenados.length; i++) {
      const anterior = SPRITE_MAP[ordenados[i - 1] as SoundId];
      expect(SPRITE_MAP[ordenados[i] as SoundId].start).toBeGreaterThanOrEqual(anterior.start + anterior.duration);
    }
  });

  it("cada som tem o arquivo de origem tirado do jogo", () => {
    for (const id of ids) {
      const achou = ["flac", "wav", "mp3"].some((ext) => existsSync(`${fontes}${id}.${ext}`));
      expect(achou, `fonte de ${id}`).toBe(true);
    }
  });

  it("o formato do Howler espelha o mapa e os sons de marco tocam no layer reward", () => {
    expect(toHowlerSprite().tab).toEqual([SPRITE_MAP.tab.start, SPRITE_MAP.tab.duration]);
    expect(REWARD_LAYER_IDS.has("match_found")).toBe(true);
    expect(REWARD_LAYER_IDS.has("click")).toBe(false);
  });
});

describe("volume geral dos efeitos", () => {
  it("multiplica o volume do layer pelo geral", () => {
    expect(effectiveVolume(0.6, 0.5)).toBeCloseTo(0.3);
    expect(effectiveVolume(0.8, 1)).toBeCloseTo(0.8);
  });

  it("zero no geral silencia e o resultado fica entre 0 e 1", () => {
    expect(effectiveVolume(0.6, 0)).toBe(0);
    expect(effectiveVolume(1.5, 1)).toBe(1);
    expect(effectiveVolume(-1, 1)).toBe(0);
  });
});
