// pnpm loja:e2e, saídas da fila da party: cinco compradores de teste ao mesmo tempo e cada jeito de
// sair. Disputa pela última vaga, compra de 2 partidas, não apareceu, saiu da fila, reembolso,
// partida terminou, live encerrada com gente na party e a fila passando para a live seguinte.
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
const NAMES = ["Ana", "Beto", "Caio", "Duda", "Enzo"];
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

async function pay(buyer) {
  const order = await latestOrder(buyer);
  const payment = await sandboxCardPayment(order.id, order.amount_cents / 100, buyer.email);
  check(`${buyer.first}: pagamento aprovado no sandbox`, payment.status === "approved", `status ${payment.status}`);
  check(`${buyer.first}: webhook assinado aceito`, (await webhook(payment.id, env.MP_WEBHOOK_SECRET)) === 200);
  return { order, payment };
}

const call = (liveId) => db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: null });
const seatsOpen = async () => (await fetch(`${BASE}/api/party/fila`).then((r) => r.json())).live?.seatsOpen ?? null;

async function raceForLastSeats(state, buyers, pages) {
  await pages[0].getByRole("button", { name: "Mais uma partida" }).click();
  await pages[0].locator("[data-fila-comprar='pix']").click();
  check("Ana compra 2 partidas num pedido só, com o Pix na página", (await outcome(pages[0])) === "pix");
  const ana = await latestOrder(buyers[0]);
  check("2 partidas cobram R$ 50", ana.quantity === 2 && ana.amount_cents === 5000);
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
  check("a fila nunca passa da lotação de 5 partidas", held === 5, `${held} seguradas`);
  await pause();
  return { winners, loser: losers[0] };
}

async function payInOrder(buyers, pages, order) {
  const payments = {};
  for (const i of order) payments[i] = await pay(buyers[i]);
  for (const [k, i] of order.entries()) await pages[i].locator(`[data-fila-posicao='${k + 1}']`).waitFor({ timeout: 20_000 });
  check("posições na ordem do pagamento", true, order.map((i) => NAMES[i]).join(" > "));
  check("fila cheia: nenhuma vaga aberta", (await seatsOpen()) === 0);
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
  await pages[w1].locator("[data-fila-posicao='3']").waitFor({ timeout: 15_000 });
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
  check("o Pedro recebe no Discord quanto devolver", !!(await discordContentWith(`${buyers[w3].name} saiu da fila`)));
  await snap(pages[w3], "4-saiu-da-fila");
  await pause();
}

async function buyFreedSeat(buyers, pages, loser) {
  const button = pages[loser].locator("[data-fila-comprar='pix']");
  await button.waitFor({ timeout: 25_000 });
  await button.click();
  check("quem tinha ficado sem compra a vaga que voltou", (await outcome(pages[loser])) === "pix");
  const payment = await pay(buyers[loser]);
  // Revezamento (migration 192): quem nunca jogou entra na frente de quem não apareceu.
  await pages[loser].locator("[data-fila-posicao='1']").waitFor({ timeout: 20_000 });
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

async function endOfLive(state, buyers, pages, w2) {
  const { data: counted } = await db.rpc("party_fila_partida_terminou", { p_live_id: state.liveId, p_expected_count: 0 });
  const { data: again } = await db.rpc("party_fila_partida_terminou", { p_live_id: state.liveId, p_expected_count: 0 });
  check("'Partida terminou' tocado duas vezes conta uma vez só", counted === 2 && again === -1, `${counted} e ${again}`);
  await pages[w2].locator("[data-fila-vez='concluido']").waitFor({ timeout: 15_000 });
  await pages[0].locator("[data-fila-vez='na_party']").getByText("Partida 2 de 2", { exact: true }).waitFor({ timeout: 15_000 });
  check("partida terminou: quem comprou 1 sai, quem comprou 2 segue na party", true);
  await snap(pages[w2], "6-jogou");
  await pause();
  await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
  // Ana jogou a primeira partida agora: no revezamento, volta atrás de quem nunca jogou.
  await pages[0].locator("[data-fila-posicao='2']").waitFor({ timeout: 15_000 });
  check("live encerrada: quem estava na party volta para a fila, atrás de quem nunca jogou", true);
  await snap(pages[0], "7-live-encerrada");
  await pause();
  state.liveId = await openTestLive(5, 2);
  await call(state.liveId);
  await call(state.liveId);
  await pages[0].locator("[data-fila-aviso]").waitFor({ timeout: 15_000 });
  await pages[0].getByRole("button", { name: "Entendi" }).click();
  const anaBooking = await bookingOf((await latestOrder(buyers[0])).id);
  await db.rpc("party_fila_jogou", { p_booking_id: anaBooking.id });
  await pages[0].getByText("2 partidas jogadas.").waitFor({ timeout: 15_000 });
  check("na live seguinte, Ana volta para a party e termina as 2 partidas", true);
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
    state.liveId = await openTestLive(5, 2);
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
    await Promise.all(pages.map((page) => page.locator("[data-fila-vagas='5']").waitFor({ timeout: 60_000 })));
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
    await endOfLive(state, buyers, pages, w2);
    const body = await fetch(`${BASE}/api/party/fila`).then((r) => r.json());
    const raw = JSON.stringify(body);
    // No fim, quem nunca jogou já está na party (as duas chamadas da live nova), e ninguém espera.
    check("no fim, a fila pública mostra só quem ainda joga, sem dado pessoal", body.queue.length === 0 && body.party.length === 1 && !/whatsapp|email|user_?id|steam_?id/i.test(raw));
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
