// Parte da permissão do microfone do e2e (R22, pedido do PPA em 26/11/2026: "alguns usuários estão tendo
// muita dificuldade para poder conseguir ativar o microfone"), com a permissão simulada (permissao-falsa.mjs)
// na entrada de um canal de voz livre: sem resposta no navegador, o botão de ativar (e quem só quer ouvir
// entra mesmo assim); o clique abre o aviso, e o guia escurece a página com a seta no lado certo de cada
// navegador; permitido, o microfone em uso e o sinal de funcionando com a fala, e a sala entra sem pedir de
// novo; o aviso fechado sem escolher volta ao botão; bloqueado, a barra de endereço desenhada com o ícone de
// cada navegador, e liberar pelo ícone abre sozinho; o sistema barrando, o caminho e o atalho do Windows e do
// macOS, e "Tentar de novo" abre depois de liberar; no palco da live, a entrada não pede microfone.

import { chromium } from "playwright-core";
import { chromeQueFala } from "./fala-falsa.mjs";
import { NAVEGADORES, permissaoDeTeste } from "./permissao-falsa.mjs";

const s = await import("./e2e-comum.mjs");
const { BASE, waitFor } = s;

const naPagina = async (page, sel, ms = 15_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));
const NO_AR = '[data-sala-papel="falante"][data-sala-voz="no_ar"]';

/** A entrada do canal (sem ?entrar=1) com a permissão de teste nesse estado e, se pedido, outro navegador. */
export async function entradaNoEstado(browser, pessoa, canalId, estado, { userAgent, quem } = {}) {
  const ctx = await s.buyerContext(browser, pessoa, { desktop: true, userAgent });
  await ctx.addInitScript(permissaoDeTeste, estado);
  const page = await ctx.newPage();
  s.instrument(page, quem ?? `permissao-${estado}`);
  await page.goto(`${BASE}/sala/${canalId}`);
  await page.locator("[data-sala-entrar]").waitFor({ timeout: 60_000 });
  return page;
}

async function ativarEFalar(pessoa, check, canal) {
  const nav = await chromeQueFala(chromium, s.CHROME_ARGS);
  try {
    const page = await entradaNoEstado(nav, pessoa, canal.id, "prompt", { quem: "permissao-ativar" });
    const botao = await naPagina(page, '[data-sala-checagem="pergunta"] [data-sala-microfone-ativar]');
    check("antes do aviso do navegador, a entrada mostra o botão de ativar o microfone, e o de entrar segue lá", botao && (await page.locator("[data-sala-entrar]").count()) === 1);
    await page.locator("[data-sala-microfone-ativar]").click();
    const guia = await naPagina(page, '[data-sala-guia-aviso="esquerda"][data-sala-navegador="chrome"]', 10_000);
    const aviso = await waitFor(() => page.evaluate(() => window.__avisosAbertos() === 1), 5_000);
    check("o clique abre o aviso do navegador, e o guia escurece a página com a seta para o canto do Chrome", guia && !!aviso);
    await page.evaluate(() => window.__responderAviso(true));
    const nome = await naPagina(page, '[data-sala-checagem="ok"] [data-sala-checagem-microfone]', 15_000)
      ? await page.locator("[data-sala-checagem-microfone]").getAttribute("data-sala-checagem-microfone")
      : "";
    check("permitido, o guia some e a entrada mostra o microfone em uso", !!nome && (await page.locator("[data-sala-guia-aviso]").count()) === 0, nome);
    check("com a fala passando da porta, acende o sinal de microfone funcionando", await naPagina(page, '[data-sala-microfone-funcionando="sim"]', 15_000));
    await page.locator("[data-sala-entrar]").click();
    check("entra na sala com o microfone no ar, sem pedir de novo", await naPagina(page, NO_AR, 40_000));
  } finally {
    await nav.close().catch(() => null);
  }
}

async function fechouOAviso(nav, pessoa, check, canal) {
  const page = await entradaNoEstado(nav, pessoa, canal.id, "prompt", { quem: "permissao-fechou" });
  await page.locator("[data-sala-microfone-ativar]").click();
  await naPagina(page, "[data-sala-guia-aviso]", 10_000);
  await page.evaluate(() => window.__responderAviso(null));
  check("fechar o aviso do navegador sem escolher volta ao botão de ativar", await naPagina(page, '[data-sala-checagem="pergunta"] [data-sala-microfone-ativar]'));
  await page.context().close();
}

