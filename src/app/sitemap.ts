// Sitemap das rotas PÚBLICAS (as gateadas por login não entram — o crawler
// seria redirecionado). Cada rota lista as variantes de idioma (hreflang);
// rotas com slug traduzido apontam URLs distintas (/torneios | /tournaments |
// /torneos), as demais compartilham a URL.

import type { MetadataRoute } from "next";
import { SITE_URL, localizedUrls } from "@/lib/seo";

// Espelho de PUBLIC_PATHS (src/lib/supabase/middleware.ts) — manter em sincronia.
const PUBLIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/manifesto", priority: 0.9 },
  { path: "/metodologia", priority: 0.8 },
  { path: "/planos", priority: 0.8 },
  { path: "/ranking", priority: 0.7 },
  { path: "/torneios", priority: 0.7 },
  { path: "/times", priority: 0.6 },
  { path: "/meta", priority: 0.6 },
  { path: "/mmr", priority: 0.6 },
  { path: "/codigo-de-conduta", priority: 0.4 },
  { path: "/privacidade", priority: 0.2 },
  { path: "/cookies", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: SITE_URL + path,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: localizedUrls(path) },
  }));
}
