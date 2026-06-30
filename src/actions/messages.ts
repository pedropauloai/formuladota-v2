"use server";
// Server Actions de mensagens diretas (DM) — pacote social 2026-06-30.
// A RLS da migration 074 é a autoridade: conversa só nasce entre AMIGOS aceitos
// (RPC dm_get_or_create_conversation) e só membros leem/escrevem. Aqui é defesa
// em profundidade + UX de erro + leitura/marcação.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getDmInbox,
  getConversationMessages,
  type DmInboxEntry,
  type DmMessage,
} from "@/lib/queries/messages";

const UUIDSchema = z.string().uuid("ID inválido");
const SendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "Mensagem vazia").max(2000, "Mensagem muito longa"),
});

export type OpenConversationResult =
  | { success: true; conversationId: string; messages: DmMessage[] }
  | { success: false; error: string };

/**
 * Abre (ou cria) a conversa com um amigo e devolve o histórico. Marca como lida.
 * RPC exige amizade aceita → null vira erro amigável.
 */
export async function openConversation(
  otherUserId: string
): Promise<OpenConversationResult> {
  const parsed = UUIDSchema.safeParse(otherUserId);
  if (!parsed.success) return { success: false, error: "Usuário inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data: convId, error } = await supabase.rpc("dm_get_or_create_conversation", {
    p_other: parsed.data,
  });
  if (error || !convId) {
    return { success: false, error: "Só dá pra conversar com amigos aceitos." };
  }

  const conversationId = convId as string;
  const messages = await getConversationMessages(supabase, conversationId);
  await supabase
    .from("dm_reads")
    .upsert(
      { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );

  return { success: true, conversationId, messages };
}

export type SendDmResult =
  | { success: true; message: DmMessage }
  | { success: false; error: string };

/** Envia uma mensagem na conversa. RLS garante que sou membro. */
export async function sendDirectMessage(input: {
  conversationId: string;
  body: string;
}): Promise<SendDmResult> {
  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      body: parsed.data.body,
    })
    .select("id, conversation_id, sender_id, body, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "42501") {
      return { success: false, error: "Você não participa dessa conversa." };
    }
    console.error("[sendDirectMessage] error:", error);
    return { success: false, error: "Não foi possível enviar a mensagem." };
  }

  return {
    success: true,
    message: {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      body: data.body,
      createdAt: data.created_at,
    },
  };
}

/** Marca a conversa como lida (zera não-lidas pro inbox/badge). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const parsed = UUIDSchema.safeParse(conversationId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("dm_reads")
    .upsert(
      { conversation_id: parsed.data, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );
}

/** Caixa de entrada (chamado pelo listener realtime quando chega mensagem nova). */
export async function fetchDmInbox(): Promise<DmInboxEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return getDmInbox(supabase);
}

/** Re-busca o histórico de uma conversa (fallback se o push perder uma msg). */
export async function fetchConversationMessages(
  conversationId: string
): Promise<DmMessage[]> {
  const parsed = UUIDSchema.safeParse(conversationId);
  if (!parsed.success) return [];
  const supabase = await createClient();
  return getConversationMessages(supabase, parsed.data);
}
