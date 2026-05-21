"use server";

// Server Actions usadas pelos componentes da landing pública.
// joinCoachQueue: cliente entra na fila de um PRO usando uma ficha do saldo.
// leaveCoachQueue: cliente sai da fila (mantém entry com status=cancelled).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type JoinQueueResult =
  | { success: true; entryId: string }
  | { success: false; error: string };

export async function joinCoachQueue(coachId: string): Promise<JoinQueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Você precisa estar logado pra entrar na fila." };
  }

  // 1. Achar uma purchase paga com saldo de fichas
  const { data: purchases, error: pErr } = await supabase
    .from("purchases")
    .select("id, partidas_compradas, partidas_usadas")
    .eq("user_id", user.id)
    .eq("status", "pago");
  if (pErr) {
    return { success: false, error: "Erro ao buscar saldo de fichas." };
  }
  type PurchaseRow = { id: string; partidas_compradas: number; partidas_usadas: number };
  const purchaseWithBalance = ((purchases ?? []) as PurchaseRow[]).find(
    (p) => p.partidas_compradas - p.partidas_usadas > 0
  );
  if (!purchaseWithBalance) {
    return {
      success: false,
      error: "Você não tem fichas disponíveis. Compre uma ficha primeiro.",
    };
  }

  // 2. Validar que o PRO tá com fila aberta e tem vaga
  const { data: pros, error: prosErr } = await supabase.rpc("get_pros_live_status");
  if (prosErr) {
    return { success: false, error: "Erro ao verificar PRO." };
  }
  type ProRow = {
    coach_id: string;
    fila_aberta: boolean;
    vagas_restantes: number;
  };
  const pro = ((pros ?? []) as ProRow[]).find((p) => p.coach_id === coachId);
  if (!pro) return { success: false, error: "PRO não encontrado." };
  if (!pro.fila_aberta) return { success: false, error: "Fila do PRO está fechada." };
  if (pro.vagas_restantes <= 0) {
    return { success: false, error: "Não há vagas restantes nessa fila." };
  }

  // 3. Inserir entry — RLS valida que user_id = auth.uid()
  const { data, error } = await supabase
    .from("coach_queue_entries")
    .insert({
      coach_id: coachId,
      user_id: user.id,
      purchase_id: purchaseWithBalance.id,
      status: "waiting",
    })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique violation (já está na fila desse PRO)
    if (error.code === "23505") {
      return { success: false, error: "Você já está na fila desse PRO." };
    }
    return { success: false, error: "Erro ao entrar na fila." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true, entryId: data.id };
}

export async function leaveCoachQueue(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Não autenticado." };

  const { error } = await supabase
    .from("coach_queue_entries")
    .update({ status: "cancelled" })
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) return { success: false as const, error: "Erro ao sair da fila." };

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true as const };
}
