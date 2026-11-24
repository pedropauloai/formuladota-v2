// Único arquivo do app que importa o partytracks (spec, ADR-003): trocar por um cliente próprio
// mexe só aqui. O partytracks fala com /api/sala/[id]/rtc, que autoriza e repassa ao SFU.

import { PartyTracks } from "partytracks/client";
import { BehaviorSubject, of, type Subscription } from "rxjs";
import type { RawStat } from "../metricas";
import type { Layer } from "../tipos";

export interface TrackRef {
  sessionId: string;
  trackName: string;
}

export interface Recebimento {
  stop: () => void;
  /** Troca a camada da tela (o servidor decide a que vale pela regra de custo). */
  setLayer: (rid: Layer) => void;
}

/** Publicação cuja faixa pode ser trocada na mesma faixa do SFU (replaceTrack, sem renegociar). */
export interface Publicacao {
  parar: () => void;
  trocar: (track: MediaStreamTrack) => void;
}

export interface Connection {
  sessionId(): string | null;
  publish(track: MediaStreamTrack, encodings: RTCRtpEncodingParameters[], onReady: (ref: TrackRef) => void): () => void;
  publishTrocavel(track: MediaStreamTrack, encodings: RTCRtpEncodingParameters[], onReady: (ref: TrackRef) => void): Publicacao;
  receive(ref: TrackRef, onTrack: (track: MediaStreamTrack) => void, layer?: Layer): Recebimento;
  stats(): Promise<RawStat[]>;
  onState(listener: (state: RTCPeerConnectionState) => void): void;
  close(): void;
}

/** Vídeo da tela: sob aperto de banda ou de processador, mantém a resolução e baixa quadros. */
function keepResolution(transceiver: RTCRtpTransceiver): void {
  const sender = transceiver.sender;
  if (sender.track?.kind !== "video") return;
  const params = sender.getParameters();
  params.degradationPreference = "maintain-resolution";
  sender.setParameters(params).catch(() => null);
}

export function createConnection(opts: { roomId: string; iceServers: RTCIceServer[] }): Connection {
  const pt = new PartyTracks({ prefix: `/api/sala/${opts.roomId}/rtc`, iceServers: opts.iceServers });
  const subs: Subscription[] = [];
  const listeners: Array<(state: RTCPeerConnectionState) => void> = [];
  let pc: RTCPeerConnection | null = null;
  let sid: string | null = null;
  subs.push(pt.session$.subscribe(({ peerConnection, sessionId }) => { pc = peerConnection; sid = sessionId; }));
  subs.push(pt.peerConnectionState$.subscribe((state) => listeners.forEach((l) => l(state))));
  subs.push(pt.transceiver$.subscribe(keepResolution));

  return {
    sessionId: () => sid,
    publish(track, encodings, onReady) {
      const sub = pt.push(of(track), { sendEncodings$: of(encodings) }).subscribe({
        next: (meta) => { if (meta.sessionId && meta.trackName) onReady({ sessionId: meta.sessionId, trackName: meta.trackName }); },
        error: (err: unknown) => console.error("[sala] publicar faixa:", err),
      });
      return () => sub.unsubscribe();
    },
    publishTrocavel(track, encodings, onReady) {
      const track$ = new BehaviorSubject<MediaStreamTrack>(track);
      const sub = pt.push(track$, { sendEncodings$: of(encodings) }).subscribe({
        next: (meta) => { if (meta.sessionId && meta.trackName) onReady({ sessionId: meta.sessionId, trackName: meta.trackName }); },
        error: (err: unknown) => console.error("[sala] publicar faixa:", err),
      });
      return { parar: () => sub.unsubscribe(), trocar: (novo) => track$.next(novo) };
    },
    receive(ref, onTrack, layer) {
      const meta = of({ location: "remote" as const, sessionId: ref.sessionId, trackName: ref.trackName });
      const rid$ = layer ? new BehaviorSubject<Layer>(layer) : null;
      const pulled = rid$ ? pt.pull(meta, { simulcast: { preferredRid$: rid$ } }) : pt.pull(meta);
      const sub = pulled.subscribe({
        next: onTrack,
        error: (err: unknown) => console.error("[sala] receber faixa:", err),
      });
      return {
        stop: () => sub.unsubscribe(),
        setLayer: (rid) => { if (rid$ && rid$.value !== rid) rid$.next(rid); },
      };
    },
    async stats() {
      if (!pc) return [];
      const report = await pc.getStats();
      const out: RawStat[] = [];
      report.forEach((value) => out.push(value as RawStat));
      return out;
    },
    onState(listener) {
      listeners.push(listener);
    },
    close() {
      subs.forEach((s) => s.unsubscribe());
      subs.length = 0;
      pc = null;
      sid = null;
    },
  };
}
