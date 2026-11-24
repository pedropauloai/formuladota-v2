// O que cada papel faz na sala (spec, seção 8) e as ações de moderação do dono e do chat. O servidor
// confere antes de gravar ou repassar ao SFU; a tela só esconde o botão, não decide.

import type { MemberRole, MemberStatus, RoomKind, ScreenPolicy } from "./tipos";

export function canPublishVoice(role: MemberRole): boolean {
  return role !== "ouvinte";
}

export function canShareScreen(role: MemberRole, roomKind: RoomKind, policy: ScreenPolicy, partyScreenEnabled: boolean): boolean {
  if (role === "dono") return roomKind !== "party" || partyScreenEnabled;
  return role === "membro" && roomKind === "mentoria" && policy === "um_por_vez";
}

export function canRaiseHand(role: MemberRole, roomKind: RoomKind): boolean {
  return roomKind === "palco" && role === "ouvinte";
}

export function canChat(role: MemberRole, roomKind: RoomKind, chatOpen: boolean): boolean {
  return roomKind === "palco" && (chatOpen || role === "dono");
}

export type StageAction = "falar" | "ouvir" | "mutar" | "liberar" | "expulsar" | "banir";
export type StageDenyCode = "so_o_dono" | "dono_nao_sai" | "fora_da_sala" | "palco_cheio" | "so_na_sala_publica";

export interface StageActionInput {
  action: StageAction;
  actorRole: MemberRole;
  roomKind: RoomKind;
  targetIsOwner: boolean;
  /** A linha do alvo nesta sala; banir vale também para quem já foi expulso. */
  target: { role: MemberRole; status: MemberStatus } | null;
  /** Quantos falam agora, além do dono. */
  speakers: number;
  maxSpeakers: number;
}

export type StageDecision = { ok: true; role?: MemberRole } | { ok: false; code: StageDenyCode };

export function decideStageAction(input: StageActionInput): StageDecision {
  if (input.actorRole !== "dono") return { ok: false, code: "so_o_dono" };
  if (input.targetIsOwner) return { ok: false, code: "dono_nao_sai" };
  const t = input.target;
  if (!t || (t.status !== "ativo" && input.action !== "banir")) return { ok: false, code: "fora_da_sala" };
  if (input.action === "falar" || input.action === "ouvir") {
    if (input.roomKind !== "palco") return { ok: false, code: "so_na_sala_publica" };
    if (input.action === "ouvir") return { ok: true, role: "ouvinte" };
    if (t.role !== "falante" && input.speakers >= input.maxSpeakers) return { ok: false, code: "palco_cheio" };
    return { ok: true, role: "falante" };
  }
  return { ok: true };
}

export const CHAT_MAX = 300;
const CHAT_INTERVALO_MS = 2000;

export type ChatDenyCode = "chat_indisponivel" | "chat_fechado" | "mensagem_invalida" | "devagar";

export interface ChatInput {
  roomKind: RoomKind;
  role: MemberRole;
  chatOpen: boolean;
  body: string;
  lastSentAt: Date | null;
  now: Date;
}

export function decideChat(input: ChatInput): { ok: true; body: string } | { ok: false; code: ChatDenyCode } {
  if (input.roomKind !== "palco") return { ok: false, code: "chat_indisponivel" };
  if (!canChat(input.role, input.roomKind, input.chatOpen)) return { ok: false, code: "chat_fechado" };
  const body = input.body.replace(/\s+/g, " ").trim();
  if (body.length === 0 || body.length > CHAT_MAX) return { ok: false, code: "mensagem_invalida" };
  if (input.lastSentAt && input.now.getTime() - input.lastSentAt.getTime() < CHAT_INTERVALO_MS) return { ok: false, code: "devagar" };
  return { ok: true, body };
}
