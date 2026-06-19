"use server";

// Server Action: grava a escolha de idioma no cookie NEXT_LOCALE.
// Chamada pelo LanguageSwitcher (client) — depois o client dá router.refresh()
// pra re-renderizar tudo no novo idioma (Server Components leem o cookie de novo).

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

export async function setLocale(next: string) {
  const locale: Locale = isLocale(next) ? next : DEFAULT_LOCALE;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: "lax",
  });
}
