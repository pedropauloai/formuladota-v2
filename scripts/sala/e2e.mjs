// Prova ponta a ponta da sala de voz (spec, seção 18): servidor local, banco de produção com salas e
// usuários de teste (is_test, apagados no fim) e o app real do Cloudflare Realtime. Na mentoria, duas
// pessoas com mídia falsa do Chrome se ouvem e a tela chega; na sala pública, a plateia, o palco, o
// chat e a moderação (e2e-palco.mjs); os canais do servidor, de texto e de voz livre (e2e-canais.mjs); o
// microfone negado, pedindo a permissão ou aberto pelo menu do site (e2e-microfone.mjs); o anel de quem
// fala e as configurações de voz (e2e-fala.mjs); os menus de botão direito (e2e-menus.mjs); e as travas
// (expulsar, bloquear, denunciar, maioridade, fora da sala, convite, teto e flag) seguram. Sai com 1 na
// primeira falha.
// Rodar: pnpm sala:e2e   (SALA_E2E_PORT reaproveita um servidor local de pé; padrão 3200)
// SALA_E2E_SO=microfone, tempo, fala ou menus roda só aquela parte, para mexer nela sem esperar o resto;
// tempo é o tempo real da árvore (e2e-tempo-real.mjs).

import { chromium } from "playwright-core";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
process.env.SALA_FLAG_KEY = s.E2E_FLAG;
const { palco } = await import("./e2e-palco.mjs");
const { canais } = await import("./e2e-canais.mjs");
const { microfone } = await import("./e2e-microfone.mjs");
const { tempoReal } = await import("./e2e-tempo-real.mjs");
const { fala } = await import("./e2e-fala.mjs");
const { menus } = await import("./e2e-menus.mjs");
const { BASE, db, checker, waitFor, sleep } = s;
const so = process.env.SALA_E2E_SO ?? "";
const { results, check } = checker();
const made = { rooms: [], orders: [], users: [] };
let browser = null;
let server = null;

async function setup() {
  server = await s.startServer();
  await s.setFlag(true);
  const nomes = ["dono", "aluno", "fora", "semmaioridade", "convidado", "ouvinte", "ouvinte2", "barra", "negado", "pedindo", "trocou", "olha", "falante", "escuta", "menu"];
  const [dono, aluno, fora, semMaior, convidado, ouvinte, ouvinte2, barra, negado, pedindo, trocou, olha, falante, escuta, menu] = await Promise.all(
    nomes.map((n) => s.createUser(n, { admin: n === "dono", adult: n !== "semmaioridade" }))
  );
  made.users.push(dono, aluno, fora, semMaior, convidado, ouvinte, ouvinte2, barra, negado, pedindo, trocou, olha, falante, escuta, menu);
  const sala = await s.createRoom(dono, [aluno]);
  const sala3 = await s.createRoom(dono, [], { invite: true });
  const palco = await s.createPalco(dono);
  const palco2 = await s.createPalco(dono);
  made.rooms.push(sala.id, sala3.id, palco.id, palco2.id);
  made.orders.push(sala.orderId, sala3.orderId);
  browser = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  const ctx = async (u) => s.buyerContext(browser, u, { desktop: true });
  return { dono, aluno, fora, semMaior, convidado, ouvinte, ouvinte2, barra, negado, pedindo, trocou, olha, falante, escuta, menu, sala, sala3, palco, palco2, ctx };
}

async function voiceAndScreen(t) {
  const pDono = await s.enter(await t.ctx(t.dono), t.sala.id, "dono");
  const pAluno = await s.enter(await t.ctx(t.aluno), t.sala.id, "aluno");
  check("as duas pessoas aparecem na lista", !!(await waitFor(async () => (await pDono.locator('[data-sala-pessoas="2"]').count()) > 0, 20_000)));
  const ouveDono = await waitFor(async () => (await s.attr(pAluno, "data-audio-bytes")) > 0, 30_000);
  const ouveAluno = await waitFor(async () => (await s.attr(pDono, "data-audio-bytes")) > 0, 30_000);
  check("o aluno recebe o áudio do dono (bytesReceived > 0)", !!ouveDono, `${await s.attr(pAluno, "data-audio-bytes")} bytes`);
  check("o dono recebe o áudio do aluno (bytesReceived > 0)", !!ouveAluno, `${await s.attr(pDono, "data-audio-bytes")} bytes`);
  await pDono.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 20_000 });
  await pDono.locator("[data-sala-qualidade-confirmar]").click();
  const tela = await waitFor(async () => (await s.attr(pAluno, "data-video-bytes")) > 0 && (await s.attr(pAluno, "data-video-altura")) > 0, 40_000);
  check("a tela do dono chega ao aluno (bytes de vídeo > 0 e quadro com altura)", !!tela, `${await s.attr(pAluno, "data-video-bytes")} bytes, ${await s.attr(pAluno, "data-video-altura")} px`);
  const alta = await waitFor(async () => (await s.videoLayerOf(t.sala.id, t.aluno.id)) === "f", 15_000);
  check("na mentoria, o aluno recebe a camada alta", !!alta, String(await s.videoLayerOf(t.sala.id, t.aluno.id)));
  await pAluno.locator("[data-sala-mudo]").click();
  const mudo = await waitFor(async () => (await db.from("voice_room_members").select("muted").eq("room_id", t.sala.id).eq("user_id", t.aluno.id).single()).data?.muted === true, 10_000);
  check("mutar chega ao servidor na hora", !!mudo);
  return { pDono, pAluno };
}

