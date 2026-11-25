// A voz de quem pode falar: liga o microfone e publica quando a pessoa passa a poder falar (entrou como
// dono ou membro, foi chamada ao palco, foi liberada pelo dono) e solta quando deixa de poder (o
// servidor já cortou a faixa no SFU). Mutar só zera o som: o SFU descarta faixa sem pacote por 30 s.
// O mudo vale também para o microfone que ainda está abrindo, e quem sai da sala não deixa microfone aberto.

import type { Connection, TrackRef } from "./conexao";
import { getMicTrack } from "./midia";
import { falhaDoMicrofone, type EstadoMicrofone } from "./microfone";
import type { NivelDeVoz } from "./nivel-voz";

export class VozLocal {
  private mic: MediaStreamTrack | null = null;
  private stop: (() => void) | null = null;
  private ligando = false;
  private mutado = false;
  /** Muda a cada desligar: o microfone que terminar de abrir depois disso não fica aberto. */
  private geracao = 0;
  /** Desde quando o microfone está abrindo (o navegador pode estar pedindo a permissão). */
  abrindoDesde: number | null = null;
  /** Desde quando a voz está no ar (para perceber a que o servidor fechou sem o navegador ver). */
  noArDesde: number | null = null;

  constructor(
    private readonly conn: Connection,
    private readonly nivel: NivelDeVoz | null,
    private readonly rotular: (ref: TrackRef) => void
  ) {}

  get noAr(): boolean {
    return this.stop !== null;
  }

  /** Deixa a voz no ar ou fora dele e diz como ficou o microfone. */
  async ajustar(quer: boolean, mutado: boolean): Promise<EstadoMicrofone> {
    this.mutado = mutado;
    if (!quer) {
      this.desligar();
      return "ok";
    }
    if (this.stop) return "ok";
    if (this.ligando) return "abrindo";
    this.ligando = true;
    this.abrindoDesde = Date.now();
    const geracao = this.geracao;
    try {
      const mic = await getMicTrack();
      // Saiu da sala enquanto o microfone abria: ele fecha e nada vai ao ar.
      if (geracao !== this.geracao) {
        mic.stop();
        return "ok";
      }
      mic.enabled = !this.mutado;
      this.mic = mic;
      this.nivel?.watch("eu", mic);
      this.stop = this.conn.publish(mic, [{ maxBitrate: 64_000 }], this.rotular);
      this.noArDesde = Date.now();
      return "ok";
    } catch (erro) {
      return falhaDoMicrofone(erro);
    } finally {
      this.ligando = false;
      this.abrindoDesde = null;
    }
  }

  setMutado(mutado: boolean): void {
    this.mutado = mutado;
    if (this.mic) this.mic.enabled = !mutado;
  }

  desligar(): void {
    this.geracao++;
    this.stop?.();
    this.stop = null;
    this.noArDesde = null;
    this.mic?.stop();
    this.mic = null;
    this.nivel?.watch("eu", null);
  }
}
