// Parte dos menus de botão direito do e2e (pedido da central em 24/11/2026, com as peças do PR 217): na
// pessoa, o dono vê chamar, expulsar e banir antes das ações do perfil, e a plateia não vê moderação;
// "Ver o perfil" troca de página sem recarregar, com a voz ligada; no canal, a plateia só copia o link e o
// dono edita o nome e o limite e apaga (com segundo toque); na mensagem, o dono copia o texto e apaga com
// segundo toque; expulsar pelo menu pede o segundo toque e tira a pessoa da sala. E a foto junto do nome
// (pedido do PPA de 25/11/2026): a mensagem do chat vem com a foto de quem escreveu, a foto abre o mini
// perfil no mouse, na árvore o botão direito na foto traz as ações da sala, e a denúncia no painel mostra
// as fotos de quem denunciou e de quem foi denunciado. E mover de canal (R20): só o dono move; quem está na
// página do canal vai junto para o destino, e quem está em outra página do site continua nela, com a voz
// já no outro canal.

const s = await import("./e2e-comum.mjs");
const { BASE, db, waitFor } = s;

const naPagina = async (page, sel, ms = 10_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));

/** Abre o menu do botão direito sobre o alvo e devolve os itens que ele mostra, pelo atributo de teste. */
async function itensDoMenu(page, alvo, atributo) {
  await page.locator(alvo).first().click({ button: "right" });
  const itens = page.locator(`[${atributo}]`);
  await itens.first().waitFor({ timeout: 10_000 });
  return itens.evaluateAll((els, a) => els.map((e) => e.getAttribute(a)), atributo);
}

/** O mouse em cima da foto abre o mini perfil (o cartão do site); depois o mouse sai. */
async function abreMiniPerfil(page, foto) {
  await page.locator(foto).first().hover();
  const abriu = await naPagina(page, "[data-radix-popper-content-wrapper]", 10_000);
  await page.mouse.move(4, 4);
  return abriu;
}

/** Item de ação sem volta: o primeiro toque arma ("Confirmar: ..."), o segundo roda. */
async function doisToques(page, item) {
  const alvo = page.locator(item);
  await alvo.click();
  const armou = (await alvo.innerText()).includes("Confirmar");
  await alvo.click();
  return armou;
}

async function messageId(roomId, body) {
  let id = null;
  await waitFor(async () => {
    const { data } = await db.from("voice_room_messages").select("id").eq("room_id", roomId).eq("body", body).limit(1);
    id = data?.[0]?.id ?? null;
    return id !== null;
  }, 10_000);
  return id;
}

/** Na sala agora: ativa e com batimento recente (sair apaga o batimento). */
async function presente(roomId, userId) {
  const { data } = await db.from("voice_room_members").select("status, last_seen_at").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  return data?.status === "ativo" && !!data.last_seen_at && Date.now() - Date.parse(data.last_seen_at) < 30_000;
}

async function pessoa(t, check, pDono, pMenu) {
  const linha = `[data-sala-membro="${t.menu.id}"]`;
  const doDono = await itensDoMenu(pDono, linha, "data-menu-acao");
  const ordem = doDono.indexOf("sala-banir") < doDono.indexOf("perfil");
  check("o botão direito do dono numa pessoa da plateia mostra chamar, expulsar e banir, e depois o perfil", ["sala-chamar", "sala-expulsar", "sala-banir", "perfil"].every((i) => doDono.includes(i)) && ordem, doDono.join(", "));
  await pDono.locator('[data-menu-acao="sala-chamar"]').click();
  check("chamar ao palco pelo menu põe a pessoa no palco", await naPagina(pDono, `${linha}[data-sala-papel-membro="falante"]`, 15_000));
  const fotoNaLinha = `${linha} a[href^="/perfil/u/"]`;
  const cartao = await abreMiniPerfil(pDono, fotoNaLinha);
  const naFoto = await itensDoMenu(pDono, fotoNaLinha, "data-menu-acao");
  await pDono.keyboard.press("Escape");
  check("na árvore, a foto abre o mini perfil no mouse e o botão direito nela traz as ações da sala", cartao && naFoto.includes("sala-expulsar") && naFoto.includes("perfil"), naFoto.join(", "));

  const daPlateia = await itensDoMenu(pMenu, `[data-sala-membro="${t.dono.id}"]`, "data-menu-acao");
  const semModerar = !daPlateia.some((i) => ["sala-chamar", "sala-mutar", "sala-expulsar", "sala-banir"].includes(i));
  check("quem não é dono não vê moderação no menu: volume, bloquear, denunciar e o perfil", semModerar && ["sala-volume", "sala-bloquear", "sala-denunciar", "perfil"].every((i) => daPlateia.includes(i)), daPlateia.join(", "));
  await pMenu.evaluate(() => {
    window.__semRecarregar = true;
  });
  await pMenu.locator('[data-menu-acao="perfil"]').click();
  // O perfil por id leva ao endereço com o apelido (/perfil/u/<id> vira /perfil/<apelido>).
  await pMenu.waitForURL((u) => new URL(u).pathname.startsWith("/perfil/"), { timeout: 30_000 });
  const semRecarregar = await pMenu.evaluate(() => window.__semRecarregar === true);
  check("Ver o perfil pelo menu abre o perfil sem recarregar a página, com a voz ligada", semRecarregar && (await naPagina(pMenu, '[data-painel-voz="na_sala"]', 20_000)));
  await pMenu.locator("[data-painel-voz-voltar]").click();
  await pMenu.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
}

