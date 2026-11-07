// Limite simples por chave (IP) na memória do isolate. É freio de abuso, não contrato:
// cada isolate da Cloudflare tem o próprio balde, e o WAF da zona continua valendo por cima.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export function allowRequest(scope: string, key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const id = `${scope}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** IP do visitante: a Cloudflare põe em cf-connecting-ip; no dev, o primeiro do x-forwarded-for. */
export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
