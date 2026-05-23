---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Design Foundations — AAA Game Client Experience
status: In Progress
last_updated: "2026-05-23T00:00:00.000Z"
current_phase: (defining requirements)
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-23 — Milestone v2.5 Design Foundations started

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Hub de comunidade Dota 2 brasileira com cultura doutrinada — onde jogadores compartilham vagas em partidas in-house criadas pelo Pedro e jogam alinhados (NÃO é coaching, é jogar junto).
**Current focus:** Design Foundations AAA — fundação visual permanente antes de qualquer nova UI.

---

## Accumulated Context (preserved from v2.0)

> Tudo abaixo é histórico do milestone V2 (HUB) preservado pra continuidade pós-V2.5.

# formuladota v2 — Project State

> Estado atual do projeto. Milestone V1 completo. Milestone V2 (HUB) em planejamento Phase 3.

## ✦ PIVÔS ESTRATÉGICOS 2026-05-02 — Brand FORMULADOTA + Mercado Pago + Design Refresh

**Documento detalhado:** `.planning/PIVOTS-2026-05-02.md` (LER PRIMEIRO ao retomar sessão)

5 mudanças grandes (Pedro 2026-05-02):
1. **Brand:** "FORMULADOTA" sempre maiúsculo, sem acento (não "Fórmula Dota")
2. **Paleta visual:** vermelho/preto/branco do logo real (NÃO cyan/purple — paleta atual desalinhada)
3. **Sem menção "Pedro Paulo" em UI** — Pedro fica como admin implícito, não pessoa pública
4. **Pagamento:** migrar pra Mercado Pago Pix Automático (lançado Bacen junho/2025) — descarta AbacatePay PIX Manual via Cron. MCP MP adicionado mas precisa autenticação
5. **Design referência:** https://guardiansgamers.com/ + assets oficiais Dota 2 (vídeos idle heroes via Steam CDN)

**Phase 4 plans antigos ARQUIVADOS:** `.planning/phases/_deprecated/04-subscription-mensal-abacatepay-pix-manual/` (6 plans, AbacatePay PIX Manual via Vercel Cron — abordagem descartada)

**NOVA Phase 3.5 — Rebrand & Design System Refresh** inserida no ROADMAP entre Phase 3 e Phase 4. Executar antes da Phase 4 nova.

---

## ✦ PIVÔ ESTRATÉGICO 2026-05-01 — formuladota = HUB Dota 2

Pedro mudou escopo de "loja de mentoria 1-1" para "HUB de comunidade Dota 2 estilo GamersClub":

- Mensalidade R$47/mês via AbacatePay subscription nativa (PIX recorrente)
- Bot Steam cria lobby in-house (modelo `meta-liga.ggarena.pro`)
- Sistema de temporadas + MMR próprio + ranking + premiação placeholder
- Multi-coach (V2 lança coaches plurais; schema pronto desde Phase 3)
- Steam OAuth obrigatório (vincula ao Discord existente)

Detalhes: `.planning/PROJECT.md` (vision canônica) + memória `project_pivot_hub_dota.md`.

## Stack atual

| Layer | Tech | Versão | Status |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | ✓ |
| UI lib | React | 19.0.0 | ✓ |
| Lang | TypeScript | 5.9 strict | ✓ |
| CSS | Tailwind CSS | v4 (beta) | ✓ |
| DB / Auth | Supabase | postgres-js 2.x | ✓ |
| Auth Discord | Discord OAuth via Supabase | — | ✓ Phase 1 |
| Auth Steam | OpenID 2.0 | — | ⏳ Phase 3 |
| Payments avulso | AbacatePay PIX Transparent | V2 sandbox | ✓ Phase 2 |
| Subscription mensal | **Mercado Pago Pix Automático** (descartado AbacatePay subscription CARD-only) | preapproval API | ⏳ Phase 4 — MCP MP adicionado, precisa autenticar |
| Email | Resend (idempotencyKey) | onboarding@resend.dev | ✓ Phase 2 |
| Stats primário | Stratz GraphQL | Tier 1 free 2k req/h | ⏳ Phase 7 |
| Stats secundário | OpenDota Premium | $0.01/100 calls | ⏳ Phase 7 (fallback) |
| Bot Steam | steam-user v5 + steam-totp + node-dota2 | — | ⏳ Phase 5 |
| Hosting app | Vercel | conectado ao GitHub | ⏳ Phase 8 |
| Hosting bot | Railway Hobby | ~$3/mês | ⏳ Phase 5 |

