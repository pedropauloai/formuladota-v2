// Sessão da sala no navegador, sem React (vive no registro da sala ativa e continua ao navegar pelo
// site): entra, consulta o estado a cada 2 ou 3 s (batimento a cada 10 s), publica a voz de quem pode
// falar (liga ou desliga sozinha quando o dono chama ao palco, devolve ou muta), recebe as faixas da
// lista, mede a conexão, conversa no chat, compartilha a tela e refaz a ligação quando ela trava.

import type { Estado } from "../estado";
import { SNAPSHOT_INICIAL, type SessaoSnapshot } from "./retrato";
import type { Layer, Quality, TrackLabel } from "../tipos";
import { api, type AcaoDono, type AlvoDenuncia, type Entrada } from "./acoes";
import { comMinha, cursorDoChat, juntarChat } from "./chat-local";
import { GuardaDaVoz } from "./guarda-voz";
import { desmontarLigacao, montarLigacao, quemFala, type Ligacao } from "./ligacao";
import { falhou } from "./microfone";
import { Pulso } from "./pulso";
import { estadoIntervalMs } from "./ritmo";
import { Compartilhamento } from "./tela-local";
import { guardarVolume, volumesGuardados } from "./volumes-local";

export { SNAPSHOT_INICIAL, type Fase, type SessaoSnapshot } from "./retrato";

const METRICAS_MS = 5_000;
const FALA_MS = 300;
const CHAT_GUARDA = 100;
const FALHAS_PARA_RESINCRONIZAR = 5;
const SAIR_DA_VISTA_MS = 1_500;

export class SessaoSala {
  private snap: SessaoSnapshot = SNAPSHOT_INICIAL;
  private lig: Ligacao | null = null;
  private refazendo = false;
  private entrada: Entrada | null = null;
  private readonly tela = new Compartilhamento((r) => this.set(r));
  private mutadoSemSurdo = false;
  private timers: number[] = [];
  private proxima: number | null = null;
  private consultando = false;
  private falhas = 0;
  private cursorChat = 0;
  private vistaAberta = false;
  private readonly pulso = new Pulso();
  private readonly pedidas = new Set<string>();
  private readonly a: ReturnType<typeof api>;
  private readonly listeners = new Set<() => void>();
  private readonly guarda = new GuardaDaVoz({ lig: () => this.lig, snap: () => this.snap, set: (patch) => this.set(patch), refazer: () => void this.refazer(), vozMudou: () => (this.pulso.mudou = true) });

  constructor(private readonly roomId: string) {
    this.a = api(roomId);
  }

  /** Loja externa para o useSyncExternalStore: a tela lê o retrato e assina as mudanças. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessaoSnapshot => this.snap;

  private set(patch: Partial<SessaoSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  async entrar(): Promise<void> {
    if (this.snap.fase === "entrando" || this.snap.fase === "na_sala") return;
    this.set({ fase: "entrando", motivo: null });
    const entrada = await this.a.entrar();
    if (!entrada.ok) return this.set({ fase: "erro", motivo: entrada.code });
    this.entrada = entrada.data;
    const camada: Layer = entrada.data.tipo === "palco" ? "h" : "f";
    this.montar(entrada.data, camada);
    this.guarda.ligar();
    this.set({ fase: "na_sala", papel: entrada.data.papel, tipo: entrada.data.tipo, camada });
    this.timers.push(window.setInterval(() => void this.medir(), METRICAS_MS));
    this.timers.push(window.setInterval(() => this.atualizarFala(), FALA_MS));
    void this.consultar();
  }

  private montar(entrada: Entrada, camada: Layer): void {
    const volumes = volumesGuardados();
    this.lig = montarLigacao({
      roomId: this.roomId, entrada, camada, foraDaSala: !this.vistaAberta, volumes, surdo: this.snap.surdo,
      rotularVoz: (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "voz", null),
      onTela: (tela, telaDe) => this.set({ tela, telaDe }),
      onBloqueio: (audioBloqueado) => audioBloqueado !== this.snap.audioBloqueado && this.set({ audioBloqueado }),
      onTravou: () => void this.refazer(),
    });
    this.set({ volumes });
  }

  /** A ligação travou (faixa que não chega, rede que caiu, voz que o servidor não mostra): sai e entra de
   *  novo por baixo, com a sala na tela. A tela compartilhada cai, e quem compartilhava compartilha de novo. */
  private async refazer(): Promise<void> {
    if (this.refazendo || this.snap.fase !== "na_sala") return;
    this.refazendo = true;
    try {
      this.set({ reconectando: true });
      this.pararTela();
      if (this.lig) desmontarLigacao(this.lig);
      this.lig = null;
      await this.a.sair();
      const entrada = await this.a.entrar();
      if (this.snap.fase !== "na_sala") return;
      if (!entrada.ok) return this.encerrar(entrada.code);
      this.entrada = entrada.data;
      this.guarda.zerarQuedas();
      this.montar(entrada.data, this.snap.camada);
      this.pulso.reiniciar(true);
      this.set({ reconectando: false, papel: entrada.data.papel, vozNoAr: false });
      this.agora();
    } finally {
      this.refazendo = false;
    }
  }

