import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import pt from "../../messages/pt.json";

// Toda chave escrita por extenso no código (t("chave")) existe em messages/pt.json. O chat passou
// meses mostrando "CHAT.CHAT" porque o grupo de textos dele nunca foi gravado (a paridade entre
// idiomas não pega: os três estavam igualmente sem as frases).

const SRC = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

type Tree = Record<string, unknown>;

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Tree)[part] : undefined), pt);
}

// const t = useTranslations("ns") | await getTranslations("ns") | getTranslations({ namespace: "ns" }) | useTranslations()
const BINDING =
  /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([\w.]*)["'`]|\{[^}]*?namespace:\s*["'`]([\w.]+)["'`][^}]*\})?\s*\)/g;

interface Missing {
  file: string;
  key: string;
}

function missingKeys(file: string, text: string): Missing[] {
  const bindings = new Map<string, string>();
  for (const m of text.matchAll(BINDING)) {
    const name = m[1] as string;
    const ns = m[2] ?? m[3] ?? "";
    // Mesmo nome com grupos diferentes no arquivo: ambíguo, fica de fora para não acusar à toa.
    bindings.set(name, bindings.has(name) && bindings.get(name) !== ns ? "?" : ns);
  }
  const out: Missing[] = [];
  for (const [name, ns] of bindings) {
    if (ns === "?") continue;
    const call = new RegExp(`(?<![\\w.])${name}(?:\\.(rich|markup|raw))?\\(\\s*["']([\\w.]+)["']`, "g");
    for (const m of text.matchAll(call)) {
      const key = ns ? `${ns}.${m[2]}` : (m[2] as string);
      const value = lookup(key);
      const ok = m[1] === "raw" ? value !== undefined : typeof value === "string";
      if (!ok) out.push({ file: file.slice(SRC.length).replace(/\\/g, "/"), key });
    }
  }
  return out;
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("chaves de texto usadas no código", () => {
  it("varre o código de verdade", () => {
    // Controle: o leitor acha as chamadas e confere chaves que existem.
    const loja = files.find((f) => f.path.replace(/\\/g, "/").endsWith("components/loja/party-buy-panel.tsx"));
    expect(loja).toBeDefined();
    expect(missingKeys(loja!.path, loja!.text)).toEqual([]);
    expect(missingKeys("x.tsx", 'const t = useTranslations("loja"); t("naoExisteEssaChave");')).toHaveLength(1);
  });

  it("toda chave escrita por extenso existe em pt.json", () => {
    const missing = files.flatMap((f) => missingKeys(f.path, f.text));
    expect(missing.map((m) => `${m.file}: ${m.key}`)).toEqual([]);
  });
});
