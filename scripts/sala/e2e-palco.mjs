// Parte da sala pública do e2e (spec, seções 8, 9 e 11): plateia sem microfone, a tela na camada alta
// (a qualidade é de quem transmite) e sem botão de compartilhar para a plateia, mão levantada, chamar ao palco, mutar e liberar pelo dono, devolver à plateia, chat
// com ritmo e apagar, denúncia de mensagem e banir (que vale para as outras salas do dono).

const s = await import("./e2e-comum.mjs");
const { db, waitFor, sleep } = s;

async function telaECamada(t, check, pDono, pOuv) {
  check("quem chega entra na plateia, sem microfone", (await pOuv.locator('[data-sala-papel="ouvinte"][data-sala-voz="fora"]').count()) === 1);
  await pDono.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 20_000 });
  await pDono.locator('[data-sala-qualidade="leve"]').check();
  await pDono.locator("[data-sala-qualidade-confirmar]").click();
  const tela = await waitFor(async () => (await s.attr(pOuv, "data-video-bytes")) > 0 && (await s.attr(pOuv, "data-video-altura")) > 0, 40_000);
  check("a plateia recebe a tela do dono", !!tela, `${await s.attr(pOuv, "data-video-bytes")} bytes, ${await s.attr(pOuv, "data-video-altura")} px`);
  const alta = await waitFor(async () => (await s.videoLayerOf(t.palco.id, t.ouvinte.id)) === "f", 15_000);
  check("a plateia recebe a camada alta sem escolher nada (a qualidade é de quem transmite)", !!alta, String(await s.videoLayerOf(t.palco.id, t.ouvinte.id)));
  const ouve = await waitFor(async () => (await s.attr(pOuv, "data-audio-bytes")) > 0, 30_000);
  check("a plateia ouve o dono", !!ouve);
  const semEscolha = (await pOuv.locator("[data-sala-camada]").count()) === 0 && (await pOuv.locator('[data-sala-tela="compartilhar"]').count()) === 0;
  const sidOuvinte = await s.openSessionOf(t.palco.id, t.ouvinte.id);
  const direto = await s.tryPublish(pOuv, t.palco.id, sidOuvinte, "video", "tela-da-plateia");
  check("a plateia não escolhe leve ou alta nem compartilha a tela (nem pela API)", semEscolha && direto.status === 403 && direto.body.errorCode === "tela_nao_permitida", `HTTP ${direto.status} ${direto.body.errorCode}`);
  // Na live, o PPA para e volta a compartilhar: a plateia pede uma faixa nova no meio da conexão.
  await pDono.locator('[data-sala-tela="parar"]').click();
  await waitFor(async () => (await s.openVideoCount(t.palco.id, t.dono.id)) === 0, 15_000);
  await sleep(3000);
  await pDono.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 20_000 });
  await pDono.locator('[data-sala-qualidade="leve"]').check();
  await pDono.locator("[data-sala-qualidade-confirmar]").click();
  // A recepção nova aberta no banco (a medida da tela antiga continua nas estatísticas): até 60 s, que cobrem
  // a ligação refeita quando a renegociação mata a sessão do ouvinte no SFU.
  const deNovo = await waitFor(async () => (await s.openVideoCount(t.palco.id, t.dono.id)) === 1 && (await s.videoLayerOf(t.palco.id, t.ouvinte.id)) !== null, 60_000);
  check("o dono para e volta a compartilhar, e a plateia recebe a tela nova", !!deNovo, `camada ${await s.videoLayerOf(t.palco.id, t.ouvinte.id)}`);
  // Trocar a janela: a captura nova entra na mesma faixa; a plateia não pede faixa nova nem renegocia.
  const faixaAntes = await s.openVideoTrackName(t.palco.id, t.dono.id);
  const recepcoesAntes = await s.videoSubscriptionCount(t.palco.id, t.ouvinte.id);
  await sleep(5500);
  const bytesAntes = await s.attr(pOuv, "data-video-bytes");
  await pDono.locator('[data-sala-tela="trocar"]').click({ timeout: 20_000 });
  const segue = await waitFor(async () => (await s.attr(pOuv, "data-video-bytes")) > bytesAntes, 25_000);
  await sleep(3000);
  const mesma = (await s.openVideoTrackName(t.palco.id, t.dono.id)) === faixaAntes;
  const semNova = (await s.videoSubscriptionCount(t.palco.id, t.ouvinte.id)) === recepcoesAntes;
  check("trocar a janela mantém a mesma faixa, e a plateia segue recebendo sem pedir de novo", mesma && semNova && !!segue, `faixa ${mesma ? "igual" : "outra"}, recepção ${semNova ? "a mesma" : "nova"}`);
  const sid = await s.openSessionOf(t.palco.id, t.ouvinte.id);
  const voz = await s.tryPublish(pOuv, t.palco.id, sid, "audio", "voz-da-plateia");
  check("a plateia não publica voz pelo servidor", voz.status === 403 && voz.body.errorCode === "voz_nao_permitida", `HTTP ${voz.status} ${voz.body.errorCode}`);
}

