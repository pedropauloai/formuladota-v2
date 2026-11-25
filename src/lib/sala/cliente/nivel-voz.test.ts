import { describe, expect, it } from "vitest";
import { segurarFala } from "./nivel-voz";

describe("segurarFala (o anel de quem fala não pisca entre as sílabas)", () => {
  it("acende na hora em que a voz passa do limiar", () => {
    const ultima = new Map<string, number>();
    expect(segurarFala(ultima, ["a"], 1000, 400)).toEqual(["a"]);
  });

  it("fica aceso um instante depois da voz cair, e apaga passado esse tempo", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    expect(segurarFala(ultima, [], 1300, 400)).toEqual(["a"]);
    expect(segurarFala(ultima, [], 1400, 400)).toEqual([]);
  });

  it("quem volta a falar antes de apagar continua aceso sem piscar", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    segurarFala(ultima, [], 1200, 400);
    segurarFala(ultima, ["a"], 1350, 400);
    expect(segurarFala(ultima, [], 1700, 400)).toEqual(["a"]);
  });

  it("cada pessoa tem o próprio tempo", () => {
    const ultima = new Map<string, number>();
    segurarFala(ultima, ["a"], 1000, 400);
    segurarFala(ultima, ["b"], 1300, 400);
    expect(segurarFala(ultima, [], 1500, 400)).toEqual(["b"]);
  });
});
