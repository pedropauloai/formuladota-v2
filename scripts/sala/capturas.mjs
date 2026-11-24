// Capturas da sala de voz para conferir a interface em 1920x1080 (e a plateia em 3440x1440): a sala
// pública vista pelo dono (tela, plateia, mãos, palco e chat), a escolha da qualidade, a vista da
// plateia, o painel de voz em outras páginas (nas duas posições) e a mentoria. Servidor local, banco de produção com salas e pessoas de teste (apagadas no
// fim) e o app real do Realtime. Liga só a linha de teste da flag (sala_voz_e2e), nunca a sala_voz.
// A tela compartilhada é uma arte do Dota do próprio site, no lugar do padrão de teste do Chrome.
// Rodar: pnpm sala:capturas <pasta-de-saida>

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
process.env.SALA_FLAG_KEY = s.E2E_FLAG;
const { db, waitFor, sleep } = s;

const out = process.argv[2] ?? "capturas";
mkdirSync(out, { recursive: true });
const made = { rooms: [], orders: [], users: [] };
const arte = readFileSync("public/dota/backgrounds/bg-07.jpg").toString("base64");
let browser = null;
let server = null;

const APELIDOS = {
  dono: "PPA", aluno: "Aluno_Pos3", a: "TinkerMain", b: "Carry_BR", c: "SupBolado", d: "MidOuFeed", e: "Rampage77",
};

async function criarPessoas() {
  const tags = Object.keys(APELIDOS);
  const users = await Promise.all(tags.map((tag) => s.createUser(`cap${tag}`, { admin: tag === "dono" })));
  made.users.push(...users);
  const porTag = Object.fromEntries(tags.map((tag, i) => [tag, users[i]]));
  // A sala mostra o nome do perfil (Discord primeiro) e, sem ele, o da Steam: os dois levam o apelido.
  for (const tag of tags) {
    const id = porTag[tag].id;
    await db.from("steam_links").update({ persona: APELIDOS[tag] }).eq("user_id", id);
    let { error } = await db.from("profiles").update({ username: APELIDOS[tag] }).eq("id", id);
    if (error) ({ error } = await db.from("profiles").update({ username: `${APELIDOS[tag]}_${id.slice(0, 3)}` }).eq("id", id));
    if (error) throw new Error(`apelido de teste: ${error.message}`);
  }
  return porTag;
}

/** Tela compartilhada com a arte do Dota; o áudio da captura continua o falso do Chrome. */
async function comTelaDoDota(ctx) {
  await ctx.addInitScript((b64) => {
    const md = navigator.mediaDevices;
    const original = md.getDisplayMedia.bind(md);
    md.getDisplayMedia = async (pedido) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const g = canvas.getContext("2d");
      const img = new Image();
      img.src = `data:image/jpeg;base64,${b64}`;
      await img.decode();
      g.drawImage(img, 0, 0, 1920, 1080);
      setInterval(() => g.drawImage(img, 0, 0, 1920, 1080), 33);
      const stream = canvas.captureStream(30);
      if (pedido?.audio) {
        const falsa = await original(pedido).catch(() => null);
        falsa?.getVideoTracks().forEach((t) => t.stop());
        falsa?.getAudioTracks().forEach((t) => stream.addTrack(t));
      }
      return stream;
    };
  }, arte);
  return ctx;
}

async function foto(page, nome, { mouse = [4, 4] } = {}) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.mouse.move(mouse[0], mouse[1]);
  await sleep(600);
  await page.screenshot({ path: join(out, nome) });
  console.log(`captura: ${nome}`);
}

async function falar(page, texto) {
  await page.locator("[data-sala-chat-campo]").fill(texto);
  await page.locator("[data-sala-chat-enviar]").click();
  await sleep(400);
}

/** O painel de voz em outras páginas, nas duas posições que o PPA escolhe vendo. */
async function painelForaDaSala(page) {
  for (const posicao of ["canto", "topo"]) {
    await page.evaluate((v) => localStorage.setItem("formuladota:painel-voz", v), posicao);
    for (const rota of ["/meta", "/party"]) {
      await page.locator(`a[href="${rota}"]`).first().click({ timeout: 20_000 });
      await page.waitForURL((u) => new URL(u).pathname === rota, { timeout: 60_000 });
      await page.locator(`[data-painel-voz="na_sala"][data-painel-posicao="${posicao}"]`).waitFor({ timeout: 30_000 });
      await sleep(2500);
      await foto(page, `07-painel-${posicao}-${rota.slice(1)}.png`);
    }
  }
}

