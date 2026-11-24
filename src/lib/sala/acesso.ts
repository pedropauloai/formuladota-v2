// Quem entra na sala de voz (spec, seção 8). Uma regra só, usada na entrada, no batimento e em toda
// chamada ao SFU. A ordem importa: quem está sem login ou fora de uma sala privada não descobre se
// ela existe ou foi encerrada.

import type { AccessDecision, MemberInfo, MemberRole, RoomInfo } from "./tipos";

export interface AccessInput {
  flagOn: boolean;
  now: Date;
  userId: string | null;
  room: RoomInfo | null;
  /** A linha da pessoa nesta sala, se existe. */
  member: MemberInfo | null;
  /** Identidade do Discord ou Steam vinculada: conta só de e-mail não entra. */
  identityOk: boolean;
  /** Conta banida ou suspensa no site (a regra do middleware). */
  accountBlocked: boolean;
  /** A marcação "tenho 18 anos ou mais" (decisão do PPA de 23/11/2026). */
  ageConfirmed: boolean;
  /** Banida pelo dono: não entra em nenhuma sala dele. */
  bannedByOwner: boolean;
  /** Reserva `na_party` agora, no mesmo ambiente (`is_test`) da sala. */
  inPartyNow: boolean;
  battlepass: boolean;
  /** Pessoas online na sala, sem contar quem pede. */
  onlineOthers: number;
}

type Link = { ok: true; role: MemberRole } | { ok: false; code: "fora_da_sala" | "expulso" | "banido" | "so_beneficio" };

function membership(input: AccessInput, room: RoomInfo, userId: string): Link {
  if (room.ownerId === userId) return { ok: true, role: "dono" };
  if (input.member?.status === "expulso") return { ok: false, code: "expulso" };
  if (input.bannedByOwner) return { ok: false, code: "banido" };
  if (room.kind === "party") return input.inPartyNow ? { ok: true, role: "membro" } : { ok: false, code: "fora_da_sala" };
  if (room.kind === "mentoria") return input.member?.status === "ativo" ? { ok: true, role: "membro" } : { ok: false, code: "fora_da_sala" };
  if (room.audience === "beneficio" && !input.battlepass && !input.inPartyNow) return { ok: false, code: "so_beneficio" };
  return { ok: true, role: input.member?.role === "falante" ? "falante" : "ouvinte" };
}

/** Sala cheia: o dono sempre entra; na sala pública, quem está no palco e o Battlepass também (escolha 9). */
function passesWhenFull(room: RoomInfo, role: MemberRole, battlepass: boolean): boolean {
  if (role === "dono") return true;
  return room.kind === "palco" && (role === "falante" || battlepass);
}

export function decideRoomAccess(input: AccessInput): AccessDecision {
  if (!input.flagOn) return { ok: false, code: "flag_desligada" };
  if (!input.userId) return { ok: false, code: "sem_login" };
  const room = input.room;
  if (!room) return { ok: false, code: "sala_inexistente" };
  const link = membership(input, room, input.userId);
  if (!link.ok) return link;
  if (room.status !== "aberta" || new Date(room.closesAt) <= input.now) return { ok: false, code: "sala_encerrada" };
  if (!input.identityOk) return { ok: false, code: "conta_sem_identidade" };
  if (input.accountBlocked) return { ok: false, code: "conta_bloqueada" };
  if (!input.ageConfirmed) return { ok: false, code: "sem_maioridade" };
  const full = input.onlineOthers + 1 > room.maxMembers;
  if (full && !passesWhenFull(room, link.role, input.battlepass)) return { ok: false, code: "sala_lotada" };
  return link;
}
