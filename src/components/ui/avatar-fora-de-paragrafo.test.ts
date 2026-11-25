import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A foto (UserAvatar) é um <div>: aberta dentro de um <p>, o navegador fecha o parágrafo antes
// dela, a hidratação quebra e o React refaz a tela por cima (apagando o que a pessoa digitava).
const FOTO = /<UserAvatar\b|<BuyerName\b|<FinishedWho\b|<XpAvatarRing\b/;
const INICIO_DO_JSX = /^\s*return\s*\(|^\s*(export\s+)?function\s|=>\s*\($/;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : []
  );
}

/** Linhas (1-based) em que uma foto abre com um <p> ainda aberto acima dela no mesmo JSX. */
function fotosDentroDeParagrafo(source: string): number[] {
  const lines = source.split(/\r?\n/);
  const hits: number[] = [];
  lines.forEach((line, i) => {
    if (!FOTO.test(line)) return;
    let open = 0;
    for (let j = i; j >= 0 && j > i - 40; j--) {
      const s = lines[j] ?? "";
      open += (s.match(/<p[\s>]/g) ?? []).length - (s.match(/<\/p>/g) ?? []).length;
      if (j < i && INICIO_DO_JSX.test(s)) break;
    }
    if (open > 0) hits.push(i + 1);
  });
  return hits;
}

describe("foto fora de parágrafo", () => {
  it("acha a foto aberta dentro de um <p>", () => {
    expect(fotosDentroDeParagrafo(`return (\n  <p className="x">\n    <UserAvatar src="a" />\n  </p>\n);`)).toEqual([3]);
  });

  it("aceita a foto fora de parágrafo e depois de um <p> fechado", () => {
    expect(fotosDentroDeParagrafo(`return (\n  <div>\n    <p>texto</p>\n    <UserAvatar src="a" />\n  </div>\n);`)).toEqual([]);
  });

  it("nenhuma foto do site abre dentro de um <p>", () => {
    const files = tsxFiles("src");
    const found = files.flatMap((f) => fotosDentroDeParagrafo(readFileSync(f, "utf8")).map((line) => `${f}:${line}`));
    expect(files.length).toBeGreaterThan(100);
    expect(found).toEqual([]);
  });
});
