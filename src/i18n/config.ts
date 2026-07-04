// Configuração central de i18n (next-intl, modo "without i18n routing").
//
// Trilíngue PT + EN + ES (Pedro 2026-07-04, 3 regiões: BR/LATAM/EU). EN é o
// padrão (beachhead internacional); PT/ES resolvidos por Accept-Language/geo.
// IMPORTANTE: idioma NÃO define região de jogo — são eixos independentes
// (um peruano pode usar a UI em inglês e jogar na fila LATAM).
//
// SEM prefixo de rota: o idioma vive num cookie (NEXT_LOCALE) e é detectado por
// Accept-Language / país (x-vercel-ip-country) na primeira visita. Rotas com
// slug traduzido (/torneios | /tournaments | /torneos) carregam o idioma na URL
// — ver src/i18n/pathnames.ts e src/lib/supabase/middleware.ts.

export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Nome do cookie que persiste a escolha do usuário (1 ano).
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Rótulos pro seletor de idioma.
export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// --- Detecção de idioma na primeira visita (sem cookie) --------------------
// Ordem de resolução (middleware): cookie NEXT_LOCALE (escolha manual SEMPRE
// vence) → Accept-Language (pt*→pt, es*→es, resto→en) → x-vercel-ip-country
// (BR→pt, América hispânica→es, resto→en) → en.

// Países de língua espanhola da América (LATAM hispânica). BR NÃO é LATAM aqui
// — BR→pt. A lista é só pra IDIOMA da UI; região de jogo é outro eixo.
const SPANISH_AMERICA = new Set([
  "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT", "HN", "MX",
  "NI", "PA", "PY", "PE", "PR", "UY", "VE",
]);

/** Accept-Language → locale. Retorna null se o header estiver ausente/vazio. */
export function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header?.trim()) return null;
  // Tags em ordem de preferência do navegador (q ignorado — a ordem já basta).
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    if (!tag || tag === "*") continue;
    if (tag.startsWith("pt")) return "pt";
    if (tag.startsWith("es")) return "es";
  }
  // Header presente mas sem pt/es → inglês.
  return "en";
}

/** País (x-vercel-ip-country) → locale. */
export function localeFromCountry(country: string | null): Locale {
  if (!country) return DEFAULT_LOCALE;
  const c = country.toUpperCase();
  if (c === "BR") return "pt";
  if (SPANISH_AMERICA.has(c)) return "es";
  return "en";
}
