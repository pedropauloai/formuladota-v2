// Prova da tela fluida (pedido do PPA em 24/11/2026: transmitia em 1080p60 e quem assistia via travado).
// Dois Chromes sem janela no mesmo computador, no SFU de verdade: um transmite uma fonte de 60 quadros em
// 1920x1080 com movimento de jogo (a arte do Dota passando e peças andando), o outro assiste. Mede pela
// getStats dos dois lados, por 30 s: no envio, resolução, quadros, limite, codificador, codec e bitrate
// de cada camada; no recebimento, resolução, quadros por segundo, quadros perdidos e congelamentos.
// Passa com a mediana de quadros recebidos a partir de 50 por segundo, até 1 congelamento e a camada alta.
// Rodar: pnpm sala:tela   (SALA_E2E_PORT reaproveita um servidor local de pé; padrão 3200)

import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

process.env.LOJA_E2E_PORT = process.env.SALA_E2E_PORT ?? "3200";
const s = await import("./e2e-comum.mjs");
process.env.SALA_FLAG_KEY = s.E2E_FLAG;
const { waitFor, sleep } = s;

const MEDIR_S = 30;
const arte = readFileSync("public/dota/backgrounds/bg-07.jpg").toString("base64");
const made = { rooms: [], orders: [], users: [] };
const navegadores = [];
let server = null;

/** Guarda cada RTCPeerConnection da página para ler a getStats de fora. */
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

/** A tela compartilhada vira um jogo falso de 60 quadros: a arte passando de lado e peças andando. */
function telaDeJogo(b64) {
  const md = navigator.mediaDevices;
  const original = md.getDisplayMedia.bind(md);
  md.getDisplayMedia = async (pedido) => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 1920, height: 1080 });
    const g = canvas.getContext("2d");
    const img = new Image();
    img.src = `data:image/jpeg;base64,${b64}`;
    await img.decode();
    let quadro = 0;
    setInterval(() => {
      quadro += 1;
      const x = -((quadro * 6) % 1920);
      g.drawImage(img, x, 0, 1920, 1080);
      g.drawImage(img, x + 1920, 0, 1920, 1080);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `hsl(${(i * 37 + quadro) % 360} 80% 55%)`;
        g.beginPath();
        g.arc((i * 211 + quadro * (3 + (i % 5))) % 1920, (i * 97 + quadro * (2 + (i % 3))) % 1080, 14 + (i % 4) * 6, 0, Math.PI * 2);
        g.fill();
      }
    }, 1000 / 60);
    const stream = canvas.captureStream(60);
    if (pedido?.audio) {
      const falsa = await original(pedido).catch(() => null);
      falsa?.getVideoTracks().forEach((t) => t.stop());
      falsa?.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
    return stream;
  };
}

/** O vídeo de cada conexão da página: envio (por camada) e recebimento. */
const lerVideo = (page) =>
  page.evaluate(async () => {
    const linhas = [];
    for (const pc of window.__pcs ?? []) {
      const rel = await pc.getStats();
      const codecs = {};
      rel.forEach((x) => {
        if (x.type === "codec") codecs[x.id] = x.mimeType;
      });
      rel.forEach((x) => {
        if (x.kind !== "video") return;
        if (x.type === "outbound-rtp") linhas.push({ lado: "envio", rid: x.rid ?? "-", w: x.frameWidth, h: x.frameHeight, fps: x.framesPerSecond, quadros: x.framesEncoded, limite: x.qualityLimitationReason, cod: x.encoderImplementation, codec: codecs[x.codecId], alvo: x.targetBitrate, bytes: x.bytesSent });
        if (x.type === "inbound-rtp") linhas.push({ lado: "recebe", rid: "-", w: x.frameWidth, h: x.frameHeight, fps: x.framesPerSecond, quadros: x.framesDecoded, perdidos: x.framesDropped, congelou: x.freezeCount, congeladoS: x.totalFreezesDuration, cod: x.decoderImplementation, codec: codecs[x.codecId], bytes: x.bytesReceived });
      });
    }
    return linhas;
  });

