// formuladota v2 — Phase 3
// Camada Steam OpenID 2.0 + Steam Web API.
// Server-only: usa STEAM_WEB_API_KEY (privada) e NEXT_PUBLIC_SITE_URL.
//
// ----------------------------------------------------------------------
// POR QUE NÃO USAR `node-steam-openid`?
// ----------------------------------------------------------------------
// A lib foi AVALIADA E DESCARTADA durante o planning (revisão 1, 2026-04-30):
//   (a) Requer adapter Express-like — em Next 16 App Router precisaríamos
//       traduzir NextRequest pra req Express, complicando sem benefício.
//   (b) Implementação manual via `fetch` é mais simples (~50 linhas)
//       e nativa do runtime.
//   (c) Zero deps adicionais — package.json fica limpo.
// ----------------------------------------------------------------------

import { timingSafeEqual } from "node:crypto";
import { publicEnv, requireServerEnv } from "@/lib/env";

// SteamID 64 vem em "https://steamcommunity.com/openid/id/{steamid64}"
const STEAM_ID_REGEX = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_API_BASE = "https://api.steampowered.com";

// Tipo público — consumido por Server Action e callback handler
export type SteamProfile = {
  steamId64: string;
  persona: string;
  avatarUrl: string;
};

// Steam Web API response shape (interno — não exportar)
type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  avatarfull: string;
};

type SummariesResponse = {
  response: { players: SteamPlayerSummary[] };
};

// Constrói URL de redirect Steam OpenID 2.0.
// Realm é o domínio raiz (sem path) — Steam exige.
// CSRF state vai como query param em `openid.return_to` — o Steam preserva
// o return_to inteiro e nos devolve o `state` no callback (lemos via
// searchParams.get("state") em validateAndFetchSteam).
export function getSteamRedirectUrl(state: string): string {
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const realm = `${siteUrl}/`;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.realm": realm,
    "openid.return_to": `${siteUrl}/auth/steam/callback?state=${encodeURIComponent(state)}`,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

// Valida o callback OpenID via re-handshake com Steam.
// Recebe os searchParams da NextRequest; retorna SteamID 64 string.
// Throws se assinatura inválida (anti-spoofing).
export async function validateSteamCallback(
  query: URLSearchParams
): Promise<string> {
  // Steam exige reenviar TODOS os params, trocando apenas openid.mode
  const validateParams = new URLSearchParams(query);
  validateParams.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: validateParams.toString(),
  });

  if (!response.ok) {
    throw new Error(`Steam OpenID validate falhou: HTTP ${response.status}`);
  }

  const text = await response.text();
  // Steam responde "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"
  if (!text.includes("is_valid:true")) {
    throw new Error("Steam OpenID assinatura inválida (possível spoofing)");
  }

  // Extrai SteamID 64 do claimed_id
  const claimedId = query.get("openid.claimed_id");
  if (!claimedId) {
    throw new Error("Steam callback sem openid.claimed_id");
  }

  const match = STEAM_ID_REGEX.exec(claimedId);
  const steamId = match?.[1];
  if (!steamId) {
    throw new Error(`Steam claimed_id em formato inesperado: ${claimedId}`);
  }

  return steamId;
}

// Busca persona/avatar via Steam Web API (server-only).
// Endpoint: ISteamUser/GetPlayerSummaries/v0002
// `force` (botão "Sincronizar com a Steam", Pedro 2026-06-12): fura o cache
// de 1h — o usuário acabou de mudar o nick/foto na Steam e quer ver AGORA.
export async function fetchSteamPersona(
  steamId64: string,
  opts?: { force?: boolean }
): Promise<SteamProfile> {
  const apiKey = requireServerEnv("STEAM_WEB_API_KEY");
  const url = new URL(
    `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/`
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamId64);

  const response = await fetch(
    url.toString(),
    opts?.force
      ? { cache: "no-store" }
      : {
          // Cache curto — persona muda raramente
          next: { revalidate: 3600 },
        }
  );

  if (!response.ok) {
    throw new Error(
      `Steam Web API falhou: HTTP ${response.status} ao buscar persona`
    );
  }

  // Único cast permitido neste módulo — replica pattern de src/lib/abacatepay.ts:65
  // (Steam Web API tem schema estável + acessamos por chaves; lookup já valida).
  const data = (await response.json()) as SummariesResponse;
  const player = data.response.players[0];

  if (!player) {
    throw new Error(`Steam Web API: nenhum player retornado para ${steamId64}`);
  }

  return {
    steamId64: player.steamid,
    persona: player.personaname,
    avatarUrl: player.avatarfull,
  };
}

// Helper composto para o callback handler.
// Confere CSRF state, valida assinatura, busca persona — tudo em sequência.
// Mantém o GET handler em /auth/steam/callback enxuto (≤ 50 linhas).
//
// Compara state com `crypto.timingSafeEqual` (mesma técnica do HMAC do
// AbacatePay em src/lib/abacatepay.ts:112) — mitiga timing attacks.
//
// Retorna SteamProfile em sucesso. Throws com mensagem específica em qualquer
// falha — caller faz redirect com `?error=...` apropriado.
export async function validateAndFetchSteam(
  searchParams: URLSearchParams,
  expectedState: string
): Promise<SteamProfile> {
  const receivedState = searchParams.get("state") ?? "";

  // CSRF check — timing-safe compare
  const a = Buffer.from(expectedState);
  const b = Buffer.from(receivedState);
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("csrf_mismatch");
  }
  if (!timingSafeEqual(a, b)) {
    throw new Error("csrf_mismatch");
  }

  // OpenID handshake (anti-spoofing)
  const steamId64 = await validateSteamCallback(searchParams);

  // Persona (Steam Web API)
  const profile = await fetchSteamPersona(steamId64);

  return profile;
}
