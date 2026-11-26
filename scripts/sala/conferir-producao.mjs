// Conferência da sala no domínio real (www.formuladota.com.br) com uma conta de teste: a aba "Sala de voz"
// aparece na barra, /sala leva a um canal do servidor (o canal de texto abre), a pessoa entra no canal de
// voz, o estado responde com quem está na sala, vai para /meta com o painel de voz, volta pelo painel e sai,
// sem erro na página nem erro 5xx nas rotas da sala. O aviso dos canais (Broadcast do Realtime, escutado com a
// chave pública, como o navegador) chega quando a pessoa entra e quando sai. Sem canal, confere a página do servidor vazio.
// E o filtro do microfone (R21) roda no domínio real, com a regra de conteúdo de produção: o WebAssembly do
// RNNoise compila, os processadores de áudio carregam de /voz e a fala falsa atravessa o RNNoise e a porta.
// E o guia do microfone (R22) na entrada de um canal livre, com a permissão simulada: o botão de ativar, a
// seta do aviso do navegador e o microfone liberado, sem entrar no canal.
// A conta de teste é apagada no fim (as linhas dela na sala saem junto). Sai com 1 se algo falhar.
// Rodar: pnpm sala:producao

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { permissaoDeTeste } from "./permissao-falsa.mjs";

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
let ouvido = null;

/** Escuta o aviso dos canais de produção com a chave pública, como a árvore do navegador. */
async function escutarAvisos() {
  const sb = createClient(loja.env.NEXT_PUBLIC_SUPABASE_URL, loja.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const avisos = [];
  const canal = sb.channel("sala-canais").on("broadcast", { event: "mudou" }, () => avisos.push(Date.now()));
  await new Promise((ok) => {
    const limite = setTimeout(ok, 10_000);
    canal.subscribe((estado) => {
      if (estado === "SUBSCRIBED") {
        clearTimeout(limite);
        ok();
      }
    });
  });
  return { avisos, depois: (t) => avisos.filter((a) => a >= t).length, parar: () => sb.removeChannel(canal) };
}

/** Uma aba nova do domínio real, logada com a conta de teste. */
async function contextoLogado() {
  const ctx = await browser.newContext({ locale: "pt-BR", viewport: { width: 1920, height: 1080 } });
  const sessao = (await loja.sessionCookiesFor(pessoa)).map((c) => ({ ...c, domain: HOST, secure: true }));
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: "pt", domain: HOST, path: "/", secure: true }, ...sessao]);
  return ctx;
}

async function entrarNoSite() {
  pessoa = await s.createUser("producao");
  browser = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
  const ctx = await contextoLogado();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(e.message));
  // Erro do servidor numa rota da sala (o estado em 500 deixa a sala vazia sem nenhum erro na página).
  page.on("response", (r) => {
    if (r.url().includes("/api/sala/") && r.status() >= 500) erros.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return page;
}

/** O filtro do microfone na página do domínio real: compila, carrega e deixa a fala passar (maior volume de 1 s). */
const filtroNoDominio = (page) =>
  page.evaluate(async () => {
    const r = { compila: false, carrega: false, volume: 0, erro: "" };
    try {
      const wasm = await (await fetch("/voz/rnnoise-0.4.2/rnnoise_simd.wasm")).arrayBuffer();
      await WebAssembly.compile(wasm);
      r.compila = true;
      const ctx = new AudioContext({ sampleRate: 48_000 });
      await ctx.audioWorklet.addModule("/voz/rnnoise-0.4.2/workletProcessor.js");
      await ctx.audioWorklet.addModule("/voz/porta-voz.js");
      r.carrega = true;
      const rn = new AudioWorkletNode(ctx, "@sapphi-red/web-noise-suppressor/rnnoise", { processorOptions: { maxChannels: 1, wasmBinary: wasm } });
      const porta = new AudioWorkletNode(ctx, "porta-de-voz", { outputChannelCount: [1] });
      let falhou = "";
      rn.onprocessorerror = () => (falhou = "rnnoise");
      porta.onprocessorerror = () => (falhou = "porta");
      const n = 48_000 * 3;
      const fala = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const k = i % 14_880;
        const env = k < 10_560 ? Math.min(1, k / 960, (10_560 - k) / 960) : 0;
        const w = (2 * Math.PI * [180, 240, 300][Math.floor(i / 14_880) % 3] * i) / 48_000;
        fala[i] = env * 0.4 * (0.5 * Math.sin(w) + 0.25 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w));
      }
      const buf = ctx.createBuffer(1, n, 48_000);
      buf.copyToChannel(fala, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      await new Promise((ok) => setTimeout(ok, 500));
      src.connect(rn).connect(porta).connect(an);
      src.start();
      const janela = new Float32Array(2048);
      for (let i = 0; i < 40; i++) {
        await new Promise((ok) => setTimeout(ok, 50));
        an.getFloatTimeDomainData(janela);
        r.volume = Math.max(r.volume, Math.sqrt(janela.reduce((s, v) => s + v * v, 0) / janela.length));
      }
      if (falhou) r.erro = `processador ${falhou} falhou`;
      await ctx.close();
    } catch (e) {
      r.erro = String(e).slice(0, 160);
    }
    return r;
  });

