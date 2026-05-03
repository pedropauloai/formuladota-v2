"use server";

// Server Action FORMULADOTA — criar lobby in-house.
// Phase 5 H3.1-H3.6: cria row em lobbies + chama bot Railway API.
//
// RLS gate: insert lobbies exige has_active_subscription() (Phase 4) +
// is_user_active() + has_accepted_doctrine() (Phase 1.5).

import crypto from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { botCreateLobby } from "@/lib/bot";

const inputSchema = z.object({
  name: z.string().min(3).max(60),
  gameMode: z.enum(["all_pick", "captains_mode", "random_draft", "single_draft"]),
});

export type CreateLobbyResult =
  | { success: true; lobbyId: string; password: string }
  | { success: false; error: string };

export async function createLobby(formData: FormData): Promise<CreateLobbyResult> {
  const parsed = inputSchema.safeParse({
    name: formData.get("name"),
    gameMode: formData.get("gameMode"),
  });
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Senha do lobby (8 chars hex, mostrada uma vez ao criador)
  const password = crypto.randomBytes(4).toString("hex");

  // INSERT lobby — RLS gate verifica subscription/doutrina
  const { data: lobby, error: insertErr } = await supabase
    .from("lobbies")
    .insert({
      name: parsed.data.name,
      password,
      game_mode: parsed.data.gameMode,
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !lobby) {
    if (insertErr?.code === "42501") {
      return {
        success: false,
        error: "Mensalidade ativa exigida pra criar lobby. Verifique /assinatura.",
      };
    }
    console.error("[createLobby] insert falhou:", insertErr?.message);
    return { success: false, error: "Erro ao criar lobby. Tente novamente." };
  }

  // Chama bot Steam pra criar lobby Dota 2 GC
  const botResult = await botCreateLobby({
    lobbyId: lobby.id,
    name: parsed.data.name,
    password,
    gameMode: parsed.data.gameMode,
  });

  if (!botResult.success) {
    // Bot offline: mantém row em DB com status 'bot_unavailable' (bot já marca via service-role)
    return { success: false, error: botResult.error };
  }

  return { success: true, lobbyId: lobby.id, password };
}

export async function cancelLobby(formData: FormData): Promise<void> {
  const lobbyId = formData.get("lobbyId");
  if (typeof lobbyId !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("lobbies")
    .update({ status: "cancelled" })
    .eq("id", lobbyId);

  redirect("/lobbies");
}
