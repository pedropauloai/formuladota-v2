// Saldo de fichas via ledger pattern (migration 025).
// user_fichas.balance é materializado; trigger mantém atualizado.

import { createClient } from "@/lib/supabase/server";

export async function getMyFichaBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_fichas")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}
