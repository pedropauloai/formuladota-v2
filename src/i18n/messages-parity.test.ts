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

  it("a aba da loja usa o termo do cliente do Dota em cada idioma", () => {
    const nav = (l: (typeof LOCALES)[number]) => (messages[l].nav as Record<string, string>).loja;
    expect(nav("pt")).toBe("Loja");
    expect(nav("en")).toBe("Store");
    expect(nav("es")).toBe("Tienda");
  });
});
