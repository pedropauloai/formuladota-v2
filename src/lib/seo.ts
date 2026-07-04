// Helpers de SEO multilíngue (hreflang).
//
// O app serve 3 idiomas (pt/en/es) sem prefixo de rota: algumas rotas têm slug
// traduzido (/torneios | /tournaments | /torneos) e as demais compartilham a
// URL (idioma via cookie). O hreflang só agrega valor onde as URLs DIFEREM —
// nas compartilhadas ele aponta pra mesma URL (aceito pelo Google como página
// multilíngue única).

import type { Metadata } from "next";
import { localizePath } from "@/i18n/pathnames";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

// hreflang → URL absoluta da variante. x-default = inglês (idioma padrão).
// SEM canonical cross-idioma: cada variante é self-canonical (declarar o EN
// como canônico mandaria o Google ignorar as variantes pt/es).
export function languageAlternates(internalPath: string): Metadata["alternates"] {
  const url = (locale: string) => SITE_URL + localizePath(internalPath, locale);
  return {
    languages: {
      "pt-BR": url("pt"),
      en: url("en"),
      es: url("es"),
      "x-default": url("en"),
    },
  };
}

/** Variantes localizadas de um path interno — usado pelo sitemap. */
export function localizedUrls(internalPath: string): Record<string, string> {
  return {
    "pt-BR": SITE_URL + localizePath(internalPath, "pt"),
    en: SITE_URL + localizePath(internalPath, "en"),
    es: SITE_URL + localizePath(internalPath, "es"),
  };
}

export { SITE_URL };
