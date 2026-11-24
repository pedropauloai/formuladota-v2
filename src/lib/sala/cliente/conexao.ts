// Único arquivo do app que importa o partytracks (spec, ADR-003): trocar por um cliente próprio
// mexe só aqui. O partytracks fala com /api/sala/[id]/rtc, que autoriza e repassa ao SFU.

import { PartyTracks } from "partytracks/client";
import { of, type Subscription } from "rxjs";
import type { RawStat } from "../metricas";

export interface TrackRef {
  sessionId: string;
  trackName: string;
}

export interface Connection {
  sessionId(): string | null;
  publish(track: MediaStreamTrack, encodings: RTCRtpEncodingParameters[], onReady: (ref: TrackRef) => void): () => void;
  receive(ref: TrackRef, onTrack: (track: MediaStreamTrack) => void): () => void;
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
    receive(ref, onTrack) {
      const sub = pt.pull(of({ location: "remote", sessionId: ref.sessionId, trackName: ref.trackName })).subscribe({
        next: onTrack,
        error: (err: unknown) => console.error("[sala] receber faixa:", err),
      });
      return () => sub.unsubscribe();
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
