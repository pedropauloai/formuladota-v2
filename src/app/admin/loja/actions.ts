"use server";

// Ações do painel da loja: marcar um pedido como entregue. O layout /admin já barra quem não é
// admin, e a ação confere de novo (ação de servidor é endpoint público).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/loja/refs";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin === true;
}

export async function marcarEntregue(orderId: string, entregue: boolean): Promise<{ ok: boolean }> {
  if (!isUuid(orderId) || !(await isAdmin())) return { ok: false };
  const { error } = await createServiceClient()
    .from("store_orders")
    .update({ fulfilled_at: entregue ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", ["pago", "em_revisao"]);
  if (error) {
    console.error("[admin/loja] marcar entregue falhou:", error.message);
    return { ok: false };
  }
  revalidatePath("/admin/loja");
  return { ok: true };
}