## Phases completas

### Milestone V1 (✓ COMPLETED)

- ✓ **Phase 1** — Foundation (Discord OAuth, schema base, RLS, login)
- ✓ **Phase 1.5** — Doutrina (aceite obrigatório, sistema progressivo advertência → suspensão → banimento, /codigo-de-conduta, /onboarding/doutrina, telas /suspended e /banned, middleware enforcement)
- ✓ **Phase 2** — Catalog & Checkout (PIX avulso AbacatePay Transparent, idempotência via UPDATE conditional, webhook HMAC SHA-256 base64 timingSafeEqual, email Resend com idempotencyKey)

## Phase corrente

### Milestone V2 — HUB ◆ CURRENT

- ✓ **Phase 3** — Steam OAuth + Roles + Multi-coach Refactor (5/5 plans completas, aguardando verify)
  - [x] 03-01 — Migration 005 (coaches/steam_links/role/coach_id) + types regen ← **CONCLUÍDO 2026-05-02**
  - [x] 03-02 — steam-client-env (src/lib/steam.ts + STEAM_WEB_API_KEY) ← **CONCLUÍDO 2026-05-02**
  - [x] 03-03 — vincular-steam-page + Server Action signInWithSteam ← **CONCLUÍDO 2026-05-02 (parallel)**
  - [x] 03-04 — middleware STEAM_REQUIRED_PATHS gate ← **CONCLUÍDO 2026-05-02 (parallel)**
  - [x] 03-05 — multicoach-refactor (PackageCard + /pacotes) ← **CONCLUÍDO 2026-05-02 (parallel)**
- ◆ **Phase 3.5 — Rebrand & Dota 2 Visual System** ← **IN PROGRESS 2026-05-02** (researcher rodando, planner+executor enfileirados)
- ◆ **Phase 4 — Mercado Pago Migration End-to-End** ← **IN PROGRESS 2026-05-02** (researcher rodando, planner+executor enfileirados; replaces Phase 4 antiga AbacatePay PIX Manual deprecated)
- ○ Phase 5 — Bot Steam Lobby Creator
- ○ Phase 6 — Sistema de Ligas + MMR + Temporadas
- ○ Phase 7 — Badges + Ranking + Perfil Expandido
- ○ Phase 8 — Painel Admin + Painel Player + Polish + Deploy

## Migrations Supabase aplicadas

| # | Arquivo | Conteúdo |
|---|---|---|
| 001 | initial_schema.sql | profiles, packages, purchases, availability_windows, matches, sessions, user_stats + triggers |
| 002 | rls_policies.sql | 25 policies, RLS ativo em todas tables |
| 003 | seed_packages.sql | 4 pacotes (R$10/50/100/100) + 7 janelas Pedro 19h-22h |
| 004 | doctrine_and_moderation.sql | doctrine_versions, user_warnings, behavior_status_log, trigger 3-strikes, helpers RLS |
| 005 | steam_roles_multicoach.sql | coaches, steam_links, profiles.role+trial_ends_at, packages.coach_id, helper is_coach(), 4 RLS policies novas. Aplicada via `scripts/apply-migration-005.mjs` (session pooler aws-1-sa-east-1). NOT NULL em packages.coach_id pendente até Pedro logar Discord. |

Projeto Supabase: `nyvbfdsxjpiwgdroptdi` em `sa-east-1`.

## Repositório

- GitHub: `pedropauloai/formuladota-v2` (privado)
- Branch: `main`

## Contas externas configuradas

- Discord: app `formuladota` (1499631204100604025), bot instalado no servidor FORMULADOTA (303265529433686017)
- AbacatePay sandbox: API key + webhook secret (HMAC) prontos. **Subscription endpoint nativo confirmado** (Phase 4)
- Resend: API key, domínio `formuladota.com` não verificado (usar `onboarding@resend.dev`)
- OpenDota: Premium key, sem rate limits
- Stratz: ainda criar conta + Tier 1 token (Phase 7)
- Vercel: GitHub linkado, deploy não acionado ainda
- Hostinger: domínio `formuladota.com` ativo (DNS no Route 53)
- Railway: conta a criar (Phase 5 — bot host)
- Steam bot: conta dedicada a criar (Pedro vai criar — checklist com Dota 2 free + 1 jogo R$1 + 30 dias maturação)

