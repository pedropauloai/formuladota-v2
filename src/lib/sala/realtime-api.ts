// Chamadas à API do Cloudflare Realtime (SFU e TURN) com o segredo do app, só no servidor.
// Base e formato conferidos no OpenAPI oficial (developers.cloudflare.com/realtime, 23/11/2026).

import "server-only";

const API = "https://rtc.live.cloudflare.com/v1";
const TIMEOUT_MS = 10_000;
const STUN_ONLY: RTCIceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478"] }];
const SAFE_PATH = /^(\/[A-Za-z0-9_-]+)+$/;

export interface RealtimeEnv {
  appId: string;
  appSecret: string;
  turnKeyId: string | null;
  turnKeyToken: string | null;
}

export interface SfuResult {
  status: number;
  body: Record<string, unknown>;
}

const read = (name: string): string | null => process.env[name]?.trim() || null;

/** Null quando o app do Realtime não está configurado: a sala mostra "indisponível". */
export function realtimeEnv(): RealtimeEnv | null {
  const appId = read("REALTIME_APP_ID");
  const appSecret = read("REALTIME_APP_SECRET");
  if (!appId || !appSecret) return null;
  return { appId, appSecret, turnKeyId: read("REALTIME_TURN_KEY_ID"), turnKeyToken: read("REALTIME_TURN_KEY_TOKEN") };
}

async function jsonOf(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // Resposta fora do formato: cai no erro abaixo.
  }
  return { errorCode: "resposta_invalida", errorDescription: `resposta do SFU fora do formato (HTTP ${res.status})` };
}

/** `path` relativo ao app, como `/sessions/new`; só letras, números, "_" e "-" entre as barras. */
export async function sfu(env: RealtimeEnv, path: string, init: { method: "GET" | "POST" | "PUT"; body?: unknown }): Promise<SfuResult> {
  if (!SAFE_PATH.test(path)) throw new Error("caminho do SFU inválido");
  const res = await fetch(`${API}/apps/${encodeURIComponent(env.appId)}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${env.appSecret}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, body: await jsonOf(res) };
}

export function createSfuSession(env: RealtimeEnv): Promise<SfuResult> {
  return sfu(env, "/sessions/new", { method: "POST" });
}

/** Fecha faixas de uma sessão sem troca de SDP: corta o encaminhamento na hora (expulsar, sair, limpar). */
export async function forceCloseTracks(env: RealtimeEnv, sessionId: string, mids: string[]): Promise<SfuResult | null> {
  if (mids.length === 0) return null;
  return sfu(env, `/sessions/${sessionId}/tracks/close`, { method: "PUT", body: { tracks: mids.map((mid) => ({ mid })), force: true } });
}

function withoutPort53(servers: RTCIceServer[]): RTCIceServer[] {
  return servers
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length > 0);
}

/** Credenciais do TURN de curta duração para o navegador; sem chave de TURN, só STUN. */
export async function generateIceServers(env: RealtimeEnv, ttlSeconds: number): Promise<RTCIceServer[]> {
  if (!env.turnKeyId || !env.turnKeyToken) return STUN_ONLY;
  const res = await fetch(`${API}/turn/keys/${encodeURIComponent(env.turnKeyId)}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.turnKeyToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: ttlSeconds }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TURN recusou a credencial (HTTP ${res.status})`);
  const body = (await res.json()) as { iceServers?: RTCIceServer[] };
  return withoutPort53(body.iceServers ?? STUN_ONLY);
}
