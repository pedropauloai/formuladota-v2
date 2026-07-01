// Event bus leve pra abrir uma conversa de qualquer lugar (lista de amigos,
// hover card, party) sem precisar de Context atravessando o shell inteiro.
// A ChatBar (montada no shell) escuta OPEN_CHAT_EVENT e abre a aba de DM.

export interface OpenChatDetail {
  userId: string;
  name: string;
  avatar: string | null;
}

export const OPEN_CHAT_EVENT = "fd:open-chat";

/** Abre (ou foca) a janela de chat com este usuário. Client-only. */
export function openChatWith(detail: OpenChatDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}