async function salaPublica(p, ctx) {
  const palco = await s.createPalco(p.dono);
  made.rooms.push(palco.id);
  await db.from("voice_rooms").update({ title: "Live do PPA: Tinker mid" }).eq("id", palco.id);
  const pDono = await s.enter(await comTelaDoDota(await ctx(p.dono)), palco.id, "dono");
  const plateia = {};
  for (const tag of ["a", "b", "c", "d", "e"]) plateia[tag] = await s.enter(await ctx(p[tag]), palco.id, tag);
  await waitFor(async () => (await pDono.locator('[data-sala-pessoas="6"]').count()) > 0, 30_000);

  await pDono.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 30_000 });
  await pDono.locator("[data-sala-qualidade-dialogo]").waitFor({ timeout: 10_000 });
  await foto(pDono, "02-escolha-da-qualidade.png");
  await pDono.locator("[data-sala-qualidade-confirmar]").click();

  await plateia.b.locator('[data-sala-mao="nao"]').click();
  await plateia.d.locator('[data-sala-mao="nao"]').click();
  await plateia.a.locator('[data-sala-mao="nao"]').click();
  await waitFor(async () => (await pDono.locator(`[data-sala-chamar="${p.a.id}"]`).count()) > 0, 20_000);
  await pDono.locator(`[data-sala-chamar="${p.a.id}"]`).click();

  await falar(plateia.b, "boa noite, cheguei agora");
  await falar(plateia.c, "qual a build de hoje?");
  await falar(pDono, "boa noite, galera. Hoje é Tinker mid");
  await falar(plateia.d, "abre a party depois da partida?");
  await falar(plateia.e, "essa tela tá liza demais");

  await waitFor(async () => (await pDono.locator("[data-sala-mensagem]").count()) >= 5, 20_000);
  await waitFor(async () => (await pDono.locator('[data-sala-mao-membro="sim"]').count()) >= 2, 20_000);
  await waitFor(async () => (await s.attr(plateia.c, "data-video-altura")) > 0, 40_000);
  await waitFor(async () => (await plateia.a.locator('[data-sala-papel="falante"]').count()) > 0, 25_000);
  await sleep(3500);
  await foto(pDono, "01-sala-publica-dono.png");
  const linha = await pDono.locator(`[data-sala-membro="${p.c.id}"]`).boundingBox();
  if (linha) await foto(pDono, "01b-acoes-do-dono-no-mouse.png", { mouse: [linha.x + 60, linha.y + linha.height / 2] });
  await foto(plateia.c, "03-sala-publica-plateia.png");

  const largo = await (await ctx(p.e)).newPage();
  await largo.setViewportSize({ width: 3440, height: 1440 });
  await largo.goto(`${s.BASE}/sala/${palco.id}`);
  await largo.locator("[data-sala-entrar]").click({ timeout: 60_000 });
  await largo.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
  await waitFor(async () => (await s.attr(largo, "data-video-altura")) > 0, 40_000);
  await sleep(3500);
  await foto(largo, "06-sala-publica-plateia-3440.png");
  await painelForaDaSala(plateia.c);

  for (const page of [pDono, largo, ...Object.values(plateia)]) await page.close().catch(() => null);
}

async function mentoria(p, ctx) {
  const sala = await s.createRoom(p.dono, [p.aluno]);
  made.rooms.push(sala.id);
  await db.from("voice_rooms").update({ title: "Mentoria de Tinker" }).eq("id", sala.id);
  made.orders.push(sala.orderId);
  const pDono = await s.enter(await comTelaDoDota(await ctx(p.dono)), sala.id, "dono-mentoria");
  const pAluno = await s.enter(await ctx(p.aluno), sala.id, "aluno");
  await waitFor(async () => (await pDono.locator('[data-sala-pessoas="2"]').count()) > 0, 30_000);
  await pDono.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 30_000 });
  await pDono.locator('[data-sala-qualidade="alta"]').check();
  await pDono.locator("[data-sala-qualidade-confirmar]").click();
  await waitFor(async () => (await s.attr(pAluno, "data-video-altura")) > 0, 40_000);
  await waitFor(async () => (await s.attr(pAluno, "data-audio-bytes")) > 0, 30_000);
  await sleep(3500);
  await foto(pAluno, "04-mentoria-aluno.png");
  await foto(pDono, "05-mentoria-dono.png");
}

try {
  server = await s.startServer();
  await s.setFlag(true);
  const p = await criarPessoas();
  browser = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  const ctx = (u) => s.buyerContext(browser, u, { desktop: true });
  await salaPublica(p, ctx);
  await mentoria(p, ctx);
} catch (err) {
  console.error("falhou:", err.message);
  console.log(s.diagnostico.slice(-40).join(String.fromCharCode(10)));
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => null);
  await sleep(500);
  await s.dropFlag().catch(() => null);
  await s.cleanup(made).catch((e) => console.error("limpeza:", e.message));
  s.stopServer(server);
}
