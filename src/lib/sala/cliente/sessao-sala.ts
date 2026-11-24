// Sessão da sala no navegador, sem React (vive no registro da sala ativa e continua ao navegar pelo
// site): entra, consulta o estado a cada 2 ou 3 s (batimento a cada 10 s), publica a voz de quem pode
// falar (liga ou desliga sozinha quando o dono chama ao palco, devolve ou muta), recebe as faixas da
// lista, mede a conexão, conversa no chat, compartilha a tela e refaz a ligação quando ela trava.

import type { Estado, MensagemEstado } from "../estado";
import { SNAPSHOT_INICIAL, type SessaoSnapshot } from "./retrato";
import type { Layer, Quality } from "../tipos";
import { api, type AcaoDono, type AlvoDenuncia, type Entrada } from "./acoes";
import { cursorDoChat, juntarChat } from "./chat-local";
import { desmontarLigacao, montarLigacao, type Ligacao } from "./ligacao";
import { Pulso } from "./pulso";
import { estadoIntervalMs, vozCaiu } from "./ritmo";
import { compartilhar, type TelaNoAr } from "./tela-local";

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
  private quedasDeVoz = 0;
  private entrada: Entrada | null = null;
  private telaNoAr: TelaNoAr | null = null;
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
    this.set({ fase: "na_sala", papel: entrada.data.papel, tipo: entrada.data.tipo, camada });
    this.timers.push(window.setInterval(() => void this.metricas(), METRICAS_MS));
    this.timers.push(window.setInterval(() => this.atualizarFala(), FALA_MS));
    void this.consultar();
  }

  private montar(entrada: Entrada, camada: Layer): void {
    this.lig = montarLigacao({
      roomId: this.roomId, entrada, camada, foraDaSala: !this.vistaAberta,
      rotularVoz: (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "voz", null),
      onTela: (tela, telaDe) => this.set({ tela, telaDe }),
      onBloqueio: (audioBloqueado) => audioBloqueado !== this.snap.audioBloqueado && this.set({ audioBloqueado }),
      onTravou: () => void this.refazer(),
    });
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
      this.quedasDeVoz = 0;
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
    void this.garantirVoz();
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

  /** Publica a voz de quem pode falar agora e solta a de quem deixou de poder (o servidor já cortou no SFU). */
  private async garantirVoz(): Promise<void> {
    const voz = this.lig?.voz;
    if (!voz) return;
    const eu = this.snap.estado?.eu;
    if (eu && vozCaiu({ noAr: voz.noAr, podeFalar: eu.podeFalar, vozAberta: eu.vozAberta, noArDesde: voz.noArDesde, agora: Date.now() })) {
      // Religar uma vez resolve o mutar e liberar rápido; caiu de novo, a ligação é que travou.
      if (++this.quedasDeVoz >= 2) return void this.refazer();
      voz.desligar();
    } else if (eu?.vozAberta) this.quedasDeVoz = 0;
    const antes = voz.noAr;
    const ok = await voz.ajustar(!!this.snap.estado?.eu?.podeFalar, this.snap.mutado);
    if (voz.noAr !== antes) this.pulso.mudou = true;
    if (this.snap.vozNoAr !== voz.noAr || this.snap.semMicrofone === ok) this.set({ vozNoAr: voz.noAr, semMicrofone: !ok });
  }

  private async metricas(): Promise<void> {
    const conn = this.lig?.conn;
    if (conn) this.set(await this.pulso.medir(conn));
  }

  private atualizarFala(): void {
    const eu = this.snap.estado?.eu?.userId ?? null;
    const falando = (this.lig?.nivel.speaking() ?? [])
      .map((id) => (id === "eu" ? eu : id))
      .filter((id): id is string => !!id && !(this.snap.mutado && id === eu));
    const igual = falando.length === this.snap.falando.length && falando.every((id) => this.snap.falando.includes(id));
    if (!igual) this.set({ falando });
  }

  private agora(): void {
    this.pulso.mudou = true;
    void this.consultar();
  }

  alternarMudo(): void {
    const mutado = !this.snap.mutado;
    this.lig?.voz.setMutado(mutado);
    this.set({ mutado });
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
    if (!conn || !this.entrada || this.snap.compartilhando) return;
    if (this.snap.estado?.eu && !this.snap.estado.eu.podeCompartilharTela) return;
    const tela = await compartilhar({
      conn, qualidade, videoMaxKbps: this.entrada.videoMaxKbps, onFim: () => this.pararTela(),
      rotular: (ref, tipo, q) => void this.a.rotular(ref.sessionId, ref.trackName, tipo, q),
    });
    if (!tela) return;
    this.telaNoAr = tela;
    this.set({ compartilhando: true, minhaTela: tela.stream, qualidadeTela: qualidade });
  }

  /** Outra janela na mesma publicação: a plateia segue na mesma faixa, sem renegociar. */
  async trocarTela(): Promise<void> {
    if (this.telaNoAr && (await this.telaNoAr.trocar())) this.set({ minhaTela: this.telaNoAr.stream });
  }

  pararTela(): void {
    this.telaNoAr?.parar();
    this.telaNoAr = null;
    if (this.snap.compartilhando || this.snap.minhaTela) this.set({ compartilhando: false, minhaTela: null, qualidadeTela: null });
  }

  /** A página da sala aberta mostra a tela na camada escolhida; fora dela, a tela vem na leve. */
  setVistaAberta(aberta: boolean): void {
    this.vistaAberta = aberta;
    this.lig?.recepcao.setForaDaSala(!aberta, aberta ? 0 : SAIR_DA_VISTA_MS);
  }

  /** Clique depois de o navegador segurar o som: as vozes voltam a tocar. */
  liberarAudio(): void {
    this.lig?.recepcao.retomarAudio();
  }

  setVoiceVolume(volume: number): void {
    this.lig?.recepcao.setVoiceVolume(volume);
  }

  async enviarMensagem(texto: string): Promise<{ ok: true } | { ok: false; code: string }> {
    const res = await this.a.chat(texto);
    if (!res.ok) return res;
    const eu = this.snap.estado?.eu?.userId ?? null;
    const minha: MensagemEstado = { id: res.data.id, userId: eu, texto: texto.replace(/\s+/g, " ").trim(), em: new Date().toISOString() };
    this.set({ chat: juntarChat(this.snap.chat, [minha], [], false, CHAT_GUARDA) });
    return { ok: true };
  }

  async apagarMensagem(id: number): Promise<void> {
    const res = await this.a.apagarMensagem(id);
    if (res.ok) this.set({ chat: this.snap.chat.filter((m) => m.id !== id) });
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
    this.set({ fase: "saiu", motivo, estado: null, tela: null, telaDe: null, minhaTela: null, compartilhando: false, falando: [], vozNoAr: false, mao: false, audioBloqueado: false, reconectando: false });
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
  }
}
