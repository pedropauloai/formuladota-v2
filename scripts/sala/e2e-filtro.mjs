// Parte do filtro do microfone do e2e (R21, pedido do PPA em 26/11/2026: o microfone de todos "está
// capturando até o clique do mouse"): a voz de quem entra passa pelo RNNoise e pela porta de ruído; o
// clique do mouse e a tecla, num microfone que só tem isso (cliques-falsos.mjs), não chegam a quem ouve;
// sem o filtro (redução desligada e régua no mínimo, a porta sempre aberta) os mesmos cliques chegam, o
// que prova que a medida enxerga o clique. A medida é a energia do som recebido pela getStats de quem
// ouve. O atraso que o filtro soma à voz, medido na página: a fala falsa entra no RNNoise e na porta, e o
// atraso é o deslocamento em que a saída mais se parece com a entrada. E o custo: com 5 pessoas falando
// na sala, o processador gasto com o RNNoise ligado e desligado.

import { chromium } from "playwright-core";
import { chromeQueClica } from "./cliques-falsos.mjs";
import { chromeQueFala } from "./fala-falsa.mjs";

const s = await import("./e2e-comum.mjs");
const { sleep } = s;

/** Energia média recebida para dizer que o clique chegou (sem o filtro) e que não chegou (com ele). */
const CHEGOU = 1e-5;
const SILENCIO = 1e-6;
/** O RNNoise de cada pessoa pode gastar até 15% de um núcleo: num processador de 6 a 8 núcleos, uns 2% do total,
 *  com o Dota aberto. Pega regressão grossa (processador de áudio que não é liberado, RNNoise em dobro); as medidas
 *  de 26/11/2026 deram 5,6% e 7,8% por pessoa (a medida oscila de uma rodada para outra). */
const CPU_POR_PESSOA = 0.15;
/** O filtro pode somar até 40 ms à voz: o quadro do RNNoise e o encaixe dele nos quadros do navegador (uns
 *  21 ms) e o olhar à frente da porta (16 ms, para a primeira palavra depois do silêncio não perder o começo). */
const ATRASO_MAX_MS = 40;

const naPagina = async (page, sel, ms = 20_000) => !!(await page.locator(sel).first().waitFor({ timeout: ms }).then(() => true).catch(() => false));

function guardarConexoes() {
  const Original = window.RTCPeerConnection;
  window.__pcs = [];
  window.RTCPeerConnection = class extends Original {
    constructor(...args) {
      super(...args);
      window.__pcs.push(this);
    }
  };
}

/** Potência média do som recebido durante `ms` (totalAudioEnergy sobre totalSamplesDuration da getStats). */
const potenciaRecebida = (page, ms) =>
  page.evaluate(async (ms) => {
    const ler = async () => {
      let energia = 0;
      let duracao = 0;
      for (const pc of window.__pcs ?? []) {
        if (pc.connectionState === "closed") continue;
        (await pc.getStats()).forEach((r) => {
          if (r.type !== "inbound-rtp" || r.kind !== "audio") return;
          energia += r.totalAudioEnergy ?? 0;
          duracao += r.totalSamplesDuration ?? 0;
        });
      }
      return { energia, duracao };
    };
    const a = await ler();
    await new Promise((ok) => setTimeout(ok, ms));
    const b = await ler();
    const d = b.duracao - a.duracao;
    return d > 0 ? (b.energia - a.energia) / d : -1;
  }, ms);

/** A régua de quem clica a cada 50 ms durante `ms`, com a engrenagem aberta: quantas vezes a porta estava aberta,
 *  o maior nível e a maior probabilidade de fala que o RNNoise deu. */
async function amostrarPorta(page, ms) {
  await page.locator("[data-sala-config-abrir]").click();
  await page.locator("[data-sala-porta]").waitFor({ timeout: 10_000 });
  const r = await page.evaluate(
    (ms) =>
      new Promise((ok) => {
        const a = { amostras: 0, aberta: 0, nivel: -100, fala: -1, corridas: [] };
        const olhar = window.setInterval(() => {
          const el = document.querySelector("[data-sala-porta]");
          if (!el) return;
          a.amostras++;
          if (el.getAttribute("data-sala-porta") === "aberta") a.aberta++;
          a.nivel = Math.max(a.nivel, Number(el.getAttribute("data-sala-config-nivel")));
          const f = el.getAttribute("data-sala-porta-fala");
          if (f) a.fala = Math.max(a.fala, Number(f));
          const c = Number(el.getAttribute("data-sala-porta-corrida"));
          if (c > 0) a.corridas.push(c);
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(olhar);
          ok(a);
        }, ms);
      }),
    ms
  );
  await page.locator("[data-sala-config-fechar]").click();
  return r;
}

