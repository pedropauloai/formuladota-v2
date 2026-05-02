---
phase: 03-steam-oauth-roles-multicoach
plan: 02
subsystem: auth
tags: [steam, openid, fetch, env-validation, csrf, server-only, zero-deps]

# Dependency graph
requires:
  - phase: 03-01
    provides: schema steam_links + Tables<"steam_links"> tipados; STATE.md atualizado pra plan 02
provides:
  - src/lib/steam.ts com 4 exports (getSteamRedirectUrl, validateSteamCallback, fetchSteamPersona, validateAndFetchSteam) + tipo SteamProfile
  - STEAM_WEB_API_KEY validado server-only via Zod no env.ts
  - .env.example documentado com instruções pra Pedro criar a key (Steam dev portal)
  - Pattern canônico de OpenID 2.0 manual via fetch (sem deps externas) — replicável em V2 pra outras redes (YouTube/Twitch)
affects:
  - phase 03-03 (vincular-steam-page) — Server Action signInWithSteam usa getSteamRedirectUrl(state); GET handler /auth/steam/callback usa validateAndFetchSteam(searchParams, expectedState)
  - phase 03-04 (middleware-steam-gate) — não consome diretamente, mas página /vincular/steam (criada em 03-03) depende deste módulo
  - phase 03-05 (multicoach-refactor) — não consome
  - V2 Milestone V4 (multi-redes) — pattern canônico de implementação manual (zero deps) replicável pra YouTube/Twitch/X OAuth

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OpenID 2.0 manual via fetch (zero deps): getSteamRedirectUrl + validateSteamCallback (re-handshake check_authentication anti-spoofing) + fetchSteamPersona (Steam Web API)"
    - "Helper composto validateAndFetchSteam mantém callback handlers enxutos (≤ 50 linhas) — encapsula CSRF timing-safe + OpenID validate + persona fetch num único call"
    - "Cast único `(await response.json()) as SummariesResponse` replicado de pattern abacatepay.ts:65 — único lugar com escape hatch tipo, justificado em comentário"
    - "Static import { timingSafeEqual } from 'node:crypto' (não import * as crypto) — mantém ' as ' count = 1 e evita namespace ambíguo"
    - "STEAM_WEB_API_KEY server-only via Zod optional + requireServerEnv enforcement no momento do uso (não no boot — segue pattern existente do env.ts)"

key-files:
  created:
    - src/lib/steam.ts
  modified:
    - src/lib/env.ts
    - .env.example

key-decisions:
  - "node-steam-openid AVALIADA E DESCARTADA — implementação manual via fetch (~50 linhas core) é mais nativa em Next 16 App Router, requer zero adapter Express, zero deps adicionais. Justificativa documentada em comentário PT-BR no topo de src/lib/steam.ts."
  - "Helper composto validateAndFetchSteam absorve o trio CSRF + OpenID + persona — caller (callback handler em 03-03) recebe SteamProfile pronto ou throws; mantém o GET handler ≤ 50 linhas per C2."
  - "CSRF check usa crypto.timingSafeEqual (mesmo padrão do HMAC AbacatePay em abacatepay.ts:112) — mitiga timing attacks consistente com Phase 2."
  - "STEAM_WEB_API_KEY adicionado APENAS ao serverSchema (não publicSchema) — server-only per C13. requireServerEnv lança erro descritivo se key faltar quando handler é chamado."

patterns-established:
  - "OpenID 2.0 server-side wrapper (zero deps): pattern de fetch + URLSearchParams pra construir handshake e re-handshake com check_authentication. Replicável em V2 pra outras redes que ainda usam OpenID 2.0."
  - "Helper composto pra mantê handlers ≤ 50 linhas: padrão de função orchestradora que combina 3+ steps (CSRF + validate + fetch) num único call, expondo Promise<Profile> ou throw — caller fica trivial."
  - "Zod optional + requireServerEnv: dual-layer validation de secrets — schema parse é leniente (build não quebra sem .env.local), enforcement é cirúrgico no momento do uso (handler quebra com erro descritivo se key faltar)."

requirements-completed: [H1.1, C1, C3, C11, C12, C13]

# Metrics
duration: 4min 15s
completed: 2026-05-02
---

# Phase 3 Plan 02: Steam Client + Env Validation Summary

**Camada Steam OpenID 2.0 + Steam Web API isolada em src/lib/steam.ts com 4 helpers tipados (getSteamRedirectUrl, validateSteamCallback, fetchSteamPersona, validateAndFetchSteam) e STEAM_WEB_API_KEY validado server-only via Zod — implementação 100% manual via fetch, zero deps adicionais.**

