// Painel do PPA para as salas de voz (spec, seção 14): abrir a sala pública da live, criar a sala de
// mentoria a partir de um horário pago e a da party da live no ar, convite, encerrar, banidos e o
// resumo de consumo e denúncias. Quem chama confere antes que é admin.

import "server-only";
import { randomBytes } from "node:crypto";
import { capBytesFor } from "./custo";
import { hashInvite } from "./entrada";
import { getRoom, getSettings, toRoom, unbanUser, type Db, type RoomRecord } from "./dados-sala";
import { openSessions } from "./dados-rtc";
import { measuredBytes } from "./dados-uso";
import { realtimeEnv } from "./realtime-api";
import { closeSessions, revokeTurn } from "./sessoes";
import type { Audience, ScreenPolicy } from "./tipos";

const HORA = 3600_000;

export type CriarResultado = { ok: true; roomId: string; convite: string | null } | { ok: false; erro: string };

function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

async function buyerName(db: Db, userId: string | null, fallback: string): Promise<string> {
  if (!userId) return fallback;
  const { data } = await db.from("public_player_identities").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? fallback;
}

export async function createMentoriaRoom(db: Db, adminId: string, bookingId: string, policy: ScreenPolicy, now: Date): Promise<CriarResultado> {
  const { data: b } = await db.from("store_bookings").select("id, kind, status, ends_at, user_id, order_id, is_test").eq("id", bookingId).maybeSingle();
  if (!b || b.kind !== "agenda" || b.status !== "confirmado" || !b.order_id) return { ok: false, erro: "Horário sem pedido confirmado." };
  const { data: o } = await db.from("store_orders").select("status, buyer_name, product_title, user_id").eq("id", b.order_id).maybeSingle();
  if (!o || o.status !== "pago") return { ok: false, erro: "O pedido deste horário não está pago." };
  const buyerId = b.user_id ?? o.user_id;
  const settings = await getSettings(db);
  const nome = await buyerName(db, buyerId, o.buyer_name);
  const convite = buyerId ? null : newInviteToken();
  const closesAt = new Date(Math.max(new Date(b.ends_at).getTime() + 2 * HORA, now.getTime() + HORA));
  const { data: room, error } = await db
    .from("voice_rooms")
    .insert({
      kind: "mentoria", title: `${o.product_title}: ${nome}`.slice(0, 80), owner_id: adminId, booking_id: b.id,
      max_members: settings.mentoriaMaxMembers, screen_policy: policy, closes_at: closesAt.toISOString(),
      invite_token_hash: convite ? hashInvite(convite) : null, is_test: b.is_test,
    })
    .select("id")
    .single();
  if (error || !room) return { ok: false, erro: `Não deu para criar a sala: ${error?.message ?? "sem retorno"}` };
  const members = [{ room_id: room.id, user_id: adminId, role: "dono", joined_via: "dono" }];
  if (buyerId && buyerId !== adminId) members.push({ room_id: room.id, user_id: buyerId, role: "membro", joined_via: "pedido" });
  await db.from("voice_room_members").insert(members);
  return { ok: true, roomId: room.id, convite };
}

export async function createPartyRoom(db: Db, adminId: string, now: Date): Promise<CriarResultado> {
  const { data: live } = await db.from("store_live_sessions").select("id").eq("status", "ao_vivo").eq("is_test", false).order("on_air_at", { ascending: false }).limit(1).maybeSingle();
  if (!live) return { ok: false, erro: "Nenhuma live no ar. Abra a live no painel da fila antes." };
  const { data: existing } = await db.from("voice_rooms").select("id").eq("live_session_id", live.id).eq("status", "aberta").limit(1).maybeSingle();
  if (existing) return { ok: true, roomId: existing.id, convite: null };
  const settings = await getSettings(db);
  const { data: room, error } = await db
    .from("voice_rooms")
    .insert({ kind: "party", title: "Party da live", owner_id: adminId, live_session_id: live.id, max_members: settings.partyMaxMembers, closes_at: new Date(now.getTime() + 12 * HORA).toISOString() })
    .select("id")
    .single();
  if (error || !room) return { ok: false, erro: `Não deu para criar a sala: ${error?.message ?? "sem retorno"}` };
  await db.from("voice_room_members").insert({ room_id: room.id, user_id: adminId, role: "dono", joined_via: "dono" });
  return { ok: true, roomId: room.id, convite: null };
}

/** Sala pública da live: uma aberta por dono; abrir de novo devolve a que já está aberta. */
export async function createPalcoRoom(db: Db, adminId: string, audience: Audience, now: Date): Promise<CriarResultado> {
  const { data: existing } = await db.from("voice_rooms").select("id").eq("owner_id", adminId).eq("kind", "palco").eq("status", "aberta").eq("is_test", false).limit(1).maybeSingle();
  if (existing) return { ok: true, roomId: existing.id, convite: null };
  const settings = await getSettings(db);
  const { data: room, error } = await db
    .from("voice_rooms")
    .insert({ kind: "palco", title: "Sala da live", owner_id: adminId, audience, max_members: settings.palcoMaxMembers, closes_at: new Date(now.getTime() + 12 * HORA).toISOString() })
    .select("id")
    .single();
  if (error || !room) return { ok: false, erro: `Não deu para abrir a sala: ${error?.message ?? "sem retorno"}` };
  await db.from("voice_room_members").insert({ room_id: room.id, user_id: adminId, role: "dono", joined_via: "dono" });
  return { ok: true, roomId: room.id, convite: null };
}

export interface Banido {
  userId: string;
  nome: string;
  motivo: string;
  em: string;
}