/** Abre a engrenagem e muda o filtro: sem a redução de ruído e, se pedido, com a régua no mínimo. */
async function mudarFiltro(page, { reguaNoMinimo }) {
  await page.locator("[data-sala-config-abrir]").click();
  await page.locator("[data-sala-config-voz]").waitFor({ timeout: 10_000 });
  await page.locator("[data-sala-config-ruido]").uncheck();
  if (reguaNoMinimo) {
    await page.locator("[data-sala-config-auto]").uncheck();
    await page.locator("[data-sala-config-regua]").fill("-80");
  }
  await page.locator("[data-sala-config-fechar]").click();
}

const fmt = (x) => x.toExponential(1);

/** O atraso do filtro, em ms: 2 s de fala falsa pelo RNNoise e pela porta (no automático), em tempo real. */
const atrasoDoFiltro = (page) =>
  page.evaluate(async () => {
    const taxa = 48_000;
    const n = taxa * 2;
    const fala = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = i % 14_880;
      const env = k < 10_560 ? Math.min(1, k / 960, (10_560 - k) / 960) : 0;
      const w = (2 * Math.PI * [180, 240, 300][Math.floor(i / 14_880) % 3] * i) / taxa;
      fala[i] = env * 0.4 * (0.5 * Math.sin(w) + 0.25 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w));
    }
    const gravador = `class G extends AudioWorkletProcessor { constructor(){ super(); this.a=[]; this.b=[]; this.port.onmessage=()=>this.port.postMessage([this.a,this.b]); }
      process(i){ const x=i[0]?.[0], y=i[1]?.[0]; if(x&&y&&this.a.length<200000){ this.a.push(...x); this.b.push(...y); } return true; } } registerProcessor("gravador-atraso", G);`;
    const ctx = new AudioContext({ sampleRate: taxa });
    await ctx.audioWorklet.addModule("/voz/rnnoise-0.4.2/workletProcessor.js");
    await ctx.audioWorklet.addModule("/voz/porta-voz.js");
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([gravador], { type: "application/javascript" })));
    const wasm = await (await fetch("/voz/rnnoise-0.4.2/rnnoise.wasm")).arrayBuffer();
    const rn = new AudioWorkletNode(ctx, "@sapphi-red/web-noise-suppressor/rnnoise", { processorOptions: { maxChannels: 1, wasmBinary: wasm } });
    const porta = new AudioWorkletNode(ctx, "porta-de-voz", { outputChannelCount: [1] });
    const g = new AudioWorkletNode(ctx, "gravador-atraso", { numberOfInputs: 2 });
    await new Promise((ok) => setTimeout(ok, 500));
    const buf = ctx.createBuffer(1, n, taxa);
    buf.copyToChannel(fala, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g, 0, 0);
    src.connect(rn).connect(porta).connect(g, 0, 1);
    g.connect(ctx.destination);
    src.start();
    await new Promise((ok) => setTimeout(ok, 2_400));
    const [a, b] = await new Promise((ok) => {
      g.port.onmessage = (e) => ok(e.data);
      g.port.postMessage(0);
    });
    await ctx.close();
    let melhor = -Infinity;
    let atraso = -1;
    for (let lag = 0; lag < taxa * 0.06; lag++) {
      let soma = 0;
      for (let i = taxa * 0.5; i + lag < a.length; i += 3) soma += a[i] * b[i + lag];
      if (soma > melhor) {
        melhor = soma;
        atraso = lag;
      }
    }
    return melhor > 0 ? (atraso / taxa) * 1000 : -1;
  });

