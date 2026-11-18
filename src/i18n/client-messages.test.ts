import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SERVER_ONLY_NAMESPACES, clientMessages } from "./client-messages";
import pt from "../../messages/pt.json";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("textos fora do pacote do navegador", () => {
  it("varre o código de verdade", () => {
    // Controle: o leitor acha os useTranslations que existem (a loja usa o grupo "loja").
    expect(files.length).toBeGreaterThan(300);
    expect(files.some((f) => /useTranslations\(\s*["']loja["']/.test(f.text))).toBe(true);
  });

  it.each(SERVER_ONLY_NAMESPACES)("nenhum useTranslations pede o grupo %s", (namespace) => {
    const hook = new RegExp(`useTranslations\\(\\s*["'\`]${namespace}(["'\`.])`);
    const rootAccess = new RegExp(`\\bt\\(\\s*["'\`]${namespace}\\.`);
    const usedByHook = files.filter((f) => hook.test(f.text)).map((f) => f.path);
    // useTranslations() sem grupo lê da raiz: aí o acesso vem como t("grupo.chave").
    const usedFromRoot = files
      .filter((f) => /useTranslations\(\s*\)/.test(f.text) && rootAccess.test(f.text))
      .map((f) => f.path);
    expect([...usedByHook, ...usedFromRoot]).toEqual([]);
  });

  it("tira só os grupos do servidor e mantém o resto", () => {
    const client = clientMessages(pt as Record<string, unknown>);
    for (const namespace of SERVER_ONLY_NAMESPACES) expect(client).not.toHaveProperty(namespace);
    expect(client).toHaveProperty("loja");
    expect(client).toHaveProperty("nav");
    expect(Object.keys(client)).toHaveLength(Object.keys(pt).length - SERVER_ONLY_NAMESPACES.length);
  });
});
