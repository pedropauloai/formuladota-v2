// A voz de quem pode falar: liga o microfone e publica quando a pessoa passa a poder falar (entrou como
// dono ou membro, foi chamada ao palco, foi liberada pelo dono) e solta quando deixa de poder (o
// servidor já cortou a faixa no SFU). Mutar só zera o som: o SFU descarta faixa sem pacote por 30 s.
// O mudo vale também para o microfone que ainda está abrindo, e quem sai da sala não deixa microfone
// aberto. Trocar o microfone (ou a redução de ruído) põe a faixa nova no lugar da antiga, sem renegociar.

import type { Connection, Publicacao, TrackRef } from "./conexao";
import { configVoz } from "./config-voz";
import { getMicTrack } from "./midia";
import { falhaDoMicrofone, type EstadoMicrofone } from "./microfone";
import type { NivelDeVoz } from "./nivel-voz";

export class VozLocal {
  private mic: MediaStreamTrack | null = null;
  private pub: Publicacao | null = null;
  private ligando = false;
  private mutado = false;
  /** Troca pedida enquanto o microfone abria: roda logo depois, com a escolha mais nova. */
  private trocaPendente = false;
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
    return this.pub !== null;
  }

  /** Abre o microfone das configurações com o mudo de agora (a pessoa pode mutar enquanto ele abre). */
  private async abrir(): Promise<MediaStreamTrack> {
    const { microfone, reducaoRuido } = configVoz.get();
    const track = await getMicTrack({ microfone, reducaoRuido });
    track.enabled = !this.mutado;
    return track;
  }

  /** O microfone que fica no ar: o nível da voz, o nome em uso e a troca sozinha se ele for desconectado. */
  private usar(track: MediaStreamTrack): void {
    track.addEventListener("ended", () => void this.trocarMicrofone());
    this.mic = track;
    this.nivel?.watch("eu", track);
    configVoz.setEmUso(track.label || null);
  }

  private trocaQueFicou(): void {
    if (!this.trocaPendente) return;
    this.trocaPendente = false;
    void this.trocarMicrofone();
  }

  /** Deixa a voz no ar ou fora dele e diz como ficou o microfone. */
  async ajustar(quer: boolean, mutado: boolean): Promise<EstadoMicrofone> {
    this.mutado = mutado;
    if (!quer) {
      this.desligar();
      return "ok";
    }
    if (this.pub) return "ok";
    if (this.ligando) return "abrindo";
    this.ligando = true;
    this.abrindoDesde = Date.now();
    const geracao = this.geracao;
    try {
      const mic = await this.abrir();
      // Saiu da sala enquanto o microfone abria: ele fecha e nada vai ao ar.
      if (geracao !== this.geracao) {
        mic.stop();
        return "ok";
      }
      this.usar(mic);
      this.pub = this.conn.publishTrocavel(mic, [{ maxBitrate: 64_000 }], this.rotular);
      this.noArDesde = Date.now();
      return "ok";
    } catch (erro) {
      return falhaDoMicrofone(erro);
    } finally {
      this.ligando = false;
      this.abrindoDesde = null;
      this.trocaQueFicou();
    }
  }

  /** Outro microfone (ou a redução de ruído) com a voz no ar: a faixa nova entra na mesma publicação. */
  async trocarMicrofone(): Promise<void> {
    if (this.ligando) {
      this.trocaPendente = true;
      return;
    }
    const antigo = this.mic;
    const pub = this.pub;
    if (!pub || !antigo) return;
    this.ligando = true;
    const geracao = this.geracao;
    try {
      const novo = await this.abrir();
      // Saiu da sala durante a troca: o microfone novo fecha.
      if (geracao !== this.geracao) {
        novo.stop();
        return;
      }
      pub.trocar(novo);
      this.usar(novo);
      antigo.stop();
    } catch {
      // Sem o microfone novo, fica o de antes.
    } finally {
      this.ligando = false;
      this.trocaQueFicou();
    }
  }

  setMutado(mutado: boolean): void {
    this.mutado = mutado;
    if (this.mic) this.mic.enabled = !mutado;
  }

  desligar(): void {
    this.geracao++;
    this.trocaPendente = false;
    this.pub?.parar();
    this.pub = null;
    this.noArDesde = null;
    this.mic?.stop();
    this.mic = null;
    this.nivel?.watch("eu", null);
    configVoz.setEmUso(null);
  }
}
