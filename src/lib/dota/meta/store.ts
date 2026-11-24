// Meta do /meta guardado no banco (dota_meta_cache): um dia por linha, o resumo dos três períodos e o
// bloco profissional. O cron renova o público a cada 6 h e o profissional a cada hora; a página só lê.

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { parseOpenDotaPatches, type DotaPatch } from "../meta-period";
import { openDotaJson } from "../opendota-fetch";
import { isMetaDay, type MetaDay } from "./days";
import { isProMeta, parseProRows, proMetaSql, type ProMeta } from "./pro";
import { PRO_EVERY_MS, PUBLIC_EVERY_MS, refreshDecision, type RefreshResult } from "./refresh";
import { queryImmortalDays } from "./stratz-days";
import { buildSummary, daysNeeded, isMetaSummary, type MetaSummary } from "./summary";
import { currentPatchIndex, sortPatches } from "./windows";

export const SUMMARY_KEY = "meta_imortal_v3";
export const PRO_KEY = "meta_pro_v3";
const DAY_KEY_PREFIX = "meta_imortal_dia_";
// O SQL do /explorer leva até uns 7 s; os 8 s padrão do openDotaFetch ficam curtos.
const PRO_TIMEOUT_MS = 20_000;

interface CacheRow {
  key: string;
  data: Json;
  refreshed_at: string;
}

export interface MetaData {
  summary: MetaSummary;
  summaryAt: string;
  pro: ProMeta | null;
  proAt: string | null;
}

