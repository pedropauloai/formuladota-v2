// Sessão da sala no navegador, sem React: entra, consulta o estado a cada 2 ou 3 s (batimento a cada
// 10 s), publica a voz de quem pode falar (e liga ou desliga sozinha quando o dono chama ao palco,
// devolve ou muta), recebe as faixas da lista, mede a conexão, levanta a mão, conversa no chat e
// compartilha a tela na qualidade escolhida. A tela só lê o retrato.

import type { Estado, MensagemEstado } from "../estado";
import { SNAPSHOT_INICIAL, type SessaoSnapshot } from "./retrato";
import { snapshotFromStats, summarizeStats, type StatsSnapshot, type StatsSummary } from "../metricas";
import type { Layer, Quality } from "../tipos";
import { api, type AcaoDono, type AlvoDenuncia, type Batimento, type Entrada } from "./acoes";
import { createConnection, type Connection } from "./conexao";
import { juntarChat } from "./chat-local";
import { NivelDeVoz } from "./nivel-voz";
import { Recepcao } from "./recepcao";
import { beatDue, estadoIntervalMs, statsEveryBeats } from "./ritmo";
import { compartilhar, type TelaNoAr } from "./tela-local";
import { VozLocal } from "./voz-local";

export { SNAPSHOT_INICIAL, type Fase, type SessaoSnapshot } from "./retrato";

const METRICAS_MS = 5_000;
const FALA_MS = 300;
const CHAT_GUARDA = 100;
const FALHAS_PARA_RESINCRONIZAR = 5;

