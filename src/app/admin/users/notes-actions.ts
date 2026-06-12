"use server";

// Server Action — Notas privadas do admin sobre um usuário (/admin/users/[id]).
//
// Persistência: tabela admin_notes (migration 011 — honor/audit/calibration).
// O modal edita UM blob de texto; a convenção aqui é manter a nota mais
// recente do alvo como "a nota" (update da última row; insert se não existe).
// RLS admin-only na tabela; usamos service client após o gate requireAdmin.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdmin,
  logAdmin,
  UuidSchema,
  type ActionResult,
} from "@/app/admin/pros/admin-gate";

const SaveNotesSchema = z.object({
  targetUserId: UuidSchema,
  note: z
    .string()
    .trim()
    .min(1, "Nota vazia — escreva algo ou feche o modal.")
    .max(4000, "Nota longa demais (máx 4000 caracteres)."),
});

export async function saveAdminNotes(input: {
  targetUserId: string;
  note: string;
}): Promise<ActionResult> {
  const parsed = SaveNotesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }
  const { targetUserId, note } = parsed.data;

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();

  // Nota mais recente do alvo (qualquer admin) — edição contínua do mesmo blob.
  const { data: existing } = await service
    .from("admin_notes")
    .select("id")
    .eq("target_user_id", targetUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await service
      .from("admin_notes")
      .update({ note, admin_user_id: gate.adminId })
      .eq("id", existing.id);
    if (error) return { success: false, error: "Erro ao salvar nota: " + error.message };
  } else {
    const { error } = await service.from("admin_notes").insert({
      admin_user_id: gate.adminId,
      target_user_id: targetUserId,
      note,
    });
    if (error) return { success: false, error: "Erro ao criar nota: " + error.message };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId,
    action: "save_admin_notes",
    reason: "Edição de notas privadas",
    payload: { length: note.length, updated_existing: Boolean(existing) },
  });

  revalidatePath(`/admin/users/${targetUserId}`);

  return { success: true };
}
