// Um só caminho até a OpenDota: chave em toda chamada, limite de tempo e nova tentativa em 429 e 5xx.
// Na Cloudflare a saída é por IP compartilhado, e sem a chave a OpenDota devolve 429.

import { serverEnv } from "@/lib/env";

export const OPENDOTA_BASE = "https://api.opendota.com/api";

const DEFAULT_TIMEOUT_MS = 8_000;
// Espera entre tentativas: cabe no tempo do cron mesmo com 429 seguidos.
const RETRY_DELAYS_MS = [1_000, 3_000] as const;

/**
 * Por que a chamada falhou. "indexando" e "incompleta" querem dizer "ainda não": a partida
 * existe mas a OpenDota não terminou de processar. O resto é falha de verdade.
 */
export type OpenDotaErrorKind = "indexando" | "incompleta" | "bloqueada" | "instavel" | "rede" | "invalida";

export class OpenDotaError extends Error {
  readonly kind: OpenDotaErrorKind;

  constructor(message: string, public status?: number, kind?: OpenDotaErrorKind) {
    super(message);
    this.name = "OpenDotaError";
    this.kind = kind ?? kindFromStatus(status);
  }
}

export function kindFromStatus(status: number | undefined): OpenDotaErrorKind {
  if (status === undefined) return "rede";
  if (status === 404) return "indexando";
  if (status === 429) return "bloqueada";
  if (status >= 500) return "instavel";
  return "invalida";
}

/** Verdadeiro quando o erro só quer dizer que a partida ainda não está pronta na OpenDota. */
export function isOpenDotaPending(err: unknown): boolean {
  return err instanceof OpenDotaError && (err.kind === "indexando" || err.kind === "incompleta");
}

export function openDotaUrl(path: string): URL {
  const url = new URL(`${OPENDOTA_BASE}${path}`);
  const apiKey = serverEnv.OPENDOTA_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url;
}

interface OpenDotaFetchOptions {
  method?: "GET" | "POST";
  timeoutMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Faz a chamada e devolve a resposta 2xx. Qualquer outra coisa vira OpenDotaError com o motivo.
 * Tenta de novo só em 429 e 5xx; tempo esgotado falha na hora, para não segurar quem chamou.
 */
export async function openDotaFetch(path: string, options: OpenDotaFetchOptions = {}): Promise<Response> {
  const url = openDotaUrl(path);
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: options.method ?? "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (err) {
      throw new OpenDotaError(`OpenDota sem resposta em ${path}: ${err instanceof Error ? err.message : err}`);
    }
    if (res.ok) return res;
    const retriable = res.status === 429 || res.status >= 500;
    const delay = RETRY_DELAYS_MS[attempt];
    if (!retriable || delay === undefined) {
      throw new OpenDotaError(`OpenDota respondeu ${res.status} em ${path}`, res.status);
    }
    await wait(delay);
  }
}

/** Atalho para GET que devolve o JSON. */
export async function openDotaJson<T>(path: string, options: OpenDotaFetchOptions = {}): Promise<T> {
  const res = await openDotaFetch(path, options);
  return (await res.json()) as T;
}