/** Bytes de áudio recebidos: na página da sala, na raiz dela; nas outras páginas, no painel de voz. */
const audioBytes = (page) =>
  page.evaluate(() => Number((document.querySelector("[data-painel-voz]") ?? document.querySelector("[data-sala-fase]"))?.getAttribute("data-audio-bytes") ?? 0));

async function irPelaBarra(page, rota) {
  await page.locator(`a[href="${rota}"]`).first().click({ timeout: 20_000 });
  await page.waitForURL((u) => new URL(u).pathname === rota, { timeout: 60_000 });
}

async function sobe(page, antes) {
  return !!(await waitFor(async () => (await audioBytes(page)) > antes, 20_000));
}

/** A sala continua ao navegar pelo site (navegação no cliente), volta pelo painel e volta sozinha ao recarregar. */
async function navegar(t, pAluno) {
  await pAluno.evaluate(() => { window.__mesmaPagina = true; });
  let antes = await audioBytes(pAluno);
  await irPelaBarra(pAluno, "/party");
  const painel = await pAluno.locator('[data-painel-voz="na_sala"]').waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
  check("no /party, o painel de voz aparece e o áudio continua chegando", painel && (await sobe(pAluno, antes)), `${await audioBytes(pAluno)} bytes`);
  const leve = await waitFor(async () => (await s.videoLayerOf(t.sala.id, t.aluno.id)) === "h", 20_000);
  check("fora da sala, a tela segue chegando na camada leve (custo menor)", !!leve, String(await s.videoLayerOf(t.sala.id, t.aluno.id)));
  antes = await audioBytes(pAluno);
  await irPelaBarra(pAluno, "/meta");
  check("no /meta, o áudio continua chegando", await sobe(pAluno, antes), `${await audioBytes(pAluno)} bytes`);
  antes = await audioBytes(pAluno);
  await pAluno.locator("[data-painel-voz-voltar]").click();
  await pAluno.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
  const mesma = await pAluno.evaluate(() => window.__mesmaPagina === true);
  check("de volta à sala pelo painel, sem recarregar a página e com o áudio subindo o tempo todo", mesma && (await sobe(pAluno, antes)), mesma ? "" : "a página recarregou");
  const tela = await waitFor(async () => (await s.attr(pAluno, "data-video-altura")) > 0, 30_000);
  const alta = await waitFor(async () => (await s.videoLayerOf(t.sala.id, t.aluno.id)) === "f", 20_000);
  check("de volta à sala, a tela aparece e volta para a camada alta", !!tela && !!alta, `${await s.attr(pAluno, "data-video-altura")} px, camada ${await s.videoLayerOf(t.sala.id, t.aluno.id)}`);
  await irPelaBarra(pAluno, "/meta");
  await pAluno.reload();
  const voltou = await pAluno.locator('[data-painel-voz="na_sala"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false);
  check("recarregar a página volta para a sala sozinho, com o áudio chegando", voltou && (await sobe(pAluno, 0)), `${await audioBytes(pAluno)} bytes`);
  await pAluno.locator("[data-painel-voz-voltar]").click();
  await pAluno.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
}

async function reportAndCap(t, pDono, pAluno) {
  await pAluno.locator(`[data-sala-denunciar="${t.dono.id}"]`).click();
  await pAluno.locator("[data-sala-denuncia-enviar]").click();
  await pAluno.getByRole("status").filter({ hasText: "Denúncia enviada" }).waitFor({ timeout: 10_000 });
  const { count } = await db.from("voice_room_reports").select("id", { count: "exact", head: true }).eq("reporter_id", t.aluno.id).eq("reported_id", t.dono.id);
  check("a denúncia fica gravada com quem denunciou", count === 1, `${count} linha(s)`);
  await pAluno.keyboard.press("Escape");

  await pDono.locator('[data-sala-tela="parar"]').click();
  // Sem esperar o fechamento, a tentativa abaixo cairia na regra de uma tela por pessoa, não no teto.
  const fechou = await waitFor(async () => (await s.openVideoCount(t.sala.id, t.dono.id)) === 0, 15_000);
  check("parar a tela fecha a faixa no servidor", !!fechou);
  const sid = await s.openSessionOf(t.sala.id, t.dono.id);
  const start = new Date(Date.now() - 90 * 3600_000).toISOString();
  await db.from("voice_room_subscriptions").insert({ session_id: sid, mid: "999", publisher_session_id: sid, track_name: "e2e-teto-falso", kind: "video", rate_kbps: 20000, started_at: start, ended_at: new Date(Date.now() - 120_000).toISOString(), is_test: true });
  const direto = await s.tryPublish(pDono, t.sala.id, sid, "video", "tela-acima-do-teto");
  check("com o teto atingido, o servidor recusa tela nova", direto.status === 403 && direto.body.errorCode === "teto_de_trafego", `HTTP ${direto.status} ${direto.body.errorCode}`);
  await db.from("voice_room_subscriptions").delete().eq("track_name", "e2e-teto-falso");
}

async function blockAndKick(t, pDono, pAluno) {
  await pAluno.locator(`[data-sala-bloquear="${t.dono.id}"]`).click();
  await s.confirmDialog(pAluno);
  const corte = await waitFor(async () => {
    const sid = await s.openSessionOf(t.sala.id, t.aluno.id);
    const { count } = await db.from("voice_room_subscriptions").select("id", { count: "exact", head: true }).eq("session_id", sid).is("ended_at", null);
    return count === 0;
  }, 15_000);
  check("o bloqueio corta o áudio entre os dois no servidor", !!corte);
  await db.from("friendships").delete().eq("requester_id", t.aluno.id).eq("addressee_id", t.dono.id);

  await pDono.locator(`[data-sala-expulsar="${t.aluno.id}"]`).click();
  await s.confirmDialog(pDono);
  const saiu = await waitFor(async () => (await pAluno.locator('[data-sala-fase="saiu"][data-sala-motivo="expulso"]').count()) > 0, 15_000);
  check("o aluno expulso sai da sala", !!saiu);
  // A expulsão marca a pessoa antes de revogar no TURN (no mesmo pedido): o aluno pode ver a saída antes do fim.
  const turnOf = async () => (await db.from("voice_room_members").select("turn_username").eq("room_id", t.sala.id).eq("user_id", t.aluno.id).single()).data?.turn_username;
  const revogada = await waitFor(async () => (await turnOf()) === null, 15_000);
  check("a credencial de TURN do expulso é revogada", !!revogada, String(await turnOf()));
  const volta = await s.apiPost(pAluno, `/api/sala/${t.sala.id}/entrar`);
  check("o expulso não volta (entrar dá 403)", volta.status === 403 && volta.body.errorCode === "expulso", `HTTP ${volta.status} ${volta.body.errorCode}`);
}

async function gates(t) {
  const anon = await s.buyerContext(browser, null, { desktop: true });
  const pAnon = await anon.newPage();
  await pAnon.goto(`${BASE}/sala/${t.sala.id}`);
  check("sem login, a sala pede o Discord", (await pAnon.locator('[data-sala-portao="login"]').count()) === 1);
  const pFora = await (await t.ctx(t.fora)).newPage();
  await pFora.goto(`${BASE}/sala/${t.sala.id}`);
  check("quem é de fora vê a sala privada", (await pFora.locator('[data-sala-portao="fora"]').count()) === 1);
  const foraApi = await s.apiPost(pFora, `/api/sala/${t.sala.id}/entrar`);
  check("quem é de fora não entra pela API", foraApi.status === 403 && foraApi.body.errorCode === "fora_da_sala", `HTTP ${foraApi.status}`);
  const pSem = await (await t.ctx(t.semMaior)).newPage();
  await pSem.goto(`${BASE}/sala/${t.palco.id}`);
  const semApi = await s.apiPost(pSem, `/api/sala/${t.palco.id}/entrar`);
  check("sem a marcação de 18 anos, a API recusa", semApi.status === 403 && semApi.body.errorCode === "sem_maioridade", `HTTP ${semApi.status} ${semApi.body.errorCode}`);
  await pSem.locator("[data-sala-maior]").check();
  await pSem.locator("[data-sala-maior-enviar]").click();
  check("a marcação de 18 anos libera a entrada", !!(await pSem.locator("[data-sala-entrar]").waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)));
  const pConv = await (await t.ctx(t.convidado)).newPage();
  s.instrument(pConv, "convidado");
  await pConv.goto(`${BASE}/sala/${t.sala3.id}?convite=${t.sala3.token}`);
  // A troca do convite compila a rota e recarrega a página: no servidor de desenvolvimento, até 40 s.
  check("o convite de uso único põe o convidado na sala", !!(await pConv.locator("[data-sala-entrar]").waitFor({ timeout: 40_000 }).then(() => true).catch(() => false)));
  await pConv.goto(`${BASE}/sala/${t.sala3.id}?convite=${t.sala3.token}`);
  check("o convidado que recarrega o link do convite continua entrando", !!(await pConv.locator("[data-sala-entrar]").waitFor({ timeout: 40_000 }).then(() => true).catch(() => false)));
  await pFora.goto(`${BASE}/sala/${t.sala3.id}?convite=${t.sala3.token}`);
  check("o mesmo convite não vale de novo", !!(await pFora.getByText("Este convite já foi usado").waitFor({ timeout: 15_000 }).then(() => true).catch(() => false)));
  const fixa = await pFora.goto(`${BASE}/sala`);
  const destino = pFora.url();
  check("o endereço fixo /sala responde (leva à sala pública aberta ou diz que ela abre na live)", fixa?.ok() === true && (/\/sala\/[0-9a-f-]{36}/.test(destino) || (await pFora.locator('[data-sala-publica="fechada"]').count()) === 1), destino);
}

