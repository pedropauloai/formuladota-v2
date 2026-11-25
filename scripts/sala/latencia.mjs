// Prova da latência da voz, de ponta a ponta (pergunta do PPA em 24/11/2026: "a latência da voz também tá
// boa? Como é que a gente consegue provar isso?"). O "atraso" da tela da sala é a ida e volta até o SFU,
// não o tempo da boca ao ouvido. Aqui: dois Chromes sem janela no mesmo computador (o mesmo relógio), no
// SFU de produção do Cloudflare Realtime. Quem fala tem um áudio falso de cliques (um por segundo); cada
// clique é marcado na saída do microfone de quem fala e na faixa recebida de quem escuta, e a diferença é
// o atraso. Mede 60 cliques e mostra mediana e p95, com o RTT e o buffer de jitter da getStats. Referência:
// ITU-T G.114, até 150 ms de uma ponta à outra para conversa sem incômodo. Passa com o p95 até 150 ms.
// Rodar: pnpm sala:latencia   (SALA_E2E_PORT reaproveita um servidor local de pé; padrão 3200)

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
process.env.SALA_FLAG_KEY = s.E2E_FLAG;
const { waitFor, sleep } = s;

const CLIQUES = 61;
const LIMITE_P95_MS = 150;
const made = { rooms: [], orders: [], users: [] };
const navegadores = [];
let server = null;

/** Um clique por segundo: 20 ms de um tom de 1 kHz com começo seco, em silêncio (WAV mono, 48 kHz). */
function wavDeCliques(caminho) {
  const taxa = 48_000;
  const n = taxa * (CLIQUES + 1);
  const wav = Buffer.alloc(44 + n * 2);
  const dur = Math.round(0.02 * taxa);
  for (let c = 0; c < CLIQUES; c++) {
    const ini = Math.round((0.5 + c) * taxa);
    for (let i = 0; i < dur; i++) {
      const fim = Math.min(1, (dur - i) / 96);
      wav.writeInt16LE(Math.round(0.8 * fim * 32767 * Math.sin((2 * Math.PI * 1000 * i) / taxa)), 44 + (ini + i) * 2);
    }
  }
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(taxa, 24);
  wav.writeUInt32LE(taxa * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(n * 2, 40);
  writeFileSync(caminho, wav);
}

/** Guarda cada RTCPeerConnection da página para ler as faixas e a getStats de fora. */
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

/** Escuta uma faixa pelo WebAudio e anota a hora (relógio do computador, em ms) do começo de cada clique.
 *  O mesmo caminho dos dois lados: o atraso da própria escuta se anula na diferença. */
const escutar = (page, lado) =>
  page.evaluate(async (ladoDaFaixa) => {
    // Envio: a faixa do microfone publicada; recebe: a faixa de quem fala (o transceptor de só receber,
    // não o receptor vazio do próprio microfone).
    const faixas = window.__pcs.flatMap((pc) => pc.getTransceivers()).filter((t) => (ladoDaFaixa === "envio" ? t.currentDirection === "sendonly" : t.currentDirection === "recvonly"));
    const faixa = faixas.map((t) => (ladoDaFaixa === "envio" ? t.sender.track : t.receiver.track)).find((t) => t?.kind === "audio");
    if (!faixa) throw new Error(`sem faixa de áudio no ${ladoDaFaixa}`);
    const ctx = new AudioContext();
    await ctx.resume();
    const codigo = `class Cliques extends AudioWorkletProcessor {
      constructor() { super(); this.quieto = 0; }
      process(inputs) {
        const canal = inputs[0]?.[0];
        if (!canal) return true;
        for (let i = 0; i < canal.length; i++) {
          const v = Math.abs(canal[i]);
          if (v > 0.05 && this.quieto > 9600) { this.port.postMessage(currentFrame + i); this.quieto = 0; }
          else if (v < 0.01) this.quieto++;
        }
        return true;
      }
    }
    registerProcessor("cliques", Cliques);`;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([codigo], { type: "application/javascript" })));
    const no = new AudioWorkletNode(ctx, "cliques");
    window.__cliques = [];
    no.port.onmessage = (e) => {
      // A hora do quadro do clique: agora, menos o que o quadro já ficou para trás no relógio do áudio.
      const atraso = (ctx.currentTime - e.data / ctx.sampleRate) * 1000;
      window.__cliques.push(performance.timeOrigin + performance.now() - atraso);
    };
    ctx.createMediaStreamSource(new MediaStream([faixa])).connect(no);
    window.__ctxCliques = ctx;
  }, lado);

const lerCliques = (page) => page.evaluate(() => window.__cliques ?? []);

