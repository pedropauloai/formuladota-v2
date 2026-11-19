// O Battlepass na fila da party: o assinante entra sem pagar, uma entrada por vez, e a fila anda
// pelo revezamento (migration 192). O banco confere o Battlepass ativo e a Steam vinculada.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestMode } from "@/lib/mercadopago";

/** Entra na fila (ou devolve a entrada de pé). null = sem Battlepass ativo, sem Steam ou sem fila. */
export async function enterQueueWithBattlepass(userId: string): Promise<string | null> {
  const { data, error } = await createServiceClient().rpc("party_fila_entrar_battlepass", { p_user_id: userId, p_is_test: isTestMode() });
  if (error) throw new Error(`entrar na fila com o Battlepass falhou: ${error.message}`);
  return typeof data === "string" ? data : null;
}
