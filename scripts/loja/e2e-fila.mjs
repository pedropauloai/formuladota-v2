// pnpm loja:e2e, parte da fila da party: compra da vaga do dia fora da live, na fila aberta, até a
// posição; a live abre com quem comprou fora; a chamada do Pedro e o aviso "Chegou a sua vez" na
// tela em tempo real; a vaga do dia segue na party sem ninguém esperando e termina no fim da live.
// A compra durante a live fica no e2e-fila-saidas. Spec: docs/loja/fila-da-party.md.
// Tudo de teste: live is_test (o site de produção nunca mostra), pedido is_test no sandbox do
// Mercado Pago, aviso [TESTE] no Discord e um usuário de teste criado e apagado no fim.
// Sai com código diferente de zero se qualquer verificação falhar. Nunca imprime credencial.

import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, acquireTestLock, buyerContext, checker, createTestBuyer, db, deleteTestUsers, discordMessageFor, env, openStoreFlag,
  openTestLive as openLive, orderRow, releaseTestLock, resetTestQueue, restoreStoreFlag, sandboxCardPayment, startServer, stopServer, waitFor, webhook,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const EMAIL = `e2e.fila.${RUN}@formuladota.com.br`;
const NAME = `Fila E2E ${RUN}`;
const PRICE_CENTS = 2500;
const { results, check } = checker();

/** Fila de teste limpa e sem live no ar: a fila aberta de teste com 6 partidas e party de 1 lugar. */
async function prepareOpenQueue() {
  await resetTestQueue();
  const { data, error } = await db
    .from("store_live_sessions")
    .update({ party_seats: 6, seats_per_match: 1 })
    .eq("is_test", true)
    .eq("status", "fila")
    .select("id")
    .single();
  if (error || !data) throw new Error(`preparar a fila aberta de teste: ${error?.message}`);
  return data.id;
}

/** O Pedro abre a live depois da venda fora dela: a live herda o tamanho da fila aberta. */
async function openLiveAfterOfflineSale(page) {
  const liveId = await openLive(null, 1);
  const { data: live } = await db.from("store_live_sessions").select("status, party_seats").eq("id", liveId).single();
  check("a live abre com o tamanho da fila aberta", live?.status === "ao_vivo" && live?.party_seats === 6, `${live?.party_seats} partidas`);
  await page.locator("[data-fila-live='ao_vivo']").waitFor({ timeout: 20_000 });
  check("a página passa sozinha para a live no ar", true);
  return liveId;
}

async function cleanup(state) {
  if (state.liveId) await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
  // Reserva de teste nunca fica esperando na fila de teste das próximas execuções.
  await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
  if (state.userId) await deleteTestUsers([state.userId]);
  if (state.flagWas !== undefined) await restoreStoreFlag(state.flagWas);
  if (state.locked) await releaseTestLock(RUN);
}