/** A getStats de quem escuta: buffer de jitter médio, perda e RTT até o SFU (dos dois lados). */
const lerStats = (page) =>
  page.evaluate(async () => {
    const r = { bufferMs: null, perdidos: null, recebidos: null, rttMs: null };
    for (const pc of window.__pcs) {
      (await pc.getStats()).forEach((x) => {
        if (x.type === "inbound-rtp" && x.kind === "audio" && x.jitterBufferEmittedCount) {
          r.bufferMs = Math.round((x.jitterBufferDelay / x.jitterBufferEmittedCount) * 1000);
          r.perdidos = x.packetsLost;
          r.recebidos = x.packetsReceived;
        }
        if (x.type === "candidate-pair" && x.nominated && x.currentRoundTripTime !== undefined) r.rttMs = Math.round(x.currentRoundTripTime * 1000);
      });
    }
    return r;
  });

async function preparar() {
  server = await s.startServer();
  await s.setFlag(true);
  const [fala, escuta] = await Promise.all(["latfala", "latescuta"].map((n) => s.createUser(n)));
  made.users.push(fala, escuta);
  const dono = await s.createUser("latdono", { admin: true });
  made.users.push(dono);
  const canal = await s.createCanal(dono, { tipo: "palco", titulo: "Latência e2e", posicao: 60, modo: "livre", limite: 5 });
  made.rooms.push(canal.id);
  const wav = join(tmpdir(), "formuladota-e2e-cliques.wav");
  wavDeCliques(wav);
  const abrir = async (u, quem, args) => {
    const nav = await chromium.launch({ channel: "chrome", headless: true, args });
    navegadores.push(nav);
    const ctx = await s.buyerContext(nav, u, { desktop: true });
    await ctx.addInitScript(guardarConexoes);
    return s.enter(ctx, canal.id, quem);
  };
  // Quem escuta entra primeiro: os cliques do arquivo começam quando o microfone de quem fala abre.
  const pEscuta = await abrir(escuta, "escuta", s.CHROME_ARGS);
  await pEscuta.locator('[data-sala-mudo="nao"]').click({ timeout: 30_000 }).catch(() => null);
  const pFala = await abrir(fala, "fala", [...s.CHROME_ARGS, `--use-file-for-fake-audio-capture=${wav}`]);
  return { pFala, pEscuta };
}

const quantil = (v, q) => {
  const o = [...v].sort((a, b) => a - b);
  return o.length ? o[Math.min(o.length - 1, Math.floor(q * o.length))] : null;
};

/** Cada clique recebido casa com o último enviado antes dele (os cliques ficam a 1 s um do outro). */
function parear(envio, recebe) {
  const atrasos = [];
  for (const t of recebe) {
    const antes = envio.filter((e) => e <= t && t - e < 800);
    if (antes.length) atrasos.push(Math.round(t - antes[antes.length - 1]));
  }
  return atrasos;
}

try {
  const { pFala, pEscuta } = await preparar();
  const chega = await waitFor(async () => (await s.attr(pEscuta, "data-audio-bytes")) > 0, 40_000);
  if (!chega) throw new Error("o áudio de quem fala não chegou a quem escuta");
  await Promise.all([escutar(pFala, "envio"), escutar(pEscuta, "recebe")]);
  await sleep(CLIQUES * 1000);
  const [envio, recebe, stats] = await Promise.all([lerCliques(pFala), lerCliques(pEscuta), lerStats(pEscuta)]);
  const atrasos = parear(envio, recebe);
  const mediana = quantil(atrasos, 0.5);
  const p95 = quantil(atrasos, 0.95);
  console.log(`cliques: ${envio.length} saíram do microfone, ${recebe.length} chegaram, ${atrasos.length} casados`);
  console.log(`atraso de ponta a ponta: mediana ${mediana} ms, p95 ${p95} ms (mínimo ${Math.min(...atrasos)}, máximo ${Math.max(...atrasos)})`);
  console.log(`na ordem dos cliques: ${atrasos.join(" ")}`);
  console.log(`getStats de quem escuta: buffer de jitter ${stats.bufferMs} ms, RTT até o SFU ${stats.rttMs} ms, pacotes perdidos ${stats.perdidos} de ${stats.recebidos}`);
  console.log(`referência ITU-T G.114: até ${LIMITE_P95_MS} ms de uma ponta à outra`);
  const passou = atrasos.length >= 50 && p95 !== null && p95 <= LIMITE_P95_MS;
  console.log(passou ? `PASSOU  a voz chega em até ${LIMITE_P95_MS} ms (p95)` : "FALHOU  a voz passa do limite ou cliques demais se perderam");
  if (!passou) process.exitCode = 1;
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.log(s.diagnostico.slice(-30).join(String.fromCharCode(10)));
  process.exitCode = 1;
} finally {
  for (const nav of navegadores) await nav.close().catch(() => null);
  await sleep(500);
  await s.dropFlag().catch(() => null);
  await s.cleanup(made).catch((e) => console.error("limpeza:", e.message));
  s.stopServer(server);
}
