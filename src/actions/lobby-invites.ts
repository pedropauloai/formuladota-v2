"use server";
// Server Actions de convite pra sala (pacote social 2026-06-12 — missão 4).
// A RLS da migration 055 é a autoridade: só AMIGO aceito convida, e só pra
// sala em que o convidante está. Aqui é defesa em profundidade + UX de erro.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { setPlayMenuState } from "@/lib/play-menu-preference";
import {
  getMyLobbyInvites,
  type LobbyInviteView,
} from "@/lib/queries/lobby-social";

const UUIDSchema = z.string().uuid("ID inválido");

const CreateInviteSchema = z.object({
  lobbyId: z.string().uuid("Sala inválida"),
  inviteeId: z.string().uuid("Convidado inválido"),
});

export type InviteResult = { success: true } | { success: false; error: string };

/**
 * Convida um amigo pra sala atual. Idempotente: convite repetido pro mesmo
 * par (sala, convidado) é tratado como sucesso (unique constraint 055).
 */
export async function createLobbyInvite(input: {
  lobbyId: string;
  inviteeId: string;
}): Promise<InviteResult> {
  const parsed = CreateInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados do convite inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { error } = await supabase.from("lobby_invites").insert({
    lobby_id: parsed.data.lobbyId,
    inviter_id: user.id,
    invitee_id: parsed.data.inviteeId,
  });

  if (error) {
    // 23505 = já existe convite ativo pro par — pro usuário é a mesma coisa.
    if (error.code === "23505") return { success: true };
    // 42501 = RLS barrou (não é amigo aceito, ou não está mais na sala).
    if (error.code === "42501") {
      return {
        success: false,
        error: "Só amigos podem ser convidados, e você precisa estar na sala.",
      };
    }
    console.error("[createLobbyInvite] error:", error);
    return { success: false, error: "Não foi possível enviar o convite" };
  }

  return { success: true };
}

/**
 * Aceita o convite: valida que a sala ainda está aberta, deleta o convite e
 * grava o cookie do PlayMenu apontando pra sala (drawer abre nela no próximo
 * mount). O client então faz a navegação completa — o PlayMenu remonta lendo
 * o cookie e carrega a sala pelo fluxo existente (fetchLobbyRoom).
 */
export async function acceptLobbyInvite(inviteId: string): Promise<InviteResult> {
  const parsed = UUIDSchema.safeParse(inviteId);
  if (!parsed.success) return { success: false, error: "Convite inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autorizado" };

  const { data: invite } = await supabase
    .from("lobby_invites")
    .select("id, lobby_id")
    .eq("id", parsed.data)
    .eq("invitee_id", user.id)
    .maybeSingle();
  if (!invite) {
    return { success: false, error: "Convite não encontrado (pode ter expirado)" };
  }

  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, status")
    .eq("id", invite.lobby_id)
    .maybeSingle();

  // Convite respondido = deletado, mesmo se a sala morreu (limpa a notificação).
  await supabase.from("lobby_invites").delete().eq("id", invite.id);

  if (!lobby || lobby.status !== "open") {
    return { success: false, error: "A sala não está mais aberta" };
  }

  // Drawer do PlayMenu abre direto na sala no próximo mount (cookie pm_state).
  await setPlayMenuState({ s: "expanded", v: "sala", l: lobby.id, a: "salas" });
  return { success: true };
}

/** Recusa o convite (DELETE — RLS permite ao convidado). */
export async function declineLobbyInvite(inviteId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(inviteId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("lobby_invites")
    .delete()
    .eq("id", parsed.data)
    .eq("invitee_id", user.id);
}

/**
 * Re-busca os convites do user logado (chamado pelo listener realtime no
 * client quando chega INSERT — o payload só tem ids, a view precisa de nomes).
 */
export async function fetchMyLobbyInvites(): Promise<LobbyInviteView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return getMyLobbyInvites(supabase, user.id);
}