/** Range do navegador: muda o valor como uma pessoa arrastando (o React ouve o evento input). */
async function arrastar(locator, valor) {
  await locator.evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, String(valor));
}

/** Tela cheia com o chat sobreposto, volume da tela, tecla F e volume de uma pessoa (vista da plateia). */
async function telaCheiaEVolumes(t, check, pOuv) {
  await pOuv.locator("[data-sala-tela-cheia-alternar]").click({ timeout: 20_000 });
  const cheia = await waitFor(async () => (await pOuv.locator('[data-sala-tela-cheia="sim"]').count()) > 0 && (await pOuv.evaluate(() => !!document.fullscreenElement)), 10_000);
  check("a tela vai para tela cheia, com o chat sobreposto", !!cheia && (await pOuv.locator("[data-sala-chat-sobreposto]").count()) === 1);
  await pOuv.locator('[data-sala-chat-sobreposto-alternar="esconder"]').click();
  const escondeu = (await pOuv.locator("[data-sala-chat-sobreposto]").count()) === 0;
  await pOuv.locator('[data-sala-chat-sobreposto-alternar="mostrar"]').click();
  check("o chat sobreposto se esconde e volta", escondeu && (await pOuv.locator("[data-sala-chat-sobreposto]").count()) === 1);
  await arrastar(pOuv.locator("[data-sala-volume-tela]"), 0.3);
  const volume = await pOuv.evaluate(() => document.querySelector("[data-sala-palco] video")?.volume ?? -1);
  check("o volume da tela muda o som da tela", Math.abs(volume - 0.3) < 0.01, String(volume));
  await pOuv.locator("[data-sala-tela-cheia-alternar]").click();
  const saiu = await waitFor(async () => (await pOuv.locator('[data-sala-tela-cheia="nao"]').count()) > 0, 10_000);
  await pOuv.locator("body").click({ position: { x: 5, y: 5 } });
  await pOuv.keyboard.press("f");
  const peloF = await waitFor(async () => (await pOuv.locator('[data-sala-tela-cheia="sim"]').count()) > 0, 10_000);
  await pOuv.keyboard.press("c");
  const semChat = await waitFor(async () => (await pOuv.locator("[data-sala-chat-sobreposto]").count()) === 0, 5_000);
  await pOuv.keyboard.press("c");
  const comChat = await waitFor(async () => (await pOuv.locator("[data-sala-chat-sobreposto]").count()) === 1, 5_000);
  check("na tela cheia, a tecla C esconde e mostra o chat", !!semChat && !!comChat);
  await pOuv.keyboard.press("f");
  const voltouPeloF = await waitFor(async () => (await pOuv.locator('[data-sala-tela-cheia="nao"]').count()) > 0, 10_000);
  check("sai da tela cheia pelo botão, e a tecla F entra e sai", !!saiu && !!peloF && !!voltouPeloF);
  await pOuv.locator(`[data-sala-volume-abrir="${t.dono.id}"]`).click({ timeout: 15_000 });
  await arrastar(pOuv.locator(`[data-sala-volume-de="${t.dono.id}"]`), 0.5);
  const guardado = await pOuv.evaluate((id) => JSON.parse(localStorage.getItem("formuladota:volumes") ?? "{}")[id], t.dono.id);
  check("o volume de uma pessoa abre no clique do nome e fica guardado no navegador", guardado === 0.5, String(guardado));
  await pOuv.locator('[data-sala-chat-coluna-alternar="esconder"]').click();
  const escondida = await waitFor(async () => (await pOuv.locator("[data-sala-chat-coluna]").count()) === 0, 5_000);
  await pOuv.locator('[data-sala-chat-coluna-alternar="mostrar"]').click();
  const deVolta = await waitFor(async () => (await pOuv.locator("[data-sala-chat-coluna]").count()) === 1, 5_000);
  check("a coluna do chat se esconde e volta pela barra", !!escondida && !!deVolta);
}

