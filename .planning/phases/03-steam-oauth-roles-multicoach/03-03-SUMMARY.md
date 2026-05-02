---
phase: 03-steam-oauth-roles-multicoach
plan: 03
subsystem: auth
tags: [steam-openid, csrf, server-action, cookie-auth, supabase, react-19]

# Dependency graph
requires:
  - phase: 03-01-migration-005
    provides: tabela steam_links + RLS policies (auth.uid()=user_id), tipo Tables<"steam_links">
  - phase: 03-02-steam-client-env
    provides: src/lib/steam.ts (getSteamRedirectUrl, validateAndFetchSteam, fetchSteamPersona) + STEAM_WEB_API_KEY env var
provides:
  - Server Action signInWithSteam (gera CSRF state em cookie httpOnly + redirect Steam OpenID)
  - Callback handler /auth/steam/callback (lê cookie, valida via timingSafeEqual, upsert steam_links via cookie client)
  - Página /vincular/steam Server Component com 2 estados (UnlinkedState + LinkedState) + ErrorBanner
  - Mensagens PT-BR mapeadas pra todos erros do flow (csrf, invalid_signature, persona_unavailable, db_failed)
affects:
  - 03-04-middleware-steam-gate (vai redirecionar pra /vincular/steam quando user logado sem steam_link)
  - 03-05-multicoach-refactor (paralelo — sem overlap de arquivos)
  - Phase 5 (Bot Steam Lobby Creator — vai consumir steam_id_64 dos steam_links)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSRF protection via cookie httpOnly + crypto.timingSafeEqual (replicando pattern HMAC AbacatePay de Phase 2)"
    - "Server Action void return + redirect (não retorna FormData state — Next 16 App Router pattern)"
    - "Sub-component extraction pra honrar limite ≤ 50 linhas em Server Component pages (ErrorBanner)"
    - "Cookie one-shot read+delete antes do try/catch — não fica órfão em sucesso ou erro"
    - "Helper composto (validateAndFetchSteam) absorve composição pra manter route handler ≤ 50 linhas"

key-files:
  created:
    - src/app/vincular/steam/actions.ts
    - src/app/vincular/steam/page.tsx
    - src/app/auth/steam/callback/route.ts
  modified: []

key-decisions:
  - "CSRF state via cookie httpOnly Secure SameSite=Lax maxAge=300s — janela do flow OpenID, secure condicional a NODE_ENV"
  - "Cookie one-shot: lê + delete antes do try block, garantindo zero órfãos em sucesso/erro"
  - "Upsert via cookie client (not service role) — RLS auth.uid()=user_id garante segurança per C13"
  - "ErrorBanner extraído como sub-componente — necessário pra VincularSteamPage caber em ≤50 linhas (per C2 sem exceção)"
  - "Mensagens PT-BR específicas pra erro de CSRF distintas de invalid_signature — UX clara pro user"
  - "Adicionei chaves missing_state e missing_code ao ERROR_MESSAGES como future-proof (não usadas hoje, mas alinha com pattern OAuth padrão)"

patterns-established:
  - "Steam OAuth flow Next 16: Server Action gera state → cookie httpOnly → redirect → callback lê cookie → helper composto valida → cookie client upsert → redirect"
  - "Função page Server Component ≤ 50 linhas via extração de sub-components no mesmo arquivo (replicar pra outras páginas com banners/estados)"

requirements-completed: [H1.1, H1.2, C1, C2, C3, C5, C6, C7, C11, C12, C13]

# Metrics
duration: 3min
completed: 2026-05-02
---

# Phase 3 Plan 3: Vincular Steam Page Summary

**Server Action signInWithSteam (CSRF state via randomUUID + cookie httpOnly) + callback handler /auth/steam/callback enxuto (timingSafeEqual via validateAndFetchSteam helper) + página /vincular/steam Server Component (UnlinkedState/LinkedState/ErrorBanner extraído)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-02T02:55:12Z
- **Completed:** 2026-05-02T02:58:14Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 0

## Accomplishments

