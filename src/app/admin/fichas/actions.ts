"use server";

// Server actions admin pra ajustar saldo de fichas de qualquer user.
// Insere entry em ficha_ledger; trigger atualiza user_fichas.balance.
// Se delta negativo deixaria saldo < 0, CHECK violation aborta.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdjustResult =
  | { success: true; ledgerId: string; newBalance: number }
  | { success: false; error: string };

interface AdjustInput {
  userId: string;
  delta: number;
  reason: string;
}

export async function adjustUserFichas(input: AdjustInput): Promise<AdjustResult> {
  if (input.delta === 0) {
    return { success: false, error: "Delta não pode ser zero." };
  }
  if (Math.abs(input.delta) > 1000) {
    return { success: false, error: "Delta absurdo (máx 1000 por operação)." };
  }
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { success: false, error: "Razão obrigatória (mínimo 3 caracteres)." };
  }
  if (reason.length > 500) {
    return { success: false, error: "Razão muito longa (máx 500 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Validar que quem está chamando é admin REAL (preview mode não pode ajustar)
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!adminProfile?.is_admin) {
    return { success: false, error: "Apenas admin pode ajustar fichas." };
  }

  // Validar que user-alvo existe
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();
  if (!targetProfile) {
    return { success: false, error: "Usuário-alvo não encontrado." };
  }

  // Insere ledger entry; trigger atualiza user_fichas.balance
  const source = input.delta > 0 ? "admin_grant" : "admin_debit";
  const { data: ledgerEntry, error: ledgerErr } = await supabase
    .from("ficha_ledger")
    .insert({
      user_id: input.userId,
      delta: input.delta,
      source,
      reason,
      admin_user_id: user.id,
    } as never)
    .select("id")
    .single();
  if (ledgerErr) {
    // CHECK violation = saldo insuficiente pra debit
    if (ledgerErr.message.includes("user_fichas_balance_check")) {
      return {
        success: false,
        error: "Saldo insuficiente — debit deixaria saldo negativo.",
      };
    }
    return { success: false, error: "Erro: " + ledgerErr.message };
  }

  // Buscar saldo atualizado pra retornar
  const { data: balanceRow } = await supabase
    .from("user_fichas")
    .select("balance")
    .eq("user_id", input.userId)
    .single();

  revalidatePath("/admin/users");
  revalidatePath("/admin/fichas");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return {
    success: true,
    ledgerId: ledgerEntry.id,
    newBalance: balanceRow?.balance ?? 0,
  };
}
