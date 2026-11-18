import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Lei do i18n: pt, en e es têm exatamente as mesmas chaves (a falta de uma vira texto quebrado na tela).
const LOCALES = ["pt", "en", "es"] as const;
type Messages = Record<string, unknown>;

function load(locale: (typeof LOCALES)[number]): Messages {
  const url = new URL(`../../messages/${locale}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Messages;
}

function flatKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatKeys(value as Messages, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

function flatEntries(obj: Messages, prefix = ""): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([key, value]): Array<[string, unknown]> =>
    value !== null && typeof value === "object"
      ? flatEntries(value as Messages, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]]
  );
}

/**
 * Nomes das variáveis ICU de um texto ("{wins}", "{count, plural, ...}"), em ordem alfabética.
 * Segue as chaves: dentro de plural/select, o texto de cada ramo pode ter variáveis, mas a
 * palavra do ramo ("{# ficha}") não é variável.
 */
function icuArguments(message: string): string {
  const names = new Set<string>();
  const readMessage = (start: number): number => {
    let i = start;
    while (i < message.length && message[i] !== "}") {
      i = message[i] === "{" ? readArgument(i + 1) : i + 1;
    }
    return i;
  };
  const readArgument = (start: number): number => {
    let i = start;
    let name = "";
    while (i < message.length && message[i] !== "," && message[i] !== "}") name += message[i++];
    if (name.trim()) names.add(name.trim());
    if (message[i] === "}") return i + 1;
    // Argumento com tipo: o que vem depois da vírgula tem ramos "chave {texto}" até a chave que fecha.
    while (i < message.length && message[i] !== "}") {
      if (message[i] === "{") i = readMessage(i + 1);
      i += 1;
    }
    return i + 1;
  };
  readMessage(0);
  return [...names].sort().join(",");
}

const messages = Object.fromEntries(LOCALES.map((l) => [l, load(l)])) as Record<
  (typeof LOCALES)[number],
  Messages
>;

describe("paridade das mensagens entre pt, en e es", () => {
  const base = new Set(flatKeys(messages.pt));

  it.each(["en", "es"] as const)("%s tem as mesmas chaves que pt", (locale) => {
    const other = new Set(flatKeys(messages[locale]));
    expect([...base].filter((k) => !other.has(k))).toEqual([]);
    expect([...other].filter((k) => !base.has(k))).toEqual([]);
  });

  // A tradução que troca o nome da variável ({partidas} no lugar de {matches}) some com o número na tela.
  it.each(["en", "es"] as const)("%s usa as mesmas variáveis que pt em cada texto", (locale) => {
    const pt = Object.fromEntries(flatEntries(messages.pt));
    const diffs = flatEntries(messages[locale])
      .filter(([key, value]) => typeof pt[key] === "string" && typeof value === "string")
      .filter(([key, value]) => icuArguments(value as string) !== icuArguments(pt[key] as string))
      .map(([key, value]) => `${key}: pt {${icuArguments(pt[key] as string)}} ${locale} {${icuArguments(value as string)}}`);
    expect(diffs).toEqual([]);
  });

  it("o leitor de variáveis ignora os ramos do plural", () => {
    expect(icuArguments("{count, plural, one {# ficha} other {# fichas}} de {nome}")).toBe("count,nome");
    expect(icuArguments("{wins}V / {losses}D em {matches}")).toBe("losses,matches,wins");
    expect(icuArguments("{n, plural, one {um {item}} other {# itens}}")).toBe("item,n");
  });

  it("a aba da loja usa o termo do cliente do Dota em cada idioma", () => {
    const nav = (l: (typeof LOCALES)[number]) => (messages[l].nav as Record<string, string>).loja;
    expect(nav("pt")).toBe("Loja");
    expect(nav("en")).toBe("Store");
    expect(nav("es")).toBe("Tienda");
  });
});
