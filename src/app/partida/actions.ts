"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
