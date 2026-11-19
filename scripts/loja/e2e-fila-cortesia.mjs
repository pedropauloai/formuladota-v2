// pnpm loja:e2e, parte da cortesia: o Pedro, no painel da fila, acha um jogador, põe na fila sem
// pagamento, soma e tira partidas, e a pessoa vê a própria posição na /party. Tudo de teste: o admin e
// o jogador são usuários de teste criados e apagados aqui. Spec: docs/loja/fila-da-party.md.
// Sai com código diferente de zero se qualquer verificação falhar. Nunca imprime credencial.

import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, acquireTestLock, buyerContext, checker, createTestBuyer, db, deleteTestUsers, openStoreFlag, openTestLive,
  releaseTestLock, resetTestQueue, restoreStoreFlag, startServer, stopServer, waitFor,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const { results, check } = checker();

const bookingOf = async (userId) =>
  (await db.from("store_bookings").select("id, source, order_id, seats, queue_state").eq("user_id", userId).eq("source", "cortesia").maybeSingle()).data;
const seatsOpen = async () => (await fetch(`${BASE}/api/party/fila`).then((r) => r.json())).live?.seatsOpen ?? null;

async function giveCourtesy(page, player) {
  await page.goto(`${BASE}/admin/loja/fila`);
  await page.getByPlaceholder("Nome do Discord, nome da Steam ou ID do Dota").fill(player.name);
  await page.getByRole("button", { name: new RegExp(`^${player.name}`) }).click();
  check("busca acha o jogador pelo nome da Steam", true);
  await page.getByLabel("Partidas de cortesia").fill("2");
  await page.getByRole("button", { name: "Pôr na fila" }).click();
  const booking = await waitFor(async () => {
    const row = await bookingOf(player.id);
    return row?.queue_state === "aguardando" ? row : null;
  }, 20_000);
  check("cortesia entra na fila sem pedido, com 2 partidas", booking?.order_id === null && booking?.seats === 2);
  return booking;
}

async function adjust(page, player, bookingId) {
  const row = page.locator("[data-fila-linha]", { hasText: player.name }).filter({ hasText: "Cortesia" });
  await row.getByText("2 a jogar").waitFor({ timeout: 20_000 });
  check("o painel mostra a cortesia na fila com as partidas", true);
  await row.getByRole("button", { name: `Dar mais uma partida a ${player.name}` }).click();
  await row.getByText("3 a jogar").waitFor({ timeout: 20_000 });
  const plus = (await db.from("store_bookings").select("seats").eq("id", bookingId).single()).data;
  check("mais uma partida pelo painel", plus?.seats === 3);
  await row.getByRole("button", { name: `Tirar uma partida de ${player.name}` }).click();
  await row.getByText("2 a jogar").waitFor({ timeout: 20_000 });
  const minus = (await db.from("store_bookings").select("seats").eq("id", bookingId).single()).data;
  check("uma partida a menos pelo painel", minus?.seats === 2);
}

/** Troca de jogador: com a live no ar, "Pôr na party" pela linha da fila e "Tirar da party" pelo cartão. */
async function swap(page, player, bookingId) {
  await page.reload();
  const row = page.locator("[data-fila-linha]", { hasText: player.name });
  await row.locator("[data-fila-por-na-party]").click();
  const seat = page.locator("[data-fila-lugar='ocupado']", { hasText: player.name });
  await seat.waitFor({ timeout: 20_000 });
  const inParty = (await db.from("store_bookings").select("queue_state").eq("id", bookingId).single()).data;
  check("pôr na party pela linha da fila", inParty?.queue_state === "na_party");
  await seat.locator("[data-fila-tirar-da-party]").click();
  await row.waitFor({ timeout: 20_000 });
  const back = (await db.from("store_bookings").select("queue_state, no_shows, called_at").eq("id", bookingId).single()).data;
  check("tirar da party devolve para a fila sem falta", back?.queue_state === "aguardando" && back.no_shows === 0 && back.called_at === null);
}

async function run() {
  const server = await startServer();
  const state = { users: [] };
  let browser = null;
  try {
    await acquireTestLock(RUN);
    state.locked = true;
    state.flagWas = await openStoreFlag();
    await resetTestQueue();
    const admin = await createTestBuyer(`e2e.cortesia.admin.${RUN}@formuladota.com.br`, `Gestor Teste ${RUN}`);
    state.users.push(admin.id);
    await db.from("profiles").update({ is_admin: true }).eq("id", admin.id);
    const player = await createTestBuyer(`e2e.cortesia.${RUN}@formuladota.com.br`, `Cortesia ${RUN}`);
    state.users.push(player.id);
    const before = await seatsOpen();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const adminPage = await (await buyerContext(browser, admin, { desktop: true })).newPage();
    const booking = await giveCourtesy(adminPage, player);
    check("cortesia não ocupa vaga à venda", (await seatsOpen()) === before, `${before} vagas`);
    await adjust(adminPage, player, booking.id);
    state.liveId = await openTestLive(20, 2);
    await swap(adminPage, player, booking.id);
    const playerPage = await (await buyerContext(browser, player)).newPage();
    await playerPage.goto(`${BASE}/party`);
    await playerPage.locator("[data-fila-posicao='1']").waitFor({ timeout: 30_000 });
    check("o jogador vê a própria posição na /party", true);
  } finally {
    await browser?.close().catch(() => undefined);
    if (state.liveId) await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
    await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
    // O admin de teste perde o acesso antes de ser apagado, mesmo se a exclusão falhar.
    if (state.users.length) await db.from("profiles").update({ is_admin: false }).in("id", state.users);
    await deleteTestUsers(state.users).catch(() => undefined);
    if (state.flagWas !== undefined) await restoreStoreFlag(state.flagWas);
    if (state.locked) await releaseTestLock(RUN);
    stopServer(server);
  }
}

run()
  .then(() => {
    console.log(`\nCortesia da fila: ${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nE2E DA CORTESIA FALHOU: ${err.message}`);
    process.exit(1);
  });
