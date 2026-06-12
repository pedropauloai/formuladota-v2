"use server";

// Server Action — encerramento ADMIN de sala (/admin/lobbies).
//
// Variante admin-gated de cancelLobby (src/app/lobbies/[id]/actions.ts), que é
// um DELETE sem gate explícito feito pro líder via RLS. Aqui: requireAdmin +
// motivo obrigatório + audit log + service client (delete cascade limpa
// lobby_players e a trigger da migration 020 devolve o bot ao pool).

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdmin,
  logAdmin,
  UuidSchema,
  ReasonSchema,
  type ActionResult,
} from "@/app/admin/pros/admin-gate";

export async function adminCloseLobby(input: {
  lobbyId: string;
  reason: string;
}): Promise<ActionResult> {
  const parsedId = UuidSchema.safeParse(input.lobbyId);
  if (!parsedId.success) return { success: false, error: "Lobby ID inválido." };
  const parsedReason = ReasonSchema.safeParse(input.reason);
  if (!parsedReason.success) {
    return { success: false, error: parsedReason.error.issues[0]?.message ?? "Motivo inválido." };
  }

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();

  // Snapshot pro audit antes do delete (a row some).
  const { data: lobby } = await service
    .from("lobbies")
    .select("id, name, status, created_by, created_at, league_id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (!lobby) return { success: false, error: "Sala não encontrada (já encerrada?)." };

  const { error: delErr } = await service.from("lobbies").delete().eq("id", lobby.id);
  if (delErr) return { success: false, error: "Erro ao encerrar sala: " + delErr.message };

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: lobby.created_by,
    action: "admin_close_lobby",
    reason: parsedReason.data,
    payload: {
      lobby_id: lobby.id,
      name: lobby.name,
      status: lobby.status,
      league_id: lobby.league_id,
      created_at: lobby.created_at,
    },
  });

  revalidatePath("/admin/lobbies");
  revalidatePath("/ranked-com-pro");

  return { success: true };
}
