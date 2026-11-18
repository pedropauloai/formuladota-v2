// Meta por posição no Imortal guardado no banco (dota_meta_cache): o cron renova a cada 6 h e a
// /meta só lê. O cache do Next não guarda nada na Cloudflare, então sem isto cada visita batia na Stratz.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { queryPositionStats, type PositionStat } from "./stratz-meta";

const CACHE_KEY = "posicoes_imortal";
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
const RETRY_EVERY_MINUTES = 10;

export interface CachedPositionStats {
  stats: PositionStat[];
  refreshedAt: string;
}

function isPositionStat(value: unknown): value is PositionStat {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["heroId", "position", "matchCount", "winCount"].every((k) => typeof row[k] === "number");
}

/** Lê o que está guardado; linha ausente ou corrompida volta null. */
async function readCache(): Promise<CachedPositionStats | null> {
  const { data, error } = await createServiceClient()
    .from("dota_meta_cache")
    .select("data, refreshed_at")
    .eq("key", CACHE_KEY)
    .maybeSingle();
  if (error) throw new Error(`ler dota_meta_cache falhou: ${error.message}`);
  if (!data || !Array.isArray(data.data) || !data.data.every(isPositionStat)) return null;
  return { stats: data.data as unknown as PositionStat[], refreshedAt: data.refreshed_at };
}

async function writeCache(stats: PositionStat[], now: Date): Promise<void> {
  const at = now.toISOString();
  const { error } = await createServiceClient()
    .from("dota_meta_cache")
    .upsert(
      { key: CACHE_KEY, data: stats as unknown as Json, refreshed_at: at, last_error: null, last_attempt_at: at },
      { onConflict: "key" }
    );
  if (error) throw new Error(`gravar dota_meta_cache falhou: ${error.message}`);
}

async function fetchFresh(): Promise<PositionStat[]> {
  const stats = await queryPositionStats();
  if (stats.length === 0) throw new Error("Stratz devolveu o meta vazio");
  return stats;
}

/** Para a página: o que está guardado; sem nada guardado ainda, busca na hora e guarda. */
export async function getPositionStats(now = new Date()): Promise<CachedPositionStats> {
  const cached = await readCache();
  if (cached) return cached;
  const stats = await fetchFresh();
  await writeCache(stats, now).catch((err: unknown) => {
    console.error("[meta] guardar o meta:", err instanceof Error ? err.message : err);
  });
  return { stats, refreshedAt: now.toISOString() };
}

/** Para o cron: renova depois de 6 h; com falha, tenta de novo a cada 10 minutos e registra o erro. */
export async function refreshPositionStats(now = new Date()): Promise<"fresco" | "aguardando" | "renovado"> {
  const cached = await readCache();
  if (cached && now.getTime() - new Date(cached.refreshedAt).getTime() < REFRESH_EVERY_MS) return "fresco";
  if (cached && now.getUTCMinutes() % RETRY_EVERY_MINUTES !== 0) return "aguardando";
  try {
    await writeCache(await fetchFresh(), now);
    return "renovado";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await createServiceClient()
      .from("dota_meta_cache")
      .update({ last_error: message.slice(0, 500), last_attempt_at: now.toISOString() })
      .eq("key", CACHE_KEY);
    throw err;
  }
}
