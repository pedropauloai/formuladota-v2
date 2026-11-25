// Quais itens o menu do botão direito sobre uma pessoa mostra. Regra pura, testada sem tela: as
// mesmas do servidor (mensagem e convite para o grupo exigem amizade aceita; pedir amizade exige
// estar logado e não ter pedido entre os dois).

import type { FriendStatus } from "@/actions/public-profile";

export type PersonMenuItem = "perfil" | "mensagem" | "grupo" | "amizade" | "pedido" | "copiarNome" | "copiarDota";

export interface PersonMenuInput {
  /** Estado da amizade com quem olha; null enquanto o perfil ainda não chegou. */
  status: FriendStatus | null;
  /** Quem olha está logado. */
  loggedIn: boolean;
  /** A pessoa tem a Steam vinculada (dá para copiar o ID do Dota). */
  hasDota: boolean;
  /** O pedido de amizade acabou de sair por este menu. */
  requested: boolean;
}

export function personMenuItems({ status, loggedIn, hasDota, requested }: PersonMenuInput): PersonMenuItem[] {
  const items: PersonMenuItem[] = ["perfil"];
  if (loggedIn && status === "friends") items.push("mensagem", "grupo");
  if (loggedIn && status === "none") items.push(requested ? "pedido" : "amizade");
  if (loggedIn && status === "pending") items.push("pedido");
  if (status !== null) items.push("copiarNome");
  if (hasDota) items.push("copiarDota");
  return items;
}

const STEAM64_BASE = BigInt("76561197960265728");

/** O ID que o Dota usa para convidar (conta de 32 bits), a partir do SteamID64. */
export function dotaIdFromSteam64(steam64: string | null): string | null {
  if (!steam64 || !/^\d{17}$/.test(steam64)) return null;
  const id = BigInt(steam64) - STEAM64_BASE;
  return id > BigInt(0) ? id.toString() : null;
}
