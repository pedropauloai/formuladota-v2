// STRATZ GraphQL: vitórias e partidas por dia, herói e função, na medalha Imortal (IMMORTAL é a medalha
// inteira, sem as partidas de 8.500+ que a Valve esconde das APIs desde 2025). Um pedido só, com um
// apelido por função; o winDay devolve até 30 dias fechados em UTC, com cerca de 1 dia de atraso.
// Auth = Bearer + User-Agent "STRATZ_API" (sem o UA a STRATZ devolve 403).

import { serverEnv } from "@/lib/env";
import { POSITIONS, groupWinDays, type MetaDay } from "./days";

const STRATZ_ENDPOINT = "https://api.stratz.com/graphql";
const STRATZ_TIMEOUT_MS = 20_000;
/** O máximo que o winDay devolve (medido em 24/11/2026: take 40 trouxe 30 dias). */
export const STRATZ_MAX_DAYS = 30;

export function immortalDaysQuery(take: number): string {
  const aliases = POSITIONS.map(
    (p) => `p${p}: winDay(take: ${take}, bracketIds: [IMMORTAL], positionIds: [POSITION_${p}]) { day heroId matchCount winCount }`
  ).join(" ");
  return `{ heroStats { ${aliases} } }`;
}

/** Dia a dia das 5 funções no Imortal. Lança em qualquer falha (HTTP, GraphQL ou resposta vazia). */
export async function queryImmortalDays(take = STRATZ_MAX_DAYS): Promise<MetaDay[]> {
  const token = serverEnv.STRATZ_API_KEY;
  if (!token) throw new Error("STRATZ_API_KEY ausente");
  const res = await fetch(STRATZ_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "STRATZ_API" },
    body: JSON.stringify({ query: immortalDaysQuery(take) }),
    cache: "no-store",
    signal: AbortSignal.timeout(STRATZ_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`STRATZ HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { heroStats?: Record<string, unknown> }; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`STRATZ GraphQL: ${json.errors[0]?.message ?? "erro"}`);
  const heroStats = json.data?.heroStats ?? {};
  const days = groupWinDays(Object.fromEntries(POSITIONS.map((p) => [p, heroStats[`p${p}`]])));
  if (days.length === 0) throw new Error("STRATZ devolveu o dia a dia vazio");
  return days;
}
