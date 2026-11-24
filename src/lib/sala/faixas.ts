// Regras de faixa (spec, seções 8 e 11): quem publica o quê, quem recebe o quê, o rótulo de cada uma e
// a camada da tela de cada pessoa. O servidor confere antes de repassar ao SFU.

import { canPublishVoice, canShareScreen } from "./papeis";
import type { Layer, MemberRole, Quality, RoomKind, RuleDecision, ScreenPolicy, TrackKind, TrackLabel } from "./tipos";

export interface PublishInput {
  role: MemberRole;
  roomKind: RoomKind;
  screenPolicy: ScreenPolicy;
  partyScreenEnabled: boolean;
  /** Mutado pelo dono: não volta a publicar a voz até ser liberado. */
  forceMuted: boolean;
  /** Tipos das faixas novas deste pedido, tirados do SDP. */
  requested: TrackKind[];
  /** Faixas ativas desta pessoa na sessão atual. */
  mine: { audio: number; video: number };
  videoActiveByOthers: boolean;
  capReached: boolean;
}

export function decidePublish(input: PublishInput): RuleDecision {
  if (input.roomKind === "texto") return { ok: false, code: "sala_sem_midia" };
  if (input.requested.length === 0) return { ok: false, code: "faixa_demais" };
  const share = canShareScreen(input.role, input.roomKind, input.screenPolicy, input.partyScreenEnabled);
  const videos = input.requested.filter((k) => k === "video").length;
  const audios = input.requested.length - videos;
  if (videos > 0 && !share) return { ok: false, code: "tela_nao_permitida" };
  if (audios > 0 && !canPublishVoice(input.role)) return { ok: false, code: "voz_nao_permitida" };
  if (audios > 0 && input.forceMuted && input.role !== "dono") return { ok: false, code: "mutado_pelo_dono" };
  // Voz, e o áudio da tela de quem pode compartilhar.
  if (input.mine.audio + audios > (share ? 2 : 1)) return { ok: false, code: "faixa_demais" };
  if (input.mine.video + videos > 1) return { ok: false, code: "faixa_demais" };
  if (videos > 0 && input.videoActiveByOthers) return { ok: false, code: "tela_ocupada" };
  if (videos > 0 && input.capReached) return { ok: false, code: "teto_de_trafego" };
  return { ok: true };
}

export interface SubscribeTarget {
  roomId: string;
  userId: string;
  closed: boolean;
  tipo: TrackLabel | null;
  /** Quem publicou segue na sala e ainda pode publicar aquilo (não saiu, não foi expulso nem voltou à plateia). */
  publisherActive: boolean;
}

export interface SubscribeInput {
  subscriberUserId: string;
  roomId: string;
  target: SubscribeTarget | null;
  blockedPair: boolean;
  alreadySubscribed: boolean;
}

export function decideSubscribe(input: SubscribeInput): RuleDecision {
  const t = input.target;
  if (!t || t.closed || t.roomId !== input.roomId) return { ok: false, code: "faixa_inexistente" };
  if (t.userId === input.subscriberUserId) return { ok: false, code: "faixa_propria" };
  if (!t.tipo) return { ok: false, code: "faixa_sem_rotulo" };
  if (!t.publisherActive) return { ok: false, code: "membro_inativo" };
  if (input.blockedPair) return { ok: false, code: "bloqueado" };
  if (input.alreadySubscribed) return { ok: false, code: "ja_recebendo" };
  return { ok: true };
}

export function labelMatchesKind(tipo: TrackLabel, kind: TrackKind): boolean {
  return (tipo === "tela") === (kind === "video");
}

export function decideLabel(input: { tipo: TrackLabel; kind: TrackKind; canShare: boolean; canVoice: boolean; quality: Quality | null }): RuleDecision {
  if (!labelMatchesKind(input.tipo, input.kind)) return { ok: false, code: "rotulo_invalido" };
  if (input.tipo === "voz" && !input.canVoice) return { ok: false, code: "voz_nao_permitida" };
  if (input.tipo !== "voz" && !input.canShare) return { ok: false, code: "tela_nao_permitida" };
  if ((input.tipo === "tela") !== (input.quality !== null)) return { ok: false, code: "qualidade_invalida" };
  return { ok: true };
}

/** Quem ainda pode publicar aquele tipo de faixa, pelo papel de agora. */
export function publisherMayKeep(role: MemberRole, tipo: TrackLabel): boolean {
  return tipo === "voz" ? canPublishVoice(role) : role === "dono" || role === "membro";
}

export interface TrackView {
  sessionId: string;
  userId: string;
  trackName: string;
  tipo: TrackLabel | null;
}

/** Faixas que esta pessoa pode receber agora: rotuladas, de quem está online e ainda pode publicar
 *  aquilo, sem bloqueio entre os dois, nunca a própria. */
export function visibleTracks<T extends TrackView>(tracks: T[], me: string, members: Map<string, { role: MemberRole; online: boolean }>, blocked: Set<string>): T[] {
  return tracks.filter((t) => {
    const m = members.get(t.userId);
    return t.userId !== me && t.tipo !== null && !!m?.online && publisherMayKeep(m.role, t.tipo) && !blocked.has(t.userId);
  });
}

/** A mesma faixa pedida duas vezes num pedido só passaria pela checagem do banco e dobraria o tráfego. */
export function hasRepeatedPull(tracks: Array<{ sessionId?: string; trackName: string }>): boolean {
  const keys = tracks.map((t) => `${t.sessionId ?? ""}:${t.trackName}`);
  return new Set(keys).size !== keys.length;
}

/** O update do SFU também serve para reaproveitar um receptor e puxar outra faixa: aqui ele só troca a
 *  camada de uma recepção de tela que já existe, da mesma sessão e da mesma faixa. */
export function checkLayerUpdate(input: {
  requested: { location: string; sessionId?: string; trackName: string };
  sub: { publisherSessionId: string; trackName: string; kind: TrackKind } | null;
}): RuleDecision {
  const { requested: r, sub } = input;
  if (!sub) return { ok: false, code: "faixa_inexistente" };
  if (r.location !== "remote" || r.sessionId !== sub.publisherSessionId || r.trackName !== sub.trackName || sub.kind !== "video") {
    return { ok: false, code: "troca_invalida" };
  }
  return { ok: true };
}

/** Camada da tela de cada pessoa (spec, ADR-006): na sala pública, a leve por padrão e a alta só para
 *  quem pede enquanto o consumo dos 30 dias está abaixo de metade do teto. */
export function decideLayer(input: { roomKind: RoomKind; requested: Layer | null; usageBytes: number; capBytes: number }): Layer {
  if (input.roomKind !== "palco") return input.requested ?? "f";
  return input.requested === "f" && input.usageBytes < input.capBytes / 2 ? "f" : "h";
}