async function preparar() {
  server = await s.startServer();
  await s.setFlag(true);
  const [dono, quem] = await Promise.all(["teladono", "telaquem"].map((n) => s.createUser(n, { admin: n === "teladono" })));
  made.users.push(dono, quem);
  const canal = await s.createCanal(dono, { tipo: "palco", titulo: "Tela e2e", posicao: 40, modo: "livre", limite: 5 });
  made.rooms.push(canal.id);
  const abrir = async (u, quem) => {
    const nav = await chromium.launch({ channel: "chrome", headless: true, args: s.CHROME_ARGS });
    navegadores.push(nav);
    const ctx = await s.buyerContext(nav, u, { desktop: true });
    await ctx.addInitScript(guardarConexoes);
    if (quem === "transmite") await ctx.addInitScript(telaDeJogo, arte);
    return s.enter(ctx, canal.id, quem);
  };
  return { transmite: await abrir(dono, "transmite"), assiste: await abrir(quem, "assiste") };
}

/** Quadros por segundo e kbps de verdade entre duas leituras (pelo total de quadros e de bytes). */
function ritmo(antes, agora, segundos) {
  return agora.map((l) => {
    const a = antes.find((x) => x.lado === l.lado && x.rid === l.rid);
    if (!a) return { ...l, fpsReal: null, kbps: null };
    return { ...l, fpsReal: Math.round(((l.quadros - a.quadros) / segundos) * 10) / 10, kbps: Math.round(((l.bytes - a.bytes) * 8) / segundos / 1000) };
  });
}

const mediana = (v) => {
  const o = [...v].sort((a, b) => a - b);
  return o.length ? o[Math.floor(o.length / 2)] : 0;
};

async function medir(p) {
  await p.transmite.locator('[data-sala-tela="compartilhar"]:not([disabled])').click({ timeout: 30_000 });
  await p.transmite.locator('[data-sala-qualidade="fluida"]').check();
  await p.transmite.locator("[data-sala-qualidade-confirmar]").click();
  const chegou = await waitFor(async () => (await s.attr(p.assiste, "data-video-altura")) > 0, 40_000);
  if (!chegou) throw new Error("a tela não chegou a quem assiste");
  await sleep(5_000);
  const amostras = [];
  let antes = [...(await lerVideo(p.transmite)), ...(await lerVideo(p.assiste))];
  for (let i = 0; i < MEDIR_S / 5; i++) {
    await sleep(5_000);
    const agora = [...(await lerVideo(p.transmite)), ...(await lerVideo(p.assiste))];
    amostras.push(ritmo(antes, agora, 5));
    antes = agora;
  }
  return amostras;
}

function relatar(amostras) {
  for (const [i, linhas] of amostras.entries()) {
    console.log(`\n${(i + 1) * 5} s`);
    for (const l of linhas) {
      const extra = l.lado === "envio" ? `limite ${l.limite}, alvo ${Math.round((l.alvo ?? 0) / 1000)} kbps` : `perdidos ${l.perdidos}, congelamentos ${l.congelou} (${Math.round((l.congeladoS ?? 0) * 10) / 10} s)`;
      console.log(`  ${l.lado.padEnd(6)} ${String(l.rid).padEnd(2)} ${l.w ?? "-"}x${l.h ?? "-"} ${String(l.fpsReal ?? "-").padStart(5)} quadros/s ${String(l.kbps ?? "-").padStart(6)} kbps  ${l.codec ?? "-"} ${l.cod ?? "-"}  ${extra}`);
    }
  }
  const recebe = amostras.flatMap((ls) => ls.filter((l) => l.lado === "recebe"));
  const fps = mediana(recebe.map((l) => l.fpsReal ?? 0));
  const congelou = recebe.length ? (recebe.at(-1).congelou ?? 0) - (recebe[0].congelou ?? 0) : 99;
  const alta = recebe.filter((l) => (l.h ?? 0) >= 1000).length / Math.max(1, recebe.length);
  console.log(`\nQuem assiste: mediana de ${fps} quadros por segundo, ${congelou} congelamento(s) nos ${MEDIR_S} s, camada alta em ${Math.round(alta * 100)}% das leituras.`);
  return fps >= 50 && congelou <= 1 && alta >= 0.8;
}

try {
  const p = await preparar();
  const passou = relatar(await medir(p));
  console.log(passou ? "PASSOU  a tela chega fluida (a partir de 50 quadros por segundo, na camada alta)" : "FALHOU  a tela não chega fluida");
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
