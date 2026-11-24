import { describe, expect, it } from "vitest";
import { LIGA_TABS, principalTabDefs, type TopBarTabFlags } from "./top-bar-tabs";

// O estado de hoje: loja ligada, liga e Ranked com PRO desligados.
const HOJE: TopBarTabFlags = { showRankedComPro: false, showLoja: true, showLiga: false };
const hrefs = (flags: Partial<TopBarTabFlags> = {}) => principalTabDefs({ ...HOJE, ...flags }).map((d) => d.href);

describe("abas principais do topbar", () => {
  it("abre com a Fila da party, e sem a liga ficam Fila, Partidas, Meta e Loja", () => {
    expect(hrefs()).toEqual(["/party", "/partidas", "/meta", "/loja"]);
  });

  it("Fila e Loja seguem a flag loja (sem loja não há fila da party)", () => {
    expect(hrefs({ showLoja: false })).not.toContain("/party");
    expect(hrefs({ showLoja: false })).not.toContain("/loja");
    expect(hrefs({ showLoja: false, showRankedComPro: true })).not.toContain("/loja");
  });

  it("põe a LOJA logo depois de META", () => {
    const list = hrefs();
    expect(list.indexOf("/loja")).toBe(list.indexOf("/meta") + 1);
  });

  it("mantém Subir MMR preso à flag ranked_com_pro, antes da Fila", () => {
    expect(hrefs({ showRankedComPro: true })[0]).toBe("/ranked-com-pro");
    expect(hrefs({ showRankedComPro: true })[1]).toBe("/party");
    expect(hrefs()).not.toContain("/ranked-com-pro");
  });

  it("Ranking, Times e Torneios só existem com a liga ligada", () => {
    expect([...LIGA_TABS].sort()).toEqual(["ranking", "times", "torneios"]);
    for (const href of ["/ranking", "/times", "/torneios"]) {
      expect(hrefs({ showLiga: false })).not.toContain(href);
      expect(hrefs({ showLiga: true })).toContain(href);
    }
    expect(hrefs({ showLiga: true }).slice(-3)).toEqual(["/ranking", "/times", "/torneios"]);
  });

  it("Partidas e Meta não mudam com nenhuma flag", () => {
    for (const showRankedComPro of [true, false]) {
      for (const showLoja of [true, false]) {
        for (const showLiga of [true, false]) {
          const list = hrefs({ showRankedComPro, showLoja, showLiga });
          expect(list.filter((h) => h === "/partidas" || h === "/meta")).toEqual(["/partidas", "/meta"]);
        }
      }
    }
  });
});
