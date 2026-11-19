// pnpm loja:e2e, parte da fila da party: compra da vaga pela fila até a posição, a chamada do
// Pedro e o aviso "Chegou a sua vez" na tela em tempo real. Spec: docs/loja/fila-da-party.md.
// Tudo de teste: live is_test (o site de produção nunca mostra), pedido is_test no sandbox do
// Mercado Pago, aviso [TESTE] no Discord e um usuário de teste criado e apagado no fim.
// Sai com código diferente de zero se qualquer verificação falhar. Nunca imprime credencial.

import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright-core";
import {
  BASE, USER_AGENT, checker, db, discordMessageFor, env, openStoreFlag, orderRow, restoreStoreFlag,
  sandboxCardPayment, startServer, stopServer, waitFor, webhook,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const EMAIL = `e2e.fila.${RUN}@formuladota.com.br`;
const NAME = `Fila E2E ${RUN}`;
const STEAM_BASE = 76561197960265728n;
// Steam de teste com ID de amigo perto do teto de 32 bits: acima de qualquer conta real.
const STEAM_ID = String(STEAM_BASE + 4294000000n + BigInt(Math.floor(Math.random() * 900000)));
const PRICE_CENTS = 2500;
const { results, check } = checker();

async function createBuyer() {
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email: EMAIL, password, email_confirm: true, user_metadata: { full_name: NAME } });
  if (error) throw new Error(`usuário de teste: ${error.message}`);
  const { error: steamError } = await db.from("steam_links").insert({ user_id: data.user.id, steam_id_64: STEAM_ID, persona: NAME });
  if (steamError) throw new Error(`Steam de teste: ${steamError.message}`);
  return { id: data.user.id, password };
}

/** Cookies de sessão no formato do site (@supabase/ssr), para o navegador de teste entrar logado. */
async function sessionCookies(password) {
  const jar = new Map();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (list) => list.forEach((cookie) => jar.set(cookie.name, cookie)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: EMAIL, password });
  if (error) throw new Error(`login do usuário de teste: ${error.message}`);
  return [...jar.values()].filter((c) => c.value).map((c) => ({ name: c.name, value: c.value, domain: "localhost", path: "/", sameSite: "Lax" }));
}

/** Fila de teste limpa e uma live de teste no ar: fila de 6 partidas, party de 1 lugar. */
async function openTestLive() {
  await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
  const { data: open } = await db.from("store_live_sessions").select("id").eq("is_test", true).eq("status", "ao_vivo");
  for (const live of open ?? []) await db.rpc("party_fila_encerrar_live", { p_live_id: live.id });
  const { data, error } = await db.rpc("party_fila_abrir_live", { p_is_test: true, p_party_seats: 6, p_seats_per_match: 1, p_youtube_video_id: null });
  if (error || !data) throw new Error(`abrir a live de teste: ${error?.message}`);
  return data;
}

async function cleanup(state) {
  if (state.liveId) await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
  // Reserva de teste nunca fica esperando na fila de teste das próximas execuções.
  await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
  if (state.userId) {
    const { error } = await db.auth.admin.deleteUser(state.userId);
    if (error) console.error("apagar o usuário de teste falhou:", error.message);
  }
  if (state.flagWas !== undefined) await restoreStoreFlag(state.flagWas);
}

async function buyWithPix(page, buyer, campaign, liveId) {
  await page.goto(`${BASE}/party?utm_source=live&utm_medium=qr&utm_campaign=${campaign}`);
  await page.locator("[data-fila-vagas='6']").waitFor({ timeout: 60_000 });
  check("página da fila mostra a live no ar e as vagas abertas", true);
  await page.locator("[data-fila-comprar='pix']").click();
  await page.locator("[data-fila-pix]").waitFor({ timeout: 60_000 });
  check("Pix na própria página depois de um toque", await page.getByText("Copiar código Pix").isVisible());
  const { data: order } = await db.from("store_orders").select("*").eq("user_id", buyer.id).single();
  check("pedido pendente com o Pix do Mercado Pago e sem WhatsApp", order?.status === "pendente" && !!order.mp_payment_id && order.is_test && order.buyer_whatsapp === null);
  check("pedido com o ID do Dota da Steam vinculada", order?.details?.dota_id === String(BigInt(STEAM_ID) - STEAM_BASE));
  check("pedido herdou a origem do QR da live", order?.utm_source === "live" && order?.utm_campaign === campaign);
  check("uma partida cobra R$ 25", order?.amount_cents === PRICE_CENTS && order?.quantity === 1);
  const { data: hold } = await db.from("store_bookings").select("id, status, live_session_id, queue_state, hold_until").eq("order_id", order.id).single();
  check("vaga segurada na live no ar, fora da fila até pagar", hold?.status === "reservado" && hold.live_session_id === liveId && hold.queue_state === null && !!hold.hold_until);
  return { order, bookingId: hold.id };
}

