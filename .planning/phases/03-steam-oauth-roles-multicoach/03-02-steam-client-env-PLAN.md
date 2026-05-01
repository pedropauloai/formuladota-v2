---
phase: 03-steam-oauth-roles-multicoach
plan: 02
plan_id: 03-02
title: Steam OpenID client + env validation (STEAM_WEB_API_KEY only — implementação manual via fetch)
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.example
  - src/lib/env.ts
  - src/lib/steam.ts
autonomous: true
requirements_addressed:
  - H1.1
  - C1
  - C3
  - C11
  - C12
  - C13
must_haves:
  truths:
    - "Variável `STEAM_WEB_API_KEY` validada via Zod em `src/lib/env.ts` (server-only, optional schema, requireServerEnv enforcement)"
    - "Módulo `src/lib/steam.ts` exporta `getSteamRedirectUrl(state)`, `validateSteamCallback(query)`, `fetchSteamPersona(steamId64)`, `validateAndFetchSteam(searchParams, expectedState)` — todos async/await onde aplicável, zero .then() chains (per C11)"
    - "`getSteamRedirectUrl(state: string)` inclui CSRF state em `openid.return_to=${SITE_URL}/auth/steam/callback?state=${state}`"
    - "`validateAndFetchSteam(searchParams, expectedState)` é o helper que o callback handler usa: confere state, valida assinatura, busca persona — tudo num único call, mantendo o GET handler ≤ 50 linhas"
    - "`fetchSteamPersona` chama `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` e retorna `{ steamId64, persona, avatarUrl }` tipado (zero any/unknown — único cast permitido é `as SummariesResponse` em response.json, replicando pattern de src/lib/abacatepay.ts)"
    - "`.env.example` documenta `STEAM_WEB_API_KEY` com comentário explicando https://steamcommunity.com/dev/apikey + domínio formuladota.com"
    - "Comentário em `src/lib/steam.ts` documenta explicitamente por que `node-steam-openid` foi descartada (avaliada e rejeitada)"
  artifacts:
    - path: "src/lib/steam.ts"
      provides: "Helpers OpenID 2.0 + Steam Web API typed wrappers (com CSRF state + helper composto)"
      exports: ["getSteamRedirectUrl", "validateSteamCallback", "fetchSteamPersona", "validateAndFetchSteam", "SteamProfile"]
      min_lines: 80
    - path: "src/lib/env.ts"
      provides: "Schema atualizado com STEAM_WEB_API_KEY"
      contains: "STEAM_WEB_API_KEY: optional"
    - path: ".env.example"
      provides: "Documentação STEAM_WEB_API_KEY pra Pedro setar"
      contains: "STEAM_WEB_API_KEY"
  key_links:
    - from: "src/lib/steam.ts"
      to: "process.env STEAM_WEB_API_KEY"
      via: "requireServerEnv('STEAM_WEB_API_KEY')"
      pattern: "requireServerEnv\\(['\"]STEAM_WEB_API_KEY['\"]\\)"
    - from: "src/lib/steam.ts"
      to: "publicEnv.NEXT_PUBLIC_SITE_URL"
      via: "import { publicEnv } from '@/lib/env'"
      pattern: "publicEnv\\.NEXT_PUBLIC_SITE_URL"
    - from: "src/lib/steam.ts validateAndFetchSteam"
      to: "validateSteamCallback + fetchSteamPersona (composição)"
      via: "helper que chama validate + persona fetch em sequência, isolando GET handler"
      pattern: "export async function validateAndFetchSteam"
---

<objective>
Preparar a camada de infraestrutura Steam OpenID 2.0: declarar `STEAM_WEB_API_KEY` no schema Zod de env, e criar módulo `src/lib/steam.ts` com helpers tipados (zero `any`) que serão consumidos no Plan 03-03 (Server Action + callback page). Implementação 100% manual via `fetch` — `node-steam-openid` foi avaliada e descartada (não instalar).

Purpose: Isolar toda a lógica Steam (OpenID handshake + Steam Web API persona fetch) num módulo único pra que Plans downstream tratem Steam como caixa-preta com API limpa. Reduz risco de duplicação em callback route e Server Action. O helper composto `validateAndFetchSteam` mantém o GET handler do callback (Plan 03-03) ≤ 50 linhas (per C2).

Output:
- `src/lib/env.ts` aceita `STEAM_WEB_API_KEY`
- `src/lib/steam.ts` com 4 funções exportadas + 1 type SteamProfile
- `.env.example` atualizado com seção Steam (comentário PT-BR explicando como obter key)
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md
@.planning/research/integrations.md
@src/lib/env.ts
@src/lib/abacatepay.ts
@.env.example
@package.json

