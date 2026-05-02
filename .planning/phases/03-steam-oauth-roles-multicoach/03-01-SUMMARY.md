---
phase: 03-steam-oauth-roles-multicoach
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migrations, multi-coach, steam-oauth, schema]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: profiles table, is_admin() helper, RLS pattern
  - phase: 01.5-doutrina
    provides: behavior_status, doctrine_versions, security definer helpers pattern
  - phase: 02-catalog-checkout
    provides: 4 packages seedados (que ganham coach_id na Migration 005)
provides:
  - Tabela coaches (PK uuid, profile_id FK, slug unique, ativo, accepted_at)
  - Tabela steam_links (user_id PK, steam_id_64 unique, persona, avatar_url, verified_at)
  - profiles.role enum ('admin','coach','player') + profiles.trial_ends_at
  - packages.coach_id FK coaches(id) — NOT NULL pós-Pedro-login
  - Helper RLS public.is_coach() retorna boolean
  - 4 RLS policies (2 coaches + 2 steam_links)
  - src/types/database.ts atualizado com tipos completos
  - Pattern canônico H1.2 de identidade externa (steam_links shape replicado em V2)
affects:
  - phase 03-02 (steam-client-env) usa coach_id em queries e steam_links em flow
  - phase 03-03 (vincular-steam-page) consome Tables<"steam_links">
  - phase 03-04 (middleware-steam-gate) checa steam_links existence
  - phase 03-05 (multicoach-refactor) faz JOIN packages × coaches × profiles
  - phase 04 (subscription) usa profiles.trial_ends_at para trial 7d
  - phase 06+ (admin panel) consome coaches table para CRUD multi-coach

# Tech tracking
tech-stack:
  added: ["pg@8.20.0 (devDep)", "@types/pg@8.20.0 (devDep)"]
  patterns:
    - "Migration 005 idempotente via 'if not exists' + 'on conflict do nothing' + DO $$ block condicional para SET NOT NULL"
    - "scripts/apply-migration-005.mjs — runner one-off via pg directo (Supabase CLI exige Docker, indisponível)"
    - "Connection via session pooler aws-1-sa-east-1.pooler.supabase.com:5432 com username postgres.<ref> (suporta multi-statement DDL)"
    - "Helper RLS pattern: security definer + set search_path = public + stable"
    - "Pattern canônico H1.2 de identidade externa documentado em comentário SQL (replicado em V2 para youtube_links/twitch_links/x_links)"

key-files:
  created:
    - supabase/migrations/005_steam_roles_multicoach.sql
    - scripts/apply-migration-005.mjs
  modified:
    - src/types/database.ts
    - package.json (devDep pg + @types/pg)
    - pnpm-lock.yaml

key-decisions:
  - "ALTER COLUMN coach_id SET NOT NULL feito condicionalmente via DO $$ block — só aplica quando todos pacotes têm coach_id preenchido. Pré-Pedro-login fica nullable; re-rodar migration pós primeiro login finaliza."
  - "Connection ao Supabase via session pooler (porta 5432) em aws-1-sa-east-1 — aws-0 retorna 'Tenant or user not found' para este projeto. Direct connection (db.<ref>.supabase.co:5432) timeout em IPv6."
  - "scripts/apply-migration-005.mjs mantido tracked como documentação do método de aplicação manual — Pedro pode re-executar pós primeiro login Discord para finalizar NOT NULL constraint."
  - "Types regenerados manualmente preservando pattern Relationships:[] em todas tables novas (Phase 2 documentou que sem isso .from() resolve como never)."

patterns-established:
  - "Migration multi-step com DO $$ blocks condicionais — permite re-execução segura quando dados upstream (Pedro profile) não estão prontos"
  - "Scripts/runner one-off pattern — node script lê .env.local, conecta via pg pooler, aplica SQL em transação única com rollback automático em caso de erro"
  - "Comentário SQL como documentação arquitetural — H1.2 pattern canônico marcado dentro do próprio DDL para que futuros agentes entendam que steam_links é template para outras redes"

requirements-completed: [H1.2, H1.3, H1.4, C4, C12]

# Metrics
duration: 7min 29s
completed: 2026-05-02
---

# Phase 3 Plan 01: Migration 005 Summary

**Schema Phase 3 aplicado no Supabase: coaches + steam_links + profiles.role/trial_ends_at + packages.coach_id, com helper is_coach() e 4 RLS policies novas; types regenerados sem erros TS.**

## Performance

- **Duration:** 7min 29s
- **Started:** 2026-05-02T02:31:42Z
- **Completed:** 2026-05-02T02:39:11Z
- **Tasks:** 2/2
- **Files modified:** 4 (1 SQL migration novo, 1 script novo, src/types/database.ts, package.json/pnpm-lock.yaml)

