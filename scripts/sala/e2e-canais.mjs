// Parte dos canais do e2e (pedido do PPA em 24/11/2026): a árvore de canais do servidor FORMULADOTA, o
// canal de texto (mensagem que chega ao outro, fica guardada e o dono apaga), sem mídia nenhuma, a voz
// livre (um clique entra e já fala), quem está em cada canal na árvore, o limite (canal cheio não deixa
// entrar), a barra (ensurdecer), trocar de canal sem derrubar a voz e o painel do admin (criar, renomear,
// subir, limite, modo e apagar). Canais de teste (is_test), apagados no fim pela limpeza do e2e.

const s = await import("./e2e-comum.mjs");
const { BASE, db, waitFor, sleep } = s;

const naPagina = async (page, sel, ms = 20_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));

const audioBytes = (page) =>
  page.evaluate(() => Number((document.querySelector("[data-painel-voz]") ?? document.querySelector("[data-sala-fase]"))?.getAttribute("data-audio-bytes") ?? 0));

async function escrever(page, texto) {
  await page.locator("[data-sala-chat-campo]").fill(texto);
  await page.locator("[data-sala-chat-enviar]").click();
}

async function texto(t, check, c, pA, pB) {
  await pA.goto(`${BASE}/sala`);
  await pA.waitForURL((u) => /\/sala\/[0-9a-f-]{36}/.test(new URL(u).pathname), { timeout: 60_000 });
  check("o endereço /sala leva a um canal do servidor", /\/sala\/[0-9a-f-]{36}/.test(new URL(pA.url()).pathname), pA.url());
  await pA.goto(`${BASE}/sala/${c.texto.id}`);
  const lista = (await naPagina(pA, `[data-canal="${c.texto.id}"]`, 60_000)) && (await naPagina(pA, `[data-canal="${c.livre.id}"]`));
  check("a coluna lista o canal de texto e o de voz", lista);
  check("o canal de texto abre, só com o chat", await naPagina(pA, `[data-canal-texto="${c.texto.id}"][data-canal-fase="dentro"]`, 30_000));
  await pB.goto(`${BASE}/sala/${c.texto.id}`);
  await naPagina(pB, '[data-canal-fase="dentro"]', 60_000);
  await escrever(pA, "bora jogar hoje?");
  check("no canal de texto, a mensagem de um chega ao outro", await naPagina(pB, 'text="bora jogar hoje?"', 20_000));
  await escrever(pB, "bora, depois da live");
  check("e a resposta volta", await naPagina(pA, 'text="bora, depois da live"', 20_000));
  await pB.reload();
  check("a mensagem fica guardada no canal (recarregar mostra de novo)", await naPagina(pB, 'text="bora jogar hoje?"', 40_000));
  const rtc = await s.apiPost(pA, `/api/sala/${c.texto.id}/rtc/sessions/new`, {});
  check("o canal de texto não abre voz nem tela", rtc.status === 403 && rtc.body.errorCode === "sala_sem_midia", `HTTP ${rtc.status} ${rtc.body.errorCode}`);
  const pDono = await (await t.ctx(t.dono)).newPage();
  await pDono.goto(`${BASE}/sala/${c.texto.id}`);
  await naPagina(pDono, '[data-canal-fase="dentro"]', 60_000);
  const { data: msg } = await db.from("voice_room_messages").select("id").eq("room_id", c.texto.id).eq("body", "bora jogar hoje?").single();
  await pDono.locator(`[data-sala-mensagem="${msg.id}"]`).hover();
  await pDono.locator(`[data-sala-apagar="${msg.id}"]`).click({ timeout: 15_000 });
  const sumiu = await waitFor(async () => (await pB.locator(`[data-sala-mensagem="${msg.id}"]`).count()) === 0, 20_000);
  check("o dono apaga a mensagem e ela some para todos", !!sumiu);
  return pDono;
}

async function vozLivre(t, check, c, pA, pB) {
  await pA.locator(`[data-canal="${c.livre.id}"]`).click();
  const umClique = await naPagina(pA, '[data-sala-fase="na_sala"]', 60_000);
  check("um clique no canal de voz da árvore já entra", umClique);
  const fala = await waitFor(async () => (await pA.locator('[data-sala-papel="falante"][data-sala-voz="no_ar"]').count()) > 0, 30_000);
  check("na voz livre, quem entra já fala (microfone no ar)", !!fala);
  await pB.locator(`[data-canal="${c.livre.id}"]`).click();
  await pB.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 60_000 });
  const ouve = await waitFor(async () => (await s.attr(pA, "data-audio-bytes")) > 0, 40_000);
  check("na voz livre, um ouve o outro", !!ouve, `${await s.attr(pA, "data-audio-bytes")} bytes`);
  const naArvore = await waitFor(async () => (await pB.locator(`[data-sala-membro="${t.ouvinte.id}"]`).count()) > 0, 30_000);
  check("a árvore mostra quem está no canal de voz, ao vivo", !!naArvore);
  const pFora = await (await t.ctx(t.dono)).newPage();
  await pFora.goto(`${BASE}/sala/${c.texto.id}`);
  const deFora = await waitFor(async () => (await pFora.locator(`[data-canal-pessoa="${t.ouvinte.id}"]`).count()) > 0 && (await pFora.locator(`[data-canal="${c.livre.id}"] [data-canal-lugares="2/2"]`).count()) > 0, 40_000);
  check("quem está fora vê na árvore quem está no canal e o limite (2/2)", !!deFora);
  const cheio = await s.apiPost(pFora, `/api/sala/${c.livre.id}/entrar`);
  check("o dono entra mesmo com o canal cheio", cheio.status === 200, `HTTP ${cheio.status}`);
  await s.apiPost(pFora, `/api/sala/${c.livre.id}/sair`);
  const pC = await (await t.ctx(t.convidado)).newPage();
  await pC.goto(`${BASE}/`);
  const lotado = await s.apiPost(pC, `/api/sala/${c.livre.id}/entrar`);
  check("canal cheio (2 de 2) não deixa entrar quem chega", lotado.status === 409 && lotado.body.errorCode === "sala_lotada", `HTTP ${lotado.status} ${lotado.body.errorCode}`);
  for (const page of [pFora, pC]) await page.close().catch(() => null);
  await pA.locator('[data-sala-surdo="nao"]').click();
  const surdo = await waitFor(async () => (await pA.locator('[data-sala-surdo="sim"]').count()) > 0 && (await pA.locator('[data-sala-mudo="sim"]').count()) > 0, 10_000);
  await pA.locator('[data-sala-surdo="sim"]').click();
  const voltou = await waitFor(async () => (await pA.locator('[data-sala-surdo="nao"]').count()) > 0 && (await pA.locator('[data-sala-mudo="nao"]').count()) > 0, 10_000);
  check("desligar o som muta o microfone, e religar devolve como estava", !!surdo && !!voltou);
  await pA.locator(`[data-canal="${c.texto.id}"]`).click();
  await pA.locator('[data-canal-fase="dentro"]').waitFor({ timeout: 30_000 });
  const antes = await audioBytes(pA);
  const segue = (await naPagina(pA, '[data-painel-voz-lugar="coluna"][data-painel-voz="na_sala"]')) && !!(await waitFor(async () => (await audioBytes(pA)) > antes, 20_000));
  check("trocar para o canal de texto não derruba a voz (painel no pé da coluna, áudio chegando)", segue, `${await audioBytes(pA)} bytes`);
}

