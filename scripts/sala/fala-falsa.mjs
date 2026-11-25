// Fala falsa para o Chrome de teste: o bipe padrão do Chrome (--use-fake-device-for-media-stream) dura
// 20 ms a cada meio segundo e mal acende o anel de quem fala. No lugar, sílabas de 220 ms com 90 ms de
// pausa, em três alturas e com harmônicos (WAV mono, 48 kHz), que o Chrome repete sem parar. São 30
// sílabas inteiras (9,3 s): a volta não corta sílaba, e a medida da sala, a cada 300 ms, escorrega 10 ms
// por sílaba e passa por todas as posições dela, inclusive a pausa, em cada volta.

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function wavDeFala(caminho) {
  const taxa = 48_000;
  const ciclo = Math.round(0.31 * taxa);
  const n = ciclo * 30;
  const wav = Buffer.alloc(44 + n * 2);
  const silaba = Math.round(0.22 * taxa);
  for (let i = 0; i < n; i++) {
    const k = i % ciclo;
    const f = [180, 240, 300][Math.floor(i / ciclo) % 3];
    const envelope = k < silaba ? Math.min(1, k / 960, (silaba - k) / 960) : 0;
    const w = (2 * Math.PI * f * i) / taxa;
    const v = 0.5 * Math.sin(w) + 0.25 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w);
    wav.writeInt16LE(Math.round(envelope * 0.8 * 32767 * v), 44 + i * 2);
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

/** Um Chrome cuja voz é a fala falsa (os microfones falsos todos tocam o mesmo áudio). */
export async function chromeQueFala(chromium, args) {
  const wav = join(tmpdir(), "formuladota-e2e-fala.wav");
  wavDeFala(wav);
  return chromium.launch({ channel: "chrome", headless: true, args: [...args, `--use-file-for-fake-audio-capture=${wav}`] });
}