async function buyWithPix(page, buyer, campaign, queueId) {
  await page.goto(`${BASE}/party?utm_source=live&utm_medium=qr&utm_campaign=${campaign}`);
  await page.locator("[data-fila-live='fila'] [data-fila-vagas='6']").waitFor({ timeout: 60_000 });
  check("sem live no ar, a página vende a vaga na fila aberta", true);
  check("o preço vem pela vaga do dia, sem escolher partidas", (await page.getByText("pela vaga do dia").count()) > 0 && (await page.getByRole("button", { name: "Mais uma partida" }).count()) === 0);
  await page.locator("[data-fila-comprar='pix']").click();
  await page.locator("[data-fila-pix]").waitFor({ timeout: 60_000 });
  check("Pix na própria página depois de um toque", await page.getByText("Copiar código Pix").isVisible());
  const { data: order } = await db.from("store_orders").select("*").eq("user_id", buyer.id).single();
  check("pedido pendente com o Pix do Mercado Pago e sem WhatsApp", order?.status === "pendente" && !!order.mp_payment_id && order.is_test && order.buyer_whatsapp === null);
  check("pedido com o ID do Dota da Steam vinculada", order?.details?.dota_id === buyer.dotaId);
  check("pedido herdou a origem do QR da live", order?.utm_source === "live" && order?.utm_campaign === campaign);
  check("a vaga do dia cobra R$ 25", order?.amount_cents === PRICE_CENTS && order?.quantity === 1);
  const { data: hold } = await db.from("store_bookings").select("id, status, modo, live_session_id, queue_state, hold_until").eq("order_id", order.id).single();
  check("a reserva nasce no modo do dia", hold?.modo === "dia");
  check("vaga segurada na fila aberta, fora da fila até pagar", hold?.status === "reservado" && hold.live_session_id === queueId && hold.queue_state === null && !!hold.hold_until);
  const holdMinutes = (Date.parse(hold.hold_until) - Date.parse(order.created_at)) / 60_000;
  check("Pix abandonado segura a vaga só por 10 minutos", holdMinutes > 9 && holdMinutes < 11, `${holdMinutes.toFixed(1)} min`);
  return { order, bookingId: hold.id };
}

async function payAndQueue(page, order) {
  const payment = await sandboxCardPayment(order.id, PRICE_CENTS / 100, EMAIL);
  check("pagamento de teste aprovado no sandbox", payment.status === "approved", `status ${payment.status}`);
  check("webhook assinado aceito", (await webhook(payment.id, env.MP_WEBHOOK_SECRET)) === 200);
  const started = Date.now();
  await page.locator("[data-fila-posicao='1']").waitFor({ timeout: 20_000 });
  check("posição na fila aparece sozinha depois do pagamento", true, `${Date.now() - started} ms`);
  check("com a vaga do dia de pé, a compra some e a nota explica", (await page.locator("[data-fila-vaga-do-dia]").count()) === 1 && (await page.locator("[data-fila-comprar]").count()) === 0);
}

async function checkPublicEndpoint(buyer) {
  const response = await fetch(`${BASE}/api/party/fila`);
  const body = await response.json();
  check(
    "endpoint público mostra a fila aberta, sem data de live, com a pessoa pelo nome público",
    body.live?.status === "fila" && body.live?.startsAt === null && body.queue?.[0]?.name === NAME && body.queue?.[0]?.position === 1
  );
  check("endpoint público conta a vaga vendida", body.live?.seatsOpen === 5, `${body.live?.seatsOpen} vagas`);
  check("endpoint público diz a oferta (vaga do dia, R$ 25) e a vaga do dia de cada um, para os overlays", body.offer?.mode === "dia" && body.offer?.priceCents === PRICE_CENTS && body.queue?.[0]?.dayPass === true);
  const raw = JSON.stringify(body);
  check("endpoint público sem id de usuário, e-mail nem WhatsApp", !raw.includes(buyer.id) && !raw.includes(EMAIL) && !/whatsapp|email|user_?id|steam_?id/i.test(raw));
  check("endpoint público com CORS aberto para o overlay", response.headers.get("access-control-allow-origin") === "*");
}

async function turnInRealTime(page, liveId, bookingId, buyer) {
  const started = Date.now();
  const { data: called } = await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
  check("o Pedro chama o próximo (a mesma função do painel)", called === bookingId);
  await page.locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  check("aviso 'Chegou a sua vez' na tela em tempo real", true, `${Date.now() - started} ms`);
  check("cartão da vez com o ID do Dota", await page.locator("[data-fila-vez='na_party']").getByText(buyer.dotaId).isVisible());
  await page.getByRole("button", { name: "Entendi" }).click();
  // A mesma função do botão "Partida terminou" do painel; ninguém espera, então a vaga do dia fica na party.
  const { data: counted } = await db.rpc("party_fila_partida_terminou", { p_live_id: liveId, p_expected_count: 0 });
  const { data: after } = await db.from("store_bookings").select("queue_state, matches_played").eq("id", bookingId).single();
  check("partida terminou sem ninguém esperando: a vaga do dia segue na party", counted === 1 && after?.queue_state === "na_party" && after?.matches_played === 1);
  await page.locator("[data-fila-vez='na_party']").getByText("Sua 2ª partida hoje", { exact: true }).waitFor({ timeout: 15_000 });
  check("a página conta a partida de hoje", true);
  await db.rpc("party_fila_encerrar_live", { p_live_id: liveId });
  await page.locator("[data-fila-vez='concluido']").getByText("1 partida jogada.").waitFor({ timeout: 15_000 });
  check("no fim da live, a vaga do dia que jogou termina, e a página mostra que a pessoa jogou", true);
}

