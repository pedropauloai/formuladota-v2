// Entrar, sair, aceitar o convite da mentoria e rotular a faixa publicada.

import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { CallContext } from "./contexto";
import { capBytesFor } from "./custo";
import { findTrack, getSession, labelTrack } from "./dados-rtc";
import { ensureMember, joinedViaFor, setTurnUsername, updateMember, type Db } from "./dados-sala";
import { forgetRoomState } from "./estado";
import { decideLabel } from "./faixas";
import { canPublishVoice, canShareScreen } from "./papeis";
import { generateIceServers, realtimeEnv } from "./realtime-api";
import { closeUserSessions } from "./sessoes";
import type { DenyCode, MemberRole, RoomKind, TrackDenyCode, TrackKind } from "./tipos";

const TURN_MAX_S = 12 * 3600;
const TURN_MIN_S = 3600;

export type EntradaResult =
  | { ok: true; iceServers: RTCIceServer[]; papel: MemberRole; tipo: RoomKind; videoMaxKbps: number; podeCompartilharTela: boolean }
  | { ok: false; code: DenyCode | "sala_indisponivel" };

export async function enterRoom(ctx: CallContext): Promise<EntradaResult> {
  const { room, settings, userId, decision } = ctx;
  if (!decision.ok) return { ok: false, code: decision.code };
  const env = realtimeEnv();
  if (!env || !room || !settings || !userId) return { ok: false, code: "sala_indisponivel" };
  const left = Math.floor((new Date(room.closesAt).getTime() - ctx.now.getTime()) / 1000);
  const turn = await generateIceServers(env, Math.min(TURN_MAX_S, Math.max(TURN_MIN_S, left)), `sala-${room.id}`);
  await ensureMember(ctx.db, room.id, userId, decision.role, joinedViaFor(decision.role, room.kind));
  await updateMember(ctx.db, room.id, userId, { last_seen_at: ctx.now.toISOString(), hand_raised_at: null });
  await setTurnUsername(ctx.db, room.id, userId, turn.username);
  forgetRoomState(room.id, userId);
  const share = canShareScreen(decision.role, room.kind, room.screenPolicy, settings.partyScreenEnabled);
  const capOk = room.isTest || settings.usageBytes30d < capBytesFor(settings.capGb30d);
  return { ok: true, iceServers: turn.iceServers, papel: decision.role, tipo: room.kind, videoMaxKbps: settings.videoMaxKbps, podeCompartilharTela: share && capOk };
}

export async function leaveRoom(ctx: CallContext): Promise<void> {
  if (!ctx.userId || !ctx.room) return;
  await closeUserSessions(ctx.db, realtimeEnv(), { roomId: ctx.room.id, userId: ctx.userId }, "saiu", ctx.now);
  await updateMember(ctx.db, ctx.room.id, ctx.userId, { last_seen_at: null, hand_raised_at: null });
  forgetRoomState(ctx.room.id, ctx.userId);
}

export function hashInvite(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const ConviteBody = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,128}$/) });

/** Troca o convite de uso único pelo lugar na mentoria. O primeiro que usa fica; o PPA vê quem é. */
export async function claimInvite(db: Db, roomId: string, userId: string, token: string, now: Date): Promise<"ok" | "invalido" | "usado"> {
  const { data: room } = await db.from("voice_rooms").select("id, kind, status, owner_id, invite_token_hash, invite_used_at").eq("id", roomId).maybeSingle();
  if (!room || room.kind !== "mentoria" || room.status !== "aberta" || !room.invite_token_hash) return "invalido";
  if (room.owner_id === userId) return "ok";
  if (room.invite_token_hash !== hashInvite(token)) return "invalido";
  const { data: taken } = await db
    .from("voice_rooms")
    .update({ invite_used_at: now.toISOString() })
    .eq("id", roomId)
    .eq("invite_token_hash", room.invite_token_hash)
    .is("invite_used_at", null)
    .select("id");
  if (!taken?.length) return "usado";
  const { error } = await db.from("voice_room_members").upsert({ room_id: roomId, user_id: userId, role: "membro", joined_via: "convite" }, { onConflict: "room_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`gravar o convidado: ${error.message}`);
  return "ok";
}

export const FaixaBody = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  trackName: z.string().min(1).max(128),
  tipo: z.enum(["voz", "tela", "tela_audio"]),
  qualidade: z.enum(["leve", "padrao", "alta", "fluida"]).nullable().default(null),
});

export async function labelOwnTrack(ctx: CallContext, body: z.infer<typeof FaixaBody>): Promise<{ ok: true } | { ok: false; code: TrackDenyCode | DenyCode }> {
  const { room, settings, userId, decision, member } = ctx;
  if (!decision.ok || !room || !settings || !userId) return { ok: false, code: decision.ok ? "sala_inexistente" : decision.code };
  const session = await getSession(ctx.db, body.sessionId);
  if (!session || session.roomId !== room.id || session.userId !== userId || session.closedAt) return { ok: false, code: "faixa_inexistente" };
  const track = await findTrack(ctx.db, body.sessionId, body.trackName);
  if (!track || track.closed) return { ok: false, code: "faixa_inexistente" };
  const rule = decideLabel({
    tipo: body.tipo,
    kind: track.kind as TrackKind,
    canShare: canShareScreen(decision.role, room.kind, room.screenPolicy, settings.partyScreenEnabled),
    canVoice: canPublishVoice(decision.role) && !(member?.forceMuted && decision.role !== "dono"),
    quality: body.qualidade,
  });
  if (!rule.ok) return rule;
  await labelTrack(ctx.db, body.sessionId, body.trackName, body.tipo, body.qualidade);
  forgetRoomState(room.id);
  return { ok: true };
}