async function canal(check, pDono, pMenu, canalId) {
  const alvo = `[data-canal="${canalId}"]`;
  const daPlateia = await itensDoMenu(pMenu, alvo, "data-canal-menu");
  await pMenu.keyboard.press("Escape");
  check("no canal, o botão direito de quem não é dono só copia o link", daPlateia.includes("canal-copiar-link") && !daPlateia.some((i) => ["canal-editar", "canal-apagar"].includes(i)), daPlateia.join(", "));
  const doDono = await itensDoMenu(pDono, alvo, "data-canal-menu");
  check("o dono vê editar, modo, público e apagar no menu do canal", ["canal-editar", "canal-modo", "canal-beneficio", "canal-apagar"].every((i) => doDono.includes(i)), doDono.join(", "));
  await pDono.locator('[data-canal-menu="canal-editar"]').click();
  await pDono.locator("[data-editar-canal-nome]").fill("Menus e2e editado");
  await pDono.locator("[data-editar-canal-limite]").fill("7");
  await pDono.locator("[data-editar-canal-salvar]").click();
  const naArvore = await waitFor(async () => (await pDono.locator(alvo).innerText()).includes("Menus e2e editado"), 15_000);
  const { data: linha } = await db.from("voice_rooms").select("title, max_members").eq("id", canalId).single();
  check("editar pelo menu muda o nome e o limite do canal, e a árvore mostra na hora", !!naArvore && linha?.title === "Menus e2e editado" && linha?.max_members === 7, `${linha?.title}, ${linha?.max_members}`);
}

async function mover(t, check, pDono, pMenu, canalId, destinoId) {
  const recusa = await s.apiPost(pMenu, `/api/sala/${canalId}/membros/${t.dono.id}/mover`, { destino: destinoId });
  check("quem não é dono não move ninguém de canal: o servidor recusa", recusa.status === 403 && recusa.body?.errorCode === "so_o_dono", `HTTP ${recusa.status} ${recusa.body?.errorCode}`);
  const trocou = async (de, para) => !!(await waitFor(async () => (await presente(para, t.menu.id)) && !(await presente(de, t.menu.id)), 30_000));
  const linha = `[data-sala-membro="${t.menu.id}"]`;
  const item = `sala-mover-${destinoId}`;
  const itens = await itensDoMenu(pDono, linha, "data-menu-acao");
  check("o botão direito do dono na pessoa traz mover para o outro canal de voz, antes de expulsar", itens.includes(item) && itens.indexOf(item) < itens.indexOf("sala-expulsar"), itens.join(", "));
  await pDono.locator(`[data-menu-acao="${item}"]`).click();
  const foi = await waitFor(() => new URL(pMenu.url()).pathname === `/sala/${destinoId}`, 30_000);
  check("movida pelo dono, a pessoa vai junto para a página do outro canal e entra nele", !!foi && (await naPagina(pMenu, '[data-sala-fase="na_sala"]', 30_000)) && (await trocou(canalId, destinoId)));

  // Em outra página do site (as novidades, pela barra de cima, sem recarregar), só a voz troca de canal.
  await pMenu.evaluate(() => {
    window.__semRecarregar = true;
  });
  await pMenu.locator('a[href="/novidades"]').first().click();
  await pMenu.waitForURL((u) => new URL(u).pathname === "/novidades", { timeout: 30_000 });
  const res = await s.apiPost(pDono, `/api/sala/${destinoId}/membros/${t.menu.id}/mover`, { destino: canalId });
  const voltou = res.status === 200 && (await trocou(destinoId, canalId));
  // O título do painel vem em caixa alta pelo CSS: compara o texto do canal, não o desenhado.
  const painel = await waitFor(async () => ((await pMenu.locator("[data-painel-voz-voltar]").textContent().catch(() => "")) ?? "").includes("Menus e2e editado"), 20_000);
  const ficou = new URL(pMenu.url()).pathname === "/novidades" && (await pMenu.evaluate(() => window.__semRecarregar === true));
  check("numa outra página do site, mover troca só a voz: a pessoa fica na página e o painel de voz mostra o novo canal", voltou && !!painel && ficou, `HTTP ${res.status}, trocou ${voltou}, painel ${!!painel}, ficou ${ficou}`);
  await pMenu.locator("[data-painel-voz-voltar]").click();
  await pMenu.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
}

