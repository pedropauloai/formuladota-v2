// Ritmo das consultas do navegador (spec, ADR-004, feito para o plano grátis do Supabase): o estado
// comum a cada 2 ou 3 s sai da memória do servidor; o batimento, que vai ao banco, a cada 10 s ou
// quando a pessoa muta ou levanta a mão; as métricas da plateia da sala pública, a cada 30 s.

import type { MemberRole, RoomKind } from "../tipos";

export const BEAT_MS = 10_000;

export function estadoIntervalMs(papel: MemberRole): number {
  return papel === "ouvinte" ? 3000 : 2000;
}

export function beatDue(input: { now: number; lastBeatAt: number | null; changed: boolean }): boolean {
  return input.changed || input.lastBeatAt === null || input.now - input.lastBeatAt >= BEAT_MS;
}

export function statsEveryBeats(papel: MemberRole, tipo: RoomKind): number {
  return tipo === "palco" && papel === "ouvinte" ? 3 : 1;
}
