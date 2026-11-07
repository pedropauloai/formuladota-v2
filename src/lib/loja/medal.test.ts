import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { mmrToDotaRank } from "@/lib/dota/rank-badges";
import { medalForMmr } from "./medal";

describe("medalForMmr", () => {
  it("dá a mesma medalha que o resto do site para todo MMR de 0 a 7.000", () => {
    for (let mmr = 0; mmr <= 7000; mmr += 10) {
      expect(medalForMmr(mmr).rank).toBe(mmrToDotaRank(mmr));
    }
  });

  it("divide a medalha em 5 estrelas", () => {
    expect(medalForMmr(3850)).toEqual({ rank: "ancient", stars: 1, image: "ancient-1" });
    expect(medalForMmr(4619)).toEqual({ rank: "ancient", stars: 5, image: "ancient-5" });
    expect(medalForMmr(4620)).toEqual({ rank: "divine", stars: 1, image: "divine-1" });
    expect(medalForMmr(5619)).toEqual({ rank: "divine", stars: 5, image: "divine-5" });
  });

  it("Imortal não tem estrela", () => {
    expect(medalForMmr(5620)).toEqual({ rank: "immortal", stars: 0, image: "immortal" });
  });

  it("toda imagem que a calculadora pede existe no site", () => {
    for (let mmr = 0; mmr <= 6500; mmr += 25) {
      const file = join(process.cwd(), "public", "icons", "dota-ranks", `${medalForMmr(mmr).image}.png`);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
