// Parte da fala e dos aparelhos do e2e (pedido do PPA em 24/11/2026): o anel verde de quem fala acende
// para quem escuta (na árvore, no palco e no painel do canto), fica aceso sem piscar enquanto a pessoa fala
// sem parar, apaga quando ela muta e volta quando ela desmuta; e as configurações de voz trocam o microfone
// no meio da ligação (a mesma faixa no SFU, o áudio seguindo e o anel aceso com o microfone novo), mostram
// o nível no teste, mandam as vozes para a saída de som escolhida e valem de novo depois de recarregar; na
// página aberta fora da sala, listam os microfones e o teste funciona. Quem fala roda num Chrome à parte,
// com a fala falsa (fala-falsa.mjs).

import { chromium } from "playwright-core";
import { chromeQueFala } from "./fala-falsa.mjs";

const s = await import("./e2e-comum.mjs");
const { BASE, db, waitFor, sleep } = s;

const CONFIG = "formuladota:voz";

/** Anota cada saída de som pedida aos elementos de mídia (as vozes tocam em elementos fora da página). */
function espiarSaida() {
  const original = HTMLMediaElement.prototype.setSinkId;
  if (!original) return;
  window.__saidas = [];
  HTMLMediaElement.prototype.setSinkId = function (id) {
    window.__saidas.push(id);
    return original.call(this, id);
  };
}

const naPagina = async (page, sel, ms = 20_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));

/** O anel da pessoa aceso (ou apagado) naquele lugar da tela. */
const anel = async (page, sel, aceso, ms = 20_000) =>
  !!(await waitFor(async () => (await page.locator(`${sel}[data-sala-falando="${aceso ? "sim" : "nao"}"]`).count()) > 0, ms));

/** A fração do tempo em que o anel ficou aceso, olhando na própria página a cada 50 ms durante `ms`. */
const anelFirme = (page, sel, ms) =>
  page.evaluate(
    ({ sel, ms }) =>
      new Promise((ok) => {
        let acesas = 0;
        let vezes = 0;
        const olhar = window.setInterval(() => {
          vezes++;
          if (document.querySelector(sel)?.getAttribute("data-sala-falando") === "sim") acesas++;
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(olhar);
          ok(vezes ? acesas / vezes : 0);
        }, ms);
      }),
    { sel, ms }
  );

const guardado = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), CONFIG);

const emUso = (page) => page.locator("[data-sala-microfone-em-uso]").getAttribute("data-sala-microfone-em-uso", { timeout: 2_000 }).catch(() => null);

/** As opções de uma lista de aparelhos, depois que o navegador responde (além do "Padrão do sistema"). */
async function opcoesDe(page, sel) {
  await waitFor(async () => (await page.locator(`${sel} option`).count()) > 1, 10_000);
  return page.locator(`${sel} option`).evaluateAll((os) => os.map((o) => ({ valor: o.value, nome: o.textContent ?? "" })));
}

/** As faixas de voz abertas da pessoa no SFU (trocar o microfone mantém a mesma). */
async function faixasDeVoz(roomId, userId) {
  const sid = await s.openSessionOf(roomId, userId);
  if (!sid) return "";
  const { data } = await db.from("voice_room_tracks").select("track_name").eq("session_id", sid).eq("kind", "audio").eq("tipo", "voz").is("closed_at", null);
  return (data ?? []).map((x) => x.track_name).sort().join(",");
}

