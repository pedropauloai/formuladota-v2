import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { publicEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Cliente Supabase para Server Components, Route Handlers e Server Actions.
// Persiste sessão via cookies HttpOnly (gerenciados pelo Next).
//
// React.cache = memoização POR REQUEST: dentro do mesmo render (page + shell +
// helpers), chamadas repetidas devolvem a mesma instância em vez de recriar.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll pode falhar dentro de Server Components puros.
            // Middleware refresh cobre esse caso.
          }
        },
      },
    }
  );
});

// Usuário autenticado do request atual, deduplicado por React.cache.
// auth.getUser() valida o JWT contra o servidor de Auth (round-trip de rede
// REAL) — sem cache, middleware + page + shell pagavam 3x no mesmo request.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