async function palcoEModeracao(t, check, pDono, pOuv) {
  await pOuv.locator('[data-sala-mao="nao"]').click();
  const mao = await waitFor(async () => (await pDono.locator(`[data-sala-membro="${t.ouvinte.id}"][data-sala-mao-membro="sim"]`).count()) > 0, 15_000);
  check("o dono vê a mão levantada", !!mao);
  await pDono.locator(`[data-sala-chamar="${t.ouvinte.id}"]`).click();
  const fala = await waitFor(async () => (await pOuv.locator('[data-sala-papel="falante"][data-sala-voz="no_ar"]').count()) > 0, 25_000);
  check("chamado ao palco, quem estava na plateia fala", !!fala);
  const donoOuve = await waitFor(async () => (await s.attr(pDono, "data-audio-bytes")) > 0, 30_000);
  check("o dono ouve quem chamou", !!donoOuve);
  await pDono.locator(`[data-sala-mutar="${t.ouvinte.id}"]`).click();
  const cortada = await waitFor(async () => (await s.openVoiceCount(t.palco.id, t.ouvinte.id)) === 0, 15_000);
  check("mutar pelo dono fecha a voz no SFU", !!cortada);
  const sid = await s.openSessionOf(t.palco.id, t.ouvinte.id);
  const nova = await s.tryPublish(pOuv, t.palco.id, sid, "audio", "voz-mutada");
  check("mutado pelo dono, o servidor recusa voz nova", nova.status === 403 && nova.body.errorCode === "mutado_pelo_dono", `HTTP ${nova.status} ${nova.body.errorCode}`);
  await pDono.locator(`[data-sala-mutar="${t.ouvinte.id}"]`).click();
  const volta = await waitFor(async () => (await s.openVoiceCount(t.palco.id, t.ouvinte.id)) === 1, 25_000);
  check("liberado pelo dono, a voz volta sozinha", !!volta);
  await pDono.locator(`[data-sala-devolver="${t.ouvinte.id}"]`).click();
  const plateia = await waitFor(async () => (await pOuv.locator('[data-sala-papel="ouvinte"][data-sala-voz="fora"]').count()) > 0, 25_000);
  check("devolvido à plateia, a voz sai do ar", !!plateia);
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

async function chat(t, check, pDono, pOuv) {
  await pOuv.locator("[data-sala-chat-campo]").fill("oi do e2e");
  await pOuv.locator("[data-sala-chat-enviar]").click();
  const chegou = await waitFor(async () => (await pDono.getByText("oi do e2e").count()) > 0, 15_000);
  check("a mensagem da plateia chega ao dono", !!chegou);
  // O ritmo se prova com dois pedidos colados: a chegada ao dono pode passar de 2 s (estado guardado 3 s).
  await sleep(2100);
  const primeira = await s.apiPost(pOuv, `/api/sala/${t.palco.id}/chat`, { texto: "ritmo um" });
  const rapida = await s.apiPost(pOuv, `/api/sala/${t.palco.id}/chat`, { texto: "de novo já" });
  check("o chat recusa mais de uma mensagem a cada 2 s", primeira.status === 200 && rapida.status === 403 && rapida.body.errorCode === "devagar", `HTTP ${primeira.status}, depois HTTP ${rapida.status} ${rapida.body.errorCode}`);
  const id = await messageId(t.palco.id, "oi do e2e");
  await pDono.locator(`[data-sala-apagar="${id}"]`).click();
  const sumiu = await waitFor(async () => (await pOuv.getByText("oi do e2e").count()) === 0, 15_000);
  check("a mensagem apagada pelo dono some para todos", !!sumiu);
  await sleep(2100);
  await s.apiPost(pOuv, `/api/sala/${t.palco.id}/chat`, { texto: "antes do dono" });
  await pDono.locator("[data-sala-chat-campo]").fill("mensagem do dono");
  await pDono.locator("[data-sala-chat-enviar]").click();
  const naoSumiu = await waitFor(async () => (await pDono.getByText("antes do dono").count()) > 0, 15_000);
  check("a mensagem de outra pessoa logo antes da sua não some do seu chat", !!naoSumiu);
  const doDono = await messageId(t.palco.id, "mensagem do dono");
  await pOuv.locator(`[data-sala-denunciar-mensagem="${doDono}"]`).click({ timeout: 15_000 });
  await pOuv.locator("[data-sala-denuncia-enviar]").click();
  await pOuv.getByRole("status").filter({ hasText: "Denúncia enviada" }).waitFor({ timeout: 10_000 });
  const { data: rep } = await db.from("voice_room_reports").select("message_body, reported_id").eq("reporter_id", t.ouvinte.id).eq("message_id", doDono).maybeSingle();
  check("a denúncia de mensagem guarda o autor e a cópia do texto", rep?.message_body === "mensagem do dono" && rep?.reported_id === t.dono.id);
  await pOuv.keyboard.press("Escape");
}

async function banir(t, check, pDono) {
  const pOuv2 = await s.enter(await t.ctx(t.ouvinte2), t.palco.id, "ouvinte2");
  const semEntrar = await s.apiPost(pOuv2, `/api/sala/${t.palco2.id}/chat`, { texto: "sem entrar" });
  check("quem não entrou na sala não escreve no chat dela", semEntrar.status === 403 && semEntrar.body.errorCode === "fora_da_sala", `HTTP ${semEntrar.status} ${semEntrar.body.errorCode}`);
  const naOutra = await s.apiPost(pOuv2, `/api/sala/${t.palco2.id}/entrar`);
  check("o ouvinte entra também na outra sala aberta do dono", naOutra.status === 200, `HTTP ${naOutra.status} ${naOutra.body.errorCode ?? ""}`);
  await pOuv2.locator("[data-sala-chat-campo]").fill("mensagem para banir");
  await pOuv2.locator("[data-sala-chat-enviar]").click();
  const msg = await messageId(t.palco.id, "mensagem para banir");
  await pDono.locator(`[data-sala-banir-autor="${msg}"]`).click({ timeout: 20_000 });
  await s.confirmDialog(pDono);
  const saiu = await waitFor(async () => (await pOuv2.locator('[data-sala-fase="saiu"]').count()) > 0, 15_000);
  check("banido pela mensagem do chat, sai da sala na hora", !!saiu);
  const { data: fora } = await db.from("voice_room_members").select("status").eq("room_id", t.palco2.id).eq("user_id", t.ouvinte2.id).maybeSingle();
  check("o banido sai também da outra sala aberta do mesmo dono", fora?.status === "expulso", String(fora?.status));
  const outra = await s.apiPost(pOuv2, `/api/sala/${t.palco2.id}/entrar`);
  check("o banido não entra em outra sala do mesmo dono", outra.status === 403 && outra.body.errorCode === "banido", `HTTP ${outra.status} ${outra.body.errorCode}`);
}

export async function palco(t, check) {
  const pDono = await s.enter(await t.ctx(t.dono), t.palco.id, "dono-palco");
  const pOuv = await s.enter(await t.ctx(t.ouvinte), t.palco.id, "ouvinte");
  await telaECamada(t, check, pDono, pOuv);
  await telaCheiaEVolumes(t, check, pOuv);
  await palcoEModeracao(t, check, pDono, pOuv);
  await sleep(2100);
  await chat(t, check, pDono, pOuv);
  await banir(t, check, pDono);
  await pDono.locator('[data-sala-tela="parar"]').click().catch(() => null);
  return pDono;
}
