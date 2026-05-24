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

  // BOT_NOT_CONFIGURED: bot ainda não foi deployado no Railway (pendência Pedro).
  // Em dev/staging marca o lobby como 'open' diretamente com steam_lobby_id placeholder
  // pra Pedro testar UI sem precisar do bot real. Em produção setar BOT_API_URL ativa
  // o fluxo real automaticamente.
  if (!botResult.success && botResult.error === "BOT_NOT_CONFIGURED") {
    await supabase
      .from("lobbies")
      .update({
        status: "open",
        steam_lobby_id: `DEV-${lobby.id.slice(0, 8)}`,
        bot_error: "Bot Steam não deployado — modo dev (lobby fictício pra testar UI)",
      })
      .eq("id", lobby.id);
    return { success: true, lobbyId: lobby.id, password };
  }

  // BOT_POOL_FULL: todos bots ocupados. V1 = 1 bot 'main', então só rola se ele
  // já está hospedando outro lobby. Cleanup row + mensagem amigável.
  if (!botResult.success && botResult.error === "BOT_POOL_FULL") {
    await supabase.from("lobbies").delete().eq("id", lobby.id);
    return {
      success: false,
      error:
        "Todos os bots Steam estão ocupados agora. Aguarde alguns minutos e tente de novo.",
    };
  }

  // Bot configurado mas chamada falhou (offline/timeout/erro Dota GC) — cleanup row.
  if (!botResult.success) {
    await supabase.from("lobbies").delete().eq("id", lobby.id);
    return { success: false, error: botResult.error };
  }

  return { success: true, lobbyId: lobby.id, password };
}

export async function cancelLobby(formData: FormData): Promise<void> {
  const lobbyId = formData.get("lobbyId");
  if (typeof lobbyId !== "string") return;

  const supabase = await createClient();
  // DELETE FROM lobbies — cascade lobby_players + trigger libera bot.
  // Lobby some completamente — não pode existir sala sem dono.
  await supabase.from("lobbies").delete().eq("id", lobbyId);

  redirect("/ranked-com-pro?play=lobbies-list");
}
