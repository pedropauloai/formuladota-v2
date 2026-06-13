"use server";

// Server Action do botão "Sincronizar com a Steam" — força o refresh do
// snapshot de identidade (fura o cache de 1h da Steam Web API).
// Sempre opera no PRÓPRIO usuário logado — nunca recebe id do client.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { refreshSteamIdentity } from "@/lib/steam/refresh-identity";

export async function syncSteamIdentityNow(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const changed = await refreshSteamIdentity(user.id, { force: true });
  if (changed) revalidatePath("/me");
  return changed;
}