async function readRows(keys: string[]): Promise<Map<string, CacheRow>> {
  const { data, error } = await createServiceClient()
    .from("dota_meta_cache")
    .select("key, data, refreshed_at")
    .in("key", keys);
  if (error) throw new Error(`ler dota_meta_cache falhou: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.key, row]));
}

async function upsertRows(rows: Array<{ key: string; data: unknown }>, now: Date): Promise<void> {
  if (rows.length === 0) return;
  const at = now.toISOString();
  const { error } = await createServiceClient()
    .from("dota_meta_cache")
    .upsert(
      rows.map((r) => ({ key: r.key, data: r.data as Json, refreshed_at: at, last_error: null, last_attempt_at: at })),
      { onConflict: "key" }
    );
  if (error) throw new Error(`gravar dota_meta_cache falhou: ${error.message}`);
}

async function recordError(key: string, err: unknown, now: Date): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await createServiceClient()
    .from("dota_meta_cache")
    .update({ last_error: message.slice(0, 500), last_attempt_at: now.toISOString() })
    .eq("key", key);
}

async function fetchPatches(): Promise<DotaPatch[]> {
  const patches = parseOpenDotaPatches(await openDotaJson<unknown>("/constants/patch"));
  if (patches.length === 0) throw new Error("OpenDota devolveu a lista de patches vazia");
  return patches;
}

/** Dias guardados que a STRATZ não devolve mais (mais de 30 dias): a janela do patch continua exata. */
async function readStoredDays(days: string[]): Promise<MetaDay[]> {
  if (days.length === 0) return [];
  const rows = await readRows(days.map((d) => `${DAY_KEY_PREFIX}${d}`));
  return [...rows.values()].map((r) => r.data as unknown).filter(isMetaDay);
}

/** Busca a STRATZ e a OpenDota, guarda cada dia e o resumo dos períodos. */
async function storePublic(now: Date): Promise<MetaSummary> {
  const [fresh, patches] = await Promise.all([queryImmortalDays(), fetchPatches()]);
  await upsertRows(fresh.map((d) => ({ key: `${DAY_KEY_PREFIX}${d.day}`, data: d })), now);
  const lastDay = fresh.map((d) => d.day).sort().at(-1) ?? "";
  const freshDays = new Set(fresh.map((d) => d.day));
  const older = await readStoredDays(daysNeeded(patches, lastDay).filter((d) => !freshDays.has(d)));
  const summary = buildSummary([...older, ...fresh], patches);
  if (!summary || summary.periods.length === 0) throw new Error("STRATZ devolveu o meta vazio");
  await upsertRows([{ key: SUMMARY_KEY, data: summary }], now);
  return summary;
}

/** Busca o bloco profissional do patch em vigor e guarda. */
async function storePro(patches: DotaPatch[], lastDay: string, now: Date): Promise<ProMeta> {
  const sorted = sortPatches(patches);
  const patch = sorted[currentPatchIndex(sorted, lastDay)];
  if (!patch) throw new Error("sem patch para o bloco profissional");
  const sql = encodeURIComponent(proMetaSql(patch.startedAt));
  const raw = await openDotaJson<unknown>(`/explorer?sql=${sql}`, { timeoutMs: PRO_TIMEOUT_MS });
  const pro = parseProRows(raw, patch);
  await upsertRows([{ key: PRO_KEY, data: pro }], now);
  return pro;
}

function summaryOf(row: CacheRow | undefined): MetaSummary | null {
  const data: unknown = row?.data;
  return isMetaSummary(data) ? data : null;
}

function proOf(row: CacheRow | undefined): ProMeta | null {
  const data: unknown = row?.data;
  return isProMeta(data) ? data : null;
}

/** Para a página: o que está guardado; sem resumo ainda, busca na hora e guarda. */
export async function getMetaData(now = new Date()): Promise<MetaData> {
  const rows = await readRows([SUMMARY_KEY, PRO_KEY]);
  let summary = summaryOf(rows.get(SUMMARY_KEY));
  let summaryAt = rows.get(SUMMARY_KEY)?.refreshed_at ?? now.toISOString();
  if (!summary) {
    summary = await storePublic(now);
    summaryAt = now.toISOString();
  }
  let pro = proOf(rows.get(PRO_KEY));
  let proAt = rows.get(PRO_KEY)?.refreshed_at ?? null;
  if (!pro) {
    // Sem o profissional a página segue: o bloco some em vez de derrubar a tela.
    pro = await storePro(summary.patches, summary.lastDay, now).catch((err: unknown) => {
      console.error("[meta] bloco profissional:", err instanceof Error ? err.message : err);
      return null;
    });
    proAt = pro ? now.toISOString() : null;
  }
  return { summary, summaryAt, pro, proAt };
}

async function refreshPublic(row: CacheRow | undefined, now: Date): Promise<RefreshResult> {
  const wait = refreshDecision(row?.refreshed_at ?? null, PUBLIC_EVERY_MS, now);
  if (wait) return wait;
  try {
    await storePublic(now);
    return "renovado";
  } catch (err) {
    await recordError(SUMMARY_KEY, err, now);
    throw err;
  }
}

async function refreshPro(row: CacheRow | undefined, summary: MetaSummary | null, now: Date): Promise<RefreshResult> {
  const wait = refreshDecision(row?.refreshed_at ?? null, PRO_EVERY_MS, now);
  if (wait) return wait;
  try {
    const patches = summary?.patches ?? (await fetchPatches());
    await storePro(patches, summary?.lastDay ?? new Date(now).toISOString().slice(0, 10), now);
    return "renovado";
  } catch (err) {
    await recordError(PRO_KEY, err, now);
    throw err;
  }
}

/**
 * Tarefa "meta" do cron: o público (6 h) e o profissional (1 h).
 * Uma parte que falha não impede a outra; a tarefa falha com o erro de cada parte que falhou.
 */
export async function refreshMeta(now = new Date()): Promise<Record<string, RefreshResult>> {
  const rows = await readRows([SUMMARY_KEY, PRO_KEY]);
  const parts = ["publico", "pro"] as const;
  const settled = await Promise.allSettled([
    refreshPublic(rows.get(SUMMARY_KEY), now),
    refreshPro(rows.get(PRO_KEY), summaryOf(rows.get(SUMMARY_KEY)), now),
  ]);
  const errors = settled.flatMap((s, i) =>
    s.status === "rejected" ? [`${parts[i]}: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`] : []
  );
  if (errors.length > 0) throw new Error(errors.join(" | "));
  return Object.fromEntries(settled.map((s, i) => [parts[i], s.status === "fulfilled" ? s.value : "aguardando"]));
}