async function checkShell(page) {
  await page.goto(`${BASE}/loja`);
  // O botão verde é sempre o JOGAR DOTA (o Buscar partida fica no lugar, mesmo pausado); a
  // party do PPA é uma modalidade dentro do menu dele.
  const play = page.locator("[data-cta='jogar-dota']");
  await play.waitFor({ timeout: 30_000 });
  check("o botão verde da barra de baixo é o JOGAR DOTA", (await play.count()) === 1);
  await play.click();
  await page.locator("[data-modalidade='party']").click();
  const party = page.locator("[data-cta='jogar-com-o-ppa']");
  await party.waitFor({ timeout: 15_000 });
  check("a party do PPA está no menu Jogar e leva para a fila", (await party.getAttribute("href"))?.endsWith("/party") === true);
  check("aba Loja com o ponto de ao vivo", (await page.locator("[data-aba-ao-vivo]").count()) > 0);
  const withQty = await fetch(`${BASE}/loja/vaga-na-party?qtd=2`, { redirect: "manual" });
  check("a quantidade escolhida na vitrine segue para a fila", (withQty.headers.get("location") ?? "").endsWith("/party?qtd=2"));
  await page.goto(`${BASE}/party?qtd=2`);
  await page.locator("[data-fila-comprar='pix']").waitFor({ timeout: 30_000 });
  const total = await page.locator("[data-fila-comprar='pix']").innerText();
  check("a quantidade da vitrine não passa de uma vaga do dia", total.includes("25") && !total.includes("50"), total);
  const product = await fetch(`${BASE}/loja/vaga-na-party`, { redirect: "manual" });
  check("produto da vaga na loja leva para a fila", product.status >= 300 && product.status < 400 && (product.headers.get("location") ?? "").endsWith("/party"), `${product.status}`);
}

async function run() {
  const server = await startServer();
  const state = {};
  let browser = null;
  try {
    await acquireTestLock(RUN);
    state.locked = true;
    state.flagWas = await openStoreFlag();
    const queueId = await prepareOpenQueue();
    const buyer = await createTestBuyer(EMAIL, NAME);
    state.userId = buyer.id;
    browser = await chromium.launch({ channel: "chrome", headless: true });
    // Celular: é de onde a pessoa compra, pelo QR da live ou vendo um vídeo.
    const page = await (await buyerContext(browser, buyer)).newPage();

    const { order, bookingId } = await buyWithPix(page, buyer, `e2e-fila-${RUN}`, queueId);
    await payAndQueue(page, order);
    await checkPublicEndpoint(buyer);
    state.liveId = await openLiveAfterOfflineSale(page);
    await turnInRealTime(page, state.liveId, bookingId, buyer);
    const notified = await waitFor(async () => (await orderRow(order.id))?.notified_at, 30_000);
    check("aviso de venda entregue", !!notified);
    const sale = await discordMessageFor(order.id);
    check("mensagem [TESTE] da vaga no canal de vendas do Discord", !!sale);
    const saleText = JSON.stringify(sale ?? {});
    check("o aviso de venda diz que a vaga é na fila aberta, sem a data fixa", saleText.includes("fila da party, para a próxima live") && !saleText.includes("01/01"));
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
