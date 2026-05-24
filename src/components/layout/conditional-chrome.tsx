"use client";

// Wrapper client-side que decide se o Header/Footer global aparece em uma rota.
//
// Filosofia (M2 reformulado 2026-05-24): a plataforma é um CLIENT (Dota 2 client real).
// A regra default é "sem Header global". Header só aparecia em rotas EXPLICITAMENTE
// públicas que ainda precisavam navegar como página web tradicional.
//
// Task #66 (2026-05-24): última rota dependente do Header global
// (/coaches/[slug]) migrou pra ClientShell. HEADER_ROUTES agora vazio —
// Header global NUNCA aparece em rota nenhuma. Lista vazia é intencional.
//
// Header global obsoleto — todas rotas usam ClientShell ou são fullscreen splash.
// Task #68 vai deletar este arquivo + Header + Footer.
//
// Importante: Header e Footer permanecem Server Components — só este wrapper é Client.

import { usePathname } from "next/navigation";

// Lista explícita de rotas onde o Header global deve aparecer.
// Default: oculto em qualquer rota não listada (filosofia client-first).
// Vazia desde task #66 — Header global nunca mais aparece. Task #68 deleta tudo.
const HEADER_ROUTES: string[] = [];

export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = pathname
    ? HEADER_ROUTES.some((r) => pathname.startsWith(r))
    : false;

  if (!showHeader) return null;
  return <>{children}</>;
}
