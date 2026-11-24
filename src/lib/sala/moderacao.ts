// Moderação da sala (spec, seções 8 e 9): o dono chama ao palco, devolve à plateia, muta, expulsa e
// bane; qualquer um bloqueia e denuncia (pessoa ou mensagem). O corte da mídia acontece no SFU, na
// hora; a tela de quem saiu recebe o motivo na consulta seguinte.

import "server-only";
import { z } from "zod";
import { blockUser } from "@/actions/friends";
import { sendOpsAlert } from "@/lib/cron/alert";
import type { CallContext } from "./contexto";
import { openSessions } from "./dados-rtc";
import { banUser, getMemberRow, kickMember, updateMember } from "./dados-sala";
import { forgetRoomState } from "./estado";
import { decideStageAction, type StageAction } from "./papeis";
import { PRESENTE_MS } from "./presenca";
import { realtimeEnv } from "./realtime-api";
import { closeUserSessions, closeVoice, cutSubscriptions, revokeTurn } from "./sessoes";

export const UserBody = z.object({ userId: z.string().uuid() });
export const BanBody = z.object({ motivo: z.string().trim().max(300).default("") });
export const MOTIVOS = ["assedio", "conteudo_sexual", "menor_em_risco", "ameaca", "discriminacao", "spam", "outro"] as const;
export const DenunciaBody = z
  .object({
    userId: z.string().uuid().optional(),
    messageId: z.number().int().positive().optional(),
    motivo: z.enum(MOTIVOS),
    detalhes: z.string().trim().max(500).default(""),
  })
  .refine((b) => !!b.userId !== !!b.messageId, "denuncie uma pessoa ou uma mensagem");

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

function denied(ctx: CallContext): ModeracaoResult {
  return { ok: false, code: ctx.decision.ok ? "sala_inexistente" : ctx.decision.code };
}

async function expel(ctx: CallContext, roomId: string, actorId: string, targetId: string): Promise<void> {
  await kickMember(ctx.db, roomId, targetId, actorId, ctx.now);
  await closeUserSessions(ctx.db, realtimeEnv(), { roomId, userId: targetId }, "expulso", ctx.now);
  await revokeTurn(ctx.db, realtimeEnv(), roomId, targetId);
}

/** Quem fala agora (falante que bateu nos últimos 30 s): quem saiu sem ser devolvido não ocupa lugar no palco. */
async function onlineSpeakers(ctx: CallContext, roomId: string): Promise<number> {
  const since = new Date(ctx.now.getTime() - PRESENTE_MS).toISOString();
  const { count } = await ctx.db.from("voice_room_members").select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId).eq("status", "ativo").eq("role", "falante").gt("last_seen_at", since);
  return count ?? 0;
}

/** O banido sai também das outras salas abertas do mesmo dono, na hora. */
async function expelFromOwnerRooms(ctx: CallContext, ownerId: string, actorId: string, targetId: string, exceptRoomId: string): Promise<void> {
  const { data: rooms } = await ctx.db.from("voice_rooms").select("id").eq("owner_id", ownerId).eq("status", "aberta").neq("id", exceptRoomId);
  for (const r of rooms ?? []) {
    if ((await getMemberRow(ctx.db, r.id, targetId))?.status !== "ativo") continue;
    await expel(ctx, r.id, actorId, targetId);
    forgetRoomState(r.id, targetId);
  }
}

/** Ações do dono sobre alguém da sala; a regra (decideStageAction) decide antes de gravar. */
export async function stageAction(ctx: CallContext, targetId: string, action: StageAction, reason = ""): Promise<ModeracaoResult> {
  const { room, settings, decision, userId } = ctx;
  if (!decision.ok || !room || !settings || !userId) return denied(ctx);
  const target = await getMemberRow(ctx.db, room.id, targetId);
  const speakers = action === "falar" ? await onlineSpeakers(ctx, room.id) : ctx.speakers;
  const rule = decideStageAction({
    action, actorRole: decision.role, roomKind: room.kind, targetIsOwner: targetId === room.ownerId,
    target, speakers, maxSpeakers: settings.palcoMaxSpeakers,
  });
  if (!rule.ok) return rule;
  const env = realtimeEnv();
  if (action === "falar") await updateMember(ctx.db, room.id, targetId, { role: "falante", hand_raised_at: null });
  if (action === "ouvir") {
    await updateMember(ctx.db, room.id, targetId, { role: "ouvinte", hand_raised_at: null });
    await closeVoice(ctx.db, env, room.id, targetId, ctx.now);
  }
  if (action === "mutar") {
    await updateMember(ctx.db, room.id, targetId, { force_muted: true, muted: true });
    await closeVoice(ctx.db, env, room.id, targetId, ctx.now);
  }
  if (action === "liberar") await updateMember(ctx.db, room.id, targetId, { force_muted: false });
  if (action === "banir") {
    await banUser(ctx.db, room.ownerId, targetId, userId, reason);
    await expelFromOwnerRooms(ctx, room.ownerId, userId, targetId, room.id);
  }
  if ((action === "expulsar" || action === "banir") && target?.status === "ativo") await expel(ctx, room.id, userId, targetId);
  forgetRoomState(room.id, targetId);
  return { ok: true };
}

