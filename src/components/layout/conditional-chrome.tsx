"use client";

// Wrapper client-side que oculta o Header/Footer global em rotas fullscreen
// (ex: /dashboard logged-in que tem sua propria top-bar + bottom-bar estilo client Dota).
// Header e Footer permanecem Server Components — só essa wrapper é client.

import { usePathname } from "next/navigation";

// Rotas que usam ClientShell (top-bar + sidebars + bottom-bar próprios) em vez do
// Header/Footer global. Todas pages logged-in usam shell estilo client de matchmaking.
const FULLSCREEN_ROUTES = [
  "/dashboard",
  "/lobbies",
  "/ranking",
  "/me",
  "/perfil",
  "/pacotes",
  "/checkout",
  "/assinatura",
  "/partidas",
  "/criar-lobby",
  "/admin",
];

export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r))) {
    return null;
  }
  return <>{children}</>;
}
