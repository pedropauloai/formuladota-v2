// Peças do e2e da sala de voz: usuários de teste com Steam e a marcação de 18 anos, salas de teste
// (mentoria de um pedido pago e sala pública), navegador com mídia falsa, chamadas diretas e a limpeza. Reaproveita o
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

export async function createUser(tag, { admin = false, adult = true } = {}) {
  const id = randomBytes(4).toString("hex");
  const user = await comum.createTestBuyer(`sala.e2e.${tag}.${id}@formuladota.com.br`, `Sala E2E ${tag} ${id}`);
  if (adult) {
    const { error } = await db.from("user_age_confirmations").insert({ user_id: user.id, terms_version: "sala-1" });
    if (error) throw new Error(`marcação de 18 anos de teste: ${error.message}`);
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

/** Sala pública de teste, só com o dono; quem chega entra na plateia. */
export async function createPalco(owner, { maxMembers = 30 } = {}) {
  const { data: room, error } = await db
    .from("voice_rooms")
    .insert({ kind: "palco", title: "Sala pública de teste do e2e", owner_id: owner.id, max_members: maxMembers, closes_at: new Date(Date.now() + 3600_000).toISOString(), is_test: true })
    .select("id")
    .single();
  if (error) throw new Error(`sala pública de teste: ${error.message}`);
  const { error: mErr } = await db.from("voice_room_members").insert({ room_id: room.id, user_id: owner.id, role: "dono", joined_via: "dono" });
  if (mErr) throw new Error(`dono de teste: ${mErr.message}`);
  return { id: room.id };
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

/** O que cada navegador viu (erros do console e respostas das rotas da sala), para a falha vir explicada. */
export const diagnostico = [];

export function instrument(page, quem) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || msg.type() === "warning" || text.includes("[sala]")) diagnostico.push(`${quem} console.${msg.type()}: ${text.slice(0, 300)}`);
  });
  page.on("pageerror", (err) => diagnostico.push(`${quem} pageerror: ${String(err).slice(0, 300)}`));
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/api/sala/")) return;
    const path = new URL(url).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ":id");
    if (res.status() >= 400) {
      const body = await res.text().catch(() => "");
      diagnostico.push(`${quem} ${res.request().method()} ${path} -> ${res.status()} ${body.slice(0, 200)}`);
    } else if (/rtc|faixas|entrar/.test(path)) diagnostico.push(`${quem} ${res.request().method()} ${path} -> ${res.status()}`);
  });
}

/** Sessões, faixas e recepções da sala, para o diagnóstico de uma falha. */
export async function dumpRoom(roomId) {
  const { data: sessions } = await db.from("voice_room_sessions").select("id, user_id, closed_at, close_reason").eq("room_id", roomId);
  const ids = (sessions ?? []).map((x) => x.id);
  const { data: tracks } = ids.length ? await db.from("voice_room_tracks").select("session_id, track_name, kind, tipo, quality, closed_at").in("session_id", ids) : { data: [] };
  const { data: subs } = ids.length ? await db.from("voice_room_subscriptions").select("session_id, publisher_session_id, track_name, kind, rid, ended_at").in("session_id", ids) : { data: [] };
  const curto = (v) => (v ? String(v).slice(0, 8) : "-");
  const linhas = [
    ...(sessions ?? []).map((x) => `sessão ${curto(x.id)} de ${curto(x.user_id)} ${x.closed_at ? `fechada (${x.close_reason})` : "aberta"}`),
    ...(tracks ?? []).map((x) => `faixa ${x.kind}/${x.tipo ?? "sem rótulo"}${x.quality ? `/${x.quality}` : ""} da sessão ${curto(x.session_id)} ${x.closed_at ? "fechada" : "aberta"}`),
    ...(subs ?? []).map((x) => `recepção ${x.kind}${x.rid ? `/${x.rid}` : ""} na sessão ${curto(x.session_id)} de ${curto(x.publisher_session_id)} ${x.ended_at ? "encerrada" : "aberta"}`),
  ];
  return linhas.join(String.fromCharCode(10));
}

export async function enter(ctx, roomId, quem = "navegador") {
  const page = await ctx.newPage();
  instrument(page, quem);
  await page.goto(`${BASE}/sala/${roomId}`);
  await page.locator("[data-sala-entrar]").click({ timeout: 60_000 });
  await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
  return page;
}

export const apiPost = (page, path, body) =>
  page.evaluate(async ([p, b]) => {
    const res = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }, [path, body ?? null]);

export async function confirmDialog(page) {
  await page.getByRole("button", { name: "Confirmar" }).click({ timeout: 10_000 });
}

/** Tenta publicar direto pelo intermediário (sem passar pela tela): a trava tem de estar no servidor. */
export function tryPublish(page, roomId, sessionId, kind, trackName) {
  return page.evaluate(async ([r, sid, k, name]) => {
    const pc = new RTCPeerConnection();
    pc.addTransceiver(k, { direction: "sendonly" });
    const offer = await pc.createOffer();
    const mid = pc.getTransceivers()[0].mid ?? "0";
    const res = await fetch(`/api/sala/${r}/rtc/sessions/${sid}/tracks/new`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionDescription: { type: "offer", sdp: offer.sdp }, tracks: [{ location: "local", mid, trackName: name }] }),
    });
    pc.close();
    return { status: res.status, body: await res.json() };
  }, [roomId, sessionId, kind, trackName]);
}

/** Camada (rid) da tela que a pessoa recebe agora. */
export async function videoLayerOf(roomId, userId) {
  const sid = await openSessionOf(roomId, userId);
  if (!sid) return null;
  const { data } = await db.from("voice_room_subscriptions").select("rid").eq("session_id", sid).eq("kind", "video").is("ended_at", null).limit(1);
  return data?.[0]?.rid ?? null;
}

/** Faixas de voz abertas da pessoa na sala. */
export async function openVoiceCount(roomId, userId) {
  const sid = await openSessionOf(roomId, userId);
  if (!sid) return 0;
  const { count } = await db.from("voice_room_tracks").select("track_name", { count: "exact", head: true }).eq("session_id", sid).eq("kind", "audio").eq("tipo", "voz").is("closed_at", null);
  return count ?? 0;
}

/** Faixas de vídeo (tela) abertas da pessoa na sala. */
export async function openVideoCount(roomId, userId) {
  const sid = await openSessionOf(roomId, userId);
  if (!sid) return 0;
  const { count } = await db.from("voice_room_tracks").select("track_name", { count: "exact", head: true }).eq("session_id", sid).eq("kind", "video").is("closed_at", null);
  return count ?? 0;
}

export async function openSessionOf(roomId, userId) {
  const { data } = await db.from("voice_room_sessions").select("id").eq("room_id", roomId).eq("user_id", userId).is("closed_at", null).order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}

export async function cleanup({ rooms, orders, users }) {
  const ids = users.map((u) => u.id);
  if (rooms.length) await db.from("voice_rooms").delete().in("id", rooms);
  if (ids.length) await db.from("voice_bans").delete().in("owner_id", ids);
  await db.from("voice_room_reports").delete().eq("is_test", true).in("reporter_id", ids);
  await db.from("voice_room_subscriptions").delete().eq("is_test", true).eq("track_name", "e2e-teto-falso");
  if (ids.length) await db.from("friendships").delete().in("requester_id", ids).in("addressee_id", ids);
  if (orders.length) await db.from("store_orders").delete().in("id", orders);
  await deleteTestUsers(ids);
}
