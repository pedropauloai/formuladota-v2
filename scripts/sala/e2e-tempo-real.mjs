// Parte do tempo real do e2e (pedido do PPA em 24/11/2026: "entrei numa sala, saí na outra... e o meu
// usuário duplicou ali"). Quem entra ou troca de canal aparece para quem olha a árvore em menos de 1 s
// e nunca em dois canais: o servidor avisa por Broadcast do Realtime e a árvore pede a lista na hora. Na
// tela de quem trocou, ele também nunca aparece nos dois. Canais de teste (is_test), apagados no fim.

const s = await import("./e2e-comum.mjs");
const { BASE, sleep } = s;

const LIMITE_MS = 1_000;
const noCanal = (canalId, userId) => `[data-canal-item="${canalId}"] [data-canal-pessoa="${userId}"], [data-canal-item="${canalId}"] [data-sala-membro="${userId}"]`;
const esta = async (page, canalId, userId) => (await page.locator(noCanal(canalId, userId)).count()) > 0;

/** Lê a árvore a cada 50 ms até a pessoa estar só em `para` (e fora de `de`); anota se ela esteve nos dois. */
async function acompanhar(page, de, para, userId, ms = 20_000) {
  const inicio = Date.now();
  let nosDois = false;
  while (Date.now() - inicio < ms) {
    const [noDe, noPara] = await Promise.all([de ? esta(page, de, userId) : false, esta(page, para, userId)]);
    if (noDe && noPara) nosDois = true;
    if (noPara && !noDe) return { ms: Date.now() - inicio, nosDois };
    await sleep(50);
  }
  return { ms: null, nosDois };
}

async function entrarPelaArvore(page, canalId) {
  await page.locator(`[data-canal="${canalId}"]`).click({ timeout: 60_000 });
  await page.waitForURL((u) => new URL(u).pathname === `/sala/${canalId}`, { timeout: 60_000 });
  await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 60_000 });
}

/** Quem troca (pTroca) entra em `para` pela árvore, com as duas telas vigiadas desde o clique; o atraso
 *  conta do momento em que ela entrou até quem olha (pOlha) ver a pessoa só no canal novo. */
async function medirAte(pOlha, pTroca, de, para, userId) {
  const vista = acompanhar(pOlha, de, para, userId).then((r) => ({ ...r, fim: Date.now() }));
  const propria = de ? acompanhar(pTroca, de, para, userId) : Promise.resolve({ ms: 0, nosDois: false });
  await entrarPelaArvore(pTroca, para);
  const entrouEm = Date.now();
  const [v, p] = await Promise.all([vista, propria]);
  return { atraso: v.ms === null ? null : Math.max(0, v.fim - entrouEm), vista: v, propria: p };
}

export async function tempoReal(t, check, made) {
  const c = {
    texto: await s.createCanal(t.dono, { tipo: "texto", titulo: "tempo-real-e2e", posicao: 6 }),
    um: await s.createCanal(t.dono, { tipo: "palco", titulo: "Tempo 1", posicao: 50, modo: "livre", limite: 5 }),
    dois: await s.createCanal(t.dono, { tipo: "palco", titulo: "Tempo 2", posicao: 51, modo: "livre", limite: 5 }),
  };
  made.rooms.push(c.texto.id, c.um.id, c.dois.id);
  const quem = t.trocou.id;
  const pA = await (await t.ctx(t.trocou)).newPage();
  const pB = await (await t.ctx(t.olha)).newPage();
  s.instrument(pA, "tempo-a");
  s.instrument(pB, "tempo-b");
  for (const page of [pB, pA]) {
    await page.goto(`${BASE}/sala/${c.texto.id}`);
    await page.locator('[data-canal-fase="dentro"]').waitFor({ timeout: 60_000 });
  }
  // A árvore de quem olha já assinou o aviso (a assinatura abre junto com a página).
  await sleep(2_000);
  const entrada = await medirAte(pB, pA, null, c.um.id, quem);
  check(`quem olha a árvore vê a pessoa entrar no canal em menos de 1 s (${entrada.atraso ?? "nunca"} ms)`, entrada.atraso !== null && entrada.atraso < LIMITE_MS);
  const troca = await medirAte(pB, pA, c.um.id, c.dois.id, quem);
  check(`a troca de canal chega a quem olha em menos de 1 s, sem a pessoa em dois canais (${troca.atraso ?? "nunca"} ms depois de ela entrar, ${troca.vista.ms ?? "-"} ms desde o clique)`, troca.atraso !== null && troca.atraso < LIMITE_MS && !troca.vista.nosDois);
  check("na tela de quem trocou, ele também nunca aparece nos dois canais", troca.propria.ms !== null && !troca.propria.nosDois);
  const antiga = await s.openSessionOf(c.um.id, quem);
  const { data: linha } = await s.db.from("voice_room_members").select("last_seen_at").eq("room_id", c.um.id).eq("user_id", quem).single();
  check("no banco, a pessoa não tem mais sessão nem presença no canal antigo (a saída chega antes da entrada)", antiga === null && linha?.last_seen_at === null, `sessão ${antiga ?? "fechada"}, presença ${linha?.last_seen_at ?? "nenhuma"}`);
  for (const page of [pA, pB]) await page.close().catch(() => null);
  await sleep(500);
}
