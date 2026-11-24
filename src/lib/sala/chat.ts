// Chat da sala pública e do canal de texto (spec, R8): mandar (até 300 caracteres, uma a cada 2 s), o
// dono apagar e o dono abrir ou fechar, e ler as mensagens anteriores. Guardado 30 dias para moderação
// (no canal de texto, enquanto o canal existir); a regra (decideChat) decide antes de gravar.

import "server-only";
import { z } from "zod";
import type { CallContext } from "./contexto";
import { isPresent } from "./presenca";
import { forgetRoomState } from "./estado";
import { decideChat } from "./papeis";

export const ChatBody = z.object({ texto: z.string().max(2000) });
export const ChatAbertoBody = z.object({ aberto: z.boolean() });

export type ChatResult = { ok: true; id?: number } | { ok: false; code: string };

function denied(ctx: CallContext): ChatResult {
  return { ok: false, code: ctx.decision.ok ? "sala_inexistente" : ctx.decision.code };
}

export async function sendChat(ctx: CallContext, texto: string): Promise<ChatResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return denied(ctx);
  // O ritmo (uma a cada 2 s) se confere no banco, ao gravar, no relógio do banco (voice_chat_send).
  const rule = decideChat({
    roomKind: room.kind, role: decision.role, chatOpen: room.chatOpen, presente: isPresent(ctx.member, ctx.now),
    body: texto, lastSentAt: null, now: ctx.now,
  });
  if (!rule.ok) return rule;
  const { data, error } = await ctx.db.rpc("voice_chat_send", { p_room: room.id, p_user: userId, p_body: rule.body });
  if (error) throw new Error(`gravar a mensagem: ${error.message}`);
  if (data === null) return { ok: false, code: "devagar" };
  forgetRoomState(room.id);
  return { ok: true, id: Number(data) };
}

export async function deleteChat(ctx: CallContext, messageId: number): Promise<ChatResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return denied(ctx);
  if (decision.role !== "dono") return { ok: false, code: "so_o_dono" };
  const { data, error } = await ctx.db
    .from("voice_room_messages")
    .update({ deleted_at: ctx.now.toISOString(), deleted_by: userId })
    .eq("id", messageId)
    .eq("room_id", room.id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`apagar a mensagem: ${error.message}`);
  if (!data?.length) return { ok: false, code: "mensagem_inexistente" };
  forgetRoomState(room.id);
  return { ok: true };
}

export async function setChatOpen(ctx: CallContext, aberto: boolean): Promise<ChatResult> {
  const { room, decision } = ctx;
  if (!decision.ok || !room) return denied(ctx);
  if (decision.role !== "dono") return { ok: false, code: "so_o_dono" };
  if (room.kind !== "palco" && room.kind !== "texto") return { ok: false, code: "chat_indisponivel" };
  const { error } = await ctx.db.from("voice_rooms").update({ chat_open: aberto }).eq("id", room.id);
  if (error) throw new Error(`abrir ou fechar o chat: ${error.message}`);
  forgetRoomState(room.id);
  return { ok: true };
}

export const HISTORICO_LOTE = 50;

export type Historico = { ok: true; mensagens: Array<{ id: number; userId: string | null; texto: string; em: string }> } | { ok: false; code: string };

/** Mensagens anteriores a `antes`, 50 por vez, da mais velha para a mais nova (a tela sobe a rolagem). */
export async function chatHistory(ctx: CallContext, antes: number): Promise<Historico> {
  const { room, decision } = ctx;
  if (!decision.ok || !room) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  if (room.kind !== "palco" && room.kind !== "texto") return { ok: false, code: "chat_indisponivel" };
  const { data, error } = await ctx.db
    .from("voice_room_messages")
    .select("id, user_id, body, created_at")
    .eq("room_id", room.id)
    .is("deleted_at", null)
    .lt("id", antes)
    .order("id", { ascending: false })
    .limit(HISTORICO_LOTE);
  if (error) throw new Error(`ler as mensagens anteriores: ${error.message}`);
  return { ok: true, mensagens: (data ?? []).reverse().map((m) => ({ id: m.id, userId: m.user_id, texto: m.body, em: m.created_at })) };
}
