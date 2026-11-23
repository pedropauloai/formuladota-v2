// pnpm loja:e2e, saídas da fila da party na regra da vaga do dia (migration 194): seis compradores de
// teste e cada jeito de sair. Disputa pela última vaga, não apareceu, saiu da fila, reembolso, partida
// terminou com o revezamento (quem tem a vaga do dia cede o lugar a quem espera), a lotação que libera
// depois da primeira partida, live encerrada e a vaga que não jogou passando para a live seguinte.
// Com FILA_VIDEO=<pasta>, grava em vídeo a fila andando na tela (computador de quem está na fila),
// tira capturas do celular de cada um e espera entre os passos para dar tempo de ver.
// Tudo de teste (is_test): o site de produção nunca mostra. Nunca imprime credencial.

import { mkdirSync, renameSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, acquireTestLock, buyerContext, checker, createTestBuyer, db, deleteTestUsers, discordContentWith, env, openStoreFlag, openTestLive,
  releaseTestLock, resetTestQueue, restoreStoreFlag, sandboxCardPayment, sandboxRefund, sleep, startServer, stopServer, webhook,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 6);
const VIDEO = process.env.FILA_VIDEO ?? null;
const NAMES = ["Ana", "Beto", "Caio", "Duda", "Enzo", "Fabi"];
/** Lotação da live de teste (vagas do dia por pagar a primeira partida) e lugares na party. */
const QUEUE_SIZE = 4;
const SEATS = 2;
/** Fabi fica de fora da disputa: compra depois que a lotação libera. */
const FABI = 5;
const { results, check } = checker();
const pause = (ms = 4000) => (VIDEO ? sleep(ms) : Promise.resolve());

async function snap(page, name) {
  if (VIDEO) await page.screenshot({ path: `${VIDEO}/${name}.png` });
}

async function latestOrder(buyer) {
  const { data } = await db.from("store_orders").select("*").eq("user_id", buyer.id).order("created_at", { ascending: false }).limit(1).single();
  return data;
}

async function bookingOf(orderId) {
  const { data } = await db.from("store_bookings").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).single();
  return data;
}

/** O Pix na página ou o aviso de erro da compra, o que vier primeiro. */
async function outcome(page) {
  const alert = page.locator("#fila-erro [role='alert']");
  const pix = page.locator("[data-fila-pix]").waitFor({ timeout: 60_000 }).then(() => "pix", () => null);
  const error = alert.waitFor({ timeout: 60_000 }).then(async () => `erro: ${await alert.innerText()}`, () => null);
  return Promise.race([pix, error]);
}

/** Confere que a compra mostrou o Pix. Se não mostrou, o aviso da página vira o detalhe da falha. */
async function checkPix(name, page) {
  const result = await outcome(page);
  check(name, result === "pix", result === "pix" ? "" : (result ?? "nem Pix nem aviso em 60 s"));
}

async function pay(buyer) {
  const order = await latestOrder(buyer);
  const payment = await sandboxCardPayment(order.id, order.amount_cents / 100, buyer.email);
  check(`${buyer.first}: pagamento aprovado no sandbox`, payment.status === "approved", `status ${payment.status}`);
  check(`${buyer.first}: webhook assinado aceito`, (await webhook(payment.id, env.MP_WEBHOOK_SECRET)) === 200);
  return { order, payment };
}

const call = (liveId) => db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
const seatsOpen = async () => (await fetch(`${BASE}/api/party/fila`).then((r) => r.json())).live?.seatsOpen ?? null;
const position = (page, n) => page.locator(`[data-fila-posicao='${n}']`).waitFor({ timeout: 20_000 });

