// Slugs de URL traduzidos (Pedro 2026-06-19: "traduza a url mesmo", sem /en).
//
// O idioma é inferido do PRIMEIRO segmento da URL quando ele é exclusivo de um
// idioma:
//   /torneios → PT   |   /tournaments → EN   |   /torneos → ES   (interno: /torneios)
// Slugs iguais em mais de um idioma (perfil, partidas, metodologia…) e rotas
// compartilhadas (/, /ranking, /dashboard) são ambíguos: o idioma delas vem do
// cookie NEXT_LOCale / Accept-Language (resolvido no middleware).
//
// Funções puras — usadas no client (Link/router), no middleware e no server.

import type { Locale } from "./config";

// Mapa canônico (interno = PT) → slug por idioma. SÓ rotas cujo slug muda em
// pelo menos um idioma. ES igual ao PT (perfil, partidas, vincular…) é
// intencional: a URL é compartilhada e o cookie decide o idioma.
export const SEGMENT_PT_TO_EN: Record<string, string> = {
  torneios: "tournaments",
  times: "teams",
  metodologia: "methodology",
  "codigo-de-conduta": "code-of-conduct",
  "ranked-com-pro": "ranked-with-pro",
  perfil: "profile",
  "criar-lobby": "create-lobby",
  partidas: "matches",
  // /assinatura é REDIRECT legado pra /planos (fusão 2026-07-04) — o slug fica
  // pra URLs antigas internalizarem e caírem no redirect.
  assinatura: "subscription",
  planos: "plans",
  pacotes: "packages",
  doutrina: "doctrine",
  vincular: "link",
  privacidade: "privacy",
};

export const SEGMENT_PT_TO_ES: Record<string, string> = {
  torneios: "torneos",
  times: "equipos",
  metodologia: "metodologia",
  "codigo-de-conduta": "codigo-de-conducta",
  "ranked-com-pro": "ranked-con-pro",
  perfil: "perfil",
  "criar-lobby": "crear-lobby",
  partidas: "partidas",
  assinatura: "suscripcion", // legado → redirect /planos
  planos: "planes",
  pacotes: "paquetes",
  doutrina: "doctrina",
  vincular: "vincular",
  privacidade: "privacidad",
};

const SEGMENT_MAPS: Partial<Record<Locale, Record<string, string>>> = {
  en: SEGMENT_PT_TO_EN,
  es: SEGMENT_PT_TO_ES,
};

function reverse(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([pt, other]) => [other, pt]));
}

export const SEGMENT_EN_TO_PT: Record<string, string> = reverse(SEGMENT_PT_TO_EN);
export const SEGMENT_ES_TO_PT: Record<string, string> = reverse(SEGMENT_PT_TO_ES);

function splitFirst(path: string): [string, string[]] {
  const parts = path.split("/").filter((_, i) => i > 0); // remove "" inicial
  const [first, ...rest] = parts;
  return [first ?? "", rest];
}

/** Interno (canônico PT) → slug localizado pro idioma. PT = sem mudança. */
export function localizePath(path: string, locale: string): string {
  const map = SEGMENT_MAPS[locale as Locale];
  if (!map) return path; // pt (ou locale desconhecido)
  const [first, rest] = splitFirst(path);
  const translated = map[first];
  if (!translated || translated === first) return path; // rota compartilhada
  return "/" + [translated, ...rest].join("/");
}

/** Slug localizado (qualquer idioma) → interno canônico (PT). */
export function internalizePath(path: string): string {
  const [first, rest] = splitFirst(path);
  const pt = SEGMENT_EN_TO_PT[first] ?? SEGMENT_ES_TO_PT[first];
  if (!pt || pt === first) return path;
  return "/" + [pt, ...rest].join("/");
}

/**
 * Idioma implícito no slug — só quando o slug é EXCLUSIVO de um idioma:
 *   "en" → /tournaments   |   "pt" → /torneios   |   "es" → /torneos
 *   null → compartilhado/ambíguo (perfil, partidas, raiz…) — cookie decide.
 */
export function localeFromPath(path: string): Locale | null {
  const [first] = splitFirst(path);
  if (!first) return null;
  const claims: Locale[] = [];
  if (first in SEGMENT_PT_TO_EN) claims.push("pt"); // é segmento canônico PT
  if (first in SEGMENT_EN_TO_PT) claims.push("en"); // é slug EN
  if (first in SEGMENT_ES_TO_PT) claims.push("es"); // é slug ES
  // Slug ES idêntico ao PT (perfil, partidas, metodologia…) gera claim dupla
  // pt+es → null (ambíguo, cookie decide). Slug próprio (torneos) → "es".
  return claims.length === 1 ? (claims[0] ?? null) : null;
}
