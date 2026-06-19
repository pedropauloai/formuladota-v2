// Configuração central de i18n (next-intl, modo "without i18n routing").
//
// Bilíngue PT + EN (Pedro 2026-06-19, pivô internacional). PT é o padrão (base
// brasileira atual); EN somado pro público internacional. Estrutura pronta pra
// somar "es"/"ru" no futuro — basta adicionar à lista + criar messages/<lang>.json.
//
// SEM prefixo de rota: o idioma vive num cookie (NEXT_LOCALE) e é detectado por
// Accept-Language na primeira visita. Nada muda na URL — ver src/i18n/request.ts.

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

// Nome do cookie que persiste a escolha do usuário (1 ano).
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Rótulos pro seletor de idioma.
export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