async function admin(t, check, c, pDono) {
  await pDono.goto(`${BASE}/admin/salas`);
  await naPagina(pDono, "[data-admin-canais]", 60_000);
  const novo = pDono.locator("[data-admin-canal-novo]");
  await novo.getByRole("textbox", { name: "Nome do canal novo" }).fill("E2E Novo");
  await novo.locator("button[type=submit]").click();
  const criado = await waitFor(async () => (await db.from("voice_rooms").select("id, title, is_test, channel_position").eq("owner_id", t.dono.id).eq("title", "e2e-novo").eq("status", "aberta").maybeSingle()).data, 20_000);
  check("o admin cria um canal de texto (de teste no servidor local, com o nome do Discord)", !!criado && criado.is_test === true, JSON.stringify(criado));
  if (!criado) return;
  await naPagina(pDono, `[data-admin-canal="${criado.id}"]`, 20_000);
  await pDono.locator(`[data-admin-canal-nome="${criado.id}"]`).fill("e2e renomeado");
  await pDono.locator(`[data-admin-canal-renomear="${criado.id}"]`).click();
  const renomeado = await waitFor(async () => (await db.from("voice_rooms").select("title").eq("id", criado.id).single()).data?.title === "e2e-renomeado", 20_000);
  check("o admin renomeia o canal", !!renomeado);
  await pDono.locator(`[data-admin-canal-subir="${criado.id}"]`).click();
  // A ordem entre os dois canais (a numeração pode empatar com canais de teste de outra rodada).
  const subiu = await waitFor(async () => {
    const { data } = await db.from("voice_rooms").select("id, channel_position").in("id", [criado.id, c.texto.id]);
    const pos = Object.fromEntries((data ?? []).map((r) => [r.id, r.channel_position]));
    return pos[criado.id] < pos[c.texto.id];
  }, 20_000);
  check("o admin sobe o canal na lista (fica acima do canal de cima)", !!subiu);
  await pDono.locator(`[data-admin-canal-limite="${c.livre.id}"]`).selectOption("5");
  const limite = await waitFor(async () => (await db.from("voice_rooms").select("max_members").eq("id", c.livre.id).single()).data?.max_members === 5, 20_000);
  check("o admin muda o limite do canal de voz", !!limite);
  await pDono.locator(`[data-admin-canal-modo="${c.livre.id}"]`).click();
  const palco = await waitFor(async () => {
    const { data } = await db.from("voice_room_members").select("role").eq("room_id", c.livre.id).eq("user_id", t.ouvinte.id).single();
    return data?.role === "ouvinte";
  }, 20_000);
  check("voz livre virando palco: quem estava falando volta à plateia", !!palco);
  await pDono.locator(`[data-admin-canal-apagar="${criado.id}"]`).click();
  await pDono.getByRole("button", { name: "Apagar", exact: true }).last().click({ timeout: 10_000 });
  const apagado = await waitFor(async () => (await db.from("voice_rooms").select("status").eq("id", criado.id).single()).data?.status === "encerrada", 20_000);
  check("o admin apaga o canal", !!apagado);
}

export async function canais(t, check, made) {
  const c = {
    texto: await s.createCanal(t.dono, { tipo: "texto", titulo: "geral-e2e", posicao: 10 }),
    livre: await s.createCanal(t.dono, { tipo: "palco", titulo: "Party e2e", posicao: 20, modo: "livre", limite: 2 }),
  };
  made.rooms.push(c.texto.id, c.livre.id);
  const pA = await (await t.ctx(t.ouvinte)).newPage();
  const pB = await (await t.ctx(t.fora)).newPage();
  s.instrument(pA, "canais-a");
  s.instrument(pB, "canais-b");
  const pDono = await texto(t, check, c, pA, pB);
  await vozLivre(t, check, c, pA, pB);
  await admin(t, check, c, pDono);
  for (const page of [pA, pB, pDono]) await page.close().catch(() => null);
  await sleep(500);
}
