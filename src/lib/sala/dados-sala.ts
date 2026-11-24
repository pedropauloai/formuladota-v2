// Leitura e escrita de salas, membros e configuração (service role). Quem chama já autenticou o
// usuário; estas funções não decidem permissão, só buscam e gravam.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";
import type { MemberInfo, MemberRole, MemberStatus, RoomInfo, RoomKind, RoomStatus, ScreenPolicy } from "./tipos";

export type Db = ReturnType<typeof createServiceClient>;
type RoomRow = Database["public"]["Tables"]["voice_rooms"]["Row"];

export interface RoomRecord extends RoomInfo {
  title: string;
  bookingId: string | null;
  liveSessionId: string | null;
  inviteTokenHash: string | null;
  inviteUsedAt: string | null;
  createdAt: string;
}

export interface VoiceSettings {
  capGb30d: number;
  videoMaxKbps: number;
  mentoriaMaxMembers: number;
  partyMaxMembers: number;
  partyScreenEnabled: boolean;
  alertLevel: number;
  peakAlertAt: string | null;
  usageBytes30d: number;
  usageComputedAt: string | null;
}

export interface MemberRow {
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  muted: boolean;
  lastSeenAt: string | null;
}

export function toRoom(r: RoomRow): RoomRecord {
  return {
    id: r.id,
    kind: r.kind as RoomKind,
    status: r.status as RoomStatus,
    ownerId: r.owner_id,
    isTest: r.is_test,
    maxMembers: r.max_members,
    screenPolicy: r.screen_policy as ScreenPolicy,
    closesAt: r.closes_at,
    title: r.title,
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

export async function getMember(db: Db, roomId: string, userId: string): Promise<MemberInfo | null> {
  const { data, error } = await db.from("voice_room_members").select("user_id, role, status").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`ler o membro: ${error.message}`);
  return data ? { userId: data.user_id, role: data.role as MemberRole, status: data.status as MemberStatus } : null;
}

export async function listMembers(db: Db, roomId: string): Promise<MemberRow[]> {
  const { data, error } = await db.from("voice_room_members").select("user_id, role, status, muted, last_seen_at").eq("room_id", roomId);
  if (error) throw new Error(`ler os membros: ${error.message}`);
  return (data ?? []).map((m) => ({ userId: m.user_id, role: m.role as MemberRole, status: m.status as MemberStatus, muted: m.muted, lastSeenAt: m.last_seen_at }));
}

export async function getSettings(db: Db): Promise<VoiceSettings> {
  const { data, error } = await db.from("voice_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`ler a configuração da sala: ${error?.message ?? "sem linha"}`);
  return {
    capGb30d: data.cap_gb_30d,
    videoMaxKbps: data.video_max_kbps,
    mentoriaMaxMembers: data.mentoria_max_members,
    partyMaxMembers: data.party_max_members,
    partyScreenEnabled: data.party_screen_enabled,
    alertLevel: data.alert_level,
    peakAlertAt: data.peak_alert_at,
    usageBytes30d: data.usage_bytes_30d,
    usageComputedAt: data.usage_computed_at,
  };
}

export async function getBirthDate(db: Db, userId: string): Promise<string | null> {
  const { data } = await db.from("user_birthdates").select("birth_date").eq("user_id", userId).maybeSingle();
  return data?.birth_date ?? null;
}

export async function hasSteamLink(db: Db, userId: string): Promise<boolean> {
  const { count } = await db.from("steam_links").select("user_id", { count: "exact", head: true }).eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** Mesma regra do middleware: banido, ou suspenso dentro do prazo. */
export async function isAccountBlocked(db: Db, userId: string, now: Date): Promise<boolean> {
  const { data } = await db.from("profiles").select("behavior_status, suspended_until").eq("id", userId).maybeSingle();
  if (!data) return true;
  if (data.behavior_status === "banned") return true;
  return data.behavior_status === "suspended" && !!data.suspended_until && new Date(data.suspended_until) > now;
}

export async function isInPartyNow(db: Db, userId: string, isTest: boolean): Promise<boolean> {
  const { count } = await db
    .from("store_bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_test", isTest)
    .eq("queue_state", "na_party");
  return (count ?? 0) > 0;
}

/** Membros ativos com batimento depois de `since`. */
export async function onlineMemberIds(db: Db, roomId: string, since: Date): Promise<string[]> {
  const { data } = await db
    .from("voice_room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("status", "ativo")
    .gt("last_seen_at", since.toISOString());
  return (data ?? []).map((m) => m.user_id);
}

/** Na party, a linha de membro nasce na primeira entrada de quem está na party agora. */
export async function ensureMember(db: Db, roomId: string, userId: string, role: MemberRole, via: "dono" | "party"): Promise<void> {
  const { error } = await db
    .from("voice_room_members")
    .upsert({ room_id: roomId, user_id: userId, role, joined_via: via }, { onConflict: "room_id,user_id", ignoreDuplicates: true });
  if (error) throw new Error(`gravar o membro: ${error.message}`);
}

export async function touchMember(db: Db, roomId: string, userId: string, muted: boolean | null, seenAt: Date | null): Promise<void> {
  const patch: Database["public"]["Tables"]["voice_room_members"]["Update"] = { last_seen_at: seenAt ? seenAt.toISOString() : null };
  if (muted !== null) patch.muted = muted;
  const { error } = await db.from("voice_room_members").update(patch).eq("room_id", roomId).eq("user_id", userId).eq("status", "ativo");
  if (error) throw new Error(`gravar o batimento: ${error.message}`);
}

export async function kickMember(db: Db, roomId: string, userId: string, byUserId: string, now: Date): Promise<void> {
  const { error } = await db.from("voice_room_members").upsert(
    { room_id: roomId, user_id: userId, role: "membro", joined_via: "party", status: "expulso", removed_by: byUserId, removed_at: now.toISOString(), last_seen_at: null },
    { onConflict: "room_id,user_id" }
  );
  if (error) throw new Error(`expulsar: ${error.message}`);
}

const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** Pares bloqueados (em qualquer direção) entre as pessoas da lista. */
export async function blockedPairsAmong(db: Db, userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds)];
  if (ids.length < 2) return new Set();
  const { data } = await db.from("friendships").select("requester_id, addressee_id").eq("status", "blocked").in("requester_id", ids).in("addressee_id", ids);
  return new Set((data ?? []).map((f) => pairKey(f.requester_id, f.addressee_id)));
}

export function isBlockedPair(pairs: Set<string>, a: string, b: string): boolean {
  return pairs.has(pairKey(a, b));
}