async function mensagem(t, check, pDono, pMenu, canalId) {
  await pMenu.locator("[data-sala-chat-campo]").fill("mensagem do menu");
  await pMenu.locator("[data-sala-chat-enviar]").click();
  const alvo = `[data-sala-mensagem="${await messageId(canalId, "mensagem do menu")}"]`;
  await pDono.locator(alvo).waitFor({ timeout: 15_000 });
  const foto = `${alvo} [data-sala-autor-foto="${t.menu.id}"] a[href^="/perfil/u/"]`;
  check("a mensagem do chat da sala vem com a foto de quem escreveu, e o mouse nela abre o mini perfil", (await pDono.locator(foto).count()) > 0 && (await abreMiniPerfil(pDono, foto)));
  // O botão direito no texto abre o menu da mensagem; no nome e na foto, o da pessoa.
  const texto = `${alvo} p`;
  const itens = await itensDoMenu(pDono, texto, "data-mensagem-menu");
  check("o dono vê copiar, perfil, apagar, banir e denunciar no menu da mensagem", ["mensagem-copiar", "mensagem-perfil", "mensagem-apagar", "mensagem-banir", "mensagem-denunciar"].every((i) => itens.includes(i)), itens.join(", "));
  await pDono.locator('[data-mensagem-menu="mensagem-copiar"]').click();
  const copiado = await waitFor(() => pDono.evaluate(() => navigator.clipboard.readText()).then((x) => x === "mensagem do menu", () => false), 5_000);
  check("copiar o texto pelo menu põe a mensagem na área de transferência", !!copiado);
  await itensDoMenu(pDono, texto, "data-mensagem-menu");
  const armou = await doisToques(pDono, '[data-mensagem-menu="mensagem-apagar"]');
  const sumiu = await waitFor(async () => (await pMenu.locator(alvo).count()) === 0, 15_000);
  check("apagar a mensagem pelo menu pede o segundo toque e some para todos", armou && !!sumiu);
}

async function denunciaNoPainel(t, check, pDono, pMenu, canalId) {
  const res = await s.apiPost(pMenu, `/api/sala/${canalId}/denuncias`, { userId: t.dono.id, motivo: "spam", detalhes: "e2e das fotos" });
  const admin = await pDono.context().newPage();
  s.instrument(admin, "menus-admin");
  try {
    await admin.goto(`${BASE}/admin/salas`);
    await admin.locator("[data-admin-denuncia-pessoas]").first().waitFor({ timeout: 60_000 });
    const fotos = await admin.locator(`[data-admin-denuncia-pessoas] a[href="/perfil/u/${t.menu.id}"]`).count();
    check("no painel das salas, a denúncia mostra a foto e o nome de quem denunciou, ligados ao perfil", res.status === 200 && fotos >= 2, `HTTP ${res.status}, ${fotos} ligação(ões)`);
  } finally {
    await admin.close().catch(() => null);
  }
}

async function expulsarEApagar(t, check, pDono, pMenu, canalId) {
  await itensDoMenu(pDono, `[data-sala-membro="${t.menu.id}"]`, "data-menu-acao");
  const armou = await doisToques(pDono, '[data-menu-acao="sala-expulsar"]');
  check("expulsar pelo menu pede o segundo toque e tira a pessoa da sala", armou && (await naPagina(pMenu, '[data-sala-fase="saiu"][data-sala-motivo="expulso"]', 15_000)));
  await itensDoMenu(pDono, `[data-canal="${canalId}"]`, "data-canal-menu");
  const armouCanal = await doisToques(pDono, '[data-canal-menu="canal-apagar"]');
  const sumiu = await waitFor(async () => (await pDono.locator(`[data-canal="${canalId}"]`).count()) === 0, 15_000);
  check("apagar o canal pelo menu pede o segundo toque e tira o canal da árvore", armouCanal && !!sumiu);
}

export async function menus(t, check, made) {
  const { id: canalId } = await s.createCanal(t.dono, { tipo: "palco", titulo: "Menus e2e", posicao: 40, modo: "palco", limite: 10 });
  made.rooms.push(canalId);
  const { id: destinoId } = await s.createCanal(t.dono, { tipo: "palco", titulo: "Mover e2e", posicao: 41, modo: "livre", limite: 10 });
  made.rooms.push(destinoId);
  const pDono = await s.enter(await t.ctx(t.dono), canalId, "menus-dono");
  await pDono.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const pMenu = await s.enter(await t.ctx(t.menu), canalId, "menus-plateia");
  try {
    await pessoa(t, check, pDono, pMenu);
    await canal(check, pDono, pMenu, canalId);
    await mover(t, check, pDono, pMenu, canalId, destinoId);
    await mensagem(t, check, pDono, pMenu, canalId);
    await denunciaNoPainel(t, check, pDono, pMenu, canalId);
    await expulsarEApagar(t, check, pDono, pMenu, canalId);
  } finally {
    for (const page of [pMenu, pDono]) await page.close().catch(() => null);
  }
}
