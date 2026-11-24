// Monta a resposta do estado da sala para uma pessoa (função pura, testada): a decisão de acesso
// guardada até o próximo batimento mais o estado comum da sala (até 3 s). O que vale para a tela
// (papel, microfone liberado, chat) vem do estado comum, que é o mais novo.

import { capBytesFor } from "./custo";
import { publisherMayKeep, visibleTracks } from "./faixas";
import type { Verdict } from "./contexto";
import type { RawSnapshot } from "./memoria";
import { canChat, canPublishVoice, canRaiseHand, canShareScreen } from "./papeis";
import type { DenyCode, MemberRole, Quality, RoomKind, TrackDenyCode, TrackLabel } from "./tipos";

export interface MembroEstado {
  userId: string;
  papel: MemberRole;
  online: boolean;
  mutado: boolean;
  mutadoPeloDono: boolean;
  maoDesde: string | null;
  compartilhandoTela: boolean;
  bloqueado: boolean;
}

export interface FaixaEstado {
  sessionId: string;
  trackName: string;
  tipo: TrackLabel;
  userId: string;
  qualidade: Quality | null;
}

export interface MensagemEstado {
  id: number;
  userId: string | null;
  texto: string;
  em: string;
}

export interface Estado {
  saida: DenyCode | null;
  eu?: {
    userId: string;
    papel: MemberRole;
    podeFalar: boolean;
    mutadoPeloDono: boolean;
    podeLevantarMao: boolean;
    maoDesde: string | null;
    podeEscrever: boolean;
    podeCompartilharTela: boolean;
    motivoTela: TrackDenyCode | null;
  };
  sala?: { titulo: string; tipo: RoomKind; fechaEm: string; chatAberto: boolean; lugares: number; falantesMax: number; videoMaxKbps: number };
  membros?: MembroEstado[];
  faixas?: FaixaEstado[];
  chat?: MensagemEstado[];
  apagadas?: number[];
}

function screenReason(v: Verdict, role: MemberRole, othersSharing: boolean): TrackDenyCode | null {
  const { room, settings } = v;
  if (!room || !settings || !canShareScreen(role, room.kind, room.screenPolicy, settings.partyScreenEnabled)) return "tela_nao_permitida";
  if (othersSharing) return "tela_ocupada";
  // Sala de teste conta o próprio consumo na hora de publicar; aqui vale o de produção (o aviso da tela).
  if (!room.isTest && settings.usageBytes30d >= capBytesFor(settings.capGb30d)) return "teto_de_trafego";
  return null;
}

export function compose(v: Verdict, snap: RawSnapshot, me: string, decided: MemberRole, chatAfter: number): Estado {
  const room = v.room as NonNullable<Verdict["room"]>;
  const settings = v.settings as NonNullable<Verdict["settings"]>;
  const live = snap.room ?? { status: room.status, chat_open: room.chatOpen, closes_at: room.closesAt };
  const mine = snap.members.find((m) => m.u === me);
  // O papel do estado comum (até 3 s) chega antes do próximo batimento: chamado ao palco, a pessoa fala
  // logo. A trava continua no servidor, que confere o papel no banco a cada publicação.
  const role: MemberRole = mine?.r ?? decided;
  const roles = new Map(snap.members.map((m) => [m.u, { role: m.r, online: m.on }]));
  roles.set(me, { role, online: true });
  const blocked = new Set(v.blocked);
  const sharing = new Set(snap.tracks.filter((t) => t.t === "tela" && publisherMayKeep(roles.get(t.u)?.role ?? "ouvinte", "tela")).map((t) => t.u));
  // No estado comum, "f" só vem quando é verdadeiro: sem ele, o dono já liberou.
  const forceMuted = mine ? !!mine.f : (v.member?.forceMuted ?? false);
  const motivoTela = screenReason(v, role, [...sharing].some((id) => id !== me));
  const tracks = visibleTracks(snap.tracks.map((t) => ({ sessionId: t.s, userId: t.u, trackName: t.n, tipo: t.t, qualidade: t.q ?? null })), me, roles, blocked);
  const membros: MembroEstado[] = snap.members.map((m) => ({
    userId: m.u, papel: m.u === me ? role : m.r, online: m.on || m.u === me, mutado: m.m, mutadoPeloDono: !!m.f,
    maoDesde: m.h ?? null, compartilhandoTela: sharing.has(m.u), bloqueado: blocked.has(m.u),
  }));
  if (!mine) membros.push({ userId: me, papel: role, online: true, mutado: true, mutadoPeloDono: forceMuted, maoDesde: null, compartilhandoTela: false, bloqueado: false });
  return {
    saida: null,
    eu: {
      userId: me, papel: role, podeFalar: canPublishVoice(role) && !(forceMuted && role !== "dono"), mutadoPeloDono: forceMuted,
      podeLevantarMao: canRaiseHand(role, room.kind), maoDesde: mine?.h ?? null,
      podeEscrever: canChat(role, room.kind, live.chat_open), podeCompartilharTela: motivoTela === null, motivoTela,
    },
    sala: { titulo: room.title, tipo: room.kind, fechaEm: live.closes_at, chatAberto: live.chat_open, lugares: room.maxMembers, falantesMax: settings.palcoMaxSpeakers, videoMaxKbps: settings.videoMaxKbps },
    membros,
    faixas: tracks.map((t) => ({ sessionId: t.sessionId, trackName: t.trackName, tipo: t.tipo as TrackLabel, userId: t.userId, qualidade: t.qualidade })),
    chat: snap.chat.filter((m) => m.i > chatAfter).map((m) => ({ id: m.i, userId: m.u, texto: m.b, em: m.a })),
    apagadas: snap.deleted,
  };
}
