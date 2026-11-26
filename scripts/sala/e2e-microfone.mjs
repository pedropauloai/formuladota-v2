// Parte do microfone do e2e (correção de 24/11/2026: o PPA na Live sem conseguir falar, com o ícone de
// mudo e nenhum botão). Quem abre o site numa página comum e chega à sala pelo menu, sem recarregar, fala;
// com o microfone bloqueado no navegador, o botão do microfone fica na barra, o guia mostra onde liberar e a
// sala abre sozinha quando a permissão muda; com o aviso do navegador aberto, o guia aparece e o mudo
// escolhido vale quando o microfone abre. A permissão é a simulada (permissao-falsa.mjs). Canais de teste
// (is_test), apagados no fim pela limpeza do e2e.

import { permissaoDeTeste } from "./permissao-falsa.mjs";

const s = await import("./e2e-comum.mjs");
const { BASE, db, waitFor } = s;

const naPagina = async (page, sel, ms = 20_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));
const NO_AR = '[data-sala-papel="falante"][data-sala-voz="no_ar"]';
const mutadoNoBanco = async (roomId, userId) => (await db.from("voice_room_members").select("muted").eq("room_id", roomId).eq("user_id", userId).maybeSingle()).data?.muted;

/** O caminho do PPA: o site aberto fora da sala, a sala pelo menu de cima e o canal de voz pela árvore. */
async function pelaBarra(t, check, c) {
  const page = await (await t.ctx(t.barra)).newPage();
  s.instrument(page, "barra");
  await page.goto(`${BASE}/meta`);
  await page.locator('a[href="/sala"]').first().click({ timeout: 30_000 });
  await page.waitForURL((u) => /\/sala\/[0-9a-f-]{36}/.test(new URL(u).pathname), { timeout: 60_000 });
  await page.locator(`[data-canal="${c.voz.id}"]`).click({ timeout: 30_000 });
  const fala = await naPagina(page, NO_AR, 40_000);
  const aviso = await page.locator("[data-sala-microfone]").getAttribute("data-sala-microfone", { timeout: 1_000 }).catch(() => "sem aviso");
  check("quem chega à sala pelo menu do site, sem recarregar, entra com o microfone no ar", fala, fala ? "" : `microfone: ${aviso}`);
  const aberto = await waitFor(async () => (await mutadoNoBanco(c.voz.id, t.barra.id)) === false, 20_000);
  check("e o banco mostra o microfone aberto (muted = false)", !!aberto);
  await page.close();
}

async function negado(t, check, c) {
  const ctx = await t.ctx(t.negado);
  await ctx.addInitScript(permissaoDeTeste, "denied");
  const page = await s.enter(ctx, c.voz.id, "negado");
  const guia = await naPagina(page, '[data-sala-controles] [data-sala-microfone="negado"][data-sala-guia-bloqueado="ajustes"]', 20_000);
  const botao = (await page.locator('[data-sala-controles] [data-sala-mudo]').count()) === 1;
  check("microfone bloqueado na sala: o botão do microfone fica na barra e o guia mostra onde liberar", guia && botao, `guia ${guia}, botão ${botao}`);
  await page.evaluate(() => window.__mudarPermissao("granted"));
  const fala = await naPagina(page, NO_AR, 30_000);
  check("liberado pelo ícone do endereço, a sala abre o microfone sozinha e o guia some", fala && (await page.locator("[data-sala-microfone]").count()) === 0);
  await page.close();
}

async function pedindo(t, check, c) {
  const ctx = await t.ctx(t.pedindo);
  await ctx.addInitScript(permissaoDeTeste, "prompt");
  const page = await s.enter(ctx, c.voz.id, "pedindo");
  check("com o aviso do navegador aberto na sala, o guia aparece na hora", await naPagina(page, '[data-sala-microfone="pedindo"][data-sala-guia-aviso="esquerda"]', 5_000));
  await page.locator('[data-sala-controles] [data-sala-mudo="nao"]').click({ timeout: 10_000 });
  await page.evaluate(() => window.__responderAviso(true));
  const mudo = await naPagina(page, NO_AR, 30_000) && (await naPagina(page, '[data-sala-controles] [data-sala-mudo="sim"]', 5_000));
  check("mutar enquanto o microfone abre: ele entra no ar mudo", mudo);
  await page.locator('[data-sala-controles] [data-sala-mudo="sim"]').click();
  const aberto = await waitFor(async () => (await mutadoNoBanco(c.voz.id, t.pedindo.id)) === false, 20_000);
  check("desmutar abre o microfone para todos (muted = false no banco)", !!aberto);
  await page.close();
}

export async function microfone(t, check, made) {
  const c = {
    texto: await s.createCanal(t.dono, { tipo: "texto", titulo: "microfone-e2e", posicao: 5 }),
    voz: await s.createCanal(t.dono, { tipo: "palco", titulo: "Microfone e2e", posicao: 15, modo: "livre", limite: 10 }),
  };
  made.rooms.push(c.texto.id, c.voz.id);
  await pelaBarra(t, check, c);
  await negado(t, check, c);
  await pedindo(t, check, c);
}