export async function listBans(db: Db, ownerId: string): Promise<Banido[]> {
  const { data } = await db.from("voice_bans").select("user_id, reason, created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: names } = await db.from("public_player_identities").select("id, username").in("id", rows.map((b) => b.user_id));
  return rows.map((b) => ({ userId: b.user_id, nome: (names ?? []).find((n) => n.id === b.user_id)?.username ?? "jogador", motivo: b.reason, em: b.created_at }));
}

export async function unban(db: Db, ownerId: string, userId: string): Promise<void> {
  await unbanUser(db, ownerId, userId);
}

export async function regenerateInvite(db: Db, roomId: string): Promise<string | null> {
  const room = await getRoom(db, roomId);
  if (!room || room.kind !== "mentoria" || room.status !== "aberta") return null;
  const token = newInviteToken();
  const { error } = await db.from("voice_rooms").update({ invite_token_hash: hashInvite(token), invite_used_at: null }).eq("id", roomId);
  return error ? null : token;
}

export async function closeRoom(db: Db, roomId: string, now: Date): Promise<void> {
  await db.from("voice_rooms").update({ status: "encerrada", closed_at: now.toISOString() }).eq("id", roomId).eq("status", "aberta");
  await closeSessions(db, realtimeEnv(), await openSessions(db, { roomId }), "sala_encerrada", now);
  await revokeTurn(db, realtimeEnv(), roomId);
}

export interface Overview {
  rooms: Array<RoomRecord & { online: number }>;
  bookings: Array<{ id: string; startsAt: string; endsAt: string; product: string; buyer: string; hasAccount: boolean }>;
  liveOnAir: boolean;
  usage: { estimatedBytes: number; measuredBytes: number; capBytes: number; computedAt: string | null };
  reports: Array<{ id: string; createdAt: string; reason: string; details: string; messageBody: string; reporter: string; reported: string; roomTitle: string }>;
}

export async function adminOverview(db: Db, now: Date): Promise<Overview> {
  const since = new Date(now.getTime() - 30_000).toISOString();
  const [rooms, members, bookings, live, settings, measured, reports] = await Promise.all([
    db.from("voice_rooms").select("*").eq("status", "aberta").order("created_at", { ascending: false }).limit(30),
    db.from("voice_room_members").select("room_id").eq("status", "ativo").gt("last_seen_at", since),
    db.from("store_bookings").select("id, starts_at, ends_at, user_id, order_id").eq("kind", "agenda").eq("status", "confirmado").eq("is_test", false)
      .gt("ends_at", new Date(now.getTime() - 24 * HORA).toISOString()).lt("starts_at", new Date(now.getTime() + 14 * 24 * HORA).toISOString()).order("starts_at").limit(30),
    db.from("store_live_sessions").select("id").eq("status", "ao_vivo").eq("is_test", false).limit(1),
    getSettings(db),
    measuredBytes(db, now),
    db.from("voice_room_reports").select("id, created_at, reason, details, message_body, reporter_id, reported_id, room_id").in("status", ["aberta", "em_analise"]).order("created_at", { ascending: false }).limit(30),
  ]);
  const online = new Map<string, number>();
  for (const m of members.data ?? []) online.set(m.room_id, (online.get(m.room_id) ?? 0) + 1);
  return {
    rooms: (rooms.data ?? []).map((r) => ({ ...toRoom(r), online: online.get(r.id) ?? 0 })),
    bookings: await describeBookings(db, bookings.data ?? []),
    liveOnAir: (live.data ?? []).length > 0,
    usage: { estimatedBytes: settings.usageBytes30d, measuredBytes: measured, capBytes: capBytesFor(settings.capGb30d), computedAt: settings.usageComputedAt },
    reports: await describeReports(db, reports.data ?? [], rooms.data ?? []),
  };
}

type BookingRow = { id: string; starts_at: string; ends_at: string; user_id: string | null; order_id: string | null };

async function describeBookings(db: Db, rows: BookingRow[]): Promise<Overview["bookings"]> {
  const orderIds = rows.flatMap((b) => (b.order_id ? [b.order_id] : []));
  if (orderIds.length === 0) return [];
  const { data: orders } = await db.from("store_orders").select("id, status, buyer_name, product_title, user_id").in("id", orderIds).eq("status", "pago");
  const byId = new Map((orders ?? []).map((o) => [o.id, o]));
  return rows.flatMap((b) => {
    const o = b.order_id ? byId.get(b.order_id) : undefined;
    if (!o) return [];
    return [{ id: b.id, startsAt: b.starts_at, endsAt: b.ends_at, product: o.product_title, buyer: o.buyer_name, hasAccount: !!(b.user_id ?? o.user_id) }];
  });
}

type ReportRow = { id: string; created_at: string; reason: string; details: string; message_body: string; reporter_id: string | null; reported_id: string | null; room_id: string | null };

async function describeReports(db: Db, rows: ReportRow[], rooms: Array<{ id: string; title: string }>): Promise<Overview["reports"]> {
  const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter((v): v is string => !!v))];
  const { data } = ids.length ? await db.from("public_player_identities").select("id, username").in("id", ids) : { data: [] };
  const nome = (id: string | null) => (data ?? []).find((p) => p.id === id)?.username ?? "conta apagada";
  return rows.map((r) => ({
    id: r.id, createdAt: r.created_at, reason: r.reason, details: r.details, messageBody: r.message_body,
    reporter: nome(r.reporter_id), reported: nome(r.reported_id),
    roomTitle: rooms.find((x) => x.id === r.room_id)?.title ?? "sala encerrada",
  }));
}