async function raceForLastSeats(state, buyers, pages) {
  check("a vaga do dia é uma por compra: sem escolher partidas", (await pages[0].getByRole("button", { name: "Mais uma partida" }).count()) === 0);
  check("o preço vem pela vaga do dia", await pages[0].getByText("pela vaga do dia").first().isVisible());
  await pages[0].locator("[data-fila-comprar='pix']").click();
  await checkPix("Ana garante a vaga do dia, com o Pix na página", pages[0]);
  const ana = await latestOrder(buyers[0]);
  check("a vaga do dia cobra R$ 25", ana.quantity === 1 && ana.amount_cents === 2500);
  check("a reserva nasce no modo do dia", (await bookingOf(ana.id))?.modo === "dia");
  await pause();
  const others = [1, 2, 3, 4];
  // Quatro pessoas tocam em "Garantir minha vaga" ao mesmo tempo para as 3 vagas que sobraram.
  await Promise.all(others.map((i) => pages[i].locator("[data-fila-comprar='pix']").click()));
  const outcomes = await Promise.all(others.map((i) => outcome(pages[i])));
  const winners = others.filter((_, k) => outcomes[k] === "pix");
  const losers = others.filter((_, k) => outcomes[k] !== "pix");
  check("disputa pela última vaga: 3 levam e 1 fica sem", winners.length === 3 && losers.length === 1, outcomes.join(" | "));
  check("quem ficou sem vê que as vagas acabaram", outcomes.some((o) => o?.includes("As vagas acabaram")));
  await snap(pages[losers[0]], "1-esgotado-no-celular");
  const { data: holds } = await db.from("store_bookings").select("seats").eq("live_session_id", state.liveId).eq("status", "reservado");
  const held = (holds ?? []).reduce((sum, b) => sum + b.seats, 0);
  check(`a fila nunca passa da lotação de ${QUEUE_SIZE} vagas`, held === QUEUE_SIZE, `${held} seguradas`);
  await pause();
  return { winners, loser: losers[0] };
}

async function payInOrder(buyers, pages, order) {
  const payments = {};
  for (const i of order) payments[i] = await pay(buyers[i]);
  for (const [k, i] of order.entries()) await position(pages[i], k + 1);
  check("posições na ordem do pagamento", true, order.map((i) => NAMES[i]).join(" > "));
  check("fila cheia: nenhuma vaga aberta", (await seatsOpen()) === 0);
  check("com a vaga do dia de pé, a compra some e a nota explica", (await pages[0].locator("[data-fila-vaga-do-dia]").count()) === 1 && (await pages[0].locator("[data-fila-comprar]").count()) === 0);
  await pause();
  return payments;
}

async function noShowAndCallNext(state, buyers, pages, [w1, w2]) {
  await call(state.liveId);
  await call(state.liveId);
  for (const i of [0, w1]) await pages[i].locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  check("Pedro completa a party: os 2 primeiros recebem 'Chegou a sua vez'", true);
  await snap(pages[0], "2-chegou-a-sua-vez");
  for (const i of [0, w1]) await pages[i].getByRole("button", { name: "Entendi" }).click();
  await pause();
  const w1Booking = await bookingOf((await latestOrder(buyers[w1])).id);
  await db.rpc("party_fila_ausente", { p_booking_id: w1Booking.id });
  await pages[w1].getByText("O PPA chamou você e você não apareceu").waitFor({ timeout: 15_000 });
  await position(pages[w1], 3);
  check("não apareceu: volta para o fim da fila, com a vaga", true);
  await snap(pages[w1], "3-nao-apareceu");
  await call(state.liveId);
  await pages[w2].locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  await pages[w2].getByRole("button", { name: "Entendi" }).click();
  check("o próximo entra no lugar de quem não apareceu", true);
  await pause();
}

async function leaveQueue(buyers, pages, w3) {
  pages[w3].once("dialog", (dialog) => dialog.accept());
  await pages[w3].locator("[data-fila-sair]").click();
  await pages[w3].getByText("Você saiu da fila").waitFor({ timeout: 15_000 });
  const booking = await bookingOf((await latestOrder(buyers[w3])).id);
  check("sair da fila: a pessoa sai, com o motivo guardado", booking.queue_state === "removido" && booking.queue_exit === "saiu");
  check("a vaga de quem saiu volta à venda", (await seatsOpen()) === 1);
  const notice = await discordContentWith(`${buyers[w3].name} saiu da fila`);
  check("o Pedro recebe no Discord a vaga inteira para devolver, porque não jogou", !!notice && notice.content.includes("25,00"));
  await snap(pages[w3], "4-saiu-da-fila");
  await pause();
}

