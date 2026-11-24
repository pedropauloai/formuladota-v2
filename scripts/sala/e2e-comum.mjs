// Peças do e2e da sala de voz: usuários de teste com Steam e data de nascimento, sala de mentoria de
// teste (pedido pago e horário de teste), navegador com mídia falsa e a limpeza. Reaproveita o
// servidor local, o login e o banco do e2e da loja. Nunca imprime credencial.

import { randomBytes, createHash } from "node:crypto";

process.env.LOJA_E2E_PORT ??= "3200";
const comum = await import("../loja/e2e-comum.mjs");
export const { env, db, BASE, checker, waitFor, sleep, startServer, stopServer, buyerContext, deleteTestUsers } = comum;

if (!env.REALTIME_APP_ID || !env.REALTIME_APP_SECRET) {
  throw new Error("Recusado: o .env.local não tem REALTIME_APP_ID e REALTIME_APP_SECRET (app do Cloudflare Realtime).");
}

/** Chrome com microfone e tela falsos (a tela falsa vem em 1920x1080 com áudio). */
export const CHROME_ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"];

export async function createUser(tag, { admin = false, birthDate = "1995-05-10" } = {}) {
  const id = randomBytes(4).toString("hex");
  const user = await comum.createTestBuyer(`sala.e2e.${tag}.${id}@formuladota.com.br`, `Sala E2E ${tag} ${id}`);
  if (birthDate) {
    const { error } = await db.from("user_birthdates").insert({ user_id: user.id, birth_date: birthDate });
    if (error) throw new Error(`data de nascimento de teste: ${error.message}`);
  }
  if (admin) {
    const { error } = await db.from("profiles").update({ is_admin: true }).eq("id", user.id);
    if (error) throw new Error(`admin de teste: ${error.message}`);
  }
  return user;
}

async function paidMentoriaBooking(buyerId) {
  const { data: prod } = await db.from("store_products").select("id, title").eq("slug", "mentoria").single();
  const { data: variant } = await db.from("store_product_variants").select("id, label, price_cents").eq("product_id", prod.id).limit(1).single();
  const { data: order, error } = await db
    .from("store_orders")
    .insert({
      product_id: prod.id, variant_id: variant.id, product_title: prod.title, variant_label: variant.label, amount_cents: variant.price_cents,
      user_id: buyerId, buyer_name: "Teste da sala de voz", buyer_email: "sala.e2e@formuladota.com.br", buyer_whatsapp: null,
      payment_method: "pix", status: "pago", paid_at: new Date().toISOString(), is_test: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`pedido de teste: ${error.message}`);
  // Horário de teste longe de tudo: a agenda de teste não aceita dois horários sobrepostos.
  const start = new Date(Date.UTC(2099, 0, 1) + Math.floor(Math.random() * 300_000) * 3600_000);
  const { data: booking, error: bErr } = await db
    .from("store_bookings")
    .insert({ order_id: order.id, product_id: prod.id, kind: "agenda", starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 5400_000).toISOString(), status: "confirmado", is_test: true })
    .select("id")
    .single();
  if (bErr) throw new Error(`horário de teste: ${bErr.message}`);
  return { orderId: order.id, bookingId: booking.id };
}

/** Sala de mentoria de teste: dono, membros já na sala e, sem membro comprador, um convite. */
export async function createRoom(owner, members, { invite = false } = {}) {
  const { orderId, bookingId } = await paidMentoriaBooking(members[0]?.id ?? null);
  const token = invite ? randomBytes(24).toString("base64url") : null;
  const { data: room, error } = await db
    .from("voice_rooms")
    .insert({
      kind: "mentoria", title: "Sala de teste do e2e", owner_id: owner.id, booking_id: bookingId, max_members: 2,
      closes_at: new Date(Date.now() + 3600_000).toISOString(), is_test: true,
      invite_token_hash: token ? createHash("sha256").update(token).digest("hex") : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`sala de teste: ${error.message}`);
  const rows = [{ room_id: room.id, user_id: owner.id, role: "dono", joined_via: "dono" }, ...members.map((m) => ({ room_id: room.id, user_id: m.id, role: "membro", joined_via: "pedido" }))];
  const { error: mErr } = await db.from("voice_room_members").insert(rows);
  if (mErr) throw new Error(`membros de teste: ${mErr.message}`);
  return { id: room.id, orderId, token };
}

export async function setFlag(enabled) {
  const { data } = await db.from("feature_flags").select("enabled").eq("key", "sala_voz").single();
  await db.from("feature_flags").update({ enabled }).eq("key", "sala_voz");
  return data?.enabled === true;
}

/** Atributo numérico da raiz da sala (bytes recebidos, altura do quadro). */
export async function attr(page, name) {
  const value = await page.locator("[data-sala-fase]").first().getAttribute(name);
  return Number(value ?? 0);
}

export async function openSessionOf(roomId, userId) {
  const { data } = await db.from("voice_room_sessions").select("id").eq("room_id", roomId).eq("user_id", userId).is("closed_at", null).order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}

export async function cleanup({ rooms, orders, users }) {
  const ids = users.map((u) => u.id);
  if (rooms.length) await db.from("voice_rooms").delete().in("id", rooms);
  await db.from("voice_room_reports").delete().eq("is_test", true).in("reporter_id", ids);
  await db.from("voice_room_subscriptions").delete().eq("is_test", true).eq("track_name", "e2e-teto-falso");
  if (ids.length) await db.from("friendships").delete().in("requester_id", ids).in("addressee_id", ids);
  if (orders.length) await db.from("store_orders").delete().in("id", orders);
  await deleteTestUsers(ids);
}
