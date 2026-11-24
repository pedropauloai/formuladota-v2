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
  /** Já está na sala (bateu nos últimos 30 s): a lotação vale só para quem chega, nunca derruba quem já entrou. */
  alreadyIn: boolean;
}

type Link = { ok: true; role: MemberRole } | { ok: false; code: "fora_da_sala" | "expulso" | "banido" | "so_beneficio" };

function membership(input: AccessInput, room: RoomInfo, userId: string): Link {
  if (room.ownerId === userId) return { ok: true, role: "dono" };
  // Banido antes de expulso: o banido também é tirado das outras salas abertas do dono, e o motivo que
  // vale para ele é o banimento (todas as salas), não a remoção desta.
  if (input.bannedByOwner) return { ok: false, code: "banido" };
  if (input.member?.status === "expulso") return { ok: false, code: "expulso" };
  if (room.kind === "party") return input.inPartyNow ? { ok: true, role: "membro" } : { ok: false, code: "fora_da_sala" };
  if (room.kind === "mentoria") return input.member?.status === "ativo" ? { ok: true, role: "membro" } : { ok: false, code: "fora_da_sala" };
  if (room.audience === "beneficio" && !input.battlepass && !input.inPartyNow) return { ok: false, code: "so_beneficio" };
  if (room.kind === "texto") return { ok: true, role: "ouvinte" };
  if (room.voiceMode === "livre") return { ok: true, role: "falante" };
  return { ok: true, role: input.member?.role === "falante" ? "falante" : "ouvinte" };
}

/** Sala cheia: o dono sempre entra; no palco da live, o Battlepass e quem foi chamado a falar também
 *  (escolha 9). Na voz livre o limite é o tamanho do grupo (a party de 5 do Dota): ninguém fura. */
function passesWhenFull(room: RoomInfo, role: MemberRole, battlepass: boolean): boolean {
  if (role === "dono") return true;
  if (room.kind !== "palco" || room.voiceMode !== "palco") return false;
  return battlepass || role === "falante";
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
  const full = !input.alreadyIn && input.onlineOthers + 1 > room.maxMembers;
  if (full && !passesWhenFull(room, link.role, input.battlepass)) return { ok: false, code: "sala_lotada" };
  return link;
}
