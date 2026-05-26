"use server";

// Sidebar preference — toggle expanded/collapsed estado global.
// Cookie sidebar_expanded NÃO é httpOnly (intencional — D-01):
//   - Server Component lê pra renderizar largura correta no SSR
//   - Client Component lê pra animar transição sem flash
// Difere de preview_mode.ts que É httpOnly (client não precisa ler).
//
// Per decisões D-01 (cookie SSR-safe), D-02 (default expandida),
// D-06 (Server Action + revalidatePath("/", "layout")).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "sidebar_expanded";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

/**
 * Lê preferência de sidebar do cookie.
 * Default: true (expandida) — D-02 espec novos users descobrem amigos imediato.
 */
export async function getSidebarExpanded(): Promise<boolean> {
  const cookieStore = await cookies();
  // Cookie ausente OU valor diferente de "0" → expandida (true)
  return cookieStore.get(COOKIE_NAME)?.value !== "0";
}

/**
 * Alterna estado expanded/collapsed e revalida layout pra refletir width nova.
 */
export async function toggleSidebar(): Promise<void> {
  const cookieStore = await cookies();
  const current = cookieStore.get(COOKIE_NAME)?.value;
  // Estado atual: "0" = colapsada; qualquer outro valor (incluindo ausente) = expandida
  const nextValue = current === "0" ? "1" : "0";

  cookieStore.set(COOKIE_NAME, nextValue, {
    maxAge: ONE_YEAR_SEC,
    httpOnly: false, // INTENCIONAL — client lê pra animar sem flash (D-01)
    sameSite: "lax",
    path: "/",
  });

  // Revalida layout inteiro pra Server Component da shell pegar novo cookie
  revalidatePath("/", "layout");
}
