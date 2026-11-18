// Sitemap das rotas PÚBLICAS (as gateadas por login não entram — o crawler
// seria redirecionado). Cada rota lista as variantes de idioma (hreflang);
// rotas com slug traduzido apontam URLs distintas (/torneios | /tournaments |
// /torneos), as demais compartilham a URL.

import type { MetadataRoute } from "next";
import { SITE_URL, localizedUrls } from "@/lib/seo";
import { getActiveProducts } from "@/lib/loja/catalog";

// Espelho de PUBLIC_PATHS (src/lib/supabase/middleware.ts), só com as páginas que existem.
// /privacidade e /cookies saíram: davam 404 (a página de privacidade espera o texto do Pedro).
const PUBLIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/loja", priority: 0.9 },
  { path: "/manifesto", priority: 0.9 },
  { path: "/metodologia", priority: 0.8 },
  { path: "/planos", priority: 0.8 },
  { path: "/ranking", priority: 0.7 },
  { path: "/torneios", priority: 0.7 },
  { path: "/times", priority: 0.6 },
  { path: "/meta", priority: 0.6 },
  { path: "/mmr", priority: 0.6 },
  { path: "/partidas", priority: 0.5 },
  { path: "/mural", priority: 0.3 },
  { path: "/novidades", priority: 0.4 },
  { path: "/codigo-de-conduta", priority: 0.4 },
];

async function productPaths(): Promise<string[]> {
  try {
    return (await getActiveProducts()).map((p) => `/loja/${p.slug}`);
  } catch (err) {
    // Sem os produtos o sitemap sai com as rotas fixas, em vez de dar erro ao robô.
    console.error("[sitemap] produtos da loja:", err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [...PUBLIC_ROUTES, ...(await productPaths()).map((path) => ({ path, priority: 0.8 }))];
  return routes.map(({ path, priority }) => ({
    url: SITE_URL + path,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: localizedUrls(path) },
  }));
}