## Cultura / Doutrina (norte do produto)

Texto canônico em `A FÓRMULA DO DOTA DE CORRIDA.txt` na raiz. Estruturado em `src/lib/doctrine.ts` (14 princípios + 10 anti-padrões + 3-strikes config).
Aceite obrigatório bloqueia rotas privadas (middleware + RLS).

## Decisões fundadoras (atualizadas pós-pivô)

- ~~Discord-first auth, Steam V1.5~~ → **Discord + Steam ambos obrigatórios** pra criar/entrar lobby
- ~~Pricing R$10/partida~~ → **R$ 47/mês mensalidade** (avulso de coach continua opcional)
- ~~Limite hardcoded 3 partidas/dia~~ → **REMOVIDO** (Pedro decisão 2026-05-01)
- Sessões sempre via Discord — mantido
- Aceite doutrinário obrigatório com 3-strikes — mantido
- **NOVO**: Multi-coach desde Phase 3 (schema), V2 lança UI multi-coach. Pedro = coach #1.
- **NOVO**: Premiação placeholder (`prize_pool` em `seasons` table, null default) — Pedro busca patrocinadores

## Decisões técnicas Phase 2 (preservadas)

- Base UI (`@base-ui/react`) em vez de Radix (shadcn canary preset base-nova)
- Dark-only sem next-themes
- Tokens shadcn mapeados pra cyberpunk em `:root`
- `tw-animate-css` no lugar de `tailwindcss-animate` (Tailwind v4)
- `Link` estilizado em vez de `Button asChild` (`@base-ui/react` não suporta asChild)
- `Database.ts` precisa `Relationships: []` + `Views: Record<never, never>` em cada table
- QR Code PNG como `<img>` (data URLs, Next/Image não aceita)

## Decisões técnicas Phase 3 (em curso)

