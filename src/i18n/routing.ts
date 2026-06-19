// Config de routing i18n (next-intl). localePrefix "as-needed":
//   PT (padrão) → URLs limpas em "/" (não quebra links/SEO/bookmarks atuais).
//   EN          → prefixo "/en/..." visível na URL (pivô internacional).
//
// IMPORTANTE: NÃO usamos o middleware padrão do next-intl (que exigiria mover
// todas as rotas pra app/[locale]/). Em vez disso, o prefixo /en é tratado por
// REWRITE no nosso middleware de auth (src/lib/supabase/middleware.ts): /en/x é
// reescrito internamente pra /x, mantendo a estrutura de pastas plana. Os helpers
// de navegação (navigation.ts) geram os hrefs com /en corretamente.

import { defineRouting } from "next-intl/routing";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE } from "./config";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeCookie: { name: LOCALE_COOKIE },
});