<interfaces>
<!-- Pattern requireServerEnv (existente em src/lib/env.ts) -->
```typescript
export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string {
  const value = serverEnv[key];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória "${key}" não configurada. Verifique .env.local.`
    );
  }
  return value as string;
}
```

<!-- Pattern publicEnv (existente) -->
```typescript
export const publicEnv = parsedPublic.success ? parsedPublic.data : { ... };
// publicEnv.NEXT_PUBLIC_SITE_URL // string
```

<!-- Pattern de cast em response.json — replicado de src/lib/abacatepay.ts:65 -->
```typescript
// Em src/lib/abacatepay.ts já fazemos:
//   json = await response.json();
// e em sequência passamos por Zod parse. Aqui em steam.ts não usamos Zod
// (Steam Web API tem schema estável + lookup por chaves obrigatórias),
// então o ÚNICO cast permitido é:
//   const data = (await response.json()) as SummariesResponse;
```

<!-- Steam Web API GetPlayerSummaries response shape -->
```typescript
type SteamPlayerSummary = {
  steamid: string;       // 64-bit
  personaname: string;   // display name
  avatarfull: string;    // 184x184 URL
  avatarmedium: string;
  avatar: string;
};
type SummariesResponse = {
  response: { players: SteamPlayerSummary[] };
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Atualizar env schema (.env.example + src/lib/env.ts) com STEAM_WEB_API_KEY</name>
  <files>.env.example, src/lib/env.ts</files>
  <read_first>
    - src/lib/env.ts (pattern Zod schema + optional preprocess + requireServerEnv)
    - .env.example (pattern de seções comentadas com instruções pra Pedro)
    - .planning/research/integrations.md seção "2.4 Steam Web API key" (URL + domain requirement)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão final pós-revisão: NÃO instalar node-steam-openid; implementação manual via fetch)
  </read_first>
  <action>
    Decisão final pós-revisão (revisão 1, BLOCKER 4): NÃO instalar `node-steam-openid`. A lib foi avaliada e descartada porque (a) requer adapter Express, (b) implementação manual em Next 16 App Router é mais simples e nativa, (c) zero deps a mais. A justificativa vai documentada em comentário no `src/lib/steam.ts` (Task 2).

    1. **Atualizar `.env.example`**: adicionar nova seção entre AbacatePay e OpenDota:
    ```
    # ============================================================================
    # Steam Web API (Phase 3 — Steam OAuth via OpenID 2.0)
    # ============================================================================
    # Pegar em: https://steamcommunity.com/dev/apikey
    # Pedro precisa logar com a conta Steam dele e cadastrar o domínio
    # `formuladota.com` (Hostinger). Em dev, aceitar qualquer domínio funciona —
    # o handshake OpenID valida só o realm que o app envia.
    # NUNCA expor no client (server-only).
    STEAM_WEB_API_KEY=
    ```

    2. **Atualizar `src/lib/env.ts`**: adicionar `STEAM_WEB_API_KEY: optional` ao `serverSchema` (na lista entre `OPENDOTA_API_KEY` e `RESEND_API_KEY`). NÃO adicionar a `publicSchema` (server-only per C13). Mantém pattern `optional` (z.preprocess vazio→undefined) — o `requireServerEnv` cuida do enforcement no momento de uso.

    3. **Comentário PT-BR**: Em `src/lib/env.ts` próximo ao `STEAM_WEB_API_KEY`, adicionar comentário inline:
    ```typescript
    // Steam Web API key (Phase 3): server-only. Validada cirurgicamente via
    // requireServerEnv("STEAM_WEB_API_KEY") em src/lib/steam.ts.
    STEAM_WEB_API_KEY: optional,
    ```

    Não modificar `publicEnv`, `requireServerEnv` ou `parsedPublic` — apenas adicionar a chave no `serverSchema`. Não rodar `pnpm add` aqui — implementação Steam é 100% manual via `fetch` (Task 2).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "STEAM_WEB_API_KEY" .env.example && grep -q "STEAM_WEB_API_KEY: optional" src/lib/env.ts && ! grep -q '"node-steam-openid"' package.json && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `.env.example` contém bloco `STEAM_WEB_API_KEY=` com comentário PT-BR explicativo (URL https://steamcommunity.com/dev/apikey + nota sobre dev/prod)
    - `src/lib/env.ts` schema `serverSchema` contém campo `STEAM_WEB_API_KEY: optional`
    - `STEAM_WEB_API_KEY` NÃO aparece em `publicSchema` (per C13 — service-side only)
    - `package.json` NÃO contém `"node-steam-openid"`: `! grep -q '"node-steam-openid"' package.json`
    - `pnpm typecheck` passa exit 0
  </acceptance_criteria>
  <done>
    Env validation update; `requireServerEnv("STEAM_WEB_API_KEY")` agora é callable e retorna a key (ou throws). Pronto pra Task 2 importar. Zero deps adicionadas.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/lib/steam.ts com getSteamRedirectUrl(state), validateSteamCallback, fetchSteamPersona, validateAndFetchSteam</name>
  <files>src/lib/steam.ts</files>
  <read_first>
    - src/lib/abacatepay.ts (pattern fetch wrapper com error handling + try/catch + cast `(await response.json()) as ...` linha ~65 — replicar estilo, NÃO usar .then().catch() per C11)
    - src/lib/env.ts (importar publicEnv + requireServerEnv)
    - .planning/research/integrations.md seção "2.1 Como funciona" (steps OpenID 2.0)
    - .planning/research/integrations.md seção "2.4 Steam Web API key" (endpoint GetPlayerSummaries)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisões: realm = NEXT_PUBLIC_SITE_URL, returnUrl = ${SITE_URL}/auth/steam/callback?state=<csrf>)
  </read_first>
  <action>
    Criar arquivo `src/lib/steam.ts` (server-only — usa `requireServerEnv`). Estrutura COMPLETA:

    ```typescript
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
      const returnTo = `${siteUrl}/auth/steam/callback?state=${encodeURIComponent(state)}`;

      const params = new URLSearchParams({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.realm": realm,
        "openid.return_to": returnTo,
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
      if (!match) {
        throw new Error(`Steam claimed_id em formato inesperado: ${claimedId}`);
      }

      return match[1];
    }

    // Busca persona/avatar via Steam Web API (server-only).
    // Endpoint: ISteamUser/GetPlayerSummaries/v0002
    export async function fetchSteamPersona(
      steamId64: string
    ): Promise<SteamProfile> {
      const apiKey = requireServerEnv("STEAM_WEB_API_KEY");
      const url = new URL(
        `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/`
      );
      url.searchParams.set("key", apiKey);
      url.searchParams.set("steamids", steamId64);

      const response = await fetch(url.toString(), {
        // Cache curto — persona muda raramente
        next: { revalidate: 3600 },
      });

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
      const crypto = await import("node:crypto");
      if (!crypto.timingSafeEqual(a, b)) {
        throw new Error("csrf_mismatch");
      }

      // OpenID handshake (anti-spoofing)
      const steamId64 = await validateSteamCallback(searchParams);

      // Persona (Steam Web API)
      const profile = await fetchSteamPersona(steamId64);

      return profile;
    }
    ```

    **Restrições**:
    - ZERO uso de `any` ou `unknown` em código produzido (per C1). O cast `(await response.json()) as SummariesResponse` é o ÚNICO cast aceitável e está documentado como pattern espelhado de `src/lib/abacatepay.ts`.
    - Async/await sempre, NUNCA `.then().catch()` (per C11).
    - Functions max 50 linhas (per C2 — todas estão).
    - File max 300 linhas (per C2 — ~150 linhas estimadas).
    - Comentários PT-BR onde não-óbvio (per C12).
    - NÃO importa `node-steam-openid` (decisão validate manual — comentário no topo justifica).
    - Server-only — comentário no topo do arquivo já documenta.
    - Para `crypto.timingSafeEqual`, usar dynamic import `await import("node:crypto")` ou import estático `import * as crypto from "node:crypto"` (preferir o estático no topo do arquivo se TS aceitar).

    Se TS reclamar de `data.response.players[0]` ser possivelmente undefined, manter o `if (!player)` early return. Não usar non-null assertion (`!`).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && test -f src/lib/steam.ts && grep -q "export function getSteamRedirectUrl(state: string)" src/lib/steam.ts && grep -q "openid.return_to.*state=" src/lib/steam.ts && grep -q "export async function validateSteamCallback" src/lib/steam.ts && grep -q "export async function fetchSteamPersona" src/lib/steam.ts && grep -q "export async function validateAndFetchSteam" src/lib/steam.ts && grep -q "export type SteamProfile" src/lib/steam.ts && grep -q "requireServerEnv(.STEAM_WEB_API_KEY.)" src/lib/steam.ts && grep -q "node-steam-openid" src/lib/steam.ts && grep -q "timingSafeEqual" src/lib/steam.ts && [ "$(grep -c ' as ' src/lib/steam.ts)" = "1" ] && ! grep -E '\\.then\\(|\\.catch\\(' src/lib/steam.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `src/lib/steam.ts` existe
    - Exporta `getSteamRedirectUrl(state: string): string` — recebe CSRF state e inclui em `openid.return_to=${SITE_URL}/auth/steam/callback?state=${state}`. Verificável: `grep -q "openid.return_to.*state=" src/lib/steam.ts`
    - Exporta `async validateSteamCallback(query: URLSearchParams): Promise<string>` (re-handshake check_authentication, retorna steamid64 ou throws)
    - Exporta `async fetchSteamPersona(steamId64: string): Promise<SteamProfile>` (Steam Web API GetPlayerSummaries com `requireServerEnv("STEAM_WEB_API_KEY")`)
    - Exporta `async validateAndFetchSteam(searchParams: URLSearchParams, expectedState: string): Promise<SteamProfile>` — helper composto que confere CSRF state via `crypto.timingSafeEqual` (mesma técnica de src/lib/abacatepay.ts:112), valida assinatura, busca persona. Verificável: `grep -q "export async function validateAndFetchSteam" src/lib/steam.ts && grep -q "timingSafeEqual" src/lib/steam.ts`
    - Exporta `type SteamProfile = { steamId64, persona, avatarUrl }`
    - Comentário explícito documentando descarte de `node-steam-openid` (avaliada e rejeitada): `grep -q "node-steam-openid" src/lib/steam.ts && grep -q "AVALIADA E DESCARTADA" src/lib/steam.ts`
    - O ÚNICO cast permitido é `(await response.json()) as SummariesResponse` — verificável via `[ "$(grep -c ' as ' src/lib/steam.ts)" = "1" ]` (espera exatamente 1 ocorrência de ` as `). Mesma pattern em src/lib/abacatepay.ts (cast em response.json antes de Zod parse) — confirmar lendo aquele arquivo.
    - ZERO `.then(` ou `.catch(` no arquivo (per C11): `! grep -E '\\.then\\(|\\.catch\\(' src/lib/steam.ts` retorna 0
    - ZERO `any` em código autoral: `! grep -nE ': any\\b|<any>|as any' src/lib/steam.ts` retorna 0
    - Funções todas ≤ 50 linhas, arquivo total ≤ 300 linhas (per C2)
    - `pnpm typecheck` passa exit 0
  </acceptance_criteria>
  <done>
    `src/lib/steam.ts` provê API completa para Plans 03-03 (Server Action `signInWithSteam` chama `getSteamRedirectUrl(state)` e callback handler chama `validateAndFetchSteam(searchParams, expectedState)` num único call). Zero dependência circular. Sem any/unknown além do cast único em response.json. Comentário PT-BR documenta razão de descarte da lib.
  </done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exit 0
