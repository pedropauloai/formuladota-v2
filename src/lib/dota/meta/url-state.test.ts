import { describe, expect, it } from "vitest";
import { DEFAULT_MIN, metaHref, parseMetaState } from "./url-state";

describe("parseMetaState", () => {
  it("sem filtro na URL fica no padrão", () => {
    expect(parseMetaState({})).toEqual({ role: "all", period: "patch", min: DEFAULT_MIN, q: "" });
  });

  it("lê função, período, amostra e busca", () => {
    expect(parseMetaState({ position: "2", period: "recent", min: "1000", q: "invoker" })).toEqual({
      role: "2",
      period: "recent",
      min: 1000,
      q: "invoker",
    });
  });

  it("valor fora da lista volta ao padrão e a busca longa é cortada", () => {
    const state = parseMetaState({ position: "6", period: "ontem", min: "750", q: "x".repeat(80), versao: "b" });
    expect(state).toEqual({ role: "all", period: "patch", min: DEFAULT_MIN, q: "x".repeat(40) });
  });

  it("parâmetro repetido usa o primeiro", () => {
    expect(parseMetaState({ position: ["3", "4"] }).role).toBe("3");
  });
});

describe("metaHref", () => {
  const base = parseMetaState({});

  it("o padrão é o /meta sem nada na URL", () => {
    expect(metaHref(base, {})).toBe("/meta");
  });

  it("leva só o que difere do padrão, mantendo o resto", () => {
    const mid = metaHref(base, { role: "2" });
    expect(mid).toBe("/meta?position=2");
    expect(metaHref(parseMetaState({ position: "2", q: "puck" }), { period: "previous", min: 100 })).toBe(
      "/meta?position=2&period=previous&min=100&q=puck"
    );
  });
});
