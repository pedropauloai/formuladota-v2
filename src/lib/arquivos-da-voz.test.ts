import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Fora de src/lib/sala de propósito: a mutação das travas da sala roda só lá, e este teste reprovaria
// qualquer mutação da porta por o arquivo gerado ficar diferente, escondendo se a lógica foi pega.
describe("arquivos públicos do filtro de voz (/voz)", () => {
  it("o processador da porta e o RNNoise estão em dia com o código e com o pacote instalado", () => {
    const r = spawnSync(process.execPath, ["scripts/sala/arquivos-voz.mjs", "--conferir"], { encoding: "utf8" });
    expect(r.stdout + r.stderr).toContain("arquivos da voz em dia");
    expect(r.status).toBe(0);
  });
});
