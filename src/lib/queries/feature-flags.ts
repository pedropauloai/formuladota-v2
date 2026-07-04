// Feature flags — interruptores de funcionalidade lidos do banco (tabela
// feature_flags, migration 102). Leitura pública. O admin liga/desliga pelo painel.
//
// Regra de visibilidade na app: uma feature "escondida" (flag off) ainda aparece
// pro ADMIN (pra testar) — a checagem `flag || isAdmin` fica em cada call site.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FeatureFlagKey = "ranked_com_pro";

export interface FeatureFlags {
  ranked_com_pro: boolean;
}

// Defaults quando a linha não existe / erro de leitura (falha fechada: feature off).
const DEFAULTS: FeatureFlags = {
  ranked_com_pro: false,
};

// React.cache: page e ClientShell chamam no mesmo request — 1 query só.
export const getFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  const supabase = await createClient();
  // Tabela nova (migration 102) fora dos tipos gerados → cast cirúrgico.
  const ff = supabase.from("feature_flags" as never) as unknown as {
    select: (q: string) => PromiseLike<{ data: { key: string; enabled: boolean }[] | null }>;
  };
  const { data } = await ff.select("key, enabled");
  const flags = { ...DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in flags) {
      (flags as Record<string, boolean>)[row.key] = Boolean(row.enabled);
    }
  }
  return flags;
});
