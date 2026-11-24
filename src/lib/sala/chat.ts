// Chat da sala pública (spec, R8): mandar (até 300 caracteres, uma a cada 2 s), o dono apagar e o
// dono abrir ou fechar. Guardado 30 dias para moderação; a regra (decideChat) decide antes de gravar.

import "server-only";
import { z } from "zod";
import type { CallContext } from "./contexto";
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
  const { data: last } = await ctx.db
    .from("voice_room_messages")
    .select("created_at")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const rule = decideChat({ roomKind: room.kind, role: decision.role, chatOpen: room.chatOpen, body: texto, lastSentAt: last ? new Date(last.created_at) : null, now: ctx.now });
  if (!rule.ok) return rule;
  const { data, error } = await ctx.db.from("voice_room_messages").insert({ room_id: room.id, user_id: userId, body: rule.body }).select("id").single();
  if (error || !data) throw new Error(`gravar a mensagem: ${error?.message ?? "sem retorno"}`);
  forgetRoomState(room.id);
  return { ok: true, id: data.id };
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
  if (room.kind !== "palco") return { ok: false, code: "chat_indisponivel" };
  const { error } = await ctx.db.from("voice_rooms").update({ chat_open: aberto }).eq("id", room.id);
  if (error) throw new Error(`abrir ou fechar o chat: ${error.message}`);
  forgetRoomState(room.id);
  return { ok: true };
}