async function bloqueado(nav, pessoa, check, canal) {
  const page = await entradaNoEstado(nav, pessoa, canal.id, "denied", { quem: "permissao-bloqueado" });
  check("bloqueado no Chrome, a barra de endereço desenhada mostra o ícone de ajustes e o microfone a ligar", await naPagina(page, '[data-sala-checagem="negado"] [data-sala-guia-bloqueado="ajustes"]'));
  await page.evaluate(() => window.__mudarPermissao("granted"));
  check("liberado pelo ícone do endereço, a entrada abre o microfone sozinha", await naPagina(page, '[data-sala-checagem="ok"] [data-sala-checagem-microfone]', 20_000));
  await page.context().close();
  const icone = {};
  for (const [nome, ua] of [["edge", NAVEGADORES.edge], ["firefox", NAVEGADORES.firefox], ["safari", NAVEGADORES.safari]]) {
    const p = await entradaNoEstado(nav, pessoa, canal.id, "denied", { userAgent: ua, quem: `permissao-${nome}` });
    icone[nome] = (await naPagina(p, "[data-sala-guia-bloqueado]")) ? await p.locator("[data-sala-guia-bloqueado]").getAttribute("data-sala-guia-bloqueado") : null;
    await p.context().close();
  }
  check("cada navegador mostra o seu ícone: cadeado no Edge, microfone riscado no Firefox e o caminho no Safari", icone.edge === "cadeado" && icone.firefox === "microfone" && icone.safari === "safari", JSON.stringify(icone));
  const ps = await entradaNoEstado(nav, pessoa, canal.id, "prompt", { userAgent: NAVEGADORES.safari, quem: "permissao-safari-aviso" });
  await ps.locator("[data-sala-microfone-ativar]").click();
  check("no Safari, a seta aponta para o centro, onde o aviso dele aparece", await naPagina(ps, '[data-sala-guia-aviso="centro"]', 10_000));
  await ps.context().close();
}

async function sistema(nav, pessoa, check, canal) {
  const page = await entradaNoEstado(nav, pessoa, canal.id, "sistema", { quem: "permissao-sistema" });
  const caminho = await naPagina(page, '[data-sala-checagem="sistema"] [data-sala-guia-sistema="windows"] [data-sala-caminho="windows"]');
  const atalho = await page.locator("[data-sala-sistema-abrir]").getAttribute("href").catch(() => null);
  check("o Windows barrando: o caminho da privacidade do microfone e o atalho que abre a tela certa", caminho && atalho === "ms-settings:privacy-microphone", atalho ?? "sem atalho");
  await page.evaluate(() => window.__sistemaLibera());
  await page.locator("[data-sala-microfone-tentar]").click();
  check("liberado no Windows, Tentar de novo abre o microfone", await naPagina(page, '[data-sala-checagem="ok"]', 15_000));
  await page.context().close();
  const mac = await entradaNoEstado(nav, pessoa, canal.id, "sistema", { userAgent: NAVEGADORES.chromeMac, quem: "permissao-mac" });
  const noMac = await naPagina(mac, '[data-sala-guia-sistema="mac"] [data-sala-caminho="mac"]');
  const atalhoMac = await mac.locator("[data-sala-sistema-abrir]").getAttribute("href").catch(() => "");
  check("no macOS, o caminho dos Ajustes do Sistema e o atalho deles", noMac && (atalhoMac ?? "").startsWith("x-apple.systempreferences:"), atalhoMac ?? "");
  await mac.context().close();
}

async function palcoNaoPede(nav, pessoa, check, palco) {
  const page = await entradaNoEstado(nav, pessoa, palco.id, "prompt", { quem: "permissao-palco" });
  await page.waitForTimeout(1_500);
  check("no palco da live, a entrada não pede o microfone (a plateia só ouve)", (await page.locator("[data-sala-checagem]").count()) === 0);
  await page.context().close();
}

export async function permissao(t, check, made) {
  const pessoas = await Promise.all(["permissao1", "permissao2"].map((n) => s.createUser(n, { admin: false, adult: true })));
  made.users.push(...pessoas);
  const canal = await s.createCanal(t.dono, { tipo: "palco", titulo: "Permissão e2e", posicao: 37, modo: "livre", limite: 10 });
  const palco = await s.createCanal(t.dono, { tipo: "palco", titulo: "Palco da permissão e2e", posicao: 38, modo: "palco", limite: 10 });
  made.rooms.push(canal.id, palco.id);
  await ativarEFalar(pessoas[0], check, canal);
  const nav = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  try {
    await fechouOAviso(nav, pessoas[1], check, canal);
    await bloqueado(nav, pessoas[1], check, canal);
    await sistema(nav, pessoas[1], check, canal);
    await palcoNaoPede(nav, pessoas[1], check, palco);
  } finally {
    await nav.close().catch(() => null);
  }
}
