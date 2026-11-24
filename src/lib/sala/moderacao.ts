// Expulsar, bloquear e denunciar (spec, seção 9). O corte da mídia acontece no SFU, na hora; a tela
// de quem saiu recebe o motivo no batimento seguinte.

import "server-only";
import { z } from "zod";
import { blockUser } from "@/actions/friends";
import { sendOpsAlert } from "@/lib/cron/alert";
import type { CallContext } from "./contexto";
import { openSessions } from "./dados-rtc";
import { kickMember, listMembers } from "./dados-sala";
import { realtimeEnv } from "./realtime-api";
import { closeUserSessions, cutSubscriptions, revokeTurn } from "./sessoes";

export const UserBody = z.object({ userId: z.string().uuid() });
export const MOTIVOS = ["assedio", "conteudo_sexual", "menor_em_risco", "ameaca", "discriminacao", "spam", "outro"] as const;
export const DenunciaBody = z.object({
  userId: z.string().uuid(),
  motivo: z.enum(MOTIVOS),
  detalhes: z.string().trim().max(500).default(""),
});

const MOTIVO_TEXTO: Record<(typeof MOTIVOS)[number], string> = {
  assedio: "assédio ou ofensa",
  conteudo_sexual: "conteúdo sexual",
  menor_em_risco: "criança ou adolescente em risco",
  ameaca: "ameaça ou violência",
  discriminacao: "discriminação",
  spam: "spam",
  outro: "outro motivo",
};
const GRAVES = new Set(["conteudo_sexual", "menor_em_risco", "ameaca"]);
const DENUNCIAS_POR_HORA = 5;

export type ModeracaoResult = { ok: true } | { ok: false; code: string };

async function inRoom(ctx: CallContext, targetId: string): Promise<boolean> {
  if (!ctx.room) return false;
  if (ctx.room.ownerId === targetId) return true;
  return (await listMembers(ctx.db, ctx.room.id)).some((m) => m.userId === targetId);
}

export async function kick(ctx: CallContext, targetId: string): Promise<ModeracaoResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  if (decision.role !== "dono") return { ok: false, code: "so_o_dono" };
  if (targetId === room.ownerId) return { ok: false, code: "dono_nao_sai" };
  await kickMember(ctx.db, room.id, targetId, userId, ctx.now);
  await closeUserSessions(ctx.db, realtimeEnv(), { roomId: room.id, userId: targetId }, "expulso", ctx.now);
  await revokeTurn(ctx.db, realtimeEnv(), room.id, targetId);
  return { ok: true };
}

/** Bloqueio pelo sistema de amizade que já existe; na sala, corta na hora o áudio entre os dois. */
export async function block(ctx: CallContext, targetId: string): Promise<ModeracaoResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  if (targetId === userId || !(await inRoom(ctx, targetId))) return { ok: false, code: "fora_da_sala" };
  await blockUser(targetId);
  const sessions = await openSessions(ctx.db, { roomId: room.id });
  const of = (id: string) => new Set(sessions.filter((s) => s.userId === id).map((s) => s.id));
  const mine = of(userId);
  const theirs = of(targetId);
  await cutSubscriptions(ctx.db, realtimeEnv(), [...mine, ...theirs], (pub) => mine.has(pub) || theirs.has(pub), ctx.now);
  return { ok: true };
}

export async function report(ctx: CallContext, body: z.infer<typeof DenunciaBody>): Promise<ModeracaoResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  if (body.userId === userId || !(await inRoom(ctx, body.userId))) return { ok: false, code: "fora_da_sala" };
  const since = new Date(ctx.now.getTime() - 3600_000).toISOString();
  const { count } = await ctx.db.from("voice_room_reports").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("reporter_id", userId).gt("created_at", since);
  if ((count ?? 0) >= DENUNCIAS_POR_HORA) return { ok: false, code: "denuncias_demais" };
  const { error } = await ctx.db.from("voice_room_reports").insert({
    room_id: room.id, reporter_id: userId, reported_id: body.userId, reason: body.motivo, details: body.detalhes, is_test: room.isTest,
  });
  if (error) throw new Error(`gravar a denúncia: ${error.message}`);
  await alertReport(ctx, body);
  return { ok: true };
}

async function alertReport(ctx: CallContext, body: z.infer<typeof DenunciaBody>): Promise<void> {
  const room = ctx.room;
  if (!room) return;
  const ids = [ctx.userId, body.userId].filter((v): v is string => !!v);
  const { data } = await ctx.db.from("public_player_identities").select("id, username").in("id", ids);
  const nome = (id: string | null) => data?.find((p) => p.id === id)?.username ?? "jogador";
  const grave = GRAVES.has(body.motivo) ? "DENÚNCIA GRAVE. " : "";
  const teste = room.isTest ? "[TESTE] " : "";
  const detalhe = body.detalhes ? ` Detalhe: "${body.detalhes.replace(/[`@]/g, "'").slice(0, 200)}"` : "";
  await sendOpsAlert(
    `${teste}${grave}Sala de voz "${room.title}": ${nome(ctx.userId)} denunciou ${nome(body.userId)} por ${MOTIVO_TEXTO[body.motivo]}.${detalhe} Veja em /admin/salas.`,
    !room.isTest
  );
}
