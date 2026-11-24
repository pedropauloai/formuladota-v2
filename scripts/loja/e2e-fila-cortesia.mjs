// pnpm loja:e2e, parte da mesa de operação: o Pedro, no painel da fila, acha um jogador e põe na fila
// sem pagamento, soma e tira partidas pelo menu, põe na party com a live fora do ar (o que abre a
// live sozinho) e tira de volta, completa a party, troca quem está nela por quem espera e conta a
// partida sem o ID. A pessoa vê a própria posição na /party.
// Tudo de teste: o admin e os jogadores são usuários de teste criados e apagados aqui. Spec:
// docs/loja/fila-da-party.md. Sai com código diferente de zero se qualquer verificação falhar.
// Nunca imprime credencial.

import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import {
  BASE, acquireTestLock, buyerContext, checker, createTestBuyer, db, deleteTestUsers, openStoreFlag,
  releaseTestLock, resetTestQueue, restoreStoreFlag, startServer, stopServer, waitFor,
} from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const { results, check } = checker();

const bookingOf = async (userId) =>
  (await db.from("store_bookings").select("id, source, order_id, seats, queue_state").eq("user_id", userId).eq("source", "cortesia").maybeSingle()).data;
const bookingState = async (id) => (await db.from("store_bookings").select("queue_state, no_shows, called_at, matches_played").eq("id", id).single()).data;
const seatsOpen = async () => (await fetch(`${BASE}/api/party/fila`).then((r) => r.json())).live?.seatsOpen ?? null;
const onAirLive = async () => (await db.from("store_live_sessions").select("id, seats_per_match").eq("is_test", true).eq("status", "ao_vivo").maybeSingle()).data;

/** O grupo do site em que a pessoa está (o espelho da party da fila), com quem lidera; null sem grupo. */
async function groupOf(userId) {
  const member = (await db.from("party_members").select("party_id").eq("user_id", userId).maybeSingle()).data;
  if (!member) return null;
  const party = (await db.from("parties").select("leader_id").eq("id", member.party_id).maybeSingle()).data;
  return party ? { partyId: member.party_id, leaderId: party.leader_id } : null;
}

/** Lugares na party da fila aberta de teste (a live que abre sozinha herda); devolve o valor de antes. */
async function setOpenQueueSeats(seats) {
  const { data, error } = await db.from("store_live_sessions").select("id, seats_per_match").eq("is_test", true).eq("status", "fila").single();
  if (error) throw new Error(`ler a fila aberta de teste: ${error.message}`);
  await db.from("store_live_sessions").update({ seats_per_match: seats }).eq("id", data.id);
  return data.seats_per_match;
}

/** Abre o menu "⋯" de um jogador (linha da fila ou lugar da party) e escolhe o item. */
async function menu(page, scope, name, item) {
  await scope.getByRole("button", { name: `Ações de ${name}` }).click();
  await page.locator(`[data-fila-menu='${item}']`).click();
}

async function giveCourtesy(page, player) {
  await page.goto(`${BASE}/admin/loja/fila`);
  await page.locator("[data-fila-por-na-fila]").click();
  await page.getByPlaceholder("Nome do Discord, nome da Steam ou ID do Dota").fill(player.name);
  await page.getByRole("button", { name: new RegExp(`^${player.name}`) }).click();
  check("busca acha o jogador pelo nome da Steam", true);
  await page.getByRole("button", { name: "Uma partida a mais" }).click();
  await page.locator("[data-fila-dar-cortesia]").click();
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
  await menu(page, row, player.name, "mais-partida");
  await row.getByText("3 a jogar").waitFor({ timeout: 20_000 });
  const plus = (await db.from("store_bookings").select("seats").eq("id", bookingId).single()).data;
  check("mais uma partida pelo menu da linha", plus?.seats === 3);
  await menu(page, row, player.name, "menos-partida");
  await row.getByText("2 a jogar").waitFor({ timeout: 20_000 });
  const minus = (await db.from("store_bookings").select("seats").eq("id", bookingId).single()).data;
  check("uma partida a menos pelo menu da linha", minus?.seats === 2);
}

/**
 * Com a live fora do ar: a mesa não tem "Abrir a live"; "Pôr na party agora" pelo menu da linha abre a
 * live sozinho, com os lugares da fila aberta, e põe a pessoa no grupo do PPA no site, que o mini
 * perfil dela mostra; "Tirar da party" pelo menu do lugar tira do grupo. Devolve a live.
 */