async function flagOff(t, pDono) {
  const admin = await pDono.context().newPage();
  const ok = await admin.goto(`${BASE}/admin/salas`);
  check("com a flag ligada, o painel do admin abre", ok?.status() === 200 && (await admin.getByText("Salas de voz").count()) > 0, `HTTP ${ok?.status()}`);
  await s.setFlag(false);
  const saiu = await waitFor(async () => (await pDono.locator('[data-sala-fase="saiu"][data-sala-motivo="flag_desligada"]').count()) > 0, 30_000);
  check("flag desligada tira da sala quem está dentro", !!saiu);
  const pagina = await admin.goto(`${BASE}/sala/${t.sala.id}`);
  const painel = await (await pDono.context().newPage()).goto(`${BASE}/admin/salas`);
  check("flag desligada esconde a sala e o painel até do admin", pagina?.status() === 404 && painel?.status() === 404, `sala ${pagina?.status()}, painel ${painel?.status()}`);
}

let t = null;
try {
  t = await setup();
  let pPalco = null;
  if (!so) {
    const { pDono, pAluno } = await voiceAndScreen(t);
    await navegar(t, pAluno);
    await reportAndCap(t, pDono, pAluno);
    await blockAndKick(t, pDono, pAluno);
    pPalco = await palco(t, check);
    await canais(t, check, made);
  }
  if (!so || so === "microfone") await microfone(t, check, made);
  if (!so || so === "tempo") await tempoReal(t, check, made);
  if (!so || so === "fala") await fala(t, check, made);
  if (!so || so === "menus") await menus(t, check, made);
  // Elemento dentro de outro que o HTML não aceita (um <div> num <p>) faz o React refazer a página ao hidratar,
  // e o que a pessoa digitou some; nenhum navegador do teste pode ter visto esse aviso.
  const hidratacao = s.diagnostico.filter((l) => /hydrat|cannot be a descendant|cannot contain a nested/i.test(l));
  check("nenhuma página da sala dá erro de hidratação do React", hidratacao.length === 0, hidratacao.slice(0, 2).join(" | ").slice(0, 200));
  if (pPalco) {
    await gates(t);
    await flagOff(t, pPalco);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
  const nl = String.fromCharCode(10);
  console.log(`${nl}--- o que os navegadores viram (últimas 60 linhas):${nl}` + s.diagnostico.slice(-60).join(nl));
  if (t) console.log(`${nl}--- banco da mentoria de teste:${nl}` + (await s.dumpRoom(t.sala.id).catch((e) => e.message)) + `${nl}--- banco da sala pública de teste:${nl}` + (await s.dumpRoom(t.palco.id).catch((e) => e.message)));
} finally {
  await browser?.close().catch(() => null);
  await sleep(500);
  await s.dropFlag().catch(() => null);
  await s.cleanup(made).catch((e) => console.error("limpeza:", e.message));
  s.stopServer(server);
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok} de ${results.length} verificações passaram.`);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}
