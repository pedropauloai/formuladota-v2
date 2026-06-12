"use server";

// Server Actions — gestão admin de PERMISSÕES DE PARTIDA (/admin/users/[id]).
//
// Modelo (migrations 043/044): o saldo disponível é DERIVADO, nunca armazenado:
//   disponíveis = floor(acertos_quiz / 5) - match_permissions_consumed
//   (clampado em 0 pela RPC available_match_permissions; acertos =
//    jsonb_array_length(profiles.doctrine_quiz_progress))
//
// Mecanismo escolhido pra conceder/debitar SEM quebrar invariantes: ajustar
// match_permissions_consumed. Conceder N = consumed -= N (pode ficar negativo —
// consumed negativo funciona como CRÉDITO BÔNUS: a RPC só faz a subtração, e
// consume_match_permission só incrementa, então nada no modelo exige >= 0).
// Debitar N = consumed += N. Não tocamos em doctrine_quiz_progress (verdade do
// quiz é imutável — mexer nela falsificaria o progresso de doutrina do user).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdmin,
  logAdmin,
  UuidSchema,
  ReasonSchema,
  type ActionResult,
} from "@/app/admin/pros/admin-gate";

const AdjustPermissionsSchema = z.object({
  targetUserId: UuidSchema,
  amount: z.number().int().min(1, "Mínimo 1.").max(100, "Máximo 100 por operação."),
  mode: z.enum(["grant", "debit"]),
  reason: ReasonSchema,
});

export async function adjustMatchPermissions(input: {
  targetUserId: string;
  amount: number;
  mode: "grant" | "debit";
  reason: string;
}): Promise<ActionResult<{ available: number }>> {
  const parsed = AdjustPermissionsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }
  const { targetUserId, amount, mode, reason } = parsed.data;

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("match_permissions_consumed")
    .eq("id", targetUserId)
    .single();
  if (!profile) return { success: false, error: "Usuário não encontrado." };

  const before = profile.match_permissions_consumed;
  // grant = decrementa consumidas (negativo = crédito bônus); debit = incrementa.
  const after = mode === "grant" ? before - amount : before + amount;

  const { error: updErr } = await service
    .from("profiles")
    .update({ match_permissions_consumed: after })
    .eq("id", targetUserId);
  if (updErr) {
    return { success: false, error: "Erro ao ajustar permissões: " + updErr.message };
  }

  // Saldo final real via a mesma RPC que os gates usam (fonte única de verdade).
  const { data: available } = await service.rpc("available_match_permissions", {
    p_uid: targetUserId,
  });

  await logAdmin({
    adminId: gate.adminId,
    targetUserId,
    action: mode === "grant" ? "grant_match_permissions" : "debit_match_permissions",
    reason,
    payload: {
      amount,
      consumed_before: before,
      consumed_after: after,
      available_after: available ?? null,
    },
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/users");

  return { success: true, data: { available: available ?? 0 } };
}
