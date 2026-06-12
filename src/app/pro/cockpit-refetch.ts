"use server";

// Server Action de refetch do cockpit — chamada pelo client a cada evento
// Realtime da fila (e após ações). Re-deriva o coach do usuário logado:
// nunca confia em ids vindos do client.

import { createClient } from "@/lib/supabase/server";
import { getProCockpitData, type CockpitData } from "./cockpit-data";

export async function fetchCockpitData(): Promise<CockpitData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, fila_aberta, fila_aberta_em, fila_max_vagas")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!coach) return null;

  return getProCockpitData(coach);
}
