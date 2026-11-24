// A medalha da credencial da vitrine (o rank e a posição no ranking da conta atual do PPA) e o
// resumo das partidas que ele registra no painel da fila (resultado, placar, herói), pelo OpenDota.
// A visita só lê a tabela store_owner_proof; quem renova é o cron de cada minuto: a cada hora, ou
// antes quando há partida registrada sem resumo. Cada partida se resume uma vez só.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { steam64To32 } from "@/lib/dota/opendota";
import { openDotaJson } from "@/lib/dota/opendota-fetch";
import type { Json } from "@/types/database";
import { buildOwnerProofData, parseOwnerProofData, reuseSummary, type OwnerProofData } from "./owner-proof-data";
import { summarizePartyMatch, type PartyMatchSummary } from "./fila/party-match";
import { registeredMatchAccounts } from "./fila/party-matches";
import { PPA_ACCOUNT_IDS } from "@/lib/battlepass/partida";

// Perfil de coach do dono da loja: dele saem a conta Steam e o avatar.
const OWNER_COACH_SLUG = "pedro-paulo";
// Uma hora para o rank (uma chamada ao OpenDota); partida registrada nova entra na próxima rodada.
const REFRESH_EVERY_MS = 60 * 60 * 1000;
const RETRY_EVERY_MINUTES = 10;
const FETCH_TIMEOUT_MS = 10_000;

export interface OwnerProof extends OwnerProofData {
  avatarUrl: string | null;
  /** account_id da Valve (32 bits), para os links de conferência. */
  accountId: number | null;
}

async function findOwner() {
  const supabase = createServiceClient();
  const { data: coach } = await supabase.from("coaches").select("profile_id").eq("slug", OWNER_COACH_SLUG).maybeSingle();
  if (!coach?.profile_id) return null;
  const [{ data: link }, { data: profile }] = await Promise.all([
    supabase.from("steam_links").select("steam_id_64, avatar_url").eq("user_id", coach.profile_id).maybeSingle(),
    supabase.from("profiles").select("avatar_url").eq("id", coach.profile_id).maybeSingle(),
  ]);
  return {
    accountId: link?.steam_id_64 ? steam64To32(link.steam_id_64) : null,
    // A credencial é da conta do Dota: avatar da Steam primeiro (o do Discord muda de endereço).
    avatarUrl: link?.avatar_url ?? profile?.avatar_url ?? null,
  };
}

async function readProof(): Promise<OwnerProofData | null> {
  const { data } = await createServiceClient().from("store_owner_proof").select("data").eq("id", 1).maybeSingle();
  return parseOwnerProofData(data?.data);
}

export const getOwnerProof = cache(async (): Promise<OwnerProof | null> => {
  try {
    const [owner, proof] = await Promise.all([findOwner(), readProof()]);
    if (!owner || !proof) return null;
    return { ...proof, ...owner };
  } catch (err) {
    // A prova é reforço da vitrine: sem ela a loja vende igual.
    console.error("[loja] prova do dono:", err instanceof Error ? err.message : err);
    return null;
  }
});

type Registered = Awaited<ReturnType<typeof registeredMatchAccounts>>;

/** O resumo de cada partida registrada: o do cache quando serve (reuseSummary); senão, da OpenDota. */
async function summarize(accountId: number, registered: Registered, current: OwnerProofData | null, now: Date): Promise<PartyMatchSummary[]> {
  const cached = new Map((current?.partyMatches ?? []).map((m) => [m.matchId, m]));
  const out: PartyMatchSummary[] = [];
  for (const r of registered) {
    const hit = cached.get(r.matchId);
    if (reuseSummary(hit, now.getTime())) {
      out.push(hit);
      continue;
    }
    try {
      const owners = [...new Set([accountId, ...PPA_ACCOUNT_IDS])];
      const summary = summarizePartyMatch(await openDotaJson<unknown>(`/matches/${r.matchId}`, { timeoutMs: FETCH_TIMEOUT_MS }), owners, r.accounts);
      if (summary) out.push(summary);
    } catch (err) {
      // Partida ainda processando na OpenDota: fica o que havia, e a próxima rodada tenta de novo.
      if (hit) out.push(hit);
      console.error("[loja] resumo da partida da party:", r.matchId, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

async function fetchOwnerData(accountId: number, now: Date, registered: Registered, current: OwnerProofData | null): Promise<OwnerProofData> {
  const [player, partyMatches] = await Promise.all([
    openDotaJson<unknown>(`/players/${accountId}`, { timeoutMs: FETCH_TIMEOUT_MS }),
    summarize(accountId, registered, current, now),
  ]);
  return buildOwnerProofData(player, now, partyMatches);
}

/**
 * Chamado pelo cron do site: renova a prova quando passou de uma hora, ou quando há partida
 * registrada sem resumo; tenta a cada 10 minutos. A falha lança, para o cron marcar a tarefa e
 * avisar se ela persistir.
 */
export async function refreshOwnerProof(now = new Date()): Promise<"fresco" | "aguardando" | "renovado" | "sem_dono"> {
  const [owner, current, registered] = await Promise.all([findOwner(), readProof(), registeredMatchAccounts()]);
  if (!owner?.accountId) return "sem_dono";
  // Partida nova (sem resumo) ou com resumo antigo (sem os heróis) puxa a rodada antes da hora; resumo sem resultado tenta de novo só na rodada de cada hora.
  const summarized = new Set((current?.partyMatches ?? []).filter((m) => m.partyHeroIds !== null).map((m) => m.matchId));
  const pending = registered.some((r) => !summarized.has(r.matchId));
  if (current && !pending && now.getTime() - new Date(current.syncedAt).getTime() < REFRESH_EVERY_MS) return "fresco";
  if (now.getUTCMinutes() % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  const data = await fetchOwnerData(owner.accountId, now, registered, current);
  const { error } = await createServiceClient()
    .from("store_owner_proof")
    .upsert({ id: 1, data: data as unknown as Json, refreshed_at: now.toISOString() }, { onConflict: "id" });
  if (error) throw new Error(`gravar store_owner_proof falhou: ${error.message}`);
  return "renovado";
}