  private agendar(): void {
    if (this.proxima !== null) window.clearTimeout(this.proxima);
    if (this.snap.fase !== "na_sala") return;
    this.proxima = window.setTimeout(() => void this.consultar(), estadoIntervalMs(this.snap.papel ?? "ouvinte"));
  }

  private async consultar(): Promise<void> {
    if (this.snap.fase !== "na_sala" || this.consultando) return;
    this.consultando = true;
    try {
      const resync = this.falhas >= FALHAS_PARA_RESINCRONIZAR;
      const chatAfter = resync ? 0 : this.cursorChat;
      const res = await this.a.estado({ sessionId: this.lig?.conn.sessionId() ?? null, chatAfter, beat: this.pulso.batimento(Date.now(), { papel: this.snap.papel, tipo: this.snap.tipo, muted: this.snap.mutado || !this.snap.vozNoAr, hand: this.snap.mao }) });
      if (this.snap.fase !== "na_sala") return;
      if (!res.ok) {
        this.falhas += 1;
        return;
      }
      this.falhas = 0;
      if (res.data.saida) return this.encerrar(res.data.saida);
      this.aplicar(res.data, resync);
    } finally {
      this.consultando = false;
      this.agendar();
    }
  }

  private aplicar(estado: Estado, resync: boolean): void {
    const eu = estado.eu;
    const papel = eu?.papel ?? this.snap.papel;
    const mao = this.snap.mao && !!eu?.podeLevantarMao;
    this.lig?.recepcao.sync(estado.faixas ?? []);
    this.cursorChat = cursorDoChat(resync ? 0 : this.cursorChat, estado.chat ?? []);
    this.set({ estado, papel, mao, chat: juntarChat(this.snap.chat, estado.chat ?? [], estado.apagadas ?? [], resync, CHAT_GUARDA) });
    void this.guarda.garantir();
    const ids = [...(estado.membros ?? []).map((m) => m.userId), ...this.snap.chat.flatMap((m) => (m.userId ? [m.userId] : []))];
    void this.buscarPessoas(ids);
  }

  private async buscarPessoas(ids: string[]): Promise<void> {
    const faltam = [...new Set(ids)].filter((id) => !(id in this.snap.pessoas) && !this.pedidas.has(id)).slice(0, 60);
    if (faltam.length === 0) return;
    faltam.forEach((id) => this.pedidas.add(id));
    const res = await this.a.pessoas(faltam);
    if (res.ok) this.set({ pessoas: { ...this.snap.pessoas, ...res.data } });
    else faltam.forEach((id) => this.pedidas.delete(id));
  }

  private async medir(): Promise<void> {
    const conn = this.lig?.conn;
    if (conn) this.set(await this.pulso.medir(conn));
  }

  private atualizarFala(): void {
    const falando = quemFala(this.lig, this.snap.estado?.eu?.userId ?? null, this.snap.mutado);
    const igual = falando.length === this.snap.falando.length && falando.every((id) => this.snap.falando.includes(id));
    if (!igual) this.set({ falando });
  }

  private agora(): void {
    this.pulso.mudou = true;
    void this.consultar();
  }

  alternarMudo(): void {
    // Clique no microfone que não abriu: a pessoa quer falar, então abre de novo, sem o mudo.
    if (!this.snap.vozNoAr && falhou(this.snap.microfone)) {
      this.lig?.voz.setMutado(false);
      this.set({ mutado: false });
      return void this.guarda.tentarDeNovo();
    }
    const mutado = !this.snap.mutado;
    // Abrir o microfone com o som desligado religa o som também, como no Discord.
    this.lig?.recepcao.setSurdo(this.snap.surdo && mutado);
    this.lig?.voz.setMutado(mutado);
    this.set({ mutado, surdo: this.snap.surdo && mutado });
    this.agora();
  }