async function buyFreedSeat(buyers, pages, loser) {
  const button = pages[loser].locator("[data-fila-comprar='pix']");
  await button.waitFor({ timeout: 25_000 });
  await button.click();
  await checkPix("quem tinha ficado sem compra a vaga que voltou", pages[loser]);
  const payment = await pay(buyers[loser]);
  // Revezamento (migration 192): quem nunca jogou entra na frente de quem não apareceu.
  await position(pages[loser], 1);
  check("a compra nova, de quem nunca jogou, entra na frente de quem não apareceu", true);
  await pause();
  return payment;
}

async function refund(buyers, pages, w1, payment) {
  const result = await sandboxRefund(payment.payment.id);
  check("reembolso feito no sandbox", !!result.id, `status ${result.status}`);
  check("webhook do reembolso aceito", (await webhook(payment.payment.id, env.MP_WEBHOOK_SECRET)) === 200);
  await pages[w1].getByText("Esta vaga foi cancelada.").waitFor({ timeout: 20_000 });
  const order = await latestOrder(buyers[w1]);
  const booking = await bookingOf(order.id);
  check("reembolso tira da fila", order.status === "reembolsado" && booking.queue_state === "removido" && booking.queue_exit === "cancelado");
  await snap(pages[w1], "5-reembolso");
  await pause();
}

/** Primeira partida: Ana e w2 jogaram; com uma pessoa esperando, um lugar abre para ela. */
async function firstMatchRotates(state, pages, { w2, loser }) {
  const { data: counted } = await db.rpc("party_fila_partida_terminou", { p_live_id: state.liveId, p_expected_count: 0 });
  const { data: again } = await db.rpc("party_fila_partida_terminou", { p_live_id: state.liveId, p_expected_count: 0 });
  check("'Partida terminou' tocado duas vezes conta uma vez só", counted === 2 && again === -1, `${counted} e ${again}`);
  // Empate no número de partidas: fica quem entrou antes na fila (Ana), e w2 cede o lugar.
  await pages[0].locator("[data-fila-vez='na_party']").getByText("Sua 2ª partida hoje", { exact: true }).waitFor({ timeout: 15_000 });
  await position(pages[w2], 2);
  await pages[w2].locator("[data-fila-jogou-hoje='1']").waitFor({ timeout: 15_000 });
  check("partida terminou: a vaga do dia cede o lugar a quem espera e volta atrás de quem nunca jogou", true);
  check("a vaga do dia libera a lotação depois da primeira partida", (await seatsOpen()) === 3);
  await snap(pages[w2], "6-revezamento");
  await pause();
  await call(state.liveId);
  await pages[loser].locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  await pages[loser].getByRole("button", { name: "Entendi" }).click();
  check("quem esperava entra no lugar que abriu", true);
  await pause();
}

async function buyAfterFirstMatch(buyers, pages) {
  const button = pages[FABI].locator("[data-fila-comprar='pix']");
  await button.waitFor({ timeout: 25_000 });
  await button.click();
  await checkPix("com a lotação liberada, Fabi garante a vaga do dia", pages[FABI]);
  await pay(buyers[FABI]);
  await position(pages[FABI], 1);
  check("quem nunca jogou entra na frente de quem já jogou hoje", true);
  await pause();
}

/** Segunda partida: com duas pessoas esperando, os dois da party cedem o lugar. */
async function secondMatchRotates(state, pages, { w2, loser }) {
  const { data: counted } = await db.rpc("party_fila_partida_terminou", { p_live_id: state.liveId, p_expected_count: 1 });
  check("segunda partida: conta quem estava na party", counted === 2, `${counted}`);
  await position(pages[FABI], 1);
  await position(pages[w2], 2);
  await position(pages[0], 3);
  await position(pages[loser], 4);
  check("com duas pessoas esperando, a party inteira cede o lugar, e a fila anda pelo revezamento", true);
  await pause();
}