async function payAndQueue(page, order) {
  const payment = await sandboxCardPayment(order.id, PRICE_CENTS / 100, EMAIL);
  check("pagamento de teste aprovado no sandbox", payment.status === "approved", `status ${payment.status}`);
  check("webhook assinado aceito", (await webhook(payment.id, env.MP_WEBHOOK_SECRET)) === 200);
  const started = Date.now();
  await page.locator("[data-fila-posicao='1']").waitFor({ timeout: 20_000 });
  check("posição na fila aparece sozinha depois do pagamento", true, `${Date.now() - started} ms`);
}

async function checkPublicEndpoint(buyer) {
  const response = await fetch(`${BASE}/api/party/fila`);
  const body = await response.json();
  check("endpoint público mostra a pessoa na fila pelo nome público", body.live?.status === "ao_vivo" && body.queue?.[0]?.name === NAME && body.queue?.[0]?.position === 1);
  check("endpoint público conta a vaga vendida", body.live?.seatsOpen === 5, `${body.live?.seatsOpen} vagas`);
  const raw = JSON.stringify(body);
  check("endpoint público sem id de usuário, e-mail nem WhatsApp", !raw.includes(buyer.id) && !raw.includes(EMAIL) && !/whatsapp|email|user_?id|steam_?id/i.test(raw));
  check("endpoint público com CORS aberto para o overlay", response.headers.get("access-control-allow-origin") === "*");
}

async function turnInRealTime(page, liveId, bookingId) {
  const started = Date.now();
  const { data: called } = await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  check("o Pedro chama o próximo (a mesma função do painel)", called === bookingId);
  await page.locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  check("aviso 'Chegou a sua vez' na tela em tempo real", true, `${Date.now() - started} ms`);
  check("cartão da vez com o ID do Dota", await page.locator("[data-fila-vez='na_party']").getByText(String(BigInt(STEAM_ID) - STEAM_BASE)).isVisible());
  await page.getByRole("button", { name: "Entendi" }).click();
  const { data: state } = await db.rpc("party_fila_jogou", { p_booking_id: bookingId });
  check("partida marcada como jogada", state === "concluido");
  await page.locator("[data-fila-vez='concluido']").waitFor({ timeout: 15_000 });
  check("página mostra que a pessoa jogou", true);
}

async function checkShell(page) {
  const { data: flag } = await db.from("feature_flags").select("enabled").eq("key", "fila_competitiva").single();
  await page.goto(`${BASE}/loja`);
  const cta = page.locator("[data-cta='jogar-com-o-pedro']");
  if (flag?.enabled) check("com a busca no ar, o botão verde continua JOGAR DOTA", (await cta.count()) === 0);
  else check("com a busca pausada, o botão verde leva para a fila", (await cta.getAttribute("href"))?.endsWith("/party") === true);
  check("aba Loja com o ponto de ao vivo", (await page.locator("[data-aba-ao-vivo]").count()) > 0);
}

async function run() {
  const server = await startServer();
  const state = {};
  let browser = null;
  try {
    state.flagWas = await openStoreFlag();
    state.liveId = await openTestLive();
    const buyer = await createBuyer();
    state.userId = buyer.id;
    const cookies = await sessionCookies(buyer.password);
    browser = await chromium.launch({ channel: "chrome", headless: true });
    // Celular: é de onde a pessoa compra durante a live.
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: "pt-BR", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: "localhost", path: "/" }, ...cookies]);
    const page = await context.newPage();

    const { order, bookingId } = await buyWithPix(page, buyer, `e2e-fila-${RUN}`, state.liveId);
    await payAndQueue(page, order);
    await checkPublicEndpoint(buyer);
    await turnInRealTime(page, state.liveId, bookingId);
    const notified = await waitFor(async () => (await orderRow(order.id))?.notified_at, 30_000);
    check("aviso de venda entregue", !!notified);
    check("mensagem [TESTE] da vaga no canal de vendas do Discord", !!(await discordMessageFor(order.id)));
    await checkShell(page);
  } finally {
    await browser?.close().catch(() => undefined);
    await cleanup(state).catch((err) => console.error("limpeza falhou:", err.message));
    stopServer(server);
  }
}

run()
  .then(() => {
    console.log(`\nFila da party: ${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nE2E DA FILA FALHOU: ${err.message}`);
    process.exit(1);
  });
