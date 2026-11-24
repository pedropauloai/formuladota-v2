// A voz de quem pode falar: liga o microfone e publica quando a pessoa passa a poder falar (entrou como
// dono ou membro, foi chamada ao palco, foi liberada pelo dono) e solta quando deixa de poder (o
// servidor já cortou a faixa no SFU). Mutar só zera o som: o SFU descarta faixa sem pacote por 30 s.

import type { Connection, TrackRef } from "./conexao";
import { getMicTrack } from "./midia";
import type { NivelDeVoz } from "./nivel-voz";

export class VozLocal {
  private mic: MediaStreamTrack | null = null;
  private stop: (() => void) | null = null;
  private ligando = false;

  constructor(
    private readonly conn: Connection,
    private readonly nivel: NivelDeVoz | null,
    private readonly rotular: (ref: TrackRef) => void
  ) {}

  get noAr(): boolean {
    return this.stop !== null;
  }

  /** Deixa a voz no ar ou fora dele; devolve false se o navegador não liberou o microfone. */
  async ajustar(quer: boolean, mutado: boolean): Promise<boolean> {
    if (!quer) {
      this.desligar();
      return true;
    }
    if (this.stop || this.ligando) return true;
    this.ligando = true;
    try {
      this.mic = await getMicTrack();
      this.mic.enabled = !mutado;
      this.nivel?.watch("eu", this.mic);
      this.stop = this.conn.publish(this.mic, [{ maxBitrate: 64_000 }], this.rotular);
      return true;
    } catch {
      return false;
    } finally {
      this.ligando = false;
    }
  }

  setMutado(mutado: boolean): void {
    if (this.mic) this.mic.enabled = !mutado;
  }

  desligar(): void {
    this.stop?.();
    this.stop = null;
    this.mic?.stop();
    this.mic = null;
    this.nivel?.watch("eu", null);
  }
}