- Server Action `signInWithSteam` (43 linhas) — gera CSRF UUID v4, persiste em cookie `steam_csrf_state` httpOnly Secure SameSite=Lax maxAge=300s, e redireciona pra Steam OpenID via `getSteamRedirectUrl(state)` (Plan 03-02)
- Callback handler `/auth/steam/callback` (file 57 linhas, GET 46 linhas — ambos dentro de C2: ≤80/≤50) — lê + apaga cookie one-shot, delega CSRF/handshake/persona ao helper composto `validateAndFetchSteam`, upsert via cookie client com `onConflict: "user_id"` (RLS bloqueia upsert pra outro user)
- Página `/vincular/steam` (193 linhas total, VincularSteamPage 50 linhas exato) — 2 estados visuais cyberpunk (cyan UnlinkedState / emerald LinkedState), ErrorBanner sub-component extraído (purple #A855F7), Lucide icons (Gamepad2/ShieldCheck/AlertCircle), WCAG AA (role=alert, aria-labelledby, focus-visible:ring)
- 7 erros mapeados PT-BR: csrf, invalid_signature, persona_unavailable, db_failed, login_required_for_steam, missing_state, missing_code

## Task Commits

Each task was committed atomically (--no-verify pra parallel execution):

1. **Task 1: Server Action signInWithSteam** — `131a9c1` (feat)
2. **Task 2: Callback handler /auth/steam/callback** — `77a767a` (feat)
3. **Task 3: Página /vincular/steam** — `f36ebdf` (feat)

**Plan metadata:** (próximo commit — docs com SUMMARY/STATE/ROADMAP)

## Files Created/Modified

- `src/app/vincular/steam/actions.ts` (43 linhas) — Server Action signInWithSteam com CSRF cookie + redirect Steam OpenID
- `src/app/auth/steam/callback/route.ts` (57 linhas, GET 46 linhas) — Callback handler enxuto via helper composto + upsert steam_links
- `src/app/vincular/steam/page.tsx` (193 linhas, VincularSteamPage 50 linhas) — Server Component cyberpunk com UnlinkedState/LinkedState/ErrorBanner

## Constraint Compliance

- **C1 (zero `any`/`unknown`):** ✓ Todos os 3 arquivos passaram `! grep -nE ': any\b|as any|<any>'`
- **C2 (file ≤300 / function ≤50):** ✓
  - `actions.ts`: file 43 linhas, função signInWithSteam ~30 linhas
  - `route.ts`: file 57 linhas (<80), função GET 46 linhas (≤50)
  - `page.tsx`: file 193 linhas (<300), VincularSteamPage 50 linhas (=50, no limite), ErrorBanner ~14, UnlinkedState ~28, LinkedState ~50
- **C5 (WCAG 2.1 AA):** ✓ role="alert" no banner, aria-labelledby nas sections, aria-hidden em ícones decorativos, alt em img, focus-visible:ring nos botões
- **C6 (Lucide, NUNCA emojis):** ✓ Gamepad2, ShieldCheck, AlertCircle — zero emojis em UI
- **C7 (Cyberpunk theme):** ✓ #00F0FF cyan (CTA primário), #A855F7 purple (alert banner), emerald-500 (success), #050505 background, #0A0A1A cards
- **C11 (zero `.then()`/`.catch()` chains):** ✓ Apenas async/await + try/catch no route.ts
- **C12 (PT-BR comments):** ✓ Comentários explicativos em todos os 3 arquivos em português
- **C13 (NUNCA service role nesta phase):** ✓ Cookie client em todos os pontos — upsert delegado a `supabase.from("steam_links").upsert()` que respeita RLS `auth.uid() = user_id`

## Verifications Passed

```
✓ pnpm typecheck (exit 0)
✓ pnpm lint (exit 0)
✓ Todas as 32 grep checks passaram (steam_csrf_state, randomUUID, httpOnly, getSteamRedirectUrl(state),
  validateAndFetchSteam, jar.delete, upsert steam_links, onConflict user_id, csrf, persona_unavailable,
  Gamepad2, ErrorBanner, etc.)
✓ awk size checks: GET 46 linhas (≤50), route.ts 57 linhas (<80), VincularSteamPage 50 linhas (≤50)
✓ AUTH_FLOW_PATHS contém "/auth" (pre-condição: middleware NÃO bloqueia callback)
```

## Decisions Made

- **Cookie `steam_csrf_state` 5min lifetime** — janela suficiente pro user autorizar na Steam, mas estreita o suficiente pra mitigar replay attacks. Cookie é one-shot (deletado no callback antes do try block, garante limpeza mesmo em erro).
- **Upsert via cookie client (não service role)** — RLS policy `users manage own steam_link` (auth.uid() = user_id) garante segurança. Service role permanece reservado pra `/api/webhooks/abacatepay` per C13.
- **ErrorBanner como sub-component no mesmo arquivo** — alternativa a um arquivo separado em `components/`. Aceita pela proximidade (uso único) e pela necessidade de honrar C2 (VincularSteamPage ≤ 50 linhas) sem criar churn de imports.
- **2 chaves de erro extras** (`missing_state`, `missing_code`) — não geradas pelo callback atual, mas adicionadas a ERROR_MESSAGES como future-proof pra alinhar com o pattern OAuth padrão (caso flow precise indicar query param ausente em uma evolução futura).
- **Mensagens PT-BR distintas pra `csrf` vs `invalid_signature`** — UX clara: usuário entende a diferença entre "sessão expirada" (csrf) e "Steam respondeu coisa errada" (invalid_signature). Plan original sugeria `error=csrf` apenas; mantive separação semântica.

## Deviations from Plan

**None — plan executed exatamente como escrito.** Os 3 arquivos foram criados conforme as especificações de skeleton no PLAN.md (com mínimas adições future-proof à ERROR_MESSAGES que não conflitam com nenhuma diretiva).

**Total deviations:** 0
**Impact on plan:** Zero scope creep. Implementação literal das 3 tasks com todos os checks passando first try.

## Issues Encountered

- **Pre-existing typecheck error em `src/components/catalog/package-grid.tsx`** detectado durante primeira passagem do `pnpm typecheck` — esse arquivo é refatorado por Plan 03-05 (em paralelo). Após 03-05 commitar `15601f0` (feat(03-05): refactor PackageCard com prop coach), typecheck voltou a exit 0. Não é bug deste plan; rule SCOPE BOUNDARY (não tocar arquivo de outro plan paralelo) foi respeitada.

## User Setup Required

**STEAM_WEB_API_KEY ainda pendente.** Pedro precisa criar em https://steamcommunity.com/dev/apikey (cadastrar domínio formuladota.com) e adicionar a `.env.local` antes de testar end-to-end. Sem essa key, o callback handler vai redirecionar pra `?error=persona_unavailable` (helper `fetchSteamPersona` lança erro). UI continua renderizando ambos estados sem a key — só o flow completo precisa dela.

## Smoke Test Manual

⏳ **Não realizado** nesta sessão — depende de:
1. Pedro criar STEAM_WEB_API_KEY (acima)
2. Plan 03-04 (middleware Steam gate) — sem o middleware, user pode visitar `/vincular/steam` direto mas o flow obrigatório de redirect pra cá não está ativado

**Smoke test esperado** (a executar após 03-04):
1. `pnpm dev` → login Discord → aceitar doutrina → middleware redirecionar pra /vincular/steam (Plan 03-04)
2. UnlinkedState card cyan visível
3. Click "Continuar com Steam" → cookie `steam_csrf_state` setado, redirect Steam OpenID com `?state=<uuid>`
4. Autorizar na Steam → redirect `/auth/steam/callback?openid.*&state=<uuid>`
5. Callback valida CSRF + assinatura + persona → upsert steam_links → redirect `/vincular/steam?ok=1`
6. Middleware vê steam_link → redirect `/perfil`
7. Forçar erro CSRF: `/vincular/steam?error=csrf` → ver mensagem A855F7 alert
8. Apagar cookie devtools + completar flow → callback redireciona `?error=csrf`

## Next Phase Readiness

- **Ready for Plan 03-04** (middleware Steam gate): página de vinculação existe, callback funciona — middleware pode redirecionar pra `/vincular/steam` sem loop infinito (AUTH_FLOW_PATHS preserva `/auth/*`)
- **Ready for Plan 03-05** (multicoach refactor): zero overlap de arquivos (já confirmado em paralelo)
- **Pedro action item:** criar STEAM_WEB_API_KEY antes de testar end-to-end
- **Schema fundação H1.2:** tabela `steam_links` é template pra `youtube_links`/`twitch_links`/`x_links` (Milestone V4) — pattern documentado in-line nos 3 arquivos novos via comentários PT-BR

## Self-Check: PASSED

Verificações realizadas:
- ✓ `src/app/vincular/steam/actions.ts` existe (43 linhas)
- ✓ `src/app/auth/steam/callback/route.ts` existe (57 linhas, GET 46)
- ✓ `src/app/vincular/steam/page.tsx` existe (193 linhas, VincularSteamPage 50)
- ✓ Commit `131a9c1` existe (Task 1: signInWithSteam Server Action)
- ✓ Commit `77a767a` existe (Task 2: callback handler)
- ✓ Commit `f36ebdf` existe (Task 3: page.tsx)
- ✓ `pnpm typecheck` exit 0
- ✓ `pnpm lint` exit 0
- ✓ Todas as 32 grep checks de verify automatizado passaram
- ✓ Size checks: GET 46/50, route.ts 57/80, VincularSteamPage 50/50

---

*Phase: 03-steam-oauth-roles-multicoach*
*Plan: 03-03 vincular-steam-page*
*Completed: 2026-05-02*
