// Leitura do pedido que chega ao intermediário do SFU: qual das rotas do partytracks, o id da sessão
// (só letras, números, "_" e "-", para não sair da pasta do app na URL da Cloudflare), o corpo em JSON
// e o IP de quem pede (registro de acesso).

export const MAX_BODY_BYTES = 64 * 1024;
export const SESSION_ID = /^[A-Za-z0-9_-]{8,128}$/;
const IP = /^[0-9a-fA-F:.]{3,45}$/;

export type Route = { kind: "new" } | { kind: "tracks" | "renegotiate" | "close" | "update"; sid: string };

export function matchRoute(method: string, segments: string[]): Route | null {
  const [a, b, c, d] = segments;
  if (a !== "sessions" || segments.length < 2) return null;
  if (method === "POST" && b === "new" && segments.length === 2) return { kind: "new" };
  if (!b || !SESSION_ID.test(b)) return null;
  if (method === "POST" && c === "tracks" && d === "new" && segments.length === 4) return { kind: "tracks", sid: b };
  if (method === "PUT" && c === "renegotiate" && segments.length === 3) return { kind: "renegotiate", sid: b };
  if (method === "PUT" && c === "tracks" && d === "close" && segments.length === 4) return { kind: "close", sid: b };
  if (method === "PUT" && c === "tracks" && d === "update" && segments.length === 4) return { kind: "update", sid: b };
  return null;
}

/** Corpo em JSON até 64 KB; `undefined` quando vazio, `null` quando grande demais ou inválido. */
export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function clientIp(req: Request): string | null {
  const raw = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "";
  const ip = raw.trim();
  return IP.test(ip) ? ip : null;
}
