// Saldo de fichas do usuário = soma de partidas_compradas - partidas_usadas
// em purchases pagas. Não precisa de tabela separada de "fichas" pq purchases
// já é a unidade contábil.

import { createClient } from "@/lib/supabase/server";

export async function getMyFichaBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("partidas_compradas, partidas_usadas")
    .eq("user_id", userId)
    .eq("status", "pago");
  if (error || !data) return 0;
  return data.reduce(
    (acc, p) => acc + (p.partidas_compradas - p.partidas_usadas),
    0
  );
}
