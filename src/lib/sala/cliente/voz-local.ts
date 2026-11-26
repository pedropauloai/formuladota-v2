// A voz de quem pode falar: liga o microfone e publica quando a pessoa passa a poder falar (entrou como
// dono ou membro, foi chamada ao palco, foi liberada pelo dono) e solta quando deixa de poder (o
// servidor já cortou a faixa no SFU). Mutar só zera o som: o SFU descarta faixa sem pacote por 30 s.
// O mudo vale também para o microfone que ainda está abrindo, e quem sai da sala não deixa microfone
// aberto. Trocar o microfone põe a faixa nova no lugar da antiga, sem renegociar.
// O microfone passa pelo filtro (R21: RNNoise e porta de ruído) e a sala recebe a saída dele, sempre a
// mesma faixa; sem filtro, ou com o áudio dele parado, vai o microfone cru, como antes.

import type { Connection, Publicacao, TrackRef } from "./conexao";
import { configVoz } from "./config-voz";
import { criarFiltro, filtroPossivel, type Filtro, type OpcoesFiltro } from "./filtro-voz";
import { medidorVoz } from "./medidor-voz";
import { getMicTrack } from "./midia";
import { falhaDoMicrofone, type EstadoMicrofone } from "./microfone";
import type { NivelDeVoz } from "./nivel-voz";

type CriarFiltro = (o: OpcoesFiltro) => Promise<Filtro | null>;

export class VozLocal {
  private mic: MediaStreamTrack | null = null;
  private filtro: Filtro | null = null;
  /** A faixa que está indo para a sala agora (a saída do filtro ou o microfone cru). */
  private noArFaixa: MediaStreamTrack | null = null;
  /** O microfone aberto com a redução de ruído do navegador (a usada quando não há RNNoise). */
  private ruidoDoMic = false;
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
    private readonly rotular: (ref: TrackRef) => void,
    private readonly criar: CriarFiltro = criarFiltro
  ) {}

  get noAr(): boolean {
    return this.pub !== null;
  }

  private opcoes(): OpcoesFiltro {
    const c = configVoz.get();
    return { reducao: c.reducaoRuido, auto: c.sensibilidadeAuto, limiarDb: c.sensibilidadeDb };
  }

  /** A redução do navegador só vale sem o RNNoise, que entra no lugar dela. */
  private ruidoDoNavegador(): boolean {
    const comRnnoise = this.filtro ? this.filtro.rnnoiseDisponivel : filtroPossivel();
    return configVoz.get().reducaoRuido && !comRnnoise;
  }

  /** Abre o microfone das configurações com o mudo de agora (a pessoa pode mutar enquanto ele abre). */
  private async abrir(): Promise<MediaStreamTrack> {
    const ruido = this.ruidoDoNavegador();
    const track = await getMicTrack({ microfone: configVoz.get().microfone, reducaoRuido: ruido });
    this.ruidoDoMic = ruido;
    track.enabled = !this.mutado;
    return track;
  }

  /** O que vai para a sala: a saída do filtro quando o áudio dele corre; senão, o microfone cru. */
  private faixaDaSala(): MediaStreamTrack | null {
    return this.filtro?.ativo ? this.filtro.saida : this.mic;
  }

  /** Põe na sala (e no anel da própria pessoa) a faixa certa de agora, e conta à engrenagem. */
  private publicarCerta(): void {
    const faixa = this.faixaDaSala();
    if (this.pub && faixa && faixa !== this.noArFaixa) this.pub.trocar(faixa);
    this.noArFaixa = faixa;
    this.nivel?.watch("eu", faixa);
    const estado = !faixa ? null : this.filtro?.ativo ? this.filtro.tipo : "cru";
    medidorVoz.definir(this.filtro, estado);
  }

  /** O microfone que fica no ar: entra no filtro, mostra o nome em uso e troca sozinho se for desconectado. */
  private usar(track: MediaStreamTrack): void {
    track.addEventListener("ended", () => void this.trocarMicrofone());
    this.mic = track;
    this.filtro?.entrada(track);
    configVoz.setEmUso(track.label || null);
  }

  private trocaQueFicou(): void {
    if (this.ruidoDoNavegador() !== this.ruidoDoMic && this.pub) this.trocaPendente = true;
    if (!this.trocaPendente) return;
    this.trocaPendente = false;
    void this.trocarMicrofone();
  }

  /** O áudio do filtro passou a correr ou parou, ou o RNNoise falhou. */
  private filtroMudou(): void {
    this.publicarCerta();
    if (!this.ligando) this.trocaQueFicou();
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
    const filtro = this.criar(this.opcoes()).catch(() => null);
    try {
      const mic = await this.abrir().catch(async (erro: unknown) => {
        (await filtro)?.fechar();
        throw erro;
      });
      const f = await filtro;
      // Saiu da sala enquanto o microfone abria: ele e o filtro fecham, e nada vai ao ar.
      if (geracao !== this.geracao) {
        mic.stop();
        f?.fechar();
        return "ok";
      }
      this.filtro = f;
      f?.onEstado(() => this.filtroMudou());
      this.usar(mic);
      this.noArFaixa = this.faixaDaSala() ?? mic;
      this.pub = this.conn.publishTrocavel(this.noArFaixa, [{ maxBitrate: 64_000 }], this.rotular);
      this.publicarCerta();
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

  /** Outro microfone (ou a redução do navegador) com a voz no ar: a faixa nova entra no filtro, ou na mesma publicação. */
  async trocarMicrofone(): Promise<void> {
    if (this.ligando) {
      this.trocaPendente = true;
      return;
    }
    const antigo = this.mic;
    if (!this.pub || !antigo) return;
    this.ligando = true;
    const geracao = this.geracao;
    try {
      const novo = await this.abrir();
      // Saiu da sala durante a troca: o microfone novo fecha.
      if (geracao !== this.geracao) {
        novo.stop();
        return;
      }
      this.usar(novo);
      this.publicarCerta();
      antigo.stop();
    } catch {
      // Sem o microfone novo, fica o de antes.
    } finally {
      this.ligando = false;
      this.trocaQueFicou();
    }
  }

  /** A engrenagem mudou a redução de ruído ou a sensibilidade: o filtro ajusta na hora, sem reabrir o microfone. */
  ajustarFiltro(): void {
    this.filtro?.ajustar(this.opcoes());
    this.publicarCerta();
    if (!this.ligando) this.trocaQueFicou();
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
    this.filtro?.fechar();
    this.filtro = null;
    this.noArFaixa = null;
    this.nivel?.watch("eu", null);
    medidorVoz.definir(null, null);
    configVoz.setEmUso(null);
  }
}
