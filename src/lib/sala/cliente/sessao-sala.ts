// Sessão da sala no navegador, sem React: entra, publica a voz, dá o batimento de 2 s, recebe as
// faixas da lista, mede a conexão a cada 5 s, muta, compartilha a tela e sai. A tela só lê o retrato.

import type { Estado } from "../estado";
import { snapshotFromStats, summarizeStats, type StatsSnapshot, type StatsSummary } from "../metricas";
import { api, type Entrada } from "./acoes";
import { createConnection, type Connection } from "./conexao";
import { getMicTrack, getScreenStream } from "./midia";
import { NivelDeVoz } from "./nivel-voz";
import { Recepcao } from "./recepcao";

export type Fase = "inicial" | "entrando" | "na_sala" | "saiu" | "erro";

export interface SessaoSnapshot {
  fase: Fase;
  motivo: string | null;
  estado: Estado | null;
  papel: "dono" | "membro" | null;
  mutado: boolean;
  compartilhando: boolean;
  minhaTela: MediaStream | null;
  tela: MediaStream | null;
  telaDe: string | null;
  falando: string[];
  qualidade: StatsSummary | null;
  medidas: { audioBytes: number; videoBytes: number; videoAltura: number | null };
}

export const SNAPSHOT_INICIAL: SessaoSnapshot = {
  fase: "inicial", motivo: null, estado: null, papel: null, mutado: false, compartilhando: false,
  minhaTela: null, tela: null, telaDe: null, falando: [], qualidade: null,
  medidas: { audioBytes: 0, videoBytes: 0, videoAltura: null },
};

const BATIMENTO_MS = 2_000;
const METRICAS_MS = 5_000;
const FALA_MS = 300;

export class SessaoSala {
  private snap: SessaoSnapshot = SNAPSHOT_INICIAL;
  private conn: Connection | null = null;
  private recepcao: Recepcao | null = null;
  private nivel: NivelDeVoz | null = null;
  private mic: MediaStreamTrack | null = null;
  private entrada: Entrada | null = null;
  private stops: Array<() => void> = [];
  private telaStops: Array<() => void> = [];
  private timers: number[] = [];
  private prev5: StatsSnapshot | null = null;
  private prev10: StatsSnapshot | null = null;
  private pendente: StatsSummary | null = null;
  private ticks = 0;
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
    try {
      this.mic = await getMicTrack();
    } catch {
      return this.set({ fase: "erro", motivo: "sem_microfone" });
    }
    this.entrada = entrada.data;
    this.nivel = new NivelDeVoz();
    this.nivel.watch("eu", this.mic);
    this.conn = createConnection({ roomId: this.roomId, iceServers: entrada.data.iceServers });
    this.recepcao = new Recepcao(this.conn, (tela, telaDe) => this.set({ tela, telaDe }), (userId, track) => this.nivel?.watch(userId, track));
    this.stops.push(this.conn.publish(this.mic, [{ maxBitrate: 64_000 }], (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "voz")));
    this.set({ fase: "na_sala", papel: entrada.data.papel });
    this.timers.push(window.setInterval(() => void this.batimento(), BATIMENTO_MS));
    this.timers.push(window.setInterval(() => void this.metricas(), METRICAS_MS));
    this.timers.push(window.setInterval(() => this.atualizarFala(), FALA_MS));
    void this.batimento();
  }

  private async batimento(): Promise<void> {
    if (this.snap.fase !== "na_sala") return;
    const metricas = this.pendente ?? undefined;
    this.pendente = null;
    const res = await this.a.estado({ muted: this.snap.mutado, sessionId: this.conn?.sessionId() ?? null, metricas });
    if (!res.ok || this.snap.fase !== "na_sala") return;
    if (res.data.saida) return this.encerrar(res.data.saida);
    this.recepcao?.sync(res.data.faixas ?? []);
    this.set({ estado: res.data });
  }

  private async metricas(): Promise<void> {
    if (!this.conn) return;
    const atual = snapshotFromStats(await this.conn.stats());
    const local = summarizeStats(this.prev5, atual);
    this.prev5 = atual;
    this.ticks += 1;
    if (this.ticks % 2 === 0) {
      this.pendente = summarizeStats(this.prev10, atual);
      this.prev10 = atual;
    }
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

  alternarMudo(): void {
    if (!this.mic) return;
    const mutado = !this.snap.mutado;
    // Mutar mantém a faixa viva (o SFU descarta faixa sem pacote por 30 s); só zera o som.
    this.mic.enabled = !mutado;
    this.set({ mutado });
    void this.batimento();
  }

  async compartilharTela(): Promise<void> {
    if (!this.conn || !this.entrada || this.snap.compartilhando) return;
    if (this.snap.estado?.eu && !this.snap.estado.eu.podeCompartilharTela) return;
    let stream: MediaStream;
    try {
      stream = await getScreenStream();
    } catch {
      return;
    }
    const [video] = stream.getVideoTracks();
    const [audio] = stream.getAudioTracks();
    if (!video || !this.conn) return stream.getTracks().forEach((t) => t.stop());
    video.addEventListener("ended", () => this.pararTela());
    const encodings = [{ maxBitrate: this.entrada.videoMaxKbps * 1000, maxFramerate: 30 }];
    this.telaStops.push(this.conn.publish(video, encodings, (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "tela")));
    if (audio) this.telaStops.push(this.conn.publish(audio, [{ maxBitrate: 128_000 }], (ref) => void this.a.rotular(ref.sessionId, ref.trackName, "tela_audio")));
    this.set({ compartilhando: true, minhaTela: stream });
  }

  pararTela(): void {
    this.telaStops.forEach((stop) => stop());
    this.telaStops = [];
    this.snap.minhaTela?.getTracks().forEach((t) => t.stop());
    if (this.snap.compartilhando || this.snap.minhaTela) this.set({ compartilhando: false, minhaTela: null });
  }

  setVoiceVolume(volume: number): void {
    this.recepcao?.setVoiceVolume(volume);
  }

  expulsar = (userId: string) => this.a.expulsar(userId);
  bloquear = (userId: string) => this.a.bloquear(userId);
  denunciar = (userId: string, motivo: string, detalhes: string) => this.a.denunciar(userId, motivo, detalhes);

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
    this.set({ fase: "saiu", motivo, estado: null, tela: null, telaDe: null, minhaTela: null, compartilhando: false, falando: [] });
  }

  private limpar(): void {
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    this.pararTela();
    this.stops.forEach((stop) => stop());
    this.stops = [];
    this.recepcao?.clear();
    this.conn?.close();
    this.mic?.stop();
    this.nivel?.close();
    this.conn = null;
    this.recepcao = null;
    this.mic = null;
    this.nivel = null;
  }
}
