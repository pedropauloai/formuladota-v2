// Origem da visita (UTM e domínio de onde a pessoa veio), sem nada que identifique quem é.
// O cookie guarda o último toque que trouxe campanha; sem campanha, vale o que já havia.

export const ORIGIN_COOKIE = "fd_origem";
export const ORIGIN_MAX_AGE_S = 30 * 24 * 60 * 60;

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export type Origin = Partial<Record<UtmKey | "referrer_host" | "landing_path", string>>;

const VALUE_MAX = 100;
const PATH_MAX = 300;
const ORIGIN_KEYS = new Set<string>([...UTM_KEYS, "referrer_host", "landing_path"]);

function cleanValue(raw: string | null | undefined, max = VALUE_MAX): string | undefined {
  const value = (raw ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .toLowerCase()
    .slice(0, max);
  return value || undefined;
}

/** Domínio do referrer, sem "www."; o próprio site e endereços inválidos viram undefined. */
export function referrerHost(referrer: string | null | undefined, siteHosts: readonly string[]): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    const own = siteHosts.map((h) => h.toLowerCase().replace(/^www\./, ""));
    return host && !own.includes(host) ? host.slice(0, VALUE_MAX) : undefined;
  } catch {
    return undefined;
  }
}

export function originFromUrl(url: URL, referrer: string | null | undefined, siteHosts: readonly string[]): Origin {
  const origin: Origin = {};
  for (const key of UTM_KEYS) {
    const value = cleanValue(url.searchParams.get(key));
    if (value) origin[key] = value;
  }
  const host = referrerHost(referrer, siteHosts);
  if (host) origin.referrer_host = host;
  // Caminho sem a query: a UTM já está nos campos próprios.
  origin.landing_path = url.pathname.slice(0, PATH_MAX) || "/";
  return origin;
}

export function hasCampaign(origin: Origin | null | undefined): boolean {
  return !!origin && UTM_KEYS.some((key) => !!origin[key]);
}

/** Último toque com campanha vence; sem campanha, fica a origem anterior; sem nenhuma, a atual. */
export function mergeOrigin(previous: Origin | null, current: Origin): Origin {
  if (hasCampaign(current)) return current;
  if (previous && (hasCampaign(previous) || previous.referrer_host)) return previous;
  if (current.referrer_host) return current;
  return previous ?? current;
}

export function serializeOrigin(origin: Origin): string {
  return encodeURIComponent(JSON.stringify(origin));
}

/** Lê o cookie aceitando só chaves conhecidas e texto curto: cookie é entrada do usuário. */
export function parseOrigin(raw: string | null | undefined): Origin | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const origin: Origin = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!ORIGIN_KEYS.has(key) || typeof value !== "string") continue;
    const cleaned = cleanValue(value, key === "landing_path" ? PATH_MAX : VALUE_MAX);
    if (cleaned) origin[key as keyof Origin] = cleaned;
  }
  return Object.keys(origin).length > 0 ? origin : null;
}

// Domínios que chegam sem UTM e o nome de canal que o painel mostra.
const HOST_SOURCES: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
  [/(^|\.)(discord\.com|discord\.gg|discordapp\.com)$/, "discord"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
];

/** Canal da origem para o painel: a UTM manda; sem ela, o domínio conhecido; sem nada, "direto". */
export function sourceLabel(origin: { utm_source?: string | null; referrer_host?: string | null }): string {
  if (origin.utm_source) return origin.utm_source;
  const host = origin.referrer_host;
  if (!host) return "direto";
  const known = HOST_SOURCES.find(([pattern]) => pattern.test(host));
  return known ? known[1] : host;
}
