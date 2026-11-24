// Quem entra na sala de voz (spec, seção 8). Uma regra só, usada na entrada e em toda chamada ao SFU.
// A ordem importa: quem está sem login ou fora da sala não descobre se ela existe ou foi encerrada.

import { isMinor } from "./idade";
import type { AccessDecision, MemberInfo, RoomInfo } from "./tipos";

export interface AccessInput {
  flagOn: boolean;
  now: Date;
  room: RoomInfo | null;
  userId: string | null;
  /** Identidade do Discord ou Steam vinculada: conta só de e-mail não entra. */
  identityOk: boolean;
  /** Conta banida ou suspensa. */
  blocked: boolean;
  birthDate: string | null;
  member: MemberInfo | null;
  /** Na party: reserva `na_party` no mesmo ambiente (`is_test`) da sala, conferida a cada chamada. */
  inPartyNow: boolean;
  /** Pessoas online na sala, sem contar quem pede. */
  onlineOthers: number;
  alreadyOnline: boolean;
}

function membership(input: AccessInput, room: RoomInfo, userId: string): AccessDecision {
  if (room.ownerId === userId) return { ok: true, role: "dono" };
  if (input.member?.status === "expulso") return { ok: false, code: "expulso" };
  if (room.kind === "party") return input.inPartyNow ? { ok: true, role: "membro" } : { ok: false, code: "fora_da_sala" };
  if (input.member?.status === "ativo") return { ok: true, role: "membro" };
  return { ok: false, code: "fora_da_sala" };
}

export function decideRoomAccess(input: AccessInput): AccessDecision {
  if (!input.flagOn) return { ok: false, code: "flag_desligada" };
  if (!input.userId) return { ok: false, code: "sem_login" };
  const room = input.room;
  if (!room) return { ok: false, code: "sala_inexistente" };
  const member = membership(input, room, input.userId);
  if (!member.ok) return member;
  if (room.status !== "aberta" || new Date(room.closesAt) <= input.now) return { ok: false, code: "sala_encerrada" };
  if (!input.identityOk) return { ok: false, code: "conta_sem_identidade" };
  if (input.blocked) return { ok: false, code: "conta_bloqueada" };
  if (!input.birthDate) return { ok: false, code: "sem_data_de_nascimento" };
  if (isMinor(input.birthDate, input.now)) return { ok: false, code: "menor_de_idade" };
  const full = !input.alreadyOnline && input.onlineOthers + 1 > room.maxMembers;
  if (full && member.role !== "dono") return { ok: false, code: "sala_lotada" };
  return member;
}