## Performance

- **Duration:** 4min 15s
- **Started:** 2026-05-02T02:45:16Z
- **Completed:** 2026-05-02T02:49:31Z
- **Tasks:** 2/2
- **Files modified:** 3 (1 novo: src/lib/steam.ts; 2 modificados: src/lib/env.ts, .env.example)

## Accomplishments

- **src/lib/steam.ts criado** (175 linhas) com 4 exports tipados + 1 tipo público (`SteamProfile`). Cobre todo o fluxo Steam OAuth via OpenID 2.0: redirect → callback re-handshake (anti-spoofing) → persona/avatar via Steam Web API. Helper composto `validateAndFetchSteam` encapsula CSRF check + validate + fetch num único call, mantendo callback handler enxuto (per C2).
- **node-steam-openid NÃO instalado** — package.json intacto, zero deps adicionais. Justificativa documentada em comentário PT-BR no topo de steam.ts (lib avaliada e descartada por (a) requer adapter Express, (b) implementação manual mais simples em Next 16 App Router, (c) zero deps).
- **STEAM_WEB_API_KEY validado** — adicionado ao serverSchema do src/lib/env.ts como `optional` (Zod preprocess vazio→undefined). Não exposto ao publicSchema (server-only per C13). `requireServerEnv("STEAM_WEB_API_KEY")` agora é callable e lança erro descritivo quando a key faltar no momento do uso.
- **.env.example documentado** — nova seção entre OpenDota e Resend com comentário PT-BR explicando como Pedro deve criar a key (https://steamcommunity.com/dev/apikey + domínio formuladota.com).
- **Type-safety 100%** — único cast em todo o módulo é `(await response.json()) as SummariesResponse` (replicando pattern abacatepay.ts:65). Zero `any`/`unknown` em código autoral. Funções todas ≤ 50 linhas (15, 37, 36, 24). `pnpm typecheck` exit 0, `pnpm lint` exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Atualizar env schema (.env.example + src/lib/env.ts) com STEAM_WEB_API_KEY** — `5bcba3a` (feat)
2. **Task 2: Criar src/lib/steam.ts com 4 helpers tipados + SteamProfile** — `8f47466` (feat)

## Files Created/Modified

- **`src/lib/steam.ts`** (175 linhas, NOVO) — Camada Steam OpenID 2.0 + Steam Web API, server-only.
  - Header com comentário PT-BR documentando razão de descarte de node-steam-openid (AVALIADA E DESCARTADA)
  - `getSteamRedirectUrl(state: string): string` — constrói URL `https://steamcommunity.com/openid/login?openid.ns=...&openid.mode=checkid_setup&openid.realm=${SITE_URL}/&openid.return_to=${SITE_URL}/auth/steam/callback?state=${encodeURIComponent(state)}&openid.identity=...&openid.claimed_id=...`. CSRF state vai como query param dentro de openid.return_to (Steam preserva o return_to inteiro e devolve no callback).
  - `validateSteamCallback(query: URLSearchParams): Promise<string>` — re-handshake POST `check_authentication` com Steam (anti-spoofing); retorna SteamID 64 do `openid.claimed_id` ou throws (3 paths: HTTP error, is_valid != true, claimed_id em formato inesperado).
  - `fetchSteamPersona(steamId64: string): Promise<SteamProfile>` — chama `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/` com `requireServerEnv("STEAM_WEB_API_KEY")`; cache `next.revalidate=3600`. Único cast `(await response.json()) as SummariesResponse`.
  - `validateAndFetchSteam(searchParams, expectedState): Promise<SteamProfile>` — helper composto: CSRF check via `timingSafeEqual` (anti timing attack) + validate + fetch persona. Caller (callback handler em 03-03) recebe SteamProfile pronto ou throws.
  - Tipo público `SteamProfile = { steamId64, persona, avatarUrl }`.
- **`src/lib/env.ts`** (+3 linhas) — Adicionada chave `STEAM_WEB_API_KEY: optional` ao `serverSchema` entre `OPENDOTA_API_KEY` e `RESEND_API_KEY`, com comentário PT-BR inline. Não modifica `publicEnv`, `requireServerEnv`, `parsedPublic` ou `publicSchema`.
- **`.env.example`** (+10 linhas) — Nova seção `Steam Web API (Phase 3 — Steam OAuth via OpenID 2.0)` entre OpenDota e Resend, com comentário PT-BR explicando: (a) URL pra criar key, (b) Pedro precisa cadastrar domínio formuladota.com, (c) em dev qualquer domínio funciona, (d) NUNCA expor no client.

## Decisions Made

### 1. node-steam-openid AVALIADA E DESCARTADA — implementação manual via fetch

**Contexto:** Plan original (revisão 0) considerava `pnpm add node-steam-openid` como path mais simples. Revisão 1 (CONTEXT.md, BLOCKER 4) reverteu essa decisão.

**Decisão:** Implementação 100% manual via `fetch` em src/lib/steam.ts. Zero deps adicionais — package.json fica intacto.

**Justificativa:**
- (a) `node-steam-openid` requer adapter Express-like — em Next 16 App Router precisaríamos traduzir NextRequest pra req Express, complicando sem benefício real
- (b) Implementação manual é nativa do runtime e mais simples (~50 linhas core, 175 com comentários PT-BR)
- (c) Manter package.json limpo é valor — cada dep é um attack vector + uma future migration

Documentado em comentário PT-BR no topo de src/lib/steam.ts pra que futuros agentes/devs entendam a decisão.

### 2. Helper composto `validateAndFetchSteam` ao invés de chamar 3 funções no callback handler

**Contexto:** O GET handler em /auth/steam/callback (Plan 03-03) precisa: (1) checar CSRF state, (2) validar OpenID assinatura, (3) buscar persona/avatar. Se chamar os 3 helpers individuais no handler, viola C2 (max 50 linhas/função).

**Decisão:** Adicionar `validateAndFetchSteam(searchParams, expectedState)` que orquestra os 3 steps. Caller fica trivial: `const profile = await validateAndFetchSteam(searchParams, cookieState);` ou throw → redirect com ?error=...

**Justificativa:** Mantém callback handler ≤ 50 linhas conforme C2. Centraliza CSRF check + anti-spoofing + persona fetch num lugar testável. Helper composto é o pattern canônico de "complex orchestration as a single call" estabelecido pelo plan.

### 3. CSRF check usa `timingSafeEqual` (não comparação direta)

**Contexto:** CSRF state recebido do Steam (via searchParams) precisa bater com state esperado (cookie). Comparação `===` é vulnerável a timing attacks (mesmo que muito improvável neste contexto).

**Decisão:** Usar `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))` com early return se lengths diferem (timingSafeEqual exige Buffers do mesmo tamanho).

**Justificativa:** Consistência com pattern Phase 2 (`verifyAbacatepayWebhookSignature` em abacatepay.ts:112 usa o mesmo timingSafeEqual). Defesa em profundidade — barato em performance, garante zero leakage de timing info.

### 4. Static import `{ timingSafeEqual }` ao invés de `import * as crypto`

**Contexto:** Plano original sugeria `import * as crypto from "node:crypto"` ou `await import("node:crypto")`. Verificação automática `[ "$(grep -c ' as ' src/lib/steam.ts)" = "1" ]` exige exatamente 1 ocorrência de ` as ` no arquivo (esperando que o único seja o cast `as SummariesResponse`).

**Decisão:** Usar `import { timingSafeEqual } from "node:crypto"` (named import). Drop `* as crypto`.

**Justificativa:** Mantém grep verification passando (1 cast = 1 ` as `) e ainda é mais idiomático (importa só o que usa). Funcionalmente equivalente. Sem dynamic import — mais simples, mesma performance.

### 5. STEAM_WEB_API_KEY como `optional` (não required) no schema

**Contexto:** Pedro ainda não criou a key no Steam dev portal (precisa primeiro logar no Steam com a conta dele e cadastrar formuladota.com). Marcar como `required` quebraria o build do projeto antes da key existir.

**Decisão:** `optional` no `serverSchema` (Zod preprocess vazio→undefined). Validação cirúrgica via `requireServerEnv("STEAM_WEB_API_KEY")` no momento do uso (em `fetchSteamPersona`).

**Justificativa:** Pattern existente do env.ts (todas as keys de Discord/AbacatePay/OpenDota/Resend são `optional`). Build não quebra. Quando user clicar "Vincular Steam" sem key configurada, `fetchSteamPersona` lança erro descritivo "Variável de ambiente obrigatória 'STEAM_WEB_API_KEY' não configurada. Verifique .env.local." — fail-fast no ponto de uso, não no boot.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan grep verification `openid.return_to.*state=` exigia tokens na mesma linha**

- **Found during:** Task 2 (verification step)
- **Issue:** Estrutura inicial do `getSteamRedirectUrl` (espelhando o exemplo do plan) tinha `openid.return_to: returnTo` numa linha e `const returnTo = '...?state=...'` em linha separada. O grep `grep -q "openid.return_to.*state="` (regex single-line) falhou — não há .* multi-line por default em grep.
- **Fix:** Refatorei pra inline o template literal direto na chave `openid.return_to`: `"openid.return_to": \`${siteUrl}/auth/steam/callback?state=${encodeURIComponent(state)}\``. Mesma semântica, ambos tokens agora aparecem na mesma linha.
- **Files modified:** src/lib/steam.ts (linhas 47-61)
- **Verification:** `grep -q "openid.return_to.*state=" src/lib/steam.ts` retorna exit 0.
- **Committed in:** `8f47466` (Task 2 commit)

**2. [Rule 3 - Blocking] `import * as crypto` violava count `as = 1`**

- **Found during:** Task 2 (verification step)
- **Issue:** Plan acceptance exigia `[ "$(grep -c ' as ' src/lib/steam.ts)" = "1" ]` — exatamente 1 ocorrência de ` as ` (apenas o cast `as SummariesResponse`). `import * as crypto from "node:crypto"` adiciona uma segunda ocorrência (`* as crypto`), quebrando a verificação.
- **Fix:** Trocado pra named import `import { timingSafeEqual } from "node:crypto"`. Atualizado o uso de `crypto.timingSafeEqual` pra `timingSafeEqual` direto. Funcionalmente equivalente.
- **Files modified:** src/lib/steam.ts (linha 16, linha ~167)
- **Verification:** `grep -c ' as ' src/lib/steam.ts` retorna `1`.
- **Committed in:** `8f47466` (Task 2 commit)

**3. [Rule 3 - Blocking] `match[1]` é `string | undefined` sob `noUncheckedIndexedAccess`**

- **Found during:** Task 2 (pnpm typecheck após escrita)
- **Issue:** TS strict mode com `noUncheckedIndexedAccess` (config provável do projeto, confirmado pelo erro `TS2322: Type 'string | undefined' is not assignable to type 'string'` em `return match[1]`). Plan dizia "Não usar non-null assertion" — então não dá pra usar `match[1]!`.
- **Fix:** Extrair `const steamId = match?.[1]` e checar `if (!steamId) throw ...` antes do return. Sem `!`, sem cast — type narrowing seguro.
- **Files modified:** src/lib/steam.ts (linhas 95-100)
- **Verification:** `pnpm typecheck` exit 0.
- **Committed in:** `8f47466` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (todas Rule 3 - Blocking, todas issues do próprio plan/config TS estrita)
**Impact on plan:** Todas correções essenciais pra completar a task com type-safety + verification passando. Nenhuma muda comportamento, contrato ou API pública. Sem scope creep. Implementação final é equivalente ao especificado no plan, apenas com pequenos ajustes sintáticos pra atender (a) regex single-line do grep, (b) count exato de ` as `, (c) noUncheckedIndexedAccess do TS.

## Issues Encountered

Nenhum issue não-resolvido. As 3 deviations acima foram todas auto-corrigidas dentro da própria Task 2 antes do commit final.

## User Setup Required

**Pedro precisa criar STEAM_WEB_API_KEY no Steam dev portal antes de Plans 03-03/03-04 serem testáveis end-to-end:**

1. Acessar https://steamcommunity.com/dev/apikey
2. Logar com a conta Steam que será cadastrada como "owner" da chave
3. No campo "Domain", cadastrar `formuladota.com` (domínio Hostinger ativo)
4. Confirmar via SMS/email se Steam pedir 2FA
5. Copiar a key gerada (32 caracteres hex)
6. Adicionar em `.env.local`: `STEAM_WEB_API_KEY=<key>`
7. Verificar com curl/Postman: `curl "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=<KEY>&steamids=76561198000000000"` deve retornar JSON com `response.players` (array vazio é OK — confirma que a key é válida).

Em dev, qualquer domínio funciona — o handshake OpenID valida só o realm que o app envia (configurável via `NEXT_PUBLIC_SITE_URL`). Mas a Steam Web API key tem domínio fixo. Pedro pode usar a mesma key em dev e prod, contanto que cadastre o domínio de prod (formuladota.com).

**Sem essa key, Steam OAuth NÃO FUNCIONA end-to-end em produção** (especificamente, `fetchSteamPersona` lança "Variável de ambiente obrigatória 'STEAM_WEB_API_KEY' não configurada"). Mas Plans 03-03 (página /vincular/steam + Server Action signInWithSteam), 03-04 (middleware STEAM_REQUIRED_PATHS) e 03-05 (multicoach refactor) podem ser construídos sem a key — ela só é consumida no callback handler quando user clica vincular.

## Verification Status

All Plan acceptance criteria verified:

**Task 1 (env + .env.example):**
- [x] `.env.example` contém `STEAM_WEB_API_KEY=` + comentário PT-BR explicativo
- [x] `src/lib/env.ts` `serverSchema` contém `STEAM_WEB_API_KEY: optional`
- [x] `STEAM_WEB_API_KEY` NÃO em `publicSchema` (per C13)
- [x] `package.json` NÃO contém `"node-steam-openid"`: `! grep -q '"node-steam-openid"' package.json` exit 0
- [x] `pnpm typecheck` exit 0

**Task 2 (src/lib/steam.ts):**
- [x] `src/lib/steam.ts` existe (175 linhas)
- [x] Exporta `getSteamRedirectUrl(state: string): string` — `grep -q "export function getSteamRedirectUrl(state: string)"` exit 0
- [x] `state=` aparece junto com `openid.return_to` na mesma linha — `grep -q "openid.return_to.*state="` exit 0
- [x] Exporta `async validateSteamCallback(query: URLSearchParams): Promise<string>` — exit 0
- [x] Exporta `async fetchSteamPersona(steamId64: string): Promise<SteamProfile>` com `requireServerEnv("STEAM_WEB_API_KEY")` — exit 0
- [x] Exporta `async validateAndFetchSteam(searchParams, expectedState): Promise<SteamProfile>` com `timingSafeEqual` — exit 0
- [x] Exporta `type SteamProfile` — exit 0
- [x] Comentário descarte node-steam-openid (`AVALIADA E DESCARTADA`) — exit 0
- [x] `grep -c ' as ' src/lib/steam.ts` = `1` (apenas `as SummariesResponse`)
- [x] Zero `.then(`/`.catch(` — `grep -cE '\.then\(|\.catch\(' src/lib/steam.ts` = 0
- [x] Zero `any` em código autoral — `grep -nE ': any\b|<any>|as any' src/lib/steam.ts` empty
- [x] Funções: 15, 37, 36, 24 linhas (todas ≤ 50, per C2)
- [x] Arquivo total: 175 linhas (≤ 300, per C2)
- [x] `pnpm typecheck` exit 0
- [x] `pnpm lint` exit 0

## Known Stubs

Nenhum. Esta plan é infraestrutura pura (lib + env) — sem componentes UI, sem placeholders. As funções têm implementação completa e funcional pendente apenas da `STEAM_WEB_API_KEY` ser configurada por Pedro no `.env.local` (documentado em "User Setup Required").

## Next Phase Readiness

**Plans 03-03 e 03-04 podem rodar em paralelo** — ambos consomem `src/lib/steam.ts`:

- **Plan 03-03 (vincular-steam-page)**: Server Action `signInWithSteam` chama `getSteamRedirectUrl(crypto.randomUUID())` + setCookie('steam-csrf', state); GET handler `/auth/steam/callback` chama `validateAndFetchSteam(searchParams, cookieState)` e persiste em `steam_links`. Página `/vincular/steam` é Server Component que mostra status atual.
- **Plan 03-04 (middleware-steam-gate)**: Middleware update com `STEAM_REQUIRED_PATHS` checa se user tem `steam_links` row antes de servir `/pacotes`, `/checkout/[id]`, etc. Não consome diretamente `src/lib/steam.ts`, mas a página de redirect (criada em 03-03) depende.

**Bloqueio mínimo:**
- Pedro ainda não criou STEAM_WEB_API_KEY (não bloqueia desenvolvimento dos plans 03-03/04, só bloqueia teste end-to-end)
- Plan 03-05 (multicoach-refactor) continua bloqueado pela necessidade de Pedro logar Discord pelo menos uma vez (herdado do plan 03-01)

**Pronto para próxima plan:** ✓

## Self-Check: PASSED

- [x] `src/lib/steam.ts` exists at expected path (175 linhas)
- [x] `src/lib/env.ts` modified with `STEAM_WEB_API_KEY: optional`
- [x] `.env.example` modified with Steam Web API section
- [x] Commit `5bcba3a` exists in `git log` (Task 1: feat env + .env.example)
- [x] Commit `8f47466` exists in `git log` (Task 2: feat src/lib/steam.ts)
- [x] `pnpm typecheck` exit 0
- [x] `pnpm lint` exit 0
- [x] `package.json` unchanged (no `node-steam-openid` added)
- [x] All acceptance criteria from PLAN verified

---
*Phase: 03-steam-oauth-roles-multicoach*
*Completed: 2026-05-02*
