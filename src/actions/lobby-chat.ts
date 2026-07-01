"use server";
// Chat da SALA (canal "Sala" da chat bar) — pacote fidelidade Dota 2 2026-06-30.
// RLS da migration 078 é a autoridade: só quem está na sala (lobby_players) lê/escreve.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";

export interface LobbyChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

const SendSchema = z.object({
  lobbyId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

/** Envia mensagem no canal da sala. */
export async function sendLobbyMessage(input: {
  lobbyId: string;
  body: string;
}): Promise<{ success: boolean }> {
  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) return { success: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("lobby_messages").insert({
    lobby_id: parsed.data.lobbyId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  return { success: !error };
}

/** Histórico do canal da sala (últimas 50) com nome do remetente resolvido. */
export async function fetchLobbyMessages(lobbyId: string): Promise<LobbyChatMessage[]> {
  const parsed = z.string().uuid().safeParse(lobbyId);
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("lobby_messages")
    .select("id, sender_id, body, created_at")
    .eq("lobby_id", parsed.data)
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
