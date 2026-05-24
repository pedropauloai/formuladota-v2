"use client";

// Wrapper client-side que decide se o Header/Footer global aparece em uma rota.
//
// Filosofia (M2 reformulado 2026-05-24): a plataforma é um CLIENT (Dota 2 client real).
// A regra default é "sem Header global". Header só aparece em rotas EXPLICITAMENTE
// públicas que ainda precisam navegar como página web tradicional (visitantes
// deslogados navegando perfis públicos de PROs).
//
// Pages que JÁ têm seu próprio chrome (não precisam Header global):
//   - 18 pages usando <ClientShell> do Sistema A (top-bar + sidebars próprios)
//   - Auth/gates fullscreen (/login, /banned, /suspended)
//   - Onboarding cerimonial (/onboarding/doutrina, /vincular/steam)
//   - Landing visitante / (tem chrome próprio embutido)
//   - Dev tools /(dev)/components
//
// Pages que MOSTRAM Header global (exceção, lista explícita):
//   - /coaches/[slug] — perfis públicos de PROs, sem ClientShell
//
// Importante: Header e Footer permanecem Server Components — só este wrapper é Client.

import { usePathname } from "next/navigation";

// Lista explícita de rotas onde o Header global deve aparecer.
// Default: oculto em qualquer rota não listada (filosofia client-first).
const HEADER_ROUTES = [
  "/coaches",
];

export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = pathname
    ? HEADER_ROUTES.some((r) => pathname.startsWith(r))
    : false;

  if (!showHeader) return null;
  return <>{children}</>;
}