export class SessaoSala {
  private snap: SessaoSnapshot = SNAPSHOT_INICIAL;
  private conn: Connection | null = null;
  private recepcao: Recepcao | null = null;
  private nivel: NivelDeVoz | null = null;
  private voz: VozLocal | null = null;
  private entrada: Entrada | null = null;
  private telaNoAr: TelaNoAr | null = null;
  private timers: number[] = [];
  private proxima: number | null = null;
  private consultando = false;
  private mudou = false;
  private ultimoBatimento: number | null = null;
  private batimentos = 0;
  private falhas = 0;
  private ultimoStats: StatsSnapshot | null = null;
  private enviadoStats: StatsSnapshot | null = null;
  private localStats: StatsSnapshot | null = null;
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
    this.nivel = new NivelDeVoz();
    this.conn = createConnection({ roomId: this.roomId, iceServers: entrada.data.iceServers });
    this.voz = new VozLocal(this.conn, this.nivel, (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "voz", null));
    const camada: Layer = entrada.data.tipo === "palco" ? "h" : "f";
    this.recepcao = new Recepcao(this.conn, camada, (tela, telaDe) => this.set({ tela, telaDe }), (userId, track) => this.nivel?.watch(userId, track));
    this.set({ fase: "na_sala", papel: entrada.data.papel, tipo: entrada.data.tipo, camada });
    this.timers.push(window.setInterval(() => void this.metricas(), METRICAS_MS));
    this.timers.push(window.setInterval(() => this.atualizarFala(), FALA_MS));
    void this.consultar();
  }

  private agendar(): void {
    if (this.proxima !== null) window.clearTimeout(this.proxima);
    if (this.snap.fase !== "na_sala") return;
    this.proxima = window.setTimeout(() => void this.consultar(), estadoIntervalMs(this.snap.papel ?? "ouvinte"));
  }

  private batimento(now: number): Batimento | undefined {
    if (!beatDue({ now, lastBeatAt: this.ultimoBatimento, changed: this.mudou })) return undefined;
    this.mudou = false;
    this.ultimoBatimento = now;
    this.batimentos += 1;
    const cada = statsEveryBeats(this.snap.papel ?? "ouvinte", this.snap.tipo ?? "palco");
    let metricas: StatsSummary | undefined;
    if (this.batimentos % cada === 0 && this.ultimoStats) {
      metricas = summarizeStats(this.enviadoStats, this.ultimoStats);
      this.enviadoStats = this.ultimoStats;
    }
    return { muted: this.snap.mutado || !this.snap.vozNoAr, hand: this.snap.mao, metricas };
  }

  private async consultar(): Promise<void> {
    if (this.snap.fase !== "na_sala" || this.consultando) return;
    this.consultando = true;
    try {
      const resync = this.falhas >= FALHAS_PARA_RESINCRONIZAR;
      const chatAfter = resync ? 0 : (this.snap.chat.at(-1)?.id ?? 0);
      const res = await this.a.estado({ sessionId: this.conn?.sessionId() ?? null, chatAfter, beat: this.batimento(Date.now()) });
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
    this.recepcao?.sync(estado.faixas ?? []);
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
    if (!this.voz) return;
    const antes = this.voz.noAr;
    const ok = await this.voz.ajustar(!!this.snap.estado?.eu?.podeFalar, this.snap.mutado);
    if (this.voz.noAr !== antes) this.mudou = true;
    if (this.snap.vozNoAr !== this.voz.noAr || this.snap.semMicrofone === ok) this.set({ vozNoAr: this.voz.noAr, semMicrofone: !ok });
  }

  private async metricas(): Promise<void> {
    if (!this.conn) return;
    const atual = snapshotFromStats(await this.conn.stats());
    const local = summarizeStats(this.localStats, atual);
    this.localStats = atual;
    this.ultimoStats = atual;
    this.set({ qualidade: local, medidas: { audioBytes: atual.audioBytesReceived, videoBytes: atual.videoBytesReceived, videoAltura: local.videoHeight } });
  }

  private atualizarFala(): void {
    const eu = this.snap.estado?.eu?.userId ?? null;
    const falando = (this.nivel?.speaking() ?? [])
      .map((id) => (id === "eu" ? eu : id))
      .filter((id): id is string => !!id && !(this.snap.mutado && id === eu));
    const igual = falando.length === this.snap.falando.length && falando.every((id) => this.snap.falando.includes(id));
    if (!igual) this.set({ falando });
  }

  private agora(): void {
    this.mudou = true;
    void this.consultar();
  }

  alternarMudo(): void {
    const mutado = !this.snap.mutado;
    this.voz?.setMutado(mutado);
    this.set({ mutado });
    this.agora();
  }

  alternarMao(): void {
    if (!this.snap.estado?.eu?.podeLevantarMao) return;
    this.set({ mao: !this.snap.mao });
    this.agora();
  }

  escolherCamada(camada: Layer): void {
    this.recepcao?.setLayer(camada);
    this.set({ camada });
  }

  async compartilharTela(qualidade: Quality): Promise<void> {
    if (!this.conn || !this.entrada || this.snap.compartilhando) return;
    if (this.snap.estado?.eu && !this.snap.estado.eu.podeCompartilharTela) return;
    const tela = await compartilhar({
      conn: this.conn, qualidade, videoMaxKbps: this.entrada.videoMaxKbps, onFim: () => this.pararTela(),
      rotular: (ref, tipo, q) => void this.a.rotular(ref.sessionId, ref.trackName, tipo, q),
    });
    if (!tela) return;
    this.telaNoAr = tela;
    this.set({ compartilhando: true, minhaTela: tela.stream, qualidadeTela: qualidade });
  }

  pararTela(): void {
    this.telaNoAr?.parar();
    this.telaNoAr = null;
    if (this.snap.compartilhando || this.snap.minhaTela) this.set({ compartilhando: false, minhaTela: null, qualidadeTela: null });
  }

  setVoiceVolume(volume: number): void {
    this.recepcao?.setVoiceVolume(volume);
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
    this.set({ fase: "saiu", motivo, estado: null, tela: null, telaDe: null, minhaTela: null, compartilhando: false, falando: [], vozNoAr: false, mao: false });
  }

  private limpar(): void {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    if (this.proxima !== null) window.clearTimeout(this.proxima);
    this.proxima = null;
    this.pararTela();
    this.voz?.desligar();
    this.voz = null;
    this.recepcao?.clear();
    this.conn?.close();
    this.nivel?.close();
    this.conn = null;
    this.recepcao = null;
    this.nivel = null;
    this.ultimoBatimento = null;
  }
}
