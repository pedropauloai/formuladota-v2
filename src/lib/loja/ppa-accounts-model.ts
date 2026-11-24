// Regras puras do cadastro das contas do Dota em que o PPA joga: ler o que ele cola no painel (número
// da conta, Steam64 ou link da OpenDota, Dotabuff, STRATZ ou Steam) e ordenar a lista para achar o PPA
// numa partida (as contas dele antes das emprestadas).

export type PpaAccountKind = "propria" | "emprestada";

export interface PpaAccount {
  accountId: number;
  label: string;
  kind: PpaAccountKind;
  createdAt: string;
}

const STEAM64_BASE = BigInt("76561197960265728");
const MAX_ACCOUNT = 4294967295;

/** O número da conta (32 bits) a partir do número ou de um link; null quando não dá para ler. */
export function parseAccountInput(input: string): number | null {
  const text = input.trim();
  const fromLink = text.match(/(?:opendota\.com|dotabuff\.com|stratz\.com)\/players\/(\d+)/i)?.[1];
  const fromSteam = text.match(/steamcommunity\.com\/profiles\/(\d{17})/i)?.[1];
  const digits = fromLink ?? fromSteam ?? (/^\d+$/.test(text) ? text : null);
  if (!digits) return null;
  const value = BigInt(digits);
  const account = value >= STEAM64_BASE ? value - STEAM64_BASE : value;
  return account > BigInt(0) && account < BigInt(MAX_ACCOUNT) ? Number(account) : null;
}

/** As contas na ordem em que o site procura o PPA: as dele primeiro, depois as emprestadas. */
export function accountSearchOrder(accounts: readonly PpaAccount[]): number[] {
  const rank = (a: PpaAccount) => (a.kind === "propria" ? 0 : 1);
  return [...accounts].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt)).map((a) => a.accountId);
}
