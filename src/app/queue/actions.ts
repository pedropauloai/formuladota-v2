"use server";

// Server Actions de matchmaking — Fase B Phase 7.
// enterQueue: usa RLS gate has_active_subscription() (Migration 015) → erro 42501 se sem mensalidade.
// leaveQueue: marca status=cancelled (mantém histórico em vez de DELETE).
// getQueueStatus: retorna entry waiting/matched do user atual.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QueueRole =
  | "support_dedicated"
  | "support"
  | "offlane"
  | "midlane"
  | "safelane";

export type QueueGameMode =
  | "all_pick"
  | "captains_mode"
  | "random_draft"
  | "single_draft";

export type QueueResult =
  | { success: true; queueId: string }
  | { success: false; error: string; code?: "need_permission" };

export interface QueueStatus {
  inQueue: boolean;
  queueId: string | null;
  status: "waiting" | "matched" | "cancelled" | null;
  matchedLobbyId: string | null;
  joinedAt: string | null;
  waitingSeconds: number;
}

export async function enterQueue(input: {
  roles: QueueRole[];
  gameMode?: QueueGameMode;
  region?: string;
}): Promise<QueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  if (input.roles.length === 0) {
    return { success: false, error: "Selecione pelo menos 1 função." };
  }

  // Já estava na fila? (re-entrada/troca de função NÃO cobra outra permissão)
  const { data: prevWaiting } = await supabase
    .from("match_queue")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .maybeSingle();

  // Cancela entries waiting anteriores antes de criar nova (idempotência)
  await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "waiting");

  const { data, error } = await supabase
    .from("match_queue")
    .insert({
      user_id: user.id,
      roles: input.roles,
      game_mode: input.gameMode ?? "all_pick",
      region: input.region ?? "brasil",
      status: "waiting",
    })
    .select("id")
    .single();

  if (error) {
    // RLS barra quem não tem permissão nem doutrina → dispara o pop-up de perguntas.
    if (error.code === "42501") {
      return {
        success: false,
        error: "Responda 5 perguntas pra liberar 1 partida.",
        code: "need_permission",
      };
    }
    console.error("[enterQueue] insert falhou:", error.message);
    return { success: false, error: "Erro ao entrar na fila." };
  }

  // Consome 1 permissão só em entrada NOVA (não em troca de função). Doutrinado = ilimitado
  // (a função consume_match_permission ignora doutrinado).
  if (!prevWaiting) {
    await supabase.rpc("consume_match_permission");
  }

  // Revalida tanto a rota dedicada (feed PROs) quanto o HUB (badges/contadores).
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, queueId: data.id };
}

export async function leaveQueue(): Promise<QueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("match_queue")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Você não está na fila." };
  }

  const { error } = await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("id", existing.id);

  if (error) {
    return { success: false, error: "Erro ao sair da fila." };
  }

  // Revalida tanto a rota dedicada (feed PROs) quanto o HUB (badges/contadores).
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, queueId: existing.id };
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      inQueue: false,
      queueId: null,
      status: null,
      matchedLobbyId: null,
      joinedAt: null,
      waitingSeconds: 0,
    };
  }

  // Pega entry waiting OU matched (recente). Cancelled é histórico, ignora.
  const { data } = await supabase
    .from("match_queue")
    .select("id, status, matched_lobby_id, joined_at")
    .eq("user_id", user.id)
    .in("status", ["waiting", "matched"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      inQueue: false,
      queueId: null,
      status: null,
      matchedLobbyId: null,
      joinedAt: null,
      waitingSeconds: 0,
    };
  }

  const joinedAt = data.joined_at ? new Date(data.joined_at) : null;
  const waitingSeconds = joinedAt
    ? Math.floor((Date.now() - joinedAt.getTime()) / 1000)
    : 0;

  return {
    inQueue: true,
    queueId: data.id,
    status: data.status,
    matchedLobbyId: data.matched_lobby_id,
    joinedAt: data.joined_at,
    waitingSeconds,
  };
}