async function endOfLive(state, pages, { w2 }) {
  await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
  await pages[0].locator("[data-fila-vez='concluido']").getByText("2 partidas jogadas.").waitFor({ timeout: 15_000 });
  await pages[w2].locator("[data-fila-vez='concluido']").waitFor({ timeout: 15_000 });
  check("live encerrada: a vaga do dia de quem jogou termina, com as partidas de hoje", true);
  await snap(pages[0], "7-live-encerrada");
  await position(pages[FABI], 1);
  check("a vaga de quem não jogou passa para a próxima live, na frente da fila", true);
  await pause();
  state.liveId = await openTestLive(QUEUE_SIZE, SEATS);
  await call(state.liveId);
  await pages[FABI].locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  await pages[FABI].getByRole("button", { name: "Entendi" }).click();
  check("na live seguinte, Fabi entra com a mesma vaga do dia", true);
  await pause();
}

async function run() {
  if (VIDEO) mkdirSync(VIDEO, { recursive: true });
  const server = await startServer();
  const state = { userIds: [] };
  let browser = null;
  let camera = null;
  try {
    await acquireTestLock(RUN);
    state.locked = true;
    state.flagWas = await openStoreFlag();
    await resetTestQueue();
    state.liveId = await openTestLive(QUEUE_SIZE, SEATS);
    const buyers = [];
    for (const [i, first] of NAMES.entries()) {
      const buyer = await createTestBuyer(`e2e.saidas.${RUN}.${i}@formuladota.com.br`, `${first} Teste ${RUN}`);
      buyers.push({ ...buyer, first });
      state.userIds.push(buyer.id);
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const pages = [];
    for (const buyer of buyers) pages.push(await (await buyerContext(browser, buyer)).newPage());
    await Promise.all(pages.map((page) => page.goto(`${BASE}/party`)));
    await Promise.all(pages.map((page) => page.locator(`[data-fila-vagas='${QUEUE_SIZE}']`).waitFor({ timeout: 60_000 })));
    if (VIDEO) {
      camera = await (await buyerContext(browser, buyers[0], { desktop: true, recordVideoDir: VIDEO })).newPage();
      await camera.goto(`${BASE}/party`);
      await pause();
    }
    const { winners, loser } = await raceForLastSeats(state, buyers, pages);
    const payments = await payInOrder(buyers, pages, [0, ...winners]);
    const [w1, w2, w3] = winners;
    await noShowAndCallNext(state, buyers, pages, [w1, w2]);
    await leaveQueue(buyers, pages, w3);
    await buyFreedSeat(buyers, pages, loser);
    await refund(buyers, pages, w1, payments[w1]);
    await firstMatchRotates(state, pages, { w2, loser });
    await buyAfterFirstMatch(buyers, pages);
    await secondMatchRotates(state, pages, { w2, loser });
    await endOfLive(state, pages, { w2 });
    const body = await fetch(`${BASE}/api/party/fila`).then((r) => r.json());
    const raw = JSON.stringify(body);
    // No fim, só Fabi joga (a vaga que passou de uma live para a outra), e ninguém espera.
    check(
      "no fim, a fila pública mostra só quem ainda joga, com a vaga do dia e a oferta à venda, sem dado pessoal",
      body.queue.length === 0 && body.party.length === 1 && body.party[0]?.dayPass === true && body.offer?.mode === "dia" && body.offer?.priceCents === 2500 && !/whatsapp|email|user_?id|steam_?id/i.test(raw)
    );
  } finally {
    if (camera) {
      const path = await camera.video()?.path();
      await camera.context().close().catch(() => undefined);
      if (path) renameSync(path, `${VIDEO}/fila-da-party-simulacao.webm`);
    }
    await browser?.close().catch(() => undefined);
    await resetTestQueue().catch(() => undefined);
    await deleteTestUsers(state.userIds).catch(() => undefined);
    if (state.flagWas !== undefined) await restoreStoreFlag(state.flagWas);
    if (state.locked) await releaseTestLock(RUN);
    stopServer(server);
  }
}

run()
  .then(() => {
    console.log(`\nSaídas da fila: ${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nE2E DAS SAÍDAS FALHOU: ${err.message}`);
    process.exit(1);
  });