- **Migration 005 idempotente** com DO $$ blocks condicionais — `SET NOT NULL` em `packages.coach_id` só aplica quando todos pacotes têm `coach_id` preenchido. Permite re-execução segura quando Pedro ainda não criou profile via Discord OAuth.
- **Aplicação manual de migrations via `scripts/apply-migration-005.mjs`** (Node + pg lib): alternativa ao Supabase CLI (Docker indisponível) e às tools MCP `mcp__supabase__*` (não expostas como function calls em executores GSD nesta sessão). Conecta ao session pooler `aws-1-sa-east-1.pooler.supabase.com:5432` (não aws-0 — aws-0 retorna "Tenant or user not found" para este projeto).
- **Pattern canônico H1.2 documentado em SQL** — `steam_links` é template para `youtube_links`/`twitch_links`/`x_links` (Milestone V4 multi-redes). Comentário inline na DDL alerta futuros agentes a manterem o shape mínimo.
- **`is_coach()` helper RLS** complementa `is_admin()` legacy. Pedro tem ambos `is_admin=true` AND `role='admin'` (compatibilidade dual com policies Phase 1/2).
- **node-steam-openid AVALIADA E DESCARTADA** — implementação Steam OpenID 2.0 100% manual via fetch em `src/lib/steam.ts`. Lib requer adapter Express, complica em Next 16 App Router sem benefício; manual é ~50 linhas core e zero deps. Justificativa em comentário PT-BR no header de steam.ts.
- **Helper composto `validateAndFetchSteam`** em src/lib/steam.ts — encapsula CSRF check (timingSafeEqual) + OpenID re-handshake + Steam Web API persona fetch num único call. Mantém callback handler /auth/steam/callback ≤ 50 linhas (per C2).
- **STEAM_WEB_API_KEY validado server-only** — adicionado ao serverSchema do env.ts como `optional` (Zod). Build não quebra sem a key; `requireServerEnv("STEAM_WEB_API_KEY")` lança erro descritivo só quando handler é chamado.
- **CSRF state via cookie httpOnly + crypto.timingSafeEqual** (Plan 03-03) — replica pattern HMAC AbacatePay de Phase 2. Cookie `steam_csrf_state` Secure SameSite=Lax maxAge=300s, deletado one-shot no callback antes do try block (zero órfãos em sucesso/erro).
- **Cookie client (não service role) pra upsert steam_links** (Plan 03-03) — RLS `auth.uid() = user_id` garante segurança. Service role permanece reservado pra `/api/webhooks/abacatepay` per C13.
- **ErrorBanner sub-component extraído no mesmo arquivo** (Plan 03-03) — pattern pra honrar C2 (página Server Component ≤ 50 linhas) sem criar churn de imports. Replicar em outras páginas com banners/estados.
- **Camada Steam no middleware aplicada APÓS doutrina** (Plan 03-04) — ordem 4 camadas: banned > suspended > !doctrine > !steam_linked. Awk validation (accepted=120, steam=140) garante regressão futura visível. Doutrina é gate cultural fundamental, Steam é integração técnica que vem depois.
- **Fail-open em DB error pra checagem de gate** (Plan 03-04) — query `steam_links` com falha → `console.error` + `return response`. Disponibilidade > paranoia em erro de infra (RLS continua protegendo dados sensíveis nas tabelas de destino). Pattern reaproveitável pra futuras camadas: subscription gate Phase 4, MMR gate Phase 6.
- **Path-based query gating no middleware** (Plan 03-04) — variável `needsSteamCheck` evita query Supabase pra rotas que não precisam (rotas públicas, login, doutrina, callbacks). Overhead da camada Steam = 0 fora de STEAM_REQUIRED_PATHS ∪ {/vincular/steam}.
- **2-query approach packages × coaches × profiles** (Plan 03-05) — `loadPackagesWithCoaches(supabase)` exportado em /pacotes/page.tsx faz 2-3 queries separadas + merge JS via `Map<coach_id, CoachInfo>`. Decisão locked CONTEXT.md: NÃO usar nested `.select()` Supabase relationship (Phase 2 viu issues de tipo objeto vs array). Pattern reaproveitável pra V3 multi-coach UI quando coaches plurais entrarem.
- **Helper extraído desde o início + buildCoachInfo sintético** (Plan 03-05) — PacotesPage Server Component fica 22 linhas (alvo C2 ≤30) com `loadPackagesWithCoaches` (41 linhas) + `buildCoachInfo` (7 linhas) extraídos no mesmo arquivo. Pattern: helpers async exportados aceitando `SupabaseClient<Database>` como param explícito facilitam reuso em /admin (futuro) e tests.
- **Pick<Tables<T>, K> em selects parciais** (Plan 03-05) — `Pick<Tables<"coaches">, "id" | "profile_id" | "slug">` em vez de `Tables<"coaches">` completo. Tipa o subset exato retornado pelas queries com .select("col1, col2"), ZERO `as` cast. Replicar em todos selects parciais futuros.
- **Empty state cyberpunk pra cenário Pedro pré-Discord-login** (Plan 03-05) — "Catálogo em breve. Coach principal entrando em breve." reflete que `coaches` table fica vazia até Pedro logar Discord (open question STATE.md). Pattern: empty states devem refletir estado real (não placeholder genérico).

## Open questions

- Bot Steam: conta dedicada — Pedro vai criar (checklist a entregar em Phase 5 pre-task)
- Stratz token API — pegar quando Phase 7 começar
- Domínio formuladota.com: DNS Route 53 → Vercel pra Phase 8
- Patrocinadores premiação: Pedro busca em paralelo
- AbacatePay sandbox vs prod: cobrança recorrente em sandbox testável?
- **Phase 3 — Pedro precisa logar Discord pelo menos uma vez** antes de Plan 03-05 (multicoach refactor) executar — sem profile com `is_admin=true` o seed Pedro em `coaches` não acontece e `packages.coach_id` permanece nullable. Re-rodar `node scripts/apply-migration-005.mjs` pós-login finaliza. Plans 03-02/03-03/03-04 não dependem deste passo.
- **Phase 3 — Pedro precisa criar STEAM_WEB_API_KEY** em https://steamcommunity.com/dev/apikey (cadastrar domínio formuladota.com) e adicionar em `.env.local`. Sem essa key, `fetchSteamPersona` lança erro no momento do callback. Plans 03-03/03-04 podem ser construídos sem a key — só bloqueia teste end-to-end.