/** Bloqueio pelo sistema de amizade que já existe; na sala, corta na hora o áudio entre os dois. */
export async function block(ctx: CallContext, targetId: string): Promise<ModeracaoResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return denied(ctx);
  if (targetId === userId || (targetId !== room.ownerId && !(await getMemberRow(ctx.db, room.id, targetId)))) return { ok: false, code: "fora_da_sala" };
  await blockUser(targetId);
  const sessions = await openSessions(ctx.db, { roomId: room.id });
  const of = (id: string) => new Set(sessions.filter((s) => s.userId === id).map((s) => s.id));
  const mine = of(userId);
  const theirs = of(targetId);
  await cutSubscriptions(ctx.db, realtimeEnv(), [...mine, ...theirs], (pub) => mine.has(pub) || theirs.has(pub), ctx.now);
  forgetRoomState(room.id, userId);
  forgetRoomState(room.id, targetId);
  return { ok: true };
}

type Denuncia = z.infer<typeof DenunciaBody>;

/** Quem a denúncia aponta: a pessoa, ou o autor da mensagem (com a cópia do texto). */
async function reportTarget(ctx: CallContext, roomId: string, body: Denuncia): Promise<{ reportedId: string; messageId: number | null; messageBody: string } | null> {
  if (body.userId) {
    const ok = body.userId === ctx.room?.ownerId || !!(await getMemberRow(ctx.db, roomId, body.userId));
    return ok ? { reportedId: body.userId, messageId: null, messageBody: "" } : null;
  }
  const { data } = await ctx.db.from("voice_room_messages").select("id, user_id, body").eq("id", body.messageId ?? 0).eq("room_id", roomId).maybeSingle();
  return data?.user_id ? { reportedId: data.user_id, messageId: data.id, messageBody: data.body } : null;
}

export async function report(ctx: CallContext, body: Denuncia): Promise<ModeracaoResult> {
  const { room, decision, userId } = ctx;
  if (!decision.ok || !room || !userId) return denied(ctx);
  const target = await reportTarget(ctx, room.id, body);
  if (!target || target.reportedId === userId) return { ok: false, code: "fora_da_sala" };
  const since = new Date(ctx.now.getTime() - 3600_000).toISOString();
  const { count } = await ctx.db.from("voice_room_reports").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("reporter_id", userId).gt("created_at", since);
  if ((count ?? 0) >= DENUNCIAS_POR_HORA) return { ok: false, code: "denuncias_demais" };
  const { error } = await ctx.db.from("voice_room_reports").insert({
    room_id: room.id, reporter_id: userId, reported_id: target.reportedId, message_id: target.messageId, message_body: target.messageBody,
    reason: body.motivo, details: body.detalhes, is_test: room.isTest,
  });
  if (error) throw new Error(`gravar a denúncia: ${error.message}`);
  await alertReport(ctx, target.reportedId, body, target.messageBody);
  return { ok: true };
}

const semMencao = (texto: string, max: number) => texto.replace(/[`@]/g, "'").slice(0, max);

async function alertReport(ctx: CallContext, reportedId: string, body: Denuncia, messageBody: string): Promise<void> {
  const room = ctx.room;
  if (!room) return;
  const ids = [ctx.userId, reportedId].filter((v): v is string => !!v);
  const { data } = await ctx.db.from("public_player_identities").select("id, username").in("id", ids);
  const nome = (id: string | null) => data?.find((p) => p.id === id)?.username ?? "jogador";
  const grave = GRAVES.has(body.motivo) ? "DENÚNCIA GRAVE. " : "";
  const teste = room.isTest ? "[TESTE] " : "";
  const mensagem = messageBody ? ` Mensagem: "${semMencao(messageBody, 200)}".` : "";
  const detalhe = body.detalhes ? ` Detalhe: "${semMencao(body.detalhes, 200)}".` : "";
  await sendOpsAlert(
    `${teste}${grave}Sala de voz "${room.title}": ${nome(ctx.userId)} denunciou ${nome(reportedId)} por ${MOTIVO_TEXTO[body.motivo]}.${mensagem}${detalhe} Veja em /admin/salas.`,
    !room.isTest
  );
}
