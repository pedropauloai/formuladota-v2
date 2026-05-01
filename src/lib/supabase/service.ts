// Cliente Supabase com SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
//
// USAR APENAS em API Routes de webhook (/api/webhooks/*) ou jobs sistêmicos.
// NUNCA importar em Server Components, Server Actions de usuário, ou Client Components.
// Bypass de RLS é justo aqui porque webhooks são triggers sistêmicos sem cookie de sessão.
//
// Para mutations de usuário, usar createClient() de @/lib/supabase/server (cookie-based).

import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createServiceClient() {
  const serviceKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