async function anelDeQuemFala(t, check, pA, pB) {
  const a = t.falante.id;
  check("na voz livre, quem fala entra com o microfone no ar", await naPagina(pA, '[data-sala-papel="falante"][data-sala-voz="no_ar"]', 30_000));
  const arvore = `[data-sala-membro="${a}"]`;
  const quadro = `[data-sala-quadro="${a}"]`;
  check("quando a pessoa fala, o anel verde acende para quem escuta, na árvore e no palco", (await anel(pB, arvore, true, 30_000)) && (await anel(pB, quadro, true, 5_000)));
  // 10 s cobrem o ciclo inteiro em que a medida de 300 ms escorrega pelas sílabas de 310 ms da fala falsa.
  const firme = await anelFirme(pB, arvore, 10_000);
  check("enquanto a pessoa fala sem parar, o anel fica aceso, sem piscar", firme >= 0.95, `aceso em ${Math.round(firme * 100)}% de 10 s`);
  // Quem escuta tem o microfone falso padrão do Chrome: um bipe de 20 ms a cada meio segundo, que o eco, o
  // ruído e o ganho automático do navegador esticam para uns 70 ms. É o tamanho de um estalo de tecla.
  const bipe = await anelFirme(pB, `[data-sala-membro="${t.escuta.id}"]`, 5_000);
  check("um estalo curto no microfone (o bipe do microfone falso) não acende o anel", bipe <= 0.05, `aceso em ${Math.round(bipe * 100)}% de 5 s`);
  await pA.locator('[data-sala-mudo="nao"]').click();
  check("quando ela muta, o anel apaga na árvore e no palco", (await anel(pB, arvore, false, 10_000)) && (await anel(pB, quadro, false, 5_000)));
  await pA.locator('[data-sala-mudo="sim"]').click();
  check("ao desmutar e voltar a falar, o anel acende de novo", await anel(pB, arvore, true, 20_000));
  await pB.locator('a[href="/party"]').first().click({ timeout: 20_000 });
  await pB.waitForURL((u) => new URL(u).pathname === "/party", { timeout: 60_000 });
  check("no painel de voz do canto, o rosto de quem fala acende do mesmo jeito", await anel(pB, `[data-painel-voz-lugar="canto"] [data-painel-voz-rosto="${a}"]`, true, 30_000));
  await pB.locator("[data-painel-voz-config]").click();
  await pB.locator("[data-sala-config-voz]").waitFor({ timeout: 10_000 });
  const microfones = (await opcoesDe(pB, "[data-sala-config-microfone]")).filter((o) => o.valor);
  check("a engrenagem do painel do canto abre as mesmas configurações, com os microfones", microfones.length > 0, `${microfones.length} microfone(s)`);
  await pB.locator("[data-sala-config-fechar]").click();
  await pB.locator("[data-painel-voz-voltar]").click();
  await pB.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 30_000 });
}

async function trocarMicrofone(t, check, canal, pA, pB) {
  const a = t.falante.id;
  await pA.locator("[data-sala-config-abrir]").click();
  await pA.locator("[data-sala-config-voz]").waitFor({ timeout: 10_000 });
  const antes = await waitFor(() => emUso(pA), 15_000);
  const opcoes = await opcoesDe(pA, "[data-sala-config-microfone]");
  const outro = opcoes.filter((o) => o.valor && o.nome !== antes).at(-1);
  check("as configurações de voz listam os microfones pelo nome e dizem qual está em uso", !!outro && !!antes, `${opcoes.map((o) => o.nome).join(" | ")}; em uso: ${antes}`);
  const faixaAntes = await faixasDeVoz(canal.id, a);
  const bytesAntes = await s.attr(pB, "data-audio-bytes");
  await pA.locator("[data-sala-config-microfone]").selectOption(outro.valor);
  const trocou = await waitFor(async () => (await emUso(pA)) === outro.nome, 15_000);
  check("escolher outro microfone troca na hora, sem sair da sala, e fica guardado", !!trocou && (await guardado(pA)).microfone === outro.valor, `em uso: ${await emUso(pA)}`);
  await sleep(2_000);
  const faixaDepois = await faixasDeVoz(canal.id, a);
  check("a troca usa a mesma faixa de voz no SFU (sem publicar de novo)", !!faixaAntes && faixaAntes === faixaDepois && !faixaDepois.includes(","), `${faixaAntes} -> ${faixaDepois}`);
  const segue = await waitFor(async () => (await s.attr(pB, "data-audio-bytes")) > bytesAntes, 20_000);
  const acende = await anel(pB, `[data-sala-membro="${a}"]`, true, 15_000);
  check("com o microfone novo, quem escuta segue recebendo e o anel acende", !!segue && acende, `${await s.attr(pB, "data-audio-bytes")} bytes`);
  return outro;
}

