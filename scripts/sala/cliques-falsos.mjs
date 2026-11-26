// Cliques falsos para o Chrome de teste (R21): o microfone de quem só mexe no mouse e no teclado, sem
// falar. Clique de mouse: 3 ms de ruído que some em 1 ms, e a soltura do botão 90 ms depois; tecla: 20 ms
// de ruído que some em 6 ms. Um golpe a cada 400 ms, alternando mouse e tecla, num laço de 4 s (WAV mono,
// 48 kHz), sempre igual (ruído de semente fixa).

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TAXA = 48_000;

function amostrasDeCliques() {
  const n = TAXA * 4;
  const amostras = new Float32Array(n);
  let semente = 12_345;
  const ruido = () => {
    semente = (semente * 1_103_515_245 + 12_345) & 0x7fffffff;
    return (semente / 0x7fffffff) * 2 - 1;
  };
  const golpe = (inicio, duracaoMs, someMs, amplitude) => {
    const fim = Math.min(n, inicio + Math.round((duracaoMs / 1000) * TAXA));
    for (let i = inicio; i < fim; i++) amostras[i] += amplitude * Math.exp(-(i - inicio) / ((someMs / 1000) * TAXA)) * ruido();
  };
  for (let k = 0; k < 10; k++) {
    const t = Math.round(k * 0.4 * TAXA);
    if (k % 2 === 0) {
      golpe(t, 3, 1, 0.8);
      golpe(t + Math.round(0.09 * TAXA), 3, 1, 0.6);
    } else golpe(t, 20, 6, 0.6);
  }
  return amostras;
}

function wav(caminho, amostras) {
  const n = amostras.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(TAXA, 24);
  b.writeUInt32LE(TAXA * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  amostras.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32_767), 44 + i * 2));
  writeFileSync(caminho, b);
}

/** Um Chrome cujo microfone só tem cliques de mouse e de tecla. */
export async function chromeQueClica(chromium, args) {
  const caminho = join(tmpdir(), "formuladota-e2e-cliques.wav");
  wav(caminho, amostrasDeCliques());
  return chromium.launch({ channel: "chrome", headless: true, args: [...args, `--use-file-for-fake-audio-capture=${caminho}`] });
}
