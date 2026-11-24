// Regras de faixa (spec, seções 8 e 11): quem publica o quê, quem recebe o quê e o rótulo de cada uma.
// O servidor confere antes de repassar ao SFU; a tela só esconde o botão, não decide.

import type { MemberRole, RoomKind, RuleDecision, ScreenPolicy, TrackKind, TrackLabel } from "./tipos";

export function canShareScreen(role: MemberRole, roomKind: RoomKind, policy: ScreenPolicy, partyScreenEnabled: boolean): boolean {
  if (role === "dono") return roomKind === "mentoria" || partyScreenEnabled;
  return roomKind === "mentoria" && policy === "um_por_vez";
}

export interface PublishInput {
  role: MemberRole;
  roomKind: RoomKind;
  screenPolicy: ScreenPolicy;
  partyScreenEnabled: boolean;
  /** Tipos das faixas novas deste pedido, tirados do SDP. */
  requested: TrackKind[];
  /** Faixas ativas desta pessoa na sessão atual. */
  mine: { audio: number; video: number };
  videoActiveByOthers: boolean;
  capReached: boolean;
}

export function decidePublish(input: PublishInput): RuleDecision {
  if (input.requested.length === 0) return { ok: false, code: "faixa_demais" };
  const share = canShareScreen(input.role, input.roomKind, input.screenPolicy, input.partyScreenEnabled);
  const videos = input.requested.filter((k) => k === "video").length;
  const audios = input.requested.length - videos;
  if (videos > 0 && !share) return { ok: false, code: "tela_nao_permitida" };
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
  /** Quem publicou continua membro ativo (não foi expulso nem saiu da party). */
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

export function decideLabel(input: { tipo: TrackLabel; kind: TrackKind; canShare: boolean }): RuleDecision {
  if (!labelMatchesKind(input.tipo, input.kind)) return { ok: false, code: "rotulo_invalido" };
  if (input.tipo !== "voz" && !input.canShare) return { ok: false, code: "tela_nao_permitida" };
  return { ok: true };
}

export interface TrackView {
  sessionId: string;
  userId: string;
  trackName: string;
  tipo: TrackLabel | null;
}

/** Faixas que esta pessoa pode receber agora: rotuladas, de quem está online, sem bloqueio, nunca a própria. */
export function visibleTracks<T extends TrackView>(tracks: T[], me: string, online: Set<string>, blocked: (a: string, b: string) => boolean): T[] {
  return tracks.filter((t) => t.userId !== me && t.tipo !== null && online.has(t.userId) && !blocked(me, t.userId));
}
