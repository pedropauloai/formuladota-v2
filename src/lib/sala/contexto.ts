// Contexto de toda chamada à sala: quem é, a flag, os fatos da sala numa consulta só ao banco e a
// decisão de acesso (decideRoomAccess). Feito para o plano grátis do Supabase (spec, ADR-004): o login
// se valida no próprio servidor pela chave pública do Supabase e a flag fica 15 s na memória.

import "server-only";
import { z } from "zod";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decideRoomAccess } from "./acesso";
import type { Db } from "./dados-sala";
import { TtlCache } from "./memoria";
import type { AccessDecision, DenyCode, MemberRole, MemberStatus, RoomInfo } from "./tipos";

const FLAG_MS = 15_000;
const flagCache = new TtlCache<boolean>(FLAG_MS, 1);

/** A flag sala_voz (autoritativa), guardada 15 s para o batimento não ir ao banco só por ela. */
export async function salaFlagOn(now: number): Promise<boolean> {
  const cached = flagCache.get("sala_voz", now);
  if (cached !== undefined) return cached;
  const on = (await getFeatureFlags()).sala_voz;
  flagCache.set("sala_voz", on, now);
  return on;
}

export interface AuthInfo {
  userId: string;
  discord: boolean;
}

const AppMeta = z.object({ provider: z.string().optional(), providers: z.array(z.string()).optional() }).passthrough();

/** Login validado pela assinatura do token (getClaims, chave ES256 do projeto), sem ir ao Auth a cada pedido. */
export async function authInfo(): Promise<AuthInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const meta = AppMeta.safeParse(data.claims.app_metadata);
  const discord = meta.success && (meta.data.provider === "discord" || (meta.data.providers ?? []).includes("discord"));
  return { userId: data.claims.sub, discord };
}

const RoomFacts = z.object({
  id: z.string(),
  kind: z.enum(["palco", "mentoria", "party"]),
  title: z.string(),
  owner_id: z.string(),
  status: z.enum(["aberta", "encerrada"]),
  closes_at: z.string(),
  max_members: z.number(),
  screen_policy: z.enum(["dono", "um_por_vez"]),
  audience: z.enum(["todos", "beneficio"]),
  chat_open: z.boolean(),
  is_test: z.boolean(),
});
const SettingsFacts = z.object({
  cap_gb_30d: z.number(),
  video_max_kbps: z.number(),
  palco_max_speakers: z.number(),
  party_screen_enabled: z.boolean(),
  usage_bytes_30d: z.number(),
});
const MemberFacts = z.object({
  role: z.enum(["dono", "membro", "falante", "ouvinte"]),
  status: z.enum(["ativo", "expulso"]),
  muted: z.boolean(),
  force_muted: z.boolean(),
  hand_raised_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
});
/** O que voice_room_access e voice_room_tick devolvem (sala inexistente: só `room: null`). */
const Facts = z.object({
  room: RoomFacts.nullable(),
  settings: SettingsFacts.nullable().default(null),
  member: MemberFacts.nullable().default(null),
  age_confirmed: z.boolean().default(false),
  steam_linked: z.boolean().default(false),
  account_blocked: z.boolean().default(true),
  banned_by_owner: z.boolean().default(false),
  party_now: z.boolean().default(false),
  battlepass: z.boolean().default(false),
  online_others: z.number().default(0),
  speakers: z.number().default(0),
  blocked: z.array(z.string()).default([]),
});

export interface SalaSettings {
  capGb30d: number;
  videoMaxKbps: number;
  palcoMaxSpeakers: number;
  partyScreenEnabled: boolean;
  usageBytes30d: number;
}

export interface MemberState {
  role: MemberRole;
  status: MemberStatus;
  muted: boolean;
  forceMuted: boolean;
  handRaisedAt: string | null;
}

/** O que a regra decidiu e o que ela leu; guardado na memória até o próximo batimento. */
export interface Verdict {
  userId: string | null;
  room: RoomInfo | null;
  settings: SalaSettings | null;
  member: MemberState | null;
  speakers: number;
  blocked: string[];
  decision: AccessDecision;
}

export interface CallContext extends Verdict {
  db: Db;
  now: Date;
}

function verdictFrom(auth: AuthInfo, flagOn: boolean, now: Date, raw: unknown): Verdict {
  const f = Facts.parse(raw);
  const r = f.room;
  const room: RoomInfo | null = r && {
    id: r.id, kind: r.kind, title: r.title, status: r.status, ownerId: r.owner_id, isTest: r.is_test,
    maxMembers: r.max_members, screenPolicy: r.screen_policy, audience: r.audience, chatOpen: r.chat_open, closesAt: r.closes_at,
  };
  const s = f.settings;
  const settings: SalaSettings | null = s && {
    capGb30d: s.cap_gb_30d, videoMaxKbps: s.video_max_kbps, palcoMaxSpeakers: s.palco_max_speakers,
    partyScreenEnabled: s.party_screen_enabled, usageBytes30d: s.usage_bytes_30d,
  };
  const m = f.member;
  const member: MemberState | null = m && { role: m.role, status: m.status, muted: m.muted, forceMuted: m.force_muted, handRaisedAt: m.hand_raised_at };
  const decision = decideRoomAccess({
    flagOn, now, userId: auth.userId, room,
    member: member && { role: member.role, status: member.status, forceMuted: member.forceMuted },
    identityOk: auth.discord || f.steam_linked,
    accountBlocked: f.account_blocked,
    ageConfirmed: f.age_confirmed,
    bannedByOwner: f.banned_by_owner,
    inPartyNow: f.party_now,
    battlepass: f.battlepass,
    onlineOthers: f.online_others,
  });
  return { userId: auth.userId, room, settings, member, speakers: f.speakers, blocked: f.blocked, decision };
}

function deniedVerdict(userId: string | null, code: DenyCode): Verdict {
  return { userId, room: null, settings: null, member: null, speakers: 0, blocked: [], decision: { ok: false, code } };
}

export type Rpc = { fn: "access" } | { fn: "tick"; muted: boolean; hand: boolean };

/** Contexto com o login e a flag já lidos: uma consulta ao banco (o contexto, ou o batimento). */
export async function contextFor(roomId: string, auth: AuthInfo | null, flagOn: boolean, rpc: Rpc, now = new Date()): Promise<CallContext> {
  const db = createServiceClient();
  if (!flagOn) return { db, now, ...deniedVerdict(auth?.userId ?? null, "flag_desligada") };
  if (!auth) return { db, now, ...deniedVerdict(null, "sem_login") };
  const { data, error } =
    rpc.fn === "tick"
      ? await db.rpc("voice_room_tick", { p_room: roomId, p_user: auth.userId, p_muted: rpc.muted, p_hand: rpc.hand })
      : await db.rpc("voice_room_access", { p_room: roomId, p_user: auth.userId });
  if (error) throw new Error(`ler o contexto da sala: ${error.message}`);
  return { db, now, ...verdictFrom(auth, flagOn, now, data) };
}

/** Contexto de uma chamada (entrar, faixa, moderação, chat): uma consulta ao banco. */
export async function loadCallContext(roomId: string): Promise<CallContext> {
  const now = new Date();
  const [auth, flagOn] = await Promise.all([authInfo(), salaFlagOn(now.getTime())]);
  return contextFor(roomId, auth, flagOn, { fn: "access" }, now);
}

export function verdictOf(ctx: CallContext): Verdict {
  return { userId: ctx.userId, room: ctx.room, settings: ctx.settings, member: ctx.member, speakers: ctx.speakers, blocked: ctx.blocked, decision: ctx.decision };
}
