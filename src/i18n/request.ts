// next-intl: resolução de idioma por request.
//
// O locale é decidido no middleware (src/lib/supabase/middleware.ts) a partir do
// prefixo de URL (/en) ou cookie/Accept-Language, e injetado no header x-fd-locale.
// Aqui só lemos esse header (fallback: cookie → default).

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const headerLocale = (await headers()).get("x-fd-locale");
  let locale: Locale;

  if (isLocale(headerLocale)) {
    locale = headerLocale;
  } else {
    // Fallback (contextos sem middleware, ex.: geração estática): cookie → default.
    const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
    locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
