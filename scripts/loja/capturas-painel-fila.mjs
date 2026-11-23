// Capturas do painel da fila (/admin/loja/fila) com uma fila de teste cheia: 2 na party e 8
// esperando, entre compras pagas e cortesias, em 1920x1080 e 3440x1440, com e sem o detalhe aberto.
// Tudo de teste (live is_test, usuários criados e apagados aqui). Rode com o servidor local de pé:
// LOJA_E2E_PORT=3104 node scripts/loja/capturas-painel-fila.mjs <pasta>

import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, acquireTestLock, buyerContext, createTestBuyer, db, deleteTestUsers, openStoreFlag, openTestLive,
  releaseTestLock, resetTestQueue, restoreStoreFlag,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 6);
const OUT = process.argv[2] ?? "capturas-painel-fila";
const NAMES = ["Ana", "Beto", "Caio", "Dani", "Enzo", "Fabi", "Gui", "Hugo", "Iara", "João"];

async function paidSeat(buyer, matches) {
  const { data: product } = await db.from("store_products").select("id").eq("slug", "vaga-na-party").single();
  const { data: variant } = await db.from("store_product_variants").select("id").eq("product_id", product.id).limit(1).single();
  const { data: order, error } = await db.from("store_orders").insert({
    product_id: product.id, variant_id: variant.id, product_title: "Vaga na party", variant_label: "Por partida",
    amount_cents: 2500 * matches, quantity: matches, user_id: buyer.id, buyer_name: buyer.name,
    buyer_email: buyer.email, payment_method: "pix", status: "pago", is_test: true,
  }).select("id").single();
  if (error) throw new Error(`pedido de teste: ${error.message}`);
  await db.rpc("store_reservar_fila", { p_order_id: order.id, p_product_id: product.id, p_seats: matches, p_hold_until: null, p_is_test: true });
}

async function fillQueue(liveId) {
  const users = [];
  for (const [i, name] of NAMES.entries()) {
    const buyer = await createTestBuyer(`painel.${RUN}.${i}@formuladota.com.br`, `${name} Teste ${RUN}`);
    users.push(buyer);
    if (i % 3 === 2) await db.rpc("party_fila_adicionar_cortesia", { p_user_id: buyer.id, p_matches: 1 + (i % 2), p_is_test: true });
    else await paidSeat(buyer, 1 + (i % 2));
  }
  await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  // Uma partida registrada com ID, para o histórico aparecer (um conferido, um sem conferência).
  const { data: party } = await db.from("store_bookings").select("user_id").eq("is_test", true).eq("queue_state", "na_party");
  await db.rpc("party_fila_partida_terminou", {
    p_live_id: liveId, p_expected_count: 0, p_dota_match_id: 9097240074, p_played_at: new Date().toISOString(), p_confirmed: (party ?? []).slice(0, 1).map((b) => b.user_id),
  });
  await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  return users;
}

async function capture(browser, admin, width, height, name) {
  const context = await buyerContext(browser, admin, { desktop: true });
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/admin/loja/fila`);
  await page.locator("[data-fila-linha]").first().waitFor({ timeout: 90_000 });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.locator("[data-fila-linha] > [role=button]").nth(1).click();
  await page.locator("[data-fila-linha] > [aria-expanded='true']").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${OUT}/${name}-detalhe.png`, fullPage: true });
  console.log(`captura: ${OUT}/${name}.png e -detalhe.png`);
  await context.close();
}

mkdirSync(OUT, { recursive: true });
const state = { users: [] };
let browser = null;
try {
  await acquireTestLock(RUN);
  state.locked = true;
  state.flagWas = await openStoreFlag();
  await resetTestQueue();
  state.liveId = await openTestLive(20, 4);
  const admin = await createTestBuyer(`painel.${RUN}.admin@formuladota.com.br`, `PPA Teste ${RUN}`);
  state.users.push(admin);
  await db.from("profiles").update({ is_admin: true }).eq("id", admin.id);
  state.users.push(...(await fillQueue(state.liveId)));
  browser = await chromium.launch({ channel: "chrome", headless: true });
  await capture(browser, admin, 1920, 1080, "painel-1920");
  await capture(browser, admin, 3440, 1440, "painel-3440");
} finally {
  await browser?.close().catch(() => undefined);
  if (state.liveId) await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
  await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
  const ids = state.users.map((u) => u.id);
  if (ids.length) await db.from("profiles").update({ is_admin: false }).in("id", ids);
  await deleteTestUsers(ids).catch(() => undefined);
  if (state.flagWas !== undefined) await restoreStoreFlag(state.flagWas);
  if (state.locked) await releaseTestLock(RUN);
}
