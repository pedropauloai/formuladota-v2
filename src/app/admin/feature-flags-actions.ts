"use server";

// Server action do admin pra ligar/desligar feature flags (tabela feature_flags,
// migration 102). Só admin (requireAdmin). Escrita via service role (RLS só libera
// leitura pública). Revalida o layout inteiro — as flags afetam o shell (topbar etc).

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/admin/pros/admin-gate";
import { createServiceClient } from "@/lib/supabase/service";
import type { FeatureFlagKey } from "@/lib/queries/feature-flags";

export type SetFlagResult = { success: true } | { success: false; error: string };

export async function setFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean
): Promise<SetFlagResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const table = service.from("feature_flags" as never) as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
  const { error } = await table
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return { success: false, error: error.message };

  // Flags mudam a UI em toda rota (topbar, sidebar, menu) → revalida tudo.
  revalidatePath("/", "layout");
  return { success: true };
}
