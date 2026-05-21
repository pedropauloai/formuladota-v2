"use server";

// Server Actions usadas pelos componentes da landing pública.
// joinCoachQueue: cliente entra na fila de um PRO (valida saldo via user_fichas).
// leaveCoachQueue: cliente sai da fila (mantém entry com status=cancelled).
//
// Saldo é validado mas NÃO decrementado aqui — decremento só no startPT
// (ledger entry source=pt_consumed) quando o PRO inicia a partida.

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

  // 1. Validar saldo via user_fichas (ledger pattern)
  const { data: fichas } = await supabase
    .from("user_fichas")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = fichas?.balance ?? 0;
  if (balance <= 0) {
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

  // 3. Inserir entry — purchase_id agora nullable (ficha pode vir de admin_grant)
  const { data, error } = await supabase
    .from("coach_queue_entries")
    .insert({
      coach_id: coachId,
      user_id: user.id,
      purchase_id: null,
      status: "waiting",
    } as never)
    .select("id")
    .single();
  if (error) {
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
