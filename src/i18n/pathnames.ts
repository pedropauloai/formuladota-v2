// Slugs de URL traduzidos (Pedro 2026-06-19: "traduza a url mesmo", sem /en).
//
// O idioma é inferido do PRIMEIRO segmento da URL, que é único por idioma:
//   /torneios       → PT   |   /tournaments → EN   (interno: /torneios)
// Rotas com o mesmo slug nos dois idiomas (manifesto, ranking, dashboard…) são
// "compartilhadas": o idioma delas vem do cookie NEXT_LOCALE (definido pelo seletor).
//
// Funções puras — usadas no client (Link/router), no middleware e no server.

// Mapa canônico (interno = PT) → slug em inglês. SÓ rotas cujo slug muda.
export const SEGMENT_PT_TO_EN: Record<string, string> = {
  torneios: "tournaments",
  times: "teams",
  metodologia: "methodology",
  "codigo-de-conduta": "code-of-conduct",
  "ranked-com-pro": "ranked-with-pro",
  perfil: "profile",
  "criar-lobby": "create-lobby",
  partidas: "matches",
  assinatura: "subscription",
  pacotes: "packages",
  doutrina: "doctrine",
  vincular: "link",
  privacidade: "privacy",
};

export const SEGMENT_EN_TO_PT: Record<string, string> = Object.fromEntries(
  Object.entries(SEGMENT_PT_TO_EN).map(([pt, en]) => [en, pt])
);

function splitFirst(path: string): [string, string[]] {
  const parts = path.split("/").filter((_, i) => i > 0); // remove "" inicial
  const [first, ...rest] = parts;
  return [first ?? "", rest];
}

/** Interno (canônico PT) → slug localizado pro idioma. PT = sem mudança. */
export function localizePath(path: string, locale: string): string {
  if (locale !== "en") return path;
  const [first, rest] = splitFirst(path);
  const en = SEGMENT_PT_TO_EN[first];
  if (!en) return path; // rota compartilhada
  return "/" + [en, ...rest].join("/");
}

/** Slug localizado (qualquer idioma) → interno canônico (PT). */
export function internalizePath(path: string): string {
  const [first, rest] = splitFirst(path);
  const pt = SEGMENT_EN_TO_PT[first];
  if (!pt) return path;
  return "/" + [pt, ...rest].join("/");
}

/**
 * Idioma implícito no slug:
 *   "en"  → slug é exclusivamente inglês (/tournaments)
 *   "pt"  → slug é exclusivamente português (/torneios)
 *   null  → slug compartilhado/raiz (idioma vem do cookie)
 */
export function localeFromPath(path: string): "en" | "pt" | null {
  const [first] = splitFirst(path);
  if (first in SEGMENT_EN_TO_PT) return "en";
  if (first in SEGMENT_PT_TO_EN) return "pt";
  return null;
}