  /** Ensurdecer, como no Discord: para de ouvir as vozes e a tela e muta o microfone; religar devolve o microfone como estava. */
  alternarSurdo(): void {
    const surdo = !this.snap.surdo;
    if (surdo) this.mutadoSemSurdo = this.snap.mutado;
    this.lig?.recepcao.setSurdo(surdo);
    this.lig?.voz.setMutado(surdo || this.mutadoSemSurdo);
    this.set({ surdo, mutado: surdo || this.mutadoSemSurdo });
    this.agora();
  }

  alternarMao(): void {
    if (!this.snap.estado?.eu?.podeLevantarMao) return;
    this.set({ mao: !this.snap.mao });
    this.agora();
  }

  escolherCamada(camada: Layer): void {
    this.lig?.recepcao.setLayer(camada);
    this.set({ camada });
  }

  async compartilharTela(qualidade: Quality): Promise<void> {
    const conn = this.lig?.conn;
    if (!conn || !this.entrada || this.snap.compartilhando || this.snap.estado?.eu?.podeCompartilharTela === false) return;
    const rotular = (ref: { sessionId: string; trackName: string }, tipo: TrackLabel, q: Quality | null) => void this.a.rotular(ref.sessionId, ref.trackName, tipo, q);
    await this.tela.iniciar({ conn, qualidade, videoMaxKbps: this.entrada.videoMaxKbps, rotular });
  }

  trocarTela = (): Promise<void> => this.tela.trocar();
  pararTela = (): void => this.tela.parar();
  /** "Tentar de novo" no aviso do microfone. */
  tentarMicrofone = (): Promise<void> => this.guarda.tentarDeNovo();

  /** A página da sala aberta mostra a tela na camada escolhida; fora dela, a tela vem na leve. */
  setVistaAberta(aberta: boolean): void {
    this.vistaAberta = aberta;
    this.lig?.recepcao.setForaDaSala(!aberta, aberta ? 0 : SAIR_DA_VISTA_MS);
  }

  /** Clique depois de o navegador segurar o som: as vozes voltam a tocar. */
  liberarAudio(): void {
    this.lig?.recepcao.retomarAudio();
  }

  setVolumeDe(userId: string, volume: number): void {
    this.lig?.recepcao.setVolumeDe(userId, volume);
    this.set({ volumes: guardarVolume(userId, volume) });
  }

  setVoiceVolume(volume: number): void {
    this.lig?.recepcao.setVoiceVolume(volume);
  }

  async enviarMensagem(texto: string): Promise<{ ok: true } | { ok: false; code: string }> {
    const res = await this.a.chat(texto);
    if (res.ok) this.set({ chat: comMinha(this.snap.chat, res.data.id, this.snap.estado?.eu?.userId ?? null, texto, CHAT_GUARDA) });
    return res.ok ? { ok: true } : res;
  }

  async apagarMensagem(id: number): Promise<void> {
    if ((await this.a.apagarMensagem(id)).ok) this.set({ chat: this.snap.chat.filter((m) => m.id !== id) });
  }

  async moderar(userId: string, acao: AcaoDono, motivo = ""): Promise<{ ok: true } | { ok: false; code: string }> {
    const res = await this.a.membro(userId, acao, motivo);
    void this.consultar();
    return res.ok ? { ok: true } : res;
  }

  abrirChat = (aberto: boolean) => this.a.abrirChat(aberto);
  bloquear = (userId: string) => this.a.bloquear(userId);
  denunciar = (alvo: AlvoDenuncia, motivo: string, detalhes: string) => this.a.denunciar(alvo, motivo, detalhes);

  sair(): void {
    if (this.snap.fase !== "na_sala") return;
    void this.a.sair();
    this.encerrar("saiu");
  }

  /** Aba fechando ou componente desmontado: avisa o servidor pelo sendBeacon e solta tudo. */
  sairNoFechamento(): void {
    if (this.snap.fase !== "na_sala") return;
    this.a.sairNoFechamento();
    this.limpar();
  }

  private encerrar(motivo: string): void {
    this.limpar();
    this.set({ fase: "saiu", motivo, estado: null, tela: null, telaDe: null, minhaTela: null, compartilhando: false, falando: [], vozNoAr: false, mao: false, audioBloqueado: false, reconectando: false, surdo: false, microfone: "ok" });
  }

  private limpar(): void {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    if (this.proxima !== null) window.clearTimeout(this.proxima);
    this.proxima = null;
    this.pararTela();
    if (this.lig) desmontarLigacao(this.lig);
    this.lig = null;
    this.pulso.reiniciar();
    this.guarda.soltar();
  }
}
