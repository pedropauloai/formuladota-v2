// Datas das novidades no fuso da comunidade (Brasília). O servidor (Cloudflare, em UTC) e o
// navegador precisam escrever o mesmo dia: sem fuso fixo, a entrada publicada perto da meia-noite
// saía com um dia no servidor e outro no navegador, e o React acusava erro de hidratação (418).
export const CHANGELOG_TIME_ZONE = "America/Sao_Paulo";

/** Chave AAAA-MM do mês da entrada (en-CA escreve o ano antes do mês). */
export function changelogMonthKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHANGELOG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(new Date(iso));
}

/** Nome do mês para o filtro ("novembro de 2026"). */
export function changelogMonthLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CHANGELOG_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Data curta da entrada ("18 de nov. de 2026"). */
export function changelogDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CHANGELOG_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
