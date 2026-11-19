// Cenário visual da fila da party: abre uma live de teste com gente na party e na fila, tira as
// capturas da /party (logado na fila e visitante) e do painel /admin/loja/fila em 1920x1080,
// celular (390x844) e 3440x1440, e apaga tudo no fim. Tudo de teste (is_test): o site de produção
// nunca mostra. O admin do painel é um usuário de teste criado e apagado na mesma execução.
// Rodar com o servidor local de pé: LOJA_E2E_PORT=3101 node scripts/loja/cenario-fila.mjs <pasta>

import { mkdirSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright-core";
import { BASE, USER_AGENT, acquireTestLock, db, env, openStoreFlag, releaseTestLock, restoreStoreFlag } from "./e2e-comum.mjs";

const OUT = process.argv[2] ?? "capturas-fila";
const RUN = randomUUID().slice(0, 6);
const STEAM_BASE = 76561197960265728n;
const NAMES = ["Kaio Mid", "Bia Suporte", "Rafa Offlane", "Duda Carry", "Leo Tinker", "Nina Hard"];
const SIZES = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "celular", width: 390, height: 844, mobile: true },
  { name: "3440", width: 3440, height: 1440 },
];

async function createUser(name, index, admin = false) {
  const email = `cenario.fila.${RUN}.${index}@formuladota.com.br`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (error) throw new Error(`usuário ${name}: ${error.message}`);
  const steamId = String(STEAM_BASE + 4294100000n + BigInt(index * 1000 + Math.floor(Math.random() * 900)));
  await db.from("steam_links").insert({ user_id: data.user.id, steam_id_64: steamId, persona: name });
  if (admin) await db.from("profiles").update({ is_admin: true }).eq("id", data.user.id);
  return { id: data.user.id, email, password };
}

async function cookiesFor(user) {
  const jar = new Map();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar.values()], setAll: (list) => list.forEach((c) => jar.set(c.name, c)) },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`login de teste: ${error.message}`);
  return [...jar.values()].filter((c) => c.value).map((c) => ({ name: c.name, value: c.value, domain: "localhost", path: "/", sameSite: "Lax" }));
}

/** Pedido pago de teste com a vaga confirmada: o gatilho do banco põe na fila. */
async function paidSeat(user, liveId, matches) {
  const { data: product } = await db.from("store_products").select("id, store_product_variants (id)").eq("slug", "vaga-na-party").single();
  const { data: order, error } = await db
    .from("store_orders")
    .insert({
      product_id: product.id, variant_id: product.store_product_variants[0].id, product_title: "Vaga na party da live",
      variant_label: `${matches} partida(s)`, amount_cents: 2500 * matches, quantity: matches, user_id: user.id,
      buyer_name: "Cenário", buyer_email: user.email, buyer_whatsapp: null, payment_method: "pix", status: "pago", is_test: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`pedido de teste: ${error.message}`);
  const { data: booking } = await db.rpc("store_reservar_fila", { p_order_id: order.id, p_product_id: product.id, p_seats: matches, p_hold_until: null, p_is_test: true });
  return booking;
}

async function capture(browser, cookies, path, label) {
  for (const size of SIZES) {
    const context = await browser.newContext({
      userAgent: USER_AGENT, viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1,
      isMobile: size.mobile === true, hasTouch: size.mobile === true, locale: "pt-BR",
    });
    await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" }, ...cookies]);
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const file = `${OUT}/${label}-${size.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log("captura:", file);
    await context.close();
  }
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  const users = [];
  await acquireTestLock(RUN);
  const flagWas = await openStoreFlag();
  let liveId = null;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
    const { data: open } = await db.from("store_live_sessions").select("id").eq("is_test", true).eq("status", "ao_vivo");
    for (const live of open ?? []) await db.rpc("party_fila_encerrar_live", { p_live_id: live.id });
    ({ data: liveId } = await db.rpc("party_fila_abrir_live", { p_is_test: true, p_party_seats: 12, p_seats_per_match: 4, p_youtube_video_id: null }));
    for (const [i, name] of NAMES.entries()) users.push(await createUser(name, i));
    const viewer = await createUser("Você Teste", 90);
    const admin = await createUser("Admin Teste", 91, true);
    users.push(viewer, admin);
    // Party com 3, a fila com quem comprou 1 ou 3 partidas, e quem olha em 2º.
    for (const [i, user] of users.slice(0, 3).entries()) await paidSeat(user, liveId, i === 0 ? 3 : 1);
    for (let i = 0; i < 3; i += 1) await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
    await paidSeat(users[3], liveId, 2);
    await paidSeat(viewer, liveId, 1);
    await paidSeat(users[4], liveId, 1);
    await paidSeat(users[5], liveId, 3);

    await capture(browser, await cookiesFor(viewer), "/party", "party-na-fila");
    await capture(browser, [], "/party", "party-visitante");
    await capture(browser, await cookiesFor(admin), "/admin/loja/fila", "painel");
  } finally {
    await browser.close().catch(() => undefined);
    if (liveId) await db.rpc("party_fila_encerrar_live", { p_live_id: liveId });
    await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
    for (const user of users) {
      const { error } = await db.auth.admin.deleteUser(user.id);
      if (error) console.error("apagar usuário de teste falhou:", error.message);
    }
    await restoreStoreFlag(flagWas);
    await releaseTestLock(RUN);
  }
}

run().catch((err) => {
  console.error(`cenário falhou: ${err.message}`);
  process.exit(1);
});
