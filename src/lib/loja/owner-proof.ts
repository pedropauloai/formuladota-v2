// A medalha da credencial da vitrine (o rank e a posição no ranking da conta atual do PPA) e as
// últimas partidas dele (coluna da direita do site), pelo OpenDota. A visita só lê a tabela
// store_owner_proof; quem renova é o cron de cada minuto, no máximo a cada hora.

import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import { steam64To32 } from "@/lib/dota/opendota";
import { openDotaJson } from "@/lib/dota/opendota-fetch";
import type { Json } from "@/types/database";
import { buildOwnerProofData, parseOwnerProofData, type OwnerProofData } from "./owner-proof-data";

// Perfil de coach do dono da loja: dele saem a conta Steam e o avatar.
const OWNER_COACH_SLUG = "pedro-paulo";
// Uma hora: as partidas da live aparecem no mesmo dia (duas chamadas ao OpenDota por renovação).
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

async function fetchOwnerData(accountId: number, now: Date): Promise<OwnerProofData> {
  const [player, recent] = await Promise.all([
    openDotaJson<unknown>(`/players/${accountId}`, { timeoutMs: FETCH_TIMEOUT_MS }),
    openDotaJson<unknown>(`/players/${accountId}/recentMatches`, { timeoutMs: FETCH_TIMEOUT_MS }),
  ]);
  return buildOwnerProofData(player, now, recent);
}

/**
 * Chamado pelo cron do site: renova a prova quando passou de uma hora; com falha, tenta a cada
 * 10 minutos. A falha lança, para o cron marcar a tarefa e avisar se ela persistir.
 */
export async function refreshOwnerProof(now = new Date()): Promise<"fresco" | "aguardando" | "renovado" | "sem_dono"> {
  const [owner, current] = await Promise.all([findOwner(), readProof()]);
  if (!owner?.accountId) return "sem_dono";
  if (current && now.getTime() - new Date(current.syncedAt).getTime() < REFRESH_EVERY_MS) return "fresco";
  if (now.getUTCMinutes() % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  const data = await fetchOwnerData(owner.accountId, now);
  const { error } = await createServiceClient()
    .from("store_owner_proof")
    .upsert({ id: 1, data: data as unknown as Json, refreshed_at: now.toISOString() }, { onConflict: "id" });
  if (error) throw new Error(`gravar store_owner_proof falhou: ${error.message}`);
  return "renovado";
}