- `pnpm install` sem warnings novos (e sem deps novas — package.json não muda)
- `node-steam-openid` NÃO aparece em package.json: `! grep -q '"node-steam-openid"' package.json`
- `STEAM_WEB_API_KEY` em `.env.example` + `src/lib/env.ts` serverSchema
- `src/lib/steam.ts` exports: `getSteamRedirectUrl(state)`, `validateSteamCallback`, `fetchSteamPersona`, `validateAndFetchSteam`, `SteamProfile`
- `src/lib/steam.ts` documenta razão de descarte de node-steam-openid em comentário
- Único cast `as SummariesResponse` (count = 1)
- Zero violations C1 (any), C11 (.then chains)
</verification>

<success_criteria>
- Wave 1 deliverable: layer Steam pronta, isolada e tipada
- Plan 03-03 (Wave 2) consegue importar `getSteamRedirectUrl` (com state) e `validateAndFetchSteam` direto, mantendo o GET handler ≤ 50 linhas
- Pedro tem instruções claras em `.env.example` pra criar STEAM_WEB_API_KEY (Steam dev portal + domínio formuladota.com)
- Type-safety 100%: `SteamProfile` consumível em components downstream
- Zero deps adicionais — `node-steam-openid` documentado como avaliado-e-descartado
</success_criteria>

<output>
After completion, create `.planning/phases/03-steam-oauth-roles-multicoach/03-02-SUMMARY.md` documentando:
- Confirmação que `node-steam-openid` NÃO foi instalado (e razão documentada no header de src/lib/steam.ts)
- API pública de `src/lib/steam.ts` (assinaturas exatas das 4 funções + 1 type)
- Tamanho final do arquivo (linhas) e funções todas ≤ 50 linhas
- Próximo: Plans 03 e 04 podem rodar em paralelo (ambos consomem `src/lib/steam.ts`)
</output>