async function testeESaida(check, pA) {
  await pA.locator('[data-sala-config-testar="nao"]').click();
  const nivel = () => pA.locator("[data-sala-config-nivel]").getAttribute("data-sala-config-nivel").then(Number);
  check("o teste do microfone mostra o nível ao vivo", !!(await waitFor(async () => (await nivel()) > 0, 10_000)), `nível ${await nivel()}`);
  await pA.locator('[data-sala-config-testar="sim"]').click();
  const saidas = (await opcoesDe(pA, "[data-sala-config-saida]")).map((o) => o.valor).filter(Boolean);
  check("o Chrome lista as saídas de som para escolher", saidas.length > 0, `${saidas.length} saída(s)`);
  const saida = saidas.at(-1);
  await pA.locator("[data-sala-config-saida]").selectOption(saida);
  const foi = await waitFor(async () => (await pA.evaluate(() => window.__saidas ?? [])).includes(saida), 10_000);
  check("escolher a saída de som manda as vozes para ela, na hora", !!foi && (await guardado(pA)).saida === saida);
}

async function guardaNaVolta(check, pA, outro) {
  await pA.locator("[data-sala-config-fechar]").click();
  await pA.reload();
  // A página da sala recarregada volta sozinha para a ligação (o botão de entrar só pisca antes).
  await pA.locator('[data-sala-fase="na_sala"]').waitFor({ timeout: 60_000 });
  await pA.locator("[data-sala-config-abrir]").click();
  const mesmo = await waitFor(async () => (await emUso(pA)) === outro.nome, 20_000);
  const valor = await pA.locator("[data-sala-config-microfone]").inputValue({ timeout: 10_000 });
  check("a escolha vale de novo: depois de recarregar, a sala abre com o mesmo microfone", !!mesmo && valor === outro.valor, `em uso: ${await emUso(pA)}`);
  await pA.locator("[data-sala-config-fechar]").click();
}

/** Página recarregada fora da sala (no /party): o microfone vale no site inteiro, e as configurações funcionam. */
async function foraDaSala(check, pB) {
  await pB.goto(`${BASE}/party`);
  await pB.locator('[data-painel-voz="na_sala"]').waitFor({ timeout: 45_000 });
  await pB.locator("[data-painel-voz-config]").click();
  await pB.locator("[data-sala-config-voz]").waitFor({ timeout: 10_000 });
  const microfones = (await opcoesDe(pB, "[data-sala-config-microfone]")).filter((o) => o.valor);
  const testeLiberado = await pB.locator("[data-sala-config-testar]").isEnabled();
  check("na página recarregada fora da sala, as configurações listam os microfones e o teste funciona", microfones.length > 0 && testeLiberado, `${microfones.length} microfone(s)`);
  await pB.locator("[data-sala-config-fechar]").click();
}

export async function fala(t, check, made) {
  const canal = await s.createCanal(t.dono, { tipo: "palco", titulo: "Fala e2e", posicao: 30, modo: "livre", limite: 5 });
  made.rooms.push(canal.id);
  const navA = await chromeQueFala(chromium, s.CHROME_ARGS);
  try {
    const ctxA = await s.buyerContext(navA, t.falante, { desktop: true });
    await ctxA.addInitScript(espiarSaida);
    const pA = await s.enter(ctxA, canal.id, "fala-a");
    const pB = await s.enter(await t.ctx(t.escuta), canal.id, "fala-b");
    await anelDeQuemFala(t, check, pA, pB);
    const outro = await trocarMicrofone(t, check, canal, pA, pB);
    await testeESaida(check, pA);
    await guardaNaVolta(check, pA, outro);
    await foraDaSala(check, pB);
    await pB.close().catch(() => null);
  } finally {
    await navA.close().catch(() => null);
    await sleep(500);
  }
}
