// next-intl: resolução de idioma por request (modo "without i18n routing").
//
// Prioridade: 1) cookie NEXT_LOCALE (escolha explícita do usuário no seletor)
//             2) Accept-Language do navegador (en* → en, resto → pt)
//             3) DEFAULT_LOCALE (pt)
//
// Roda no servidor a cada request. Não precisa de middleware do next-intl — a
// detecção é feita aqui, sem tocar nas URLs nem no middleware de auth existente.

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;

  let locale: Locale;
  if (isLocale(cookieLocale)) {
    // Escolha explícita do usuário tem prioridade absoluta.
    locale = cookieLocale;
  } else {
    // Primeira visita sem cookie: detecta pelo navegador.
    const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
    locale = accept.startsWith("en") ? "en" : DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
