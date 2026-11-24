// Leitura e escrita de salas, membros, banidos e configuração (service role). Quem chama já autenticou
// o usuário e decidiu a permissão; estas funções só buscam e gravam.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";
import type { Audience, MemberRole, MemberStatus, RoomInfo, RoomKind, RoomStatus, ScreenPolicy } from "./tipos";

export type Db = ReturnType<typeof createServiceClient>;
type RoomRow = Database["public"]["Tables"]["voice_rooms"]["Row"];
type MemberUpdate = Database["public"]["Tables"]["voice_room_members"]["Update"];

export interface RoomRecord extends RoomInfo {
  bookingId: string | null;
  liveSessionId: string | null;
  inviteTokenHash: string | null;
  inviteUsedAt: string | null;
  createdAt: string;
}

export interface VoiceSettings {
  capGb30d: number;
  videoMaxKbps: number;
  palcoMaxMembers: number;
  palcoMaxSpeakers: number;
  mentoriaMaxMembers: number;
  partyMaxMembers: number;
  partyScreenEnabled: boolean;
  chatRetentionDays: number;
  alertLevel: number;
  peakAlertAt: string | null;
  usageBytes30d: number;
  usageComputedAt: string | null;
}

export type JoinedVia = "dono" | "pedido" | "convite" | "party" | "palco";

export function toRoom(r: RoomRow): RoomRecord {
  return {
    id: r.id,
    kind: r.kind as RoomKind,
    title: r.title,
    status: r.status as RoomStatus,
    ownerId: r.owner_id,
    isTest: r.is_test,
    maxMembers: r.max_members,
    screenPolicy: r.screen_policy as ScreenPolicy,
    audience: r.audience as Audience,
    chatOpen: r.chat_open,
    closesAt: r.closes_at,
    bookingId: r.booking_id,
    liveSessionId: r.live_session_id,
    inviteTokenHash: r.invite_token_hash,
    inviteUsedAt: r.invite_used_at,
    createdAt: r.created_at,
  };
}

export async function getRoom(db: Db, id: string): Promise<RoomRecord | null> {
  const { data, error } = await db.from("voice_rooms").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`ler a sala: ${error.message}`);
  return data ? toRoom(data) : null;
}

export async function getSettings(db: Db): Promise<VoiceSettings> {
  const { data, error } = await db.from("voice_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`ler a configuração da sala: ${error?.message ?? "sem linha"}`);
  return {
    capGb30d: data.cap_gb_30d,
    videoMaxKbps: data.video_max_kbps,
    palcoMaxMembers: data.palco_max_members,
    palcoMaxSpeakers: data.palco_max_speakers,
    mentoriaMaxMembers: data.mentoria_max_members,
    partyMaxMembers: data.party_max_members,
    partyScreenEnabled: data.party_screen_enabled,
    chatRetentionDays: data.chat_retention_days,
    alertLevel: data.alert_level,
    peakAlertAt: data.peak_alert_at,
    usageBytes30d: data.usage_bytes_30d,
    usageComputedAt: data.usage_computed_at,
  };
}

/** A linha da pessoa na sala (qualquer status), para a moderação. */
export async function getMemberRow(db: Db, roomId: string, userId: string): Promise<{ role: MemberRole; status: MemberStatus } | null> {
  const { data, error } = await db.from("voice_room_members").select("role, status").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`ler o membro: ${error.message}`);
  return data ? { role: data.role as MemberRole, status: data.status as MemberStatus } : null;
}

/** As linhas de várias pessoas na sala, com o último batimento (quem publica segue online?). */
export async function memberRows(db: Db, roomId: string, userIds: string[]): Promise<Map<string, { role: MemberRole; status: MemberStatus; lastSeenAt: string | null }>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from("voice_room_members").select("user_id, role, status, last_seen_at").eq("room_id", roomId).in("user_id", ids);
  if (error) throw new Error(`ler os membros: ${error.message}`);
  return new Map((data ?? []).map((m) => [m.user_id, { role: m.role as MemberRole, status: m.status as MemberStatus, lastSeenAt: m.last_seen_at }]));
}

export function joinedViaFor(role: MemberRole, kind: RoomKind): JoinedVia {
  if (role === "dono") return "dono";
  if (kind === "party") return "party";
  return kind === "palco" ? "palco" : "pedido";
}

/** Cria a linha na primeira entrada (party e sala pública); quem já tem linha fica como está. */
export async function ensureMember(db: Db, roomId: string, userId: string, role: MemberRole, via: JoinedVia): Promise<void> {
  const { error } = await db
    .from("voice_room_members")
    .upsert({ room_id: roomId, user_id: userId, role, joined_via: via }, { onConflict: "room_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`gravar o membro: ${error.message}`);
}

/** Atualiza a linha de quem segue ativo na sala. */
export async function updateMember(db: Db, roomId: string, userId: string, patch: MemberUpdate): Promise<void> {
  const { error } = await db.from("voice_room_members").update(patch).eq("room_id", roomId).eq("user_id", userId).eq("status", "ativo");
  if (error) throw new Error(`gravar o membro: ${error.message}`);
}

export async function kickMember(db: Db, roomId: string, userId: string, byUserId: string, now: Date): Promise<void> {
  const { error } = await db
    .from("voice_room_members")
    .update({ status: "expulso", removed_by: byUserId, removed_at: now.toISOString(), last_seen_at: null, hand_raised_at: null })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw new Error(`expulsar: ${error.message}`);
}

export async function banUser(db: Db, ownerId: string, userId: string, byUserId: string, reason: string): Promise<void> {
  const { error } = await db.from("voice_bans").upsert({ owner_id: ownerId, user_id: userId, created_by: byUserId, reason }, { onConflict: "owner_id,user_id" });
  if (error) throw new Error(`banir: ${error.message}`);
}

export async function unbanUser(db: Db, ownerId: string, userId: string): Promise<void> {
  const { error } = await db.from("voice_bans").delete().eq("owner_id", ownerId).eq("user_id", userId);
  if (error) throw new Error(`desbanir: ${error.message}`);
}

export async function setTurnUsername(db: Db, roomId: string, userId: string, username: string | null): Promise<void> {
  await db.from("voice_room_members").update({ turn_username: username }).eq("room_id", roomId).eq("user_id", userId);
}

/** Nomes das credenciais de TURN da sala (de uma pessoa ou de todas), para revogar. */
export async function turnUsernames(db: Db, roomId: string, userId?: string): Promise<string[]> {
  let q = db.from("voice_room_members").select("turn_username").eq("room_id", roomId).not("turn_username", "is", null);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data ?? []).map((m) => m.turn_username as string);
}

/** Se há bloqueio (em qualquer direção) entre a pessoa e cada uma das outras. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function blockedAmong(db: Db, me: string, others: string[]): Promise<Set<string>> {
  // Os ids entram no filtro do PostgREST: só uuid passa.
  const ids = [...new Set(others.filter((id) => id !== me && UUID.test(id)))];
  if (ids.length === 0 || !UUID.test(me)) return new Set();
  const { data } = await db
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "blocked")
    .or(`and(requester_id.eq.${me},addressee_id.in.(${ids.join(",")})),and(addressee_id.eq.${me},requester_id.in.(${ids.join(",")}))`);
  return new Set((data ?? []).map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id)));
}
