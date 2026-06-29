"use server";

// Finaliza uma partida de MATCHMAKING (lobby) — reaproveita todo o motor de
// enriquecimento (OpenDota → match_players + radiant_win + MMR) que já existe pro
// fluxo de coach. Liga o lobby a uma `matches` row (sem coach) e enriquece.
//
// Gatilho hoje: botão admin na página da partida. Futuro: quando o bot sinalizar
// que o jogo acabou, um worker chama a MESMA action automaticamente.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enrichMatchFromOpenDota } from "@/app/admin/pros/actions";

export interface FinalizeResult {
  success: boolean;
  error?: string;
  playersInserted?: number;
  matchId?: string;
}

export async function finalizeLobbyMatch(lobbyId: string): Promise<FinalizeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return { success: false, error: "Apenas admin." };

  const service = createServiceClient();
  const { data: lobby } = await service
    .from("lobbies")
    .select("id, status, dota_match_id")
    .eq("id", lobbyId)
    .maybeSingle();
  if (!lobby) return { success: false, error: "Lobby não encontrado." };
  if (!lobby.dota_match_id) {
    return {
      success: false,
      error: "Sem dota_match_id ainda — o bot precisa registrar a partida no Dota primeiro.",
    };
  }

  // Idempotência: pega/cria a matches row ligada a este lobby.
  let { data: matchRow } = await service
    .from("matches")
    .select("id, enriched_at")
    .eq("lobby_id", lobbyId)
    .maybeSingle();

  if (!matchRow) {
    // status 'realizada' DIRETO no insert — o trigger de fichas é AFTER UPDATE
    // (transição agendada→realizada), então insert não cobra ficha. coach_id null.
    const { data: created, error: insErr } = await service
      .from("matches")
      .insert({
        coach_id: null,
        status: "realizada",
        data_agendada: new Date().toISOString(),
        dota_match_id: lobby.dota_match_id,
        dota_match_id_verified: false,
        lobby_id: lobbyId,
      })
      .select("id, enriched_at")
      .single();
    if (insErr || !created) {
      return { success: false, error: "Erro ao registrar a partida." };
    }
    matchRow = created;
  }

  // Já enriquecida? Garante o lobby fechado e retorna (idempotente).
  if (matchRow.enriched_at) {
    if (lobby.status !== "completed") {
      await service
        .from("lobbies")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", lobbyId);
    }
    revalidatePath(`/partida/${lobbyId}`);
    return { success: true, matchId: matchRow.id };
  }

  // Enriquece: OpenDota → match_players (com user_id via steam_links) + MMR.
  const enrich = await enrichMatchFromOpenDota(matchRow.id, lobby.dota_match_id);
  if (!enrich.success) return { success: false, error: enrich.error };

  // Fecha o lobby.
  await service
    .from("lobbies")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", lobbyId);

  revalidatePath(`/partida/${lobbyId}`);
  return {
    success: true,
    matchId: matchRow.id,
    playersInserted: enrich.data?.playersInserted,
  };
}