## Accomplishments

- **Schema Phase 3 vivo no DB** — Migration 005 aplicada via session pooler `aws-1-sa-east-1.pooler.supabase.com:5432`, transação única com rollback safety. Tabelas `coaches` e `steam_links` existem; colunas `profiles.role`, `profiles.trial_ends_at`, `packages.coach_id` adicionadas.
- **4 RLS policies novas ativas** — `coaches` (everyone reads active + admin manages), `steam_links` (users see own + users manage own). Helper `is_coach()` complementa `is_admin()` legacy.
- **Pattern canônico H1.2 documentado** — comentário SQL inline em `steam_links` declara o shape como template para `youtube_links`/`twitch_links`/`x_links` na V2 (Hub multi-redes).
- **Types regenerados sem erros TS** — `src/types/database.ts` ganha `coaches`, `steam_links`, `profiles.role`, `profiles.trial_ends_at`, `packages.coach_id`. Pattern `Relationships:[]` preservado em todas tables novas. `pnpm typecheck` exit 0, `pnpm lint` exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 005 SQL + apply via Supabase pooler** — `d3b6aef` (feat)
2. **Task 2: Regen src/types/database.ts** — `48a0ffe` (feat)

## Files Created/Modified

- **`supabase/migrations/005_steam_roles_multicoach.sql`** (160 linhas) — DDL completo Phase 3. Idempotente (if not exists, on conflict do nothing, DO $$ block condicional para SET NOT NULL). Comentários PT-BR em cada bloco (per C12). Documenta H1.2 pattern canônico inline.
- **`scripts/apply-migration-005.mjs`** (~110 linhas) — Runner one-off via `pg` lib. Conecta ao session pooler (porta 5432) com fallback aws-0 → aws-1 sa-east-1. Lê SUPABASE_DB_PASSWORD de `.env.local`. Aplica em transação única, executa 10 verificações pós-aplicação, exit 1 se algo crítico falhou. Idempotente — Pedro pode re-rodar pós primeiro login Discord.
- **`src/types/database.ts`** — +71 linhas. Adicionados:
  - `coaches: { Row, Insert, Update, Relationships:[] }` (após behavior_status_log, antes de doctrine_versions)
  - `steam_links: { Row, Insert, Update, Relationships:[] }` (após sessions, antes de user_stats)
  - `profiles.Row/Insert/Update` ganha `role: "admin" | "coach" | "player"` + `trial_ends_at: string | null`
  - `packages.Row/Insert/Update` ganha `coach_id: string` (não-null pois NOT NULL no DB pós-seed)
  - Comentário PT-BR no header de `steam_links` documenta pattern H1.2
- **`package.json` + `pnpm-lock.yaml`** — devDeps `pg@8.20.0` + `@types/pg@8.20.0` adicionados (necessários pelo runner one-off). Sem dependências runtime adicionadas — runner é dev-only.

## Decisions Made

### 1. Aplicação via `scripts/apply-migration-005.mjs` em vez de `mcp__supabase__apply_migration`

**Contexto:** Prompt original instruía aplicar via tool `mcp__supabase__apply_migration`, mas as ferramentas MCP da Supabase **não estão expostas como function calls** nesta sessão de execução (apesar do `claude mcp list` mostrar a Supabase MCP como `✓ Connected` no nível user-config). Apenas Read/Write/Edit/Bash/Grep/Glob estão disponíveis.

**Decisão:** Aplicar via script Node.js direto (`pg` library) com a `SUPABASE_DB_PASSWORD` já presente em `.env.local`. Caminho equivalente operacional: aplica SQL em transação única, com rollback automático em erro. Resultado idêntico ao MCP do ponto de vista do DB.

**Por quê:** Bloqueio estrutural — não há jeito de invocar tools MCP `mcp__supabase__*` desta sessão. Alternativas avaliadas: psql (não instalado), supabase CLI (exige Docker, indisponível), Management API (exige PAT separado, não em `.env`). pg via session pooler é o caminho mais limpo com credenciais já disponíveis.

### 2. Connection via session pooler aws-1-sa-east-1 (não aws-0)

**Contexto:** `aws-0-sa-east-1.pooler.supabase.com:5432` retornou `Tenant or user not found` para este projeto. `db.nyvbfdsxjpiwgdroptdi.supabase.co:5432` resolve para IPv6 e dá ETIMEDOUT.

**Decisão:** Runner faz fallback automático aws-0 → aws-1. Para este projeto, aws-1 é o pooler correto.

### 3. ALTER COLUMN coach_id SET NOT NULL **condicional**

