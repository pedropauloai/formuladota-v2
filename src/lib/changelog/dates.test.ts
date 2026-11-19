import { describe, expect, it } from "vitest";
import { changelogDay, changelogMonthKey, changelogMonthLabel } from "./dates";

// 01h de 1º de dezembro em UTC ainda é 30 de novembro em Brasília: o servidor (UTC) e o navegador
// do jogador têm de escrever o mesmo dia, ou a página de novidades quebra a hidratação.
const VIRADA = "2026-12-01T01:00:00Z";

describe("datas das novidades", () => {
  it("usam o fuso de Brasília para o mês, qualquer que seja o fuso da máquina", () => {
    expect(changelogMonthKey(VIRADA)).toBe("2026-11");
    expect(changelogMonthLabel(VIRADA, "pt-BR")).toBe("novembro de 2026");
  });

  it("usam o fuso de Brasília para o dia", () => {
    expect(changelogDay(VIRADA, "pt-BR")).toMatch(/^30 de nov/);
    expect(changelogDay("2026-11-18T23:30:00Z", "pt-BR")).toMatch(/^18 de nov/);
  });
});
