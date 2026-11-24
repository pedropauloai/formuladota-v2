// Quem está na sala agora: tem linha de membro ativa e bateu nos últimos 30 s (o batimento é a cada 10 s).
// Trava do chat e da lotação (quem já está dentro não conta como pessoa nova).

import type { MemberStatus } from "./tipos";

export const PRESENTE_MS = 30_000;

export function isPresent(member: { status: MemberStatus; lastSeenAt: string | null } | null, now: Date): boolean {
  if (!member || member.status !== "ativo" || !member.lastSeenAt) return false;
  return now.getTime() - new Date(member.lastSeenAt).getTime() < PRESENTE_MS;
}
