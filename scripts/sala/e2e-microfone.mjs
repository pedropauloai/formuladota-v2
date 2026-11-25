// Parte do microfone do e2e (correção de 24/11/2026: o PPA na Live sem conseguir falar, com o ícone de
// mudo e nenhum botão). Quem abre o site numa página comum e chega à sala pelo menu, sem recarregar, fala;
// com o microfone negado pelo navegador, o botão do microfone fica na barra, o aviso diz o caminho e
// "Tentar de novo" abre; com o navegador ainda pedindo a permissão, a tela avisa e o mudo escolhido vale
// quando o microfone abre. Canais de teste (is_test), apagados no fim pela limpeza do e2e.

const s = await import("./e2e-comum.mjs");
const { BASE, db, waitFor } = s;

/** getUserMedia de teste: "negado" recusa como o navegador; "esperar" segura até liberar, como o pedido da permissão. */
function microfoneDeTeste(modo) {
  const md = navigator.mediaDevices;
  if (!md) return;
  const original = md.getUserMedia.bind(md);
  window.__microfone = modo;
  const esperando = [];
  window.__liberarMicrofone = () => {
    window.__microfone = "liberado";
    esperando.splice(0).forEach((seguir) => seguir());
  };
  md.getUserMedia = async (pedido) => {
    if (!pedido?.audio || window.__microfone === "liberado") return original(pedido);
    if (window.__microfone === "negado") throw new DOMException("Permission denied", "NotAllowedError");
    await new Promise((seguir) => esperando.push(seguir));
    return original(pedido);
  };
}

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
  await ctx.addInitScript(microfoneDeTeste, "negado");
  const page = await s.enter(ctx, c.voz.id, "negado");
  const aviso = await naPagina(page, '[data-sala-microfone="negado"]', 20_000);
  const botao = (await page.locator('[data-sala-controles] [data-sala-mudo]').count()) === 1;
  check("microfone negado: o botão do microfone fica na barra e o aviso diz como liberar", aviso && botao, `aviso ${aviso}, botão ${botao}`);
  await page.evaluate(() => {
    window.__microfone = "liberado";
  });
  await page.locator("[data-sala-microfone-tentar]").click();
  const fala = await naPagina(page, NO_AR, 30_000);
  check("liberado, Tentar de novo abre o microfone e o aviso some", fala && (await page.locator("[data-sala-microfone]").count()) === 0);
  await page.close();
}

async function pedindo(t, check, c) {
  const ctx = await t.ctx(t.pedindo);
  await ctx.addInitScript(microfoneDeTeste, "esperar");
  const page = await s.enter(ctx, c.voz.id, "pedindo");
  check("com o navegador pedindo a permissão, a tela avisa", await naPagina(page, '[data-sala-microfone="pedindo"]', 15_000));
  await page.locator('[data-sala-controles] [data-sala-mudo="nao"]').click({ timeout: 10_000 });
  await page.evaluate(() => window.__liberarMicrofone());
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
