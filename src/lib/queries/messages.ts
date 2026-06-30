// Read-models do chat de mensagens diretas (DM) — pacote social 2026-06-30.
//   - getDmInbox: lista de conversas (RPC dm_inbox) + identidade do OUTRO lado
//     (Steam > Discord, batch — zero N+1) + contador de não-lidas.
//   - getConversationMessages: histórico de uma conversa (RLS garante membro).
//
// RLS (migration 074): dm_conversations/dm_messages só pros 2 participantes;
// steam_links SELECT público (054) resolve a identidade do amigo.

import type { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";
import type { Database } from "@/types/database";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type DmInboxRow = Database["public"]["Functions"]["dm_inbox"]["Returns"][number];

export interface DmInboxEntry {
  conversationId: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  lastPreview: string | null;
  lastMessageAt: string | null;
  /** Quem mandou a última (pra "Você: ..." no preview). */
  lastSenderId: string | null;
  unreadCount: number;
}

export interface DmMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** Caixa de entrada do user logado (RPC usa auth.uid()). Identidade em batch. */
export async function getDmInbox(supabase: ServerClient): Promise<DmInboxEntry[]> {
  const { data } = await supabase.rpc("dm_inbox");
  const rows = (data ?? []) as DmInboxRow[];
  if (rows.length === 0) return [];

  const otherIds = [...new Set(rows.map((r) => r.other_user_id).filter(Boolean))] as string[];
  const [{ data: profiles }, steamMap] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds),
    getSteamIdentityMap(supabase, otherIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const p = profileById.get(r.other_user_id);
    const ident = resolveIdentity(steamMap, r.other_user_id, p?.username, p?.avatar_url);
    return {
      conversationId: r.conversation_id,
      otherUserId: r.other_user_id,
      otherName: ident.name,
      otherAvatarUrl: ident.avatarUrl,
      lastPreview: r.last_preview,
      lastMessageAt: r.last_message_at,
      lastSenderId: r.last_sender_id,
      unreadCount: r.unread_count ?? 0,
    };
  });
}

/** Histórico de uma conversa (últimas `limit`, em ordem cronológica). */
export async function getConversationMessages(
  supabase: ServerClient,
  conversationId: string,
  limit = 80
): Promise<DmMessage[]> {
  const { data } = await supabase
    .from("dm_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Vem desc (mais recentes) → inverte pra renderizar do mais antigo ao mais novo.
  return (data ?? [])
    .reverse()
    .map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
    }));
}
