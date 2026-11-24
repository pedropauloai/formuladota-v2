// Tipos do domínio das salas de voz (spec: docs/comunicacao/spec.md), compartilhados entre as regras
// puras, o servidor e a tela.

/** palco: canal de voz (ou a sala da live); texto: canal só de chat; mentoria e party: salas privadas. */
export type RoomKind = "palco" | "mentoria" | "party" | "texto";
/** Canal de voz: palco (a plateia ouve e o dono chama para falar) ou livre (quem entra já fala). */
export type VoiceMode = "palco" | "livre";
export type RoomStatus = "aberta" | "encerrada";
/** dono; membro (mentoria e party); falante e ouvinte (sala pública). */
export type MemberRole = "dono" | "membro" | "falante" | "ouvinte";
export type MemberStatus = "ativo" | "expulso";
export type ScreenPolicy = "dono" | "um_por_vez";
export type Audience = "todos" | "beneficio";
export type TrackKind = "audio" | "video";
export type TrackLabel = "voz" | "tela" | "tela_audio";
export type Quality = "leve" | "padrao" | "alta" | "fluida";
/** Camada da tela: f (a qualidade escolhida) e h (metade da resolução). */
export type Layer = "f" | "h";

export interface RoomInfo {
  id: string;
  kind: RoomKind;
  title: string;
  status: RoomStatus;
  ownerId: string;
  isTest: boolean;
  maxMembers: number;
  screenPolicy: ScreenPolicy;
  audience: Audience;
  chatOpen: boolean;
  closesAt: string;
  voiceMode: VoiceMode;
  /** Lugar na lista de canais do servidor; nulo nas salas privadas. */
  channelPosition: number | null;
}

export interface MemberInfo {
  role: MemberRole;
  status: MemberStatus;
  forceMuted: boolean;
}

/** Motivo de recusa de entrada, na ordem em que a regra confere (seção 8 da spec). */
export type DenyCode =
  | "flag_desligada"
  | "sem_login"
  | "sala_inexistente"
  | "fora_da_sala"
  | "expulso"
  | "banido"
  | "so_beneficio"
  | "sala_encerrada"
  | "conta_sem_identidade"
  | "conta_bloqueada"
  | "sem_maioridade"
  | "sala_lotada";

export type AccessDecision = { ok: true; role: MemberRole } | { ok: false; code: DenyCode };

/** Motivo de recusa ao publicar, receber ou rotular uma faixa. */
export type TrackDenyCode =
  | "faixa_demais"
  | "voz_nao_permitida"
  | "mutado_pelo_dono"
  | "tela_nao_permitida"
  | "tela_ocupada"
  | "teto_de_trafego"
  | "faixa_inexistente"
  | "faixa_propria"
  | "faixa_sem_rotulo"
  | "membro_inativo"
  | "bloqueado"
  | "ja_recebendo"
  | "rotulo_invalido"
  | "qualidade_invalida"
  | "troca_invalida"
  | "sala_sem_midia";

export type RuleDecision = { ok: true } | { ok: false; code: TrackDenyCode };
