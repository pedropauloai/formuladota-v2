"use server";
// Server Actions do sistema de PARTY/grupo — pacote social 2026-06-30.
// A RLS + os RPCs SECURITY DEFINER (migrations 075/076) são a autoridade. Aqui:
// validação Zod, auth inline, UX de erro e revalidate do shell (a party aparece
// global, como os amigos → revalidatePath("/", "layout")).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";
import {
  getMyParty,
  getMyPartyInvites,
  getPartyInvitesDetailed,
  type PartyView,
  type PartyInviteView,
  type PartyInviteDetailed,
} from "@/lib/queries/party";

const UUIDSchema = z.string().uuid("ID inválido");
const RolesSchema = z.array(
  z.enum(["safelane", "midlane", "offlane", "support", "support_dedicated"])
);
const ModesSchema = z.array(
  z.enum(["all_pick", "captains_mode", "random_draft", "single_draft"])
);

export type PartyResult = { success: true } | { success: false; error: string };

/**
 * Convida um amigo pro grupo. Cria a party (idempotente) se eu ainda não tenho
 * uma, depois insere o convite. Anti-spam: a RLS só deixa convidar AMIGO aceito.
 */
export async function inviteToParty(inviteeId: string): Promise<PartyResult> {
  const parsed = UUIDSchema.safeParse(inviteeId);
  if (!parsed.success) return { success: false, error: "Convidado inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data: partyId, error: pErr } = await supabase.rpc("create_party");
  if (pErr || !partyId) return { success: false, error: "Não foi possível criar o grupo" };

  const { error } = await supabase.from("party_invites").insert({
    party_id: partyId as string,
    inviter_id: user.id,
    invitee_id: parsed.data,
  });

  if (error) {
    if (error.code === "23505") return { success: true }; // já convidado — ok
    if (error.code === "42501") {
      return { success: false, error: "Só amigos podem ser convidados pro grupo." };
    }
    console.error("[inviteToParty] error:", error);
    return { success: false, error: "Não foi possível convidar." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Aceita um convite de grupo (RPC valida convidado + lotação ≤5). */
export async function acceptPartyInvite(inviteId: string): Promise<PartyResult> {
  const parsed = UUIDSchema.safeParse(inviteId);
  if (!parsed.success) return { success: false, error: "Convite inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data, error } = await supabase.rpc("accept_party_invite", {
    p_invite: parsed.data,
  });
  if (error || !data) {
    return { success: false, error: "Convite expirado ou grupo cheio." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/** Recusa/cancela um convite de grupo (DELETE — RLS permite participante). */
export async function declinePartyInvite(inviteId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(inviteId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("party_invites")
    .delete()
    .eq("id", parsed.data)
    .eq("invitee_id", user.id);
}

/** Sai da própria party (RPC transfere liderança/deleta se vazia). Tira da fila. */
export async function leaveParty(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Tira da fila de grupo antes de sair (a entry waiting ficaria órfã).
  await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "waiting");
  await supabase.rpc("leave_party");
  revalidatePath("/", "layout");
}

/** Expulsa um membro (só o líder — RPC valida). */
export async function kickPartyMember(memberId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(memberId);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("kick_party_member", { p_user: parsed.data });
  revalidatePath("/", "layout");
}

/** Passa a liderança pra outro membro (só o líder atual — RPC valida). */
export async function transferPartyLeader(memberId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(memberId);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("transfer_party_leader", { p_user: parsed.data });
  revalidatePath("/", "layout");
}

/** Atualiza as funções preferidas do membro logado (RLS update_self). */
export async function updateMyPartyRoles(roles: string[]): Promise<PartyResult> {
  const parsed = RolesSchema.safeParse(roles);
  if (!parsed.success) return { success: false, error: "Funções inválidas" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  await supabase.from("party_members").update({ roles: parsed.data }).eq("user_id", user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

export type PartyQueueResult =
  | { success: true; matchedLobbyId: string | null }
  | { success: false; error: string };

/** O LÍDER coloca a party inteira na fila (mesmo time garantido). */
export async function enterPartyQueue(gameModes: string[]): Promise<PartyQueueResult> {
  const parsed = ModesSchema.safeParse(gameModes);
  const modes = parsed.success && parsed.data.length ? parsed.data : ["all_pick"];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data, error } = await supabase.rpc("enter_party_queue", {
    p_game_modes: modes,
  });
  if (error || !data) {
    console.error("[enterPartyQueue] error:", error);
    return { success: false, error: "Erro ao buscar em grupo." };
  }

  const res = data as {
    ok: boolean;
    error?: string;
    who?: string;
    lobby_id?: string | null;
  };
  if (!res.ok) {
    if (res.error === "not_leader") {
      return { success: false, error: "Só o líder do grupo inicia a busca." };
    }
    if (res.error === "cooldown") {
      return { success: false, error: `${res.who ?? "Um membro"} está em cooldown de fila.` };
    }
    if (res.error === "in_match") {
      return { success: false, error: `${res.who ?? "Um membro"} já está em partida.` };
    }
    return { success: false, error: "Não foi possível buscar." };
  }

  revalidatePath("/dashboard");
  return { success: true, matchedLobbyId: res.lobby_id ?? null };
}

/** Tira a party inteira da fila (qualquer membro pode). */
export async function leavePartyQueue(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("leave_party_queue");
  revalidatePath("/dashboard");
}

/** Manda mensagem no chat do grupo. */
export async function sendPartyMessage(body: string): Promise<{ success: boolean }> {
  const parsed = z.string().trim().min(1).max(2000).safeParse(body);
  if (!parsed.success) return { success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: pm } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pm) return { success: false };

  const { error } = await supabase.from("party_messages").insert({
    party_id: pm.party_id,
    sender_id: user.id,
    body: parsed.data,
  });
  return { success: !error };
}

/** Re-busca a minha party (listener realtime chama quando muda membro/fila). */
export async function fetchMyParty(): Promise<PartyView | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getMyParty(supabase, user.id);
}

export interface PartyChatMessageView {
  id: string;
  senderId: string;
  /** Nome do remetente resolvido no servidor (Steam > Discord). */
  senderName: string;
  body: string;
  createdAt: string;
}

/** Histórico do chat do grupo (últimas 50) com nome do remetente resolvido.
 *  Resolve no servidor (não depende do roster que o ChatBar tem em memória —
 *  esse pode estar desatualizado se alguém entrou no grupo depois). */
export async function fetchPartyMessages(): Promise<PartyChatMessageView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: pm } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pm) return [];

  const { data } = await supabase
    .from("party_messages")
    .select("id, sender_id, body, created_at")
    .eq("party_id", pm.party_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []).reverse();
  const senderIds = [...new Set(rows.map((m) => m.sender_id))];
  const [{ data: profiles }, steamMap] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_url").in("id", senderIds),
    getSteamIdentityMap(supabase, senderIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((m) => {
    const p = profileById.get(m.sender_id);
    const ident = resolveIdentity(steamMap, m.sender_id, p?.username, p?.avatar_url);
    return {
      id: m.id,
      senderId: m.sender_id,
      senderName: ident.name,
      body: m.body,
      createdAt: m.created_at,
    };
  });
}

/** Re-busca convites de grupo (listener realtime chama no INSERT). */
export async function fetchMyPartyInvites(): Promise<PartyInviteView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return getMyPartyInvites(supabase, user.id);
}

/** Convites de grupo com preview dos membros (popup central). */
export async function fetchPartyInvitesDetailed(): Promise<PartyInviteDetailed[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return getPartyInvitesDetailed(supabase);
}
