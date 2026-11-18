import { describe, expect, it } from "vitest";
import { principalTabDefs, type TopBarTabFlags } from "./top-bar-tabs";

const hrefs = (flags: TopBarTabFlags) => principalTabDefs(flags).map((d) => d.href);

describe("abas principais do topbar", () => {
  it("mostra a aba LOJA quando a flag loja está ligada", () => {
    expect(hrefs({ showRankedComPro: false, showLoja: true })).toContain("/loja");
  });

  it("esconde a aba LOJA quando a flag loja está desligada", () => {
    expect(hrefs({ showRankedComPro: false, showLoja: false })).not.toContain("/loja");
    expect(hrefs({ showRankedComPro: true, showLoja: false })).not.toContain("/loja");
  });

  it("põe a LOJA logo depois de META", () => {
    const list = hrefs({ showRankedComPro: false, showLoja: true });
    expect(list.indexOf("/loja")).toBe(list.indexOf("/meta") + 1);
  });

  it("mantém Subir MMR preso à flag ranked_com_pro", () => {
    expect(hrefs({ showRankedComPro: true, showLoja: false })[0]).toBe("/ranked-com-pro");
    expect(hrefs({ showRankedComPro: false, showLoja: true })).not.toContain("/ranked-com-pro");
  });

  it("não muda as abas fixas com as flags", () => {
    const fixas = ["/meta", "/ranking", "/partidas", "/times", "/torneios"];
    for (const showRankedComPro of [true, false]) {
      for (const showLoja of [true, false]) {
        const list = hrefs({ showRankedComPro, showLoja });
        expect(list.filter((h) => fixas.includes(h))).toEqual(fixas);
      }
    }
  });
});
