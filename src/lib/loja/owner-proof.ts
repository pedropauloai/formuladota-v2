// A medalha da credencial da vitrine: o rank e a posição no ranking da conta atual do Pedro, pelo
// OpenDota. A visita só lê a tabela store_owner_proof; quem renova é o cron de cada minuto, no
// máximo a cada 6 horas.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { serverEnv } from "@/lib/env";
import { OPENDOTA_BASE, steam64To32 } from "@/lib/dota/opendota";
import type { Json } from "@/types/database";
import { buildOwnerProofData, parseOwnerProofData, type OwnerProofData } from "./owner-proof-data";

// Perfil de coach do dono da loja: dele saem a conta Steam e o avatar.
const OWNER_COACH_SLUG = "pedro-paulo";
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} respondeu ${res.status}`);
  return res.json();
}

async function fetchOwnerData(accountId: number, now: Date): Promise<OwnerProofData> {
  const url = new URL(`${OPENDOTA_BASE}/players/${accountId}`);
  // Na Cloudflare a saída é por IP compartilhado: sem a chave o OpenDota devolve 429.
  if (serverEnv.OPENDOTA_API_KEY) url.searchParams.set("api_key", serverEnv.OPENDOTA_API_KEY);
  return buildOwnerProofData(await fetchJson(url.toString()), now);
}

/** Chamado pelo cron: renova a prova quando passou de 6 horas; com falha, tenta a cada 10 minutos. */
export async function refreshOwnerProof(now = new Date()): Promise<"fresco" | "aguardando" | "renovado" | "sem_dono" | "falhou"> {
  const [owner, current] = await Promise.all([findOwner(), readProof()]);
  if (!owner?.accountId) return "sem_dono";
  if (current && now.getTime() - new Date(current.syncedAt).getTime() < REFRESH_EVERY_MS) return "fresco";
  if (now.getUTCMinutes() % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  try {
    const data = await fetchOwnerData(owner.accountId, now);
    const { error } = await createServiceClient()
      .from("store_owner_proof")
      .upsert({ id: 1, data: data as unknown as Json, refreshed_at: now.toISOString() }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return "renovado";
  } catch (err) {
    console.error("[loja] renovar prova do dono:", err instanceof Error ? err.message : err);
    return "falhou";
  }
}
