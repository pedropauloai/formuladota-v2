// Meta por posição no Imortal guardado no banco (dota_meta_cache): o cron renova a cada 6 h e a
// /meta só lê. O cache do Next não guarda nada na Cloudflare, então sem isto cada visita batia na Stratz.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { openDotaJson } from "./opendota-fetch";
import { parseOpenDotaPatches, patchesInWindow, weekWindow, type DotaPatch, type MetaWindow } from "./meta-period";
import { queryPositionStats, type PositionStat } from "./stratz-meta";

// Chave própria do formato com janela e patches; a "posicoes_imortal" (só a lista) é da versão anterior.
const CACHE_KEY = "posicoes_imortal_v2";
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;
const RETRY_EVERY_MINUTES = 10;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface StoredMeta {
  stats: PositionStat[];
  /** Dias (UTC) das semanas somadas. */
  window: MetaWindow;
  /** Patches com partida dentro da janela, do mais antigo ao mais novo. */
  patches: DotaPatch[];
}

export interface CachedPositionStats extends StoredMeta {
  refreshedAt: string;
}

function isPositionStat(value: unknown): value is PositionStat {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["heroId", "position", "matchCount", "winCount"].every((k) => typeof row[k] === "number");
}

function isPatch(value: unknown): value is DotaPatch {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.name === "string" && typeof row.startedAt === "string";
}

function isStoredMeta(value: unknown): value is StoredMeta {
  if (!value || typeof value !== "object") return false;
  const { stats, window, patches } = value as Record<string, unknown>;
  const w = window as Record<string, unknown> | null;
  return (
    Array.isArray(stats) &&
    stats.every(isPositionStat) &&
    !!w &&
    typeof w.start === "string" &&
    typeof w.end === "string" &&
    DAY_PATTERN.test(w.start) &&
    DAY_PATTERN.test(w.end) &&
    Array.isArray(patches) &&
    patches.every(isPatch)
  );
}

/** Lê o que está guardado; linha ausente ou em formato antigo volta null. */
async function readCache(): Promise<CachedPositionStats | null> {
  const { data, error } = await createServiceClient()
    .from("dota_meta_cache")
    .select("data, refreshed_at")
    .eq("key", CACHE_KEY)
    .maybeSingle();
  if (error) throw new Error(`ler dota_meta_cache falhou: ${error.message}`);
  const stored: unknown = data?.data;
  if (!data || !isStoredMeta(stored)) return null;
  return { ...stored, refreshedAt: data.refreshed_at };
}

async function writeCache(meta: StoredMeta, now: Date): Promise<void> {
  const at = now.toISOString();
  const { error } = await createServiceClient()
    .from("dota_meta_cache")
    .upsert(
      { key: CACHE_KEY, data: meta as unknown as Json, refreshed_at: at, last_error: null, last_attempt_at: at },
      { onConflict: "key" }
    );
  if (error) throw new Error(`gravar dota_meta_cache falhou: ${error.message}`);
}

/** Início de cada patch, pela OpenDota (a lista de versões da Stratz não acompanha o patch novo). */
async function fetchPatches(): Promise<DotaPatch[]> {
  const patches = parseOpenDotaPatches(await openDotaJson<unknown>("/constants/patch"));
  if (patches.length === 0) throw new Error("OpenDota devolveu a lista de patches vazia");
  return patches;
}

async function fetchFresh(): Promise<StoredMeta> {
  const [{ stats, weekStarts }, patches] = await Promise.all([queryPositionStats(), fetchPatches()]);
  const window = weekWindow(weekStarts);
  if (stats.length === 0 || !window) throw new Error("Stratz devolveu o meta vazio");
  return { stats, window, patches: patchesInWindow(patches, window) };
}

/** Para a página: o que está guardado; sem nada guardado ainda, busca na hora e guarda. */
export async function getPositionStats(now = new Date()): Promise<CachedPositionStats> {
  const cached = await readCache();
  if (cached) return cached;
  const meta = await fetchFresh();
  await writeCache(meta, now).catch((err: unknown) => {
    console.error("[meta] guardar o meta:", err instanceof Error ? err.message : err);
  });
  return { ...meta, refreshedAt: now.toISOString() };
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
