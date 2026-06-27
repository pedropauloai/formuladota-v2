"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Define a senha do lobby Steam exibida na página da partida.
// RLS de lobbies só permite ao criador OU admin — se não autorizado, o UPDATE não
// afeta linhas (data.length === 0), e devolvemos "sem permissão".
export async function setLobbyPassword(
  lobbyId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const clean = password.trim();
  if (clean.length < 1 || clean.length > 32) {
    return { success: false, error: "Senha deve ter de 1 a 32 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data, error } = await supabase
    .from("lobbies")
    .update({ password: clean })
    .eq("id", lobbyId)
    .select("id");

  if (error) return { success: false, error: "Erro ao salvar a senha." };
  if (!data || data.length === 0) {
    return { success: false, error: "Você não tem permissão pra editar esta sala." };
  }

  revalidatePath(`/partida/${lobbyId}`);
  return { success: true };
}

// Descarta a partida: marca lobbies.status='cancelled'. É o sinal que o bot Steam
// (bot-server.js) detecta no poll pra expulsar todos e finalizar o lobby Steam.
// Mesma RLS do setLobbyPassword: só criador OU admin afeta a linha (senão data vazio).
export async function discardMatch(
  lobbyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data, error } = await supabase
    .from("lobbies")
    .update({ status: "cancelled" })
    .eq("id", lobbyId)
    .select("id");

  if (error) return { success: false, error: "Erro ao descartar a partida." };
  if (!data || data.length === 0) {
    return { success: false, error: "Você não tem permissão pra descartar esta partida." };
  }

  // Limpa a FILA dos jogadores dessa partida: sem isso, as entradas match_queue
  // ficam 'matched' apontando pro lobby cancelado e o usuário fica preso no "Voltar à
  // partida". match_queue só tem RLS self (cada user mexe na própria), então a limpeza
  // de TODOS os jogadores usa service client — sistêmica, e só roda APÓS a autorização
  // ter sido confirmada pelo update de lobbies acima (RLS criador/admin).
  try {
    const service = createServiceClient();
    await service
      .from("match_queue")
      .update({ status: "cancelled" })
      .eq("matched_lobby_id", lobbyId);
  } catch (e) {
    console.error("[discardMatch] limpeza de match_queue falhou:", e);
  }

  revalidatePath(`/partida/${lobbyId}`);
  return { success: true };
}