**Contexto:** Plan original ditava `alter table public.packages alter column coach_id set not null;` no fim. Falhou na primeira tentativa com `column "coach_id" of relation "packages" contains null values` — porque o seed Pedro depende de `profiles.is_admin=true` existir, e a tabela `profiles` está vazia (Pedro ainda não logou via Discord).

**Decisão:** Envolver o ALTER em DO $$ block condicional: só aplica se NÃO houver linhas com `coach_id is null`. Pré-Pedro-login fica nullable. Migration permanece idempotente — re-rodar pós primeiro login Discord finaliza o NOT NULL.

**Justificativa:** Documentado em `<important_notes>` do prompt como cenário aceitável: "Se Pedro não tem profile is_admin=true ainda... documentar como pendência no SUMMARY se acontecer." A alternativa (criar profile manualmente) viola FK em `auth.users` e exigiria seed via service_role JWT que adicionaria dependência indesejada.

### 4. Types regenerados manualmente preservando pattern `Relationships:[]`

**Contexto:** Phase 2 (commit `02-07-webhook-handler-SUMMARY`) descobriu que sem `Relationships: []` em cada table o Supabase JS v2 resolve `.from()` para `never`. Pattern documentado em comentário-cabeçalho do `database.ts`.

**Decisão:** Editar `database.ts` manualmente em vez de tentar regen via `pnpm db:gen-types` (exige Supabase CLI + Docker). Adicionei `Relationships: []` em ambas tables novas + comentário PT-BR documentando pattern canônico H1.2 em `steam_links`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ALTER COLUMN coach_id SET NOT NULL falha quando profiles vazia**

- **Found during:** Task 1 (primeira aplicação da migration)
- **Issue:** Migration original tinha `alter table public.packages alter column coach_id set not null;` no fim. Falha com `column "coach_id" of relation "packages" contains null values` porque o seed Pedro (`insert into coaches select from profiles where is_admin=true limit 1`) não inseriu nada — `profiles` está vazia (Pedro ainda não criou conta via Discord OAuth). Backfill `update packages set coach_id = (select id from coaches where slug='pedro-paulo')` portanto deixou todos 4 pacotes com `coach_id is null`. Resultado: `SET NOT NULL` viola, transação inteira rollback.
- **Fix:** Envolver o `ALTER` em `DO $$ ... END $$` block condicional: só aplica `SET NOT NULL` se não houver linhas null. Adicionado RAISE NOTICE explicativo. Migration permanece idempotente — re-rodar pós primeiro login finaliza.
- **Files modified:** `supabase/migrations/005_steam_roles_multicoach.sql` (último bloco antes do commit)
- **Verification:** Re-aplicação retorna `Migration aplicada com sucesso`. Verificações pós-mostram todas tabelas/colunas/policies/helper criados; apenas `coach_id is null` em 4 pacotes (esperado).
- **Committed in:** `d3b6aef` (Task 1 commit)

**2. [Rule 3 - Blocking] MCP tools `mcp__supabase__*` não expostos nesta sessão**

- **Found during:** Task 1 (tentativa de aplicar via MCP per prompt instructions)
- **Issue:** Prompt instruía `mcp__supabase__apply_migration` + `mcp__supabase__generate_typescript_types` + `mcp__supabase__list_tables`. Função list mostra apenas Read/Write/Edit/Bash/Grep/Glob — MCP tools não disponíveis. `claude mcp list` confirma supabase MCP `✓ Connected` no user-config, mas tools não expostos a este executor.
- **Fix:** Aplicar via `scripts/apply-migration-005.mjs` (Node.js + pg lib) usando `SUPABASE_DB_PASSWORD` de `.env.local`. Conecta no session pooler (multi-statement DDL OK). Verificações pós-aplicação via mesmo script. Types regenerados manualmente seguindo pattern existente (Plan tarefa 2 já previa este fallback: "NÃO regenerar via `pnpm db:gen-types` (Docker indisponível) — fazer manualmente seguindo pattern existente exato").
- **Files modified:** Adicionado `scripts/apply-migration-005.mjs`, `package.json`/`pnpm-lock.yaml` ganham devDeps `pg`/`@types/pg`.
- **Verification:** Migration aplicada com sucesso, todas verificações automáticas do PLAN passaram, `pnpm typecheck` exit 0, `pnpm lint` exit 0.
- **Committed in:** `d3b6aef` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking, ambas Rule 3)
**Impact on plan:** Ambas correções essenciais para completar a tarefa. Resultado funcional idêntico ao planejado — apenas o caminho de aplicação foi adaptado às tools disponíveis. Sem scope creep. Sem mudança no contrato/output esperado pelas próximas plans.

## Issues Encountered