async function putAndTakeBack(page, player, bookingId, admin, openPlayerPage) {
  await page.reload();
  await page.locator("[data-fila-passo='completar']").waitFor({ timeout: 20_000 });
  const noButton = (await page.locator("[data-fila-abrir-live]").count()) === 0;
  check("fora do ar, a mesa pede para completar a party e não tem botão de abrir a live", noButton && (await onAirLive()) === null);
  const row = page.locator("[data-fila-linha]", { hasText: player.name });
  await menu(page, row, player.name, "por-na-party");
  const seat = page.locator("[data-fila-lugar='ocupado']", { hasText: player.name });
  await seat.waitFor({ timeout: 20_000 });
  const live = await onAirLive();
  check("pôr na party com a live fora do ar abre a live sozinha, com os lugares da fila aberta", live?.seats_per_match === 1, `${live?.seats_per_match ?? "sem live"} lugar(es)`);
  await page.getByText("A live abriu sozinha").first().waitFor({ timeout: 10_000 });
  check("o aviso diz que a live abriu sozinha", true);
  check("pôr na party pelo menu da linha", (await bookingState(bookingId))?.queue_state === "na_party");
  const [group, adminGroup] = await Promise.all([groupOf(player.id), groupOf(admin.id)]);
  check("quem entra na party da fila entra no grupo do PPA no site", group?.leaderId === admin.id && adminGroup?.partyId === group.partyId);
  const playerPage = await openPlayerPage();
  await playerPage.goto(`${BASE}/party`);
  await playerPage.locator(`[aria-label="${admin.name}"]`).first().waitFor({ timeout: 60_000 });
  check("o mini perfil de quem entrou mostra o PPA no grupo", true);
  await playerPage.context().close();
  await menu(page, seat, player.name, "tirar-da-party");
  await row.waitFor({ timeout: 20_000 });
  const back = await bookingState(bookingId);
  check("tirar da party devolve para a fila sem falta", back?.queue_state === "aguardando" && back.no_shows === 0 && back.called_at === null);
  check("quem sai da party sai do grupo, e o grupo vazio some", (await groupOf(player.id)) === null && (await groupOf(admin.id)) === null);
  return live.id;
}

/** Completar a party (1 lugar), trocar quem entrou por quem espera e contar a partida sem o ID. */
async function swapAndCount(page, player, other, ids) {
  await page.locator("[data-fila-completar]").click();
  const seat = page.locator("[data-fila-lugar='ocupado']", { hasText: player.name });
  await seat.waitFor({ timeout: 20_000 });
  check("completar a party chama o primeiro da fila", (await bookingState(ids.player))?.queue_state === "na_party");
  check("completar a party põe quem entrou no grupo do PPA", (await groupOf(player.id))?.leaderId === ids.admin);
  await seat.locator("[data-fila-trocar]").click();
  await page.locator("[data-fila-linha]", { hasText: other.name }).locator("[data-fila-entrar-no-lugar]").click();
  await page.locator("[data-fila-lugar='ocupado']", { hasText: other.name }).waitFor({ timeout: 20_000 });
  const [out, inn] = await Promise.all([bookingState(ids.player), bookingState(ids.other)]);
  check("trocar: quem sai volta para a fila sem falta e quem espera entra", out?.queue_state === "aguardando" && out.no_shows === 0 && inn?.queue_state === "na_party");
  const [outGroup, inGroup] = await Promise.all([groupOf(player.id), groupOf(other.id)]);
  check("na troca, o grupo acompanha: quem entra está nele e quem sai não", outGroup === null && inGroup?.leaderId === ids.admin);
  await page.locator("[data-fila-partida-terminou]").click();
  await page.locator("[data-fila-partida-previa]").waitFor({ timeout: 20_000 });
  await page.locator("[data-fila-contar-sem-id]").click();
  const done = await waitFor(async () => ((await bookingState(ids.other))?.queue_state === "concluido" ? true : null), 30_000);
  const live = (await db.from("store_live_sessions").select("match_count").eq("id", ids.live).single()).data;
  check("partida contada sem o ID: quem jogou a única partida conclui", done === true && live?.match_count === 1);
  // A vaga conclui dentro da contagem da partida, e o grupo se desfaz logo depois, na mesma ação.
  const gone = await waitFor(async () => ((await groupOf(other.id)) === null && (await groupOf(ids.admin)) === null ? true : null), 20_000);
  check("com a party vazia depois da partida, o grupo do PPA some", gone === true);
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
    const other = await createTestBuyer(`e2e.cortesia.b.${RUN}@formuladota.com.br`, `Reserva ${RUN}`);
    state.users.push(player.id, other.id);
    const before = await seatsOpen();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const adminPage = await (await buyerContext(browser, admin, { desktop: true })).newPage();
    const booking = await giveCourtesy(adminPage, player);
    check("cortesia não ocupa vaga à venda", (await seatsOpen()) === before, `${before} vagas`);
    await adjust(adminPage, player, booking.id);
    const { error } = await db.rpc("party_fila_adicionar_cortesia", { p_user_id: other.id, p_matches: 1, p_is_test: true });
    if (error) throw new Error(`segunda cortesia: ${error.message}`);
    const otherBooking = await bookingOf(other.id);
    state.seatsWas = await setOpenQueueSeats(1);
    const openPlayerPage = async () => (await buyerContext(browser, player, { desktop: true })).newPage();
    state.liveId = await putAndTakeBack(adminPage, player, booking.id, admin, openPlayerPage);
    await swapAndCount(adminPage, player, other, { player: booking.id, other: otherBooking.id, live: state.liveId, admin: admin.id });
    const playerPage = await (await buyerContext(browser, player)).newPage();
    await playerPage.goto(`${BASE}/party`);
    await playerPage.locator("[data-fila-posicao='1']").waitFor({ timeout: 30_000 });
    check("o jogador vê a própria posição na /party", true);
  } finally {
    await browser?.close().catch(() => undefined);
    const open = await onAirLive().catch(() => null);
    if (open) await db.rpc("party_fila_encerrar_live", { p_live_id: open.id });
    if (state.seatsWas !== undefined) await db.from("store_live_sessions").update({ seats_per_match: state.seatsWas }).eq("is_test", true).eq("status", "fila");
    await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
    if (state.users.length) await db.from("parties").delete().in("leader_id", state.users);
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
    console.log(`\nMesa da fila: ${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nE2E DA MESA DA FILA FALHOU: ${err.message}`);
    process.exit(1);
  });
