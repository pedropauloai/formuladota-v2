// Capturas do guia do microfone (R22), em 1920x1080 e em 3440x1440: cada estado da entrada de um canal de
// voz livre com a permissão simulada (permissao-falsa.mjs): o botão de ativar, o aviso do navegador aberto
// (Chrome e Safari), liberado e funcionando com a fala, bloqueado em cada navegador, o sistema barrando
// (Windows e macOS) e os guias dentro da sala. Servidor local, banco de produção com sala e pessoas de teste
// (apagadas no fim). Liga só a linha de teste da flag (sala_voz_e2e).
// Rodar: SALA_E2E_PORT=3210 node scripts/sala/capturas-microfone.mjs <pasta-de-saida>
// Só algumas: CAPTURAS_SO=m11,m12 (o começo do nome).

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { chromeQueFala } from "./fala-falsa.mjs";
import { NAVEGADORES } from "./permissao-falsa.mjs";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
process.env.SALA_FLAG_KEY = s.E2E_FLAG;
const { entradaNoEstado } = await import("./e2e-permissao.mjs");

const out = process.argv[2] ?? "capturas-microfone";
mkdirSync(out, { recursive: true });
const made = { rooms: [], orders: [], users: [] };
const navegadores = [];
let server = null;

/** A mesma tela em 1920 e em 3440, depois de o estado aparecer. */
async function fotos(page, nome, seletor) {
  await page.locator(seletor).first().waitFor({ timeout: 20_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.mouse.move(4, 4);
  for (const [w, h, sufixo] of [[1920, 1080, ""], [3440, 1440, "-3440"]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(out, `${nome}${sufixo}.png`) });
    console.log(`captura: ${nome}${sufixo}.png`);
  }
}

async function estado(nav, pessoa, canal, nome, permissao, seletor, { userAgent, antes } = {}) {
  if (!quero(nome)) return;
  const page = await entradaNoEstado(nav, pessoa, canal.id, permissao, { userAgent, quem: nome });
  if (antes) await antes(page);
  await fotos(page, nome, seletor);
  await page.context().close();
}

const ativar = async (page) => page.locator("[data-sala-microfone-ativar]").click();
const so = (process.env.CAPTURAS_SO ?? "").split(",").filter(Boolean);
const quero = (nome) => so.length === 0 || so.some((n) => nome.startsWith(n));

/** Entra na sala com a entrada já assentada no estado e fotografa o guia abaixo dos controles. */
async function dentro(nav, pessoa, canal, nome, permissao, checagem, seletor) {
  if (!quero(nome)) return;
  const page = await entradaNoEstado(nav, pessoa, canal.id, permissao, { quem: nome });
  await page.locator(`[data-sala-checagem="${checagem}"]`).waitFor({ timeout: 20_000 });
  await page.locator("[data-sala-entrar]").click();
  await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
  await fotos(page, nome, seletor);
  await page.context().close();
}

try {
  server = await s.startServer();
  await s.setFlag(true);
  const dono = await s.createUser("capmicdono", { admin: true });
  const pessoa = await s.createUser("capmic", { admin: false, adult: true });
  made.users.push(dono, pessoa);
  const canal = await s.createCanal(dono, { tipo: "palco", titulo: "Party do PPA", posicao: 36, modo: "livre", limite: 10 });
  made.rooms.push(canal.id);
  const nav = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  const fala = await chromeQueFala(chromium, s.CHROME_ARGS);
  navegadores.push(nav, fala);
  await estado(nav, pessoa, canal, "m01-ativar-microfone", "prompt", '[data-sala-checagem="pergunta"]');
  await estado(nav, pessoa, canal, "m02-aviso-aberto-chrome", "prompt", "[data-sala-guia-aviso]", { antes: ativar });
  await estado(nav, pessoa, canal, "m03-aviso-aberto-safari", "prompt", '[data-sala-guia-aviso="centro"]', { userAgent: NAVEGADORES.safari, antes: ativar });
  await estado(fala, pessoa, canal, "m04-liberado-funcionando", "granted", '[data-sala-microfone-funcionando="sim"]');
  await estado(nav, pessoa, canal, "m05-bloqueado-chrome", "denied", '[data-sala-guia-bloqueado="ajustes"]');
  await estado(nav, pessoa, canal, "m06-bloqueado-edge", "denied", '[data-sala-guia-bloqueado="cadeado"]', { userAgent: NAVEGADORES.edge });
  await estado(nav, pessoa, canal, "m07-bloqueado-firefox", "denied", '[data-sala-guia-bloqueado="microfone"]', { userAgent: NAVEGADORES.firefox });
  await estado(nav, pessoa, canal, "m08-bloqueado-safari", "denied", '[data-sala-guia-bloqueado="safari"]', { userAgent: NAVEGADORES.safari });
  await estado(nav, pessoa, canal, "m09-sistema-windows", "sistema", '[data-sala-guia-sistema="windows"]');
  await estado(nav, pessoa, canal, "m10-sistema-mac", "sistema", '[data-sala-guia-sistema="mac"]', { userAgent: NAVEGADORES.chromeMac });
  await dentro(nav, pessoa, canal, "m11-bloqueado-dentro-da-sala", "denied", "negado", "[data-sala-controles] [data-sala-guia-bloqueado]");
  await dentro(nav, pessoa, canal, "m12-sistema-dentro-da-sala", "sistema", "sistema", '[data-sala-controles] [data-sala-guia-sistema="windows"]');
} catch (err) {
  console.error("falhou:", err.message);
  console.log(s.diagnostico.slice(-30).join(String.fromCharCode(10)));
  process.exitCode = 1;
} finally {
  for (const n of navegadores) await n.close().catch(() => null);
  await s.dropFlag().catch(() => null);
  await s.cleanup(made).catch((e) => console.error("limpeza:", e.message));
  s.stopServer(server);
}
