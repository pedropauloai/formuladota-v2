"use server";

// Server Actions ADMIN sobre filas de PROs — variantes admin-gated.
//
// Diferença das actions do PRO (./actions.ts): aqui o ALVO vem por parâmetro
// (coachId / entryId) e o gate é profiles.is_admin do CALLER — nunca
// confiamos no client. Mutações usam o client do usuário logado (as RLS
// policies "admin manages coaches" / "admin all queue" autorizam); audit log
// via service client em admin-gate.ts.
//
// Actions de PT (cancelar/confirmar/validar) estão em ./admin-pt-actions.ts.

import { createClient } from "@/lib/supabase/server";
import { getAdminProsData } from "./admin-pros-data";
import type { AdminProsData } from "./admin-pros-types";
import {
  type ActionResult,
  ReasonSchema,
  UuidSchema,
  logAdmin,
  requireAdmin,
  revalidateQueueRoutes,
} from "./admin-gate";

// ─── Refetch do snapshot (Realtime / botão Atualizar) ───────────────────────

export async function fetchAdminProsData(): Promise<AdminProsData | null> {
  const gate = await requireAdmin();
  if (!gate.ok) return null;
  return getAdminProsData();
}

// ─── adminToggleCoachFila — forçar abrir/fechar fila de QUALQUER coach ───────
// Fechar cancela todas as entries waiting (mesma cascade do togglePROFila).

export async function adminToggleCoachFila(
  coachId: string,
  open: boolean
): Promise<ActionResult<{ cancelledEntries: number }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!UuidSchema.safeParse(coachId).success) {
    return { success: false, error: "Coach inválido." };
  }

  const supabase = await createClient();
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, profile_id, fila_aberta")
    .eq("id", coachId)
    .single();
  if (!coach) return { success: false, error: "PRO não encontrado." };

  const { error } = await supabase
    .from("coaches")
    .update({
      fila_aberta: open,
      fila_aberta_em: open ? new Date().toISOString() : null,
    })
    .eq("id", coachId);
  if (error) return { success: false, error: "Erro ao atualizar fila." };

  let cancelledEntries = 0;
  if (!open) {
    const { data, error: cancelErr } = await supabase.rpc(
      "cancel_pro_waiting_entries",
      { p_coach_id: coachId, p_reason: "Fila fechada pelo admin" }
    );
    if (cancelErr) {
      console.error("[adminToggleCoachFila] cancel waiting falhou", cancelErr.message);
    } else {
      cancelledEntries = (data as number) ?? 0;
    }
  }

  void logAdmin({
    adminId: gate.adminId,
    targetUserId: coach.profile_id,
    action: open ? "admin_open_pro_fila" : "admin_close_pro_fila",
    reason: "Intervenção via /admin/pros",
    payload: { coachId, cancelledEntries },
  });
  revalidateQueueRoutes();
  return { success: true, data: { cancelledEntries } };
}

// ─── adminRemoveFromQueue — remover aluno da fila de QUALQUER coach ──────────
// Ficha do aluno fica intacta (entry waiting nunca foi cobrada).

export async function adminRemoveFromQueue(
  entryId: string,
  reason: string
): Promise<ActionResult<{ entryId: string }>> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const reasonParsed = ReasonSchema.safeParse(reason);
  if (!reasonParsed.success) {
    return {
      success: false,
      error: reasonParsed.error.errors[0]?.message ?? "Motivo inválido.",
    };
  }

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, user_id, status")
    .eq("id", entryId)
    .single();
  if (!entry) return { success: false, error: "Entry não encontrada." };
  if (entry.status !== "waiting") {
    return { success: false, error: `Entry já está ${entry.status}.` };
  }

  const { error } = await supabase
    .from("coach_queue_entries")
    .update({ status: "cancelled" } as never)
    .eq("id", entryId);
  if (error) return { success: false, error: "Erro ao remover: " + error.message };

  void logAdmin({
    adminId: gate.adminId,
    targetUserId: entry.user_id,
    action: "admin_remove_from_queue",
    reason: reasonParsed.data,
    payload: { entryId, coachId: entry.coach_id },
  });
  revalidateQueueRoutes();
  return { success: true, data: { entryId } };
}
