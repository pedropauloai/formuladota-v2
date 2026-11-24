// Tipos do domínio da sala de voz (spec: docs/comunicacao/spec.md), compartilhados entre as regras
// puras, o servidor e a tela.

export type RoomKind = "mentoria" | "party";
export type RoomStatus = "aberta" | "encerrada";
export type MemberRole = "dono" | "membro";
export type MemberStatus = "ativo" | "expulso";
export type ScreenPolicy = "dono" | "um_por_vez";
export type TrackKind = "audio" | "video";
export type TrackLabel = "voz" | "tela" | "tela_audio";

export interface RoomInfo {
  id: string;
  kind: RoomKind;
  status: RoomStatus;
  ownerId: string;
  isTest: boolean;
  maxMembers: number;
  screenPolicy: ScreenPolicy;
  closesAt: string;
}

export interface MemberInfo {
  userId: string;
  role: MemberRole;
  status: MemberStatus;
}

/** Motivo de recusa de entrada, na ordem em que a regra confere (seção 8 da spec). */
export type DenyCode =
  | "flag_desligada"
  | "sala_inexistente"
  | "sala_encerrada"
  | "sem_login"
  | "conta_sem_identidade"
  | "conta_bloqueada"
  | "sem_data_de_nascimento"
  | "menor_de_idade"
  | "fora_da_sala"
  | "expulso"
  | "sala_lotada";

export type AccessDecision = { ok: true; role: MemberRole } | { ok: false; code: DenyCode };

/** Motivo de recusa ao publicar, receber ou rotular uma faixa. */
export type TrackDenyCode =
  | "faixa_demais"
  | "tela_nao_permitida"
  | "tela_ocupada"
  | "teto_de_trafego"
  | "faixa_inexistente"
  | "faixa_propria"
  | "faixa_sem_rotulo"
  | "membro_inativo"
  | "bloqueado"
  | "ja_recebendo"
  | "rotulo_invalido";

export type RuleDecision = { ok: true } | { ok: false; code: TrackDenyCode };
