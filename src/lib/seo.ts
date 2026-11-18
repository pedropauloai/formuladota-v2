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

const DEFAULT_PREVIEW_IMAGE = { url: "/brand/og-hero.png", width: 1200, height: 630, alt: "FORMULADOTA" };

interface PreviewInput {
  title: string;
  description?: string;
  /** Caminho público da página, ex. "/loja/mentoria". */
  path: string;
  alternates?: Metadata["alternates"];
}

/**
 * Metadados com prévia própria (WhatsApp, Discord, Instagram): título, descrição e endereço da
 * página. Sem isto a página herda o og:title, a descrição e o og:url da home, do layout.
 */
export function pagePreview({ title, description, path, alternates }: PreviewInput): Metadata {
  return {
    title,
    description,
    alternates: { ...alternates, canonical: path },
    openGraph: {
      type: "website",
      siteName: "FORMULADOTA",
      // Sem og:locale: a mesma URL sai em pt, en ou es conforme o visitante.
      title,
      description,
      url: SITE_URL + path,
      images: [DEFAULT_PREVIEW_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_PREVIEW_IMAGE.url] },
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
