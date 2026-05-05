"use server";

// Server Actions do lobby — entrar/sair time, iniciar partida, sair do lobby.
// RLS de lobby_players (Migration 011) força auth.uid() = user_id.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { botInviteToLobby } from "@/lib/bot";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * Entra em um time específico do lobby (radiant/dire/spectator).
 * Se já está em outro time, troca via UPDATE; se não está, INSERT.
 */
export async function joinTeam(input: {
  lobbyId: string;
  team: "radiant" | "dire" | "spectator";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Verifica se há vaga no time (limite por time = max_players / 2 pra radiant/dire; spectators sem limite)
  const { data: lobby } = await supabase
    .from("lobbies")
    .select("status, max_players")
    .eq("id", input.lobbyId)
    .single();
  if (!lobby) return { success: false, error: "Lobby não encontrado." };
  if (lobby.status !== "open" && lobby.status !== "pending") {
    return { success: false, error: "Lobby não aceita mais jogadores." };
  }

  if (input.team !== "spectator") {
    const teamLimit = Math.floor(lobby.max_players / 2);
    const { count } = await supabase
      .from("lobby_players")
      .select("*", { count: "exact", head: true })
      .eq("lobby_id", input.lobbyId)
      .eq("team", input.team);
    if ((count ?? 0) >= teamLimit) {
      return { success: false, error: "Time cheio." };
    }
  }

  // Já está no lobby? Update team. Senão insert.
  const { data: existing } = await supabase
    .from("lobby_players")
    .select("user_id")
    .eq("lobby_id", input.lobbyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("lobby_players")
      .update({ team: input.team })
      .eq("lobby_id", input.lobbyId)
      .eq("user_id", user.id);
    if (error) return { success: false, error: "Erro ao trocar de time." };
  } else {
    const { error } = await supabase
      .from("lobby_players")
      .insert({ lobby_id: input.lobbyId, user_id: user.id, team: input.team });
    if (error) {
      if (error.code === "42501") {
        return {
          success: false,
          error: "Mensalidade ativa exigida pra entrar em lobby.",
        };
      }
      return { success: false, error: "Erro ao entrar no time." };
    }
  }

  // Auto-invite via GC: só pra teams (radiant/dire), não pra spectator.
  // Fire-and-forget — invite é melhor-esforço. Se bot offline ou Dota fechado
  // no client do user, fluxo continua válido (senha visível no painel da sala).
  if (input.team !== "spectator") {
    const { data: steamLink } = await supabase
      .from("steam_links")
      .select("steam_id_64")
      .eq("user_id", user.id)
      .single();
    if (steamLink?.steam_id_64) {
      void botInviteToLobby({
        lobbyId: input.lobbyId,
        steamId64: steamLink.steam_id_64,
      }).catch((err) => {
        console.error("[joinTeam] invite GC falhou:", err);
      });
    }
  }

  revalidatePath(`/lobbies/${input.lobbyId}`);
  return { success: true };
}

/**
 * Sai do lobby — DELETE row de lobby_players + redirect /lobbies.
 */
export async function leaveLobby(formData: FormData): Promise<void> {
  const lobbyId = formData.get("lobbyId");
  if (typeof lobbyId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("lobby_players")
    .delete()
    .eq("lobby_id", lobbyId)
    .eq("user_id", user.id);

  redirect("/lobbies");
}

/**
 * Inicia a partida — só o líder pode chamar. Atualiza status='in_progress'.
 * Em produção (bot configurado) chamará bot.startMatch — V2.
 */
export async function startMatch(input: {
  lobbyId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("created_by, status")
    .eq("id", input.lobbyId)
    .single();
  if (!lobby) return { success: false, error: "Lobby não encontrado." };
  if (lobby.created_by !== user.id) {
    return { success: false, error: "Apenas o líder pode iniciar." };
  }
  if (lobby.status !== "open") {
    return { success: false, error: "Lobby não está aberto." };
  }

  const { error } = await supabase
    .from("lobbies")
    .update({ status: "in_progress" })
    .eq("id", input.lobbyId);
  if (error) return { success: false, error: "Erro ao iniciar partida." };

  revalidatePath(`/lobbies/${input.lobbyId}`);
  return { success: true };
}

/**
 * Cancela o lobby (líder/admin). UPDATE status='cancelled' + redirect.
 */
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
