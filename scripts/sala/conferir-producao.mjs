// Conferência da sala no domínio real (www.formuladota.com.br) com uma conta de teste: a aba "Sala de voz"
// aparece na barra, /sala leva à sala pública aberta, a pessoa entra, vai para /meta com o painel de voz,
// volta pelo painel e sai, sem erro na página. Sem sala pública aberta, confere a página "abre na live".
// A conta de teste é apagada no fim (as linhas dela na sala saem junto). Sai com 1 se algo falhar.
// Rodar: pnpm sala:producao

import { chromium } from "playwright-core";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
const loja = await import("../loja/e2e-comum.mjs");
const SITE = "https://www.formuladota.com.br";
const HOST = new URL(SITE).hostname;
const { waitFor } = s;
const { results, check } = s.checker();
const erros = [];
let browser = null;
let pessoa = null;

async function entrarNoSite() {
  pessoa = await s.createUser("producao");
  browser = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  const ctx = await browser.newContext({ locale: "pt-BR", viewport: { width: 1920, height: 1080 } });
  const sessao = (await loja.sessionCookiesFor(pessoa)).map((c) => ({ ...c, domain: HOST, secure: true }));
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: HOST, path: "/", secure: true }, ...sessao]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(e.message));
  return page;
}

async function naSala(page) {
  await page.locator('a[href="/sala"]').first().click({ timeout: 30_000 });
  // O /sala redireciona: espera a sala aberta ou a página de "abre na live", não o endereço do meio.
  const sala = /^\/sala\/[0-9a-f-]{36}$/;
  await waitFor(async () => sala.test(new URL(page.url()).pathname) || (await page.locator('[data-sala-publica="fechada"]').count()) > 0, 60_000);
  if (!sala.test(new URL(page.url()).pathname)) {
    check("sem sala pública aberta, /sala diz que ela abre na live", (await page.locator('[data-sala-publica="fechada"]').count()) === 1);
    return false;
  }
  await page.locator("[data-sala-entrar]").click({ timeout: 60_000 });
  const dentro = await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false);
  check("entra na sala pública pelo domínio real", dentro, page.url());
  return dentro;
}

async function navegarESair(page) {
  await page.locator('a[href="/meta"]').first().click({ timeout: 30_000 });
  await page.waitForURL((u) => new URL(u).pathname === "/meta", { timeout: 60_000 });
  const painel = await page.locator('[data-painel-voz="na_sala"]').waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
  check("no /meta, o painel de voz mostra a sala", painel);
  await page.locator("[data-painel-voz-voltar]").click({ timeout: 20_000 });
  const voltou = await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 }).then(() => true).catch(() => false);
  check("volta para a sala pelo painel", voltou);
  await page.locator("[data-sala-sair]").click({ timeout: 20_000 });
  const saiu = await waitFor(async () => (await page.locator('[data-sala-fase="saiu"]').count()) > 0, 20_000);
  check("sai da sala sem erro", !!saiu);
}

try {
  const page = await entrarNoSite();
  await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("a aba Sala de voz aparece na barra de cima", !!(await waitFor(async () => (await page.locator('a[href="/sala"]').count()) > 0, 30_000)));
  if (await naSala(page)) await navegarESair(page);
  check("nenhum erro na página", erros.length === 0, erros.slice(0, 3).join(" | "));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => null);
  if (pessoa) await loja.deleteTestUsers([pessoa.id]).catch(() => null);
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok} de ${results.length} verificações passaram.`);
  if (ok !== results.length) process.exitCode = 1;
}