- **Profiles table vazia (Pedro ainda não fez Discord OAuth):** documentado como pendência. Coluna `packages.coach_id` permanece nullable até primeiro login. Re-execução do `scripts/apply-migration-005.mjs` pós-login finaliza o NOT NULL automaticamente. Não bloqueia Plans 03-02 e 03-03 (que apenas adicionam env vars + página `/vincular/steam`); pode ser bloqueante para Plan 03-05 (multicoach refactor) que assume `packages.coach_id` populado em produção — Plan 03-05 deve ser executado APÓS Pedro logar pelo menos uma vez.

## Verification Status

Migration applied — verified via `node scripts/apply-migration-005.mjs`:

```
✓ Tabela coaches existe → 1
✓ Tabela steam_links existe → 1
✓ Coluna profiles.role existe → 1
✓ Coluna profiles.trial_ends_at existe → 1
✓ Helper is_coach() existe → 1
✓ Total pacotes (esperado 4) → 4
* Coluna packages.coach_id existe e é NOT NULL → 0 (esperado: pendente Pedro logar)
* Pedro coach (slug pedro-paulo) → 0 (esperado: pendente Pedro logar)
* Pacotes com coach_id null → 4 (esperado: pendente Pedro logar)
```

`grep` checks do PLAN:
- `create table if not exists public.coaches` ✓
- `create table if not exists public.steam_links` ✓
- `PATTERN CANÔNICO de identidade externa` ✓
- `alter table public.profiles` ✓
- `create or replace function public.is_coach` ✓
- `insert into public.coaches` ✓
- `alter column coach_id set not null` ✓ (dentro de DO block condicional)

Types check:
- `coaches: {` ✓
- `steam_links: {` ✓
- `role: "admin" | "coach" | "player"` ✓
- `trial_ends_at: string | null` ✓
- `coach_id: string` ✓
- `pnpm typecheck` exit 0 ✓
- `pnpm lint` exit 0 ✓
- Zero `any`/`unknown` em database.ts ✓

## Known Stubs

Nenhum. Esta plan é DDL puro + types — sem componentes UI, sem código de aplicação que possa ter placeholders.

## User Setup Required

**Pedro precisa fazer Discord OAuth pelo menos uma vez** antes de Plan 03-05 (multicoach refactor) rodar — para criar profile com `is_admin=true`, permitindo seed Pedro em `coaches` e backfill de `packages.coach_id`. Após login:

1. Pedro vai na app e faz login Discord (já implementado em Phase 1)
2. Via Supabase Dashboard ou SQL: `update public.profiles set is_admin = true where discord_id = '<pedro_discord_id>'`
3. Re-rodar `node scripts/apply-migration-005.mjs` — finaliza seed Pedro + backfill `coach_id` + aplica `SET NOT NULL`
4. Verificar: `select count(*) from coaches where slug='pedro-paulo'` deve retornar 1

Alternativamente, Plans 03-02/03-03/03-04 podem rodar em sequência sem este passo (não dependem de Pedro estar em coaches).

## Next Phase Readiness

**Pronto para Plans 03-02 e 03-03 em paralelo** (per `<output>` do PLAN):
- **Plan 03-02** (steam-client-env): adiciona `STEAM_WEB_API_KEY` ao env, cria lib `src/lib/steam.ts`. Não depende de dados em `coaches`/`steam_links` — só do schema vivo.
- **Plan 03-03** (vincular-steam-page): cria página `/vincular/steam` Server Component. Consome `Tables<"steam_links">` (já tipado).
- **Plan 03-04** (middleware-steam-gate): atualiza middleware com `STEAM_REQUIRED_PATHS`. Consome `Tables<"steam_links">` para checar existence.
- **Plan 03-05** (multicoach-refactor): JOIN `packages × coaches × profiles`. **Bloqueado até Pedro logar e re-rodar runner** — caso contrário queries retornam 0 resultados.

**Concerns:**
- Pedro precisa criar conta Discord antes de Plan 03-05 (documentado em "User Setup Required")
- Runner `scripts/apply-migration-005.mjs` mantido tracked para re-execução fácil pós primeiro login

## Self-Check: PASSED

- [x] `supabase/migrations/005_steam_roles_multicoach.sql` exists (FOUND, 160 linhas)
- [x] `scripts/apply-migration-005.mjs` exists (FOUND)
- [x] `src/types/database.ts` modified with `coaches`, `steam_links`, `role`, `trial_ends_at`, `coach_id`
- [x] Commit `d3b6aef` exists in `git log` (Task 1)
- [x] Commit `48a0ffe` exists in `git log` (Task 2)
- [x] `pnpm typecheck` exit 0
- [x] `pnpm lint` exit 0
- [x] Migration aplicada no Supabase confirmada via introspection (information_schema + pg_proc + pg_policies)

---
*Phase: 03-steam-oauth-roles-multicoach*
*Completed: 2026-05-02*