async function cliques(t, check, canal) {
  const navC = await chromeQueClica(chromium, s.CHROME_ARGS);
  try {
    const pC = await s.enter(await s.buyerContext(navC, t.pessoas[0], { desktop: true }), canal.id, "filtro-clica");
    const ctxO = await t.ctx(t.pessoas[1]);
    await ctxO.addInitScript(guardarConexoes);
    const pO = await s.enter(ctxO, canal.id, "filtro-ouve");
    // Quem ouve fica mudo: só o som de quem clica chega a ele.
    await pO.locator('[data-sala-mudo="nao"]').click();
    check("a voz de quem entra passa pelo filtro do microfone: RNNoise e porta de ruído", await naPagina(pC, '[data-sala-filtro="rnnoise"]', 30_000));
    await sleep(3_000);
    const [comFiltro, porta] = await Promise.all([potenciaRecebida(pO, 8_000), amostrarPorta(pC, 8_000)]);
    await mudarFiltro(pC, { reguaNoMinimo: true });
    const saiu = await naPagina(pC, '[data-sala-filtro="porta"]', 10_000);
    await sleep(2_000);
    const semFiltro = await potenciaRecebida(pO, 8_000);
    const detalhe = `${fmt(comFiltro)} com o filtro, ${fmt(semFiltro)} sem ele; porta aberta em ${porta.aberta} de ${porta.amostras} olhadas, nível até ${porta.nivel} dB, fala até ${porta.fala}%, sequências de voz ${[...new Set(porta.corridas)].sort((x, y) => y - x).slice(0, 8).join(" ")}`;
    check("com o filtro, o clique do mouse e a tecla não chegam a quem ouve", comFiltro >= 0 && comFiltro < SILENCIO, detalhe);
    check("sem o filtro (redução desligada e régua no mínimo), os mesmos cliques chegam: a medida vê o clique", saiu && semFiltro > CHEGOU, detalhe);
    const atraso = await atrasoDoFiltro(pC);
    check(`o filtro soma até ${ATRASO_MAX_MS} ms ao atraso da voz`, atraso > 0 && atraso <= ATRASO_MAX_MS, `${Math.round(atraso * 10) / 10} ms`);
  } finally {
    await navC.close().catch(() => null);
  }
}

/** Núcleos do processador em uso, em média, por todo o Chrome durante `ms`. */
async function cpuDe(cdp, ms) {
  const soma = async () => (await cdp.send("SystemInfo.getProcessInfo")).processInfo.reduce((t, p) => t + p.cpuTime, 0);
  const a = await soma();
  const inicio = Date.now();
  await sleep(ms);
  return ((await soma()) - a) / ((Date.now() - inicio) / 1000);
}

async function custo(t, check, canal) {
  const nav = await chromeQueFala(chromium, s.CHROME_ARGS);
  try {
    const paginas = [];
    for (const [i, p] of t.pessoas.entries()) paginas.push(await s.enter(await s.buyerContext(nav, p, { desktop: true }), canal.id, `filtro-cpu-${i}`));
    const todas = async (estado) => (await Promise.all(paginas.map((p) => naPagina(p, `[data-sala-filtro="${estado}"]`, 30_000)))).every(Boolean);
    const ligado = (await todas("rnnoise")) ? (await sleep(3_000), await cpuDe(await nav.newBrowserCDPSession(), 15_000)) : -1;
    for (const p of paginas) await mudarFiltro(p, { reguaNoMinimo: false });
    const desligado = (await todas("porta")) ? (await sleep(3_000), await cpuDe(await nav.newBrowserCDPSession(), 15_000)) : -1;
    const porPessoa = (ligado - desligado) / paginas.length;
    const pct = (x) => `${Math.round(x * 1000) / 10}%`;
    check(
      `com ${paginas.length} pessoas falando, o RNNoise de cada uma gasta até ${pct(CPU_POR_PESSOA)} de um núcleo`,
      ligado > 0 && desligado > 0 && porPessoa < CPU_POR_PESSOA,
      `Chrome inteiro: ${pct(ligado)} de um núcleo com o RNNoise, ${pct(desligado)} sem ele; ${pct(porPessoa)} por pessoa`
    );
  } finally {
    await nav.close().catch(() => null);
  }
}

export async function filtro(t, check, made) {
  const nomes = ["filtro1", "filtro2", "filtro3", "filtro4", "filtro5"];
  const pessoas = await Promise.all(nomes.map((n) => s.createUser(n, { admin: false, adult: true })));
  made.users.push(...pessoas);
  const canal = await s.createCanal(t.dono, { tipo: "palco", titulo: "Filtro e2e", posicao: 35, modo: "livre", limite: 6 });
  made.rooms.push(canal.id);
  const comPessoas = { ...t, pessoas };
  await cliques(comPessoas, check, canal);
  await sleep(1_000);
  await custo(comPessoas, check, canal);
}
