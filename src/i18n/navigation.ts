// Navegação locale-aware (next-intl). Use ESTES no lugar de next/link e
// next/navigation pra que os links/redirects/push respeitem o idioma:
//   - Link      → prepende /en automaticamente quando o locale é "en".
//   - redirect  → redireciona já no idioma certo.
//   - useRouter → push/replace com prefixo de locale.
//   - usePathname → pathname SEM o prefixo de locale (pra comparar rota ativa).
//
// PT (padrão) não ganha prefixo (localePrefix "as-needed"); EN ganha /en.

import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