async function naSala(page) {
  await page.locator('a[href="/sala"]').first().click({ timeout: 30_000 });
  // O /sala redireciona: espera a sala aberta ou a página de "abre na live", não o endereço do meio.
  const sala = /^\/sala\/[0-9a-f-]{36}$/;
  await waitFor(async () => sala.test(new URL(page.url()).pathname) || (await page.locator('[data-sala-publica="fechada"]').count()) > 0, 60_000);
  if (!sala.test(new URL(page.url()).pathname)) {
    check("sem canal aberto, /sala mostra o servidor vazio", (await page.locator('[data-sala-publica="fechada"]').count()) === 1);
    return false;
  }
  if ((await page.locator("[data-canal-texto]").count()) > 0) {
    check("o canal de texto abre pelo domínio real", await page.locator('[data-canal-fase="dentro"]').waitFor({ timeout: 45_000 }).then(() => true).catch(() => false));
    const voz = page.locator('[data-canal-tipo="palco"]').first();
    if ((await voz.count()) === 0) return false;
    // Um clique no canal de voz da árvore já entra.
    await voz.click();
  } else {
    await page.locator("[data-sala-entrar]").click({ timeout: 60_000 });
  }
  const entrouEm = Date.now();
  const dentro = await page.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 60_000 }).then(() => true).catch(() => false);
  check("entra no canal de voz pelo domínio real", dentro, page.url());
  check("o aviso de quem entrou chega pelo Realtime", !!(await waitFor(async () => ouvido.depois(entrouEm) >= 1, 10_000)), `${ouvido.avisos.length} aviso(s)`);
  const pessoas = await waitFor(async () => Number((await page.locator("[data-sala-pessoas]").first().getAttribute("data-sala-pessoas")) ?? 0) >= 1, 30_000);
  check("o estado da sala responde (a lista de quem está na sala aparece)", !!pessoas);
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
  // Espera o servidor responder a saída: fechar o navegador antes cortaria o pedido.
  const resposta = page.waitForResponse((r) => r.url().endsWith("/sair") && r.request().method() === "POST", { timeout: 20_000 }).catch(() => null);
  const saiuEm = Date.now();
  await page.locator("[data-sala-sair]").click({ timeout: 20_000 });
  const saiu = await waitFor(async () => (await page.locator('[data-sala-fase="saiu"]').count()) > 0, 20_000);
  const r = await resposta;
  check("sai da sala sem erro", !!saiu && r?.status() === 204, `HTTP ${r?.status() ?? "sem resposta"}`);
  check("o aviso de quem saiu chega pelo Realtime", !!(await waitFor(async () => ouvido.depois(saiuEm) >= 1, 10_000)), `${ouvido.depois(saiuEm)} aviso(s) depois da saída`);
}

/** O guia do microfone (R22) na entrada de um canal livre da árvore, numa aba com a permissão simulada: o
 *  botão de ativar, a seta do aviso no canto do Chrome e, permitido, o microfone de teste aberto. Não entra. */
async function guiaDoMicrofone(page) {
  const livre = page.locator('[data-canal-tipo="palco"][data-canal-modo="livre"]').first();
  const id = (await livre.count()) > 0 ? await livre.getAttribute("data-canal") : null;
  if (!id) return check("o guia do microfone: a árvore tem um canal livre", false, "sem canal livre na árvore");
  const ctx = await contextoLogado();
  await ctx.addInitScript(permissaoDeTeste, "prompt");
  const aba = await ctx.newPage();
  const ve = (sel, ms) => aba.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false);
  await aba.goto(`${SITE}/sala/${id}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const botao = await ve('[data-sala-checagem="pergunta"] [data-sala-microfone-ativar]', 60_000);
  if (botao) await aba.locator("[data-sala-microfone-ativar]").click();
  const seta = botao && (await ve('[data-sala-guia-aviso="esquerda"]', 15_000));
  if (seta) await aba.evaluate(() => window.__responderAviso(true));
  const liberado = seta && (await ve('[data-sala-checagem="ok"] [data-sala-checagem-microfone]', 30_000));
  check("no domínio real, a entrada de um canal livre mostra Ativar microfone, a seta do aviso e, permitido, o microfone aberto", !!liberado, `botão ${botao}, seta ${!!seta}, liberado ${!!liberado}`);
  await ctx.close();
}

try {
  ouvido = await escutarAvisos();
  const page = await entrarNoSite();
  await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  check("a aba Sala de voz aparece na barra de cima", !!(await waitFor(async () => (await page.locator('a[href="/sala"]').count()) > 0, 30_000)));
  const f = await filtroNoDominio(page);
  check("o filtro do microfone roda no domínio real: o RNNoise compila, os processadores carregam e a fala passa", f.compila && f.carrega && !f.erro && f.volume > 0.01, `compila ${f.compila}, carrega ${f.carrega}, volume ${Math.round(f.volume * 1000) / 1000}${f.erro ? `, ${f.erro}` : ""}`);
  if (await naSala(page)) {
    await navegarESair(page);
    await guiaDoMicrofone(page);
  }
  check("nenhum erro na página", erros.length === 0, erros.slice(0, 3).join(" | "));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => null);
  await ouvido?.parar().catch(() => null);
  if (pessoa) await loja.deleteTestUsers([pessoa.id]).catch(() => null);
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok} de ${results.length} verificações passaram.`);
  if (ok !== results.length) process.exitCode = 1;
}
