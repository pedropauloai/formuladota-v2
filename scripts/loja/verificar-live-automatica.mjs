// pnpm loja:live-auto, depois de cada deploy que mexe na fila: prova no ar que o cron do site fecha
// sozinho a live parada. Abre uma live de teste (is_test, o site de produção nunca mostra), põe um
// jogador de teste na party e finge que a live abriu há 4 horas. Em ciclos do cron de produção (um
// por minuto): a partida de 1 hora atrás segura a live aberta; a chamada de 1 hora atrás também
// segura; sem nenhuma das duas, a live fecha e quem estava na party volta para a fila. Spec:
// docs/loja/fila-da-party.md. Sai com código diferente de zero se qualquer verificação falhar.
// Não sobe servidor: quem fecha é o cron do site publicado. Nunca imprime credencial.

import { randomUUID } from "node:crypto";
import { acquireTestLock, checker, createTestBuyer, db, deleteTestUsers, openTestLive, releaseTestLock, resetTestQueue, sleep, waitFor } from "./e2e-comum.mjs";

const RUN = randomUUID().slice(0, 8);
const { results, check } = checker();
const HOUR = 60 * 60 * 1000;
// Dois ciclos do cron de minuto, com folga: a live que devia ficar aberta teve tempo de fechar.
const TWO_CYCLES_MS = 150_000;

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const liveStatus = async (id) => (await db.from("store_live_sessions").select("status").eq("id", id).single()).data?.status;

async function must(promise, what) {
  const { error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
}

/** Jogador de teste na party da live de teste, chamado agora. Devolve a reserva. */
async function playerInParty(liveId, userId) {
  const { data: bookingId, error } = await db.rpc("party_fila_adicionar_cortesia", { p_user_id: userId, p_matches: 2, p_is_test: true });
  if (error || !bookingId) throw new Error(`cortesia de teste: ${error?.message ?? "sem reserva"}`);
  const { data: called, error: callError } = await db.rpc("party_fila_chamar", { p_live_id: liveId, p_booking_id: bookingId });
  if (callError || called !== bookingId) throw new Error(`chamar para a party de teste: ${callError?.message ?? "não entrou"}`);
  return bookingId;
}

async function phases(state, userId) {
  const { liveId, bookingId } = state;
  await must(db.from("store_live_sessions").update({ on_air_at: ago(4 * HOUR) }).eq("id", liveId), "envelhecer a live");
  await must(db.from("store_bookings").update({ called_at: ago(4 * HOUR) }).eq("id", bookingId), "envelhecer a chamada");
  await must(
    db.from("party_participacoes").insert({ user_id: userId, kind: "jogou", played_at: ago(HOUR), live_session_id: liveId, booking_id: bookingId, is_test: true }),
    "partida de teste",
  );
  await sleep(TWO_CYCLES_MS);
  check("a partida de 1 hora atrás segura aberta a live que abriu há 4 horas", (await liveStatus(liveId)) === "ao_vivo");

  await must(db.from("party_participacoes").update({ played_at: ago(4 * HOUR) }).eq("live_session_id", liveId), "envelhecer a partida");
  await must(db.from("store_bookings").update({ called_at: ago(HOUR) }).eq("id", bookingId), "chamada de 1 hora atrás");
  await sleep(TWO_CYCLES_MS);
  check("a chamada de 1 hora atrás de quem está na party também segura a live aberta", (await liveStatus(liveId)) === "ao_vivo");

  await must(db.from("store_bookings").update({ called_at: ago(4 * HOUR) }).eq("id", bookingId), "envelhecer a chamada de novo");
  const closed = await waitFor(async () => ((await liveStatus(liveId)) === "encerrada" ? true : null), 180_000, 5000);
  check("sem chamada nem partida há mais de 3 horas, o cron fecha a live sozinho", closed === true);
  const back = (await db.from("store_bookings").select("queue_state").eq("id", bookingId).single()).data;
  check("quem estava na party volta para a fila, com a vaga", back?.queue_state === "aguardando");
}

async function run() {
  const state = { users: [] };
  try {
    await acquireTestLock(RUN);
    state.locked = true;
    await resetTestQueue();
    const player = await createTestBuyer(`e2e.liveauto.${RUN}@formuladota.com.br`, `Live Auto ${RUN}`);
    state.users.push(player.id);
    state.liveId = await openTestLive(null, 4);
    state.bookingId = await playerInParty(state.liveId, player.id);
    await phases(state, player.id);
  } finally {
    if (state.liveId) {
      await db.from("party_participacoes").delete().eq("live_session_id", state.liveId);
      if ((await liveStatus(state.liveId)) === "ao_vivo") await db.rpc("party_fila_encerrar_live", { p_live_id: state.liveId });
    }
    await db.from("store_bookings").update({ queue_state: "removido" }).eq("is_test", true).in("queue_state", ["aguardando", "na_party"]);
    await deleteTestUsers(state.users).catch(() => undefined);
    if (state.locked) await releaseTestLock(RUN);
  }
}

run()
  .then(() => {
    console.log(`\nLive automática: ${results.length} de ${results.length} verificações passaram.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nVERIFICAÇÃO DA LIVE AUTOMÁTICA FALHOU: ${err.message}`);
    process.exit(1);
  });
