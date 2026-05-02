---
phase: 04-subscription-mensal
plan: 02
plan_id: 04-02
title: Env vars (HUB_PRICE_BRL + CRON_SECRET) + vercel.json cron config
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/env.ts
  - vercel.json
  - .env.example
autonomous: true
requirements:
  - H2.1
  - C12
must_haves:
  truths:
    - "src/lib/env.ts adiciona HUB_PRICE_BRL e CRON_SECRET ao serverSchema (ambos optional via z.preprocess)"
    - "requireServerEnv('HUB_PRICE_BRL') retorna string parseable como integer (default 47 quando ausente)"
    - "requireServerEnv('CRON_SECRET') exige min 32 chars quando configurada"
    - "vercel.json existe com 1 cron entry: path '/api/cron/subscriptions/charge-due' schedule '0 9 * * *'"
    - ".env.example documenta as 2 novas env vars com comentários PT-BR"
  artifacts:
    - path: "src/lib/env.ts"
      provides: "Schema Zod validando HUB_PRICE_BRL (number string) e CRON_SECRET (string min 32 chars)"
      contains: "HUB_PRICE_BRL: optional, CRON_SECRET: optional"
    - path: "vercel.json"
      provides: "Vercel Cron config — schedule diário 09:00 UTC pra /api/cron/subscriptions/charge-due"
      contains: "\"path\": \"/api/cron/subscriptions/charge-due\", \"schedule\": \"0 9 * * *\""
    - path: ".env.example"
      provides: "Documentação das 2 novas env vars com gerar-via openssl rand -hex 32"
      contains: "HUB_PRICE_BRL=, CRON_SECRET="
  key_links:
    - from: "vercel.json crons[0].path"
      to: "src/app/api/cron/subscriptions/charge-due/route.ts (Plan 04-04)"
      via: "Vercel injeta Authorization: Bearer ${CRON_SECRET} no schedule"
      pattern: "/api/cron/subscriptions/charge-due"
    - from: "requireServerEnv('CRON_SECRET')"
      to: "Plan 04-04 cron handler timingSafeEqual validation"
      via: "import requireServerEnv from @/lib/env"
      pattern: "requireServerEnv\\(\"CRON_SECRET\"\\)"
---

<objective>
Adicionar 2 env vars (`HUB_PRICE_BRL=47` e `CRON_SECRET` 32+ chars) ao schema Zod centralizado em `src/lib/env.ts` (per pattern Phase 3 STEAM_WEB_API_KEY) e criar `vercel.json` com config Vercel Cron diária pra endpoint `/api/cron/subscriptions/charge-due` (a ser criado em Plan 04-04). Atualizar `.env.example` documentando ambas vars com comentários PT-BR.

Esse plan habilita o cron do Plan 04-04 a rodar em produção (`vercel.json` é lido pelo Vercel no deploy) e dá ao handler do Plan 04-04 acesso seguro ao `CRON_SECRET` validado via `timingSafeEqual` per C8.

Purpose: Fundação de configuração externa pro cron job — sem isso, cron 04-04 não pode validar Authorization header nem rodar em produção. Plan paralelo a 04-01 (sem overlap em arquivos), Wave 1.

Output:
- `src/lib/env.ts` extendido com `HUB_PRICE_BRL` + `CRON_SECRET` no `serverSchema`
- `vercel.json` criado com 1 entry em `crons[]`
- `.env.example` atualizado com as 2 novas vars (com comentário "gerar via openssl rand -hex 32" pra CRON_SECRET)
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-subscription-mensal/04-CONTEXT.md
@.planning/phases/04-subscription-mensal/04-RESEARCH.md
@src/lib/env.ts

<interfaces>
<!-- src/lib/env.ts pattern existente — copiar pro novo schema -->
```typescript
const optional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional()
);

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optional,
  // ... existentes
  STEAM_WEB_API_KEY: optional,    // Phase 3 pattern
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email().optional()
  ),
});

export function requireServerEnv<K extends keyof typeof serverEnv>(key: K): string {
  const value = serverEnv[key];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória "${key}" não configurada. Verifique .env.local.`);
  }
  return value as string;
}
```

<!-- Vercel Cron docs (verificado via 04-RESEARCH.md / Vercel docs) -->
```json
{
  "crons": [
    { "path": "/api/cron/subscriptions/charge-due", "schedule": "0 9 * * *" }
  ]
}
```
- `schedule` aceita formato cron clássico (5 campos)
- Vercel injeta header `Authorization: Bearer ${CRON_SECRET}` automaticamente quando `CRON_SECRET` env var existe na mesma project
- Schedule é UTC; `0 9 * * *` = 09:00 UTC = 06:00 BRT
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Estender src/lib/env.ts com HUB_PRICE_BRL + CRON_SECRET no serverSchema</name>
  <files>src/lib/env.ts</files>
  <read_first>
    - src/lib/env.ts (estado atual — verificar serverSchema e pattern optional preprocess)
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-05 hardcoded HUB_PRICE_BRL=47, D-11 CRON_SECRET 32+ chars)
  </read_first>
  <action>
Modificar `src/lib/env.ts` adicionando 2 novas linhas no objeto `serverSchema` (entre `EMAIL_FROM` e o fechamento `})`:

```typescript
  // Phase 4 — Subscription Mensal PIX Manual
  // HUB_PRICE_BRL: preço da mensalidade em reais (string, parseInt no consumo).
  // Default 47 — alinhado com decisão Pedro 2026-05-02 (D-05).
  HUB_PRICE_BRL: optional,

  // CRON_SECRET: token Bearer pra validar Vercel Cron headers em /api/cron/*.
  // Gerar via: openssl rand -hex 32   (mínimo 32 chars).
  // Validado via crypto.timingSafeEqual no handler (per C8 + D-11).
  CRON_SECRET: optional,
```

Usar `optional` (preprocess existente) — schema é todo optional intencionalmente; validação cirúrgica acontece via `requireServerEnv("CRON_SECRET")` no handler que precisa.

NÃO criar variant strict pra CRON_SECRET (schema não valida tamanho — handler valida via Buffer length + timingSafeEqual).

Conferir após edit:
1. Schema continua usando `optional` preprocess (não strict).
2. `requireServerEnv` continua tipado via `keyof typeof serverEnv` — TypeScript autocomplete deve aceitar `requireServerEnv("HUB_PRICE_BRL")` e `requireServerEnv("CRON_SECRET")` sem erro.
3. Sem mudança em publicSchema (essas vars são server-only).

Validar:
```
pnpm typecheck
```
Deve passar sem erros.
  </action>
  <verify>
    <automated>grep -q "HUB_PRICE_BRL: optional" src/lib/env.ts && grep -q "CRON_SECRET: optional" src/lib/env.ts && grep -q "Phase 4 — Subscription Mensal PIX Manual" src/lib/env.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - "src/lib/env.ts contains 'HUB_PRICE_BRL: optional,'"
    - "src/lib/env.ts contains 'CRON_SECRET: optional,'"
    - "src/lib/env.ts contains comment 'Phase 4 — Subscription Mensal PIX Manual' (or similar PT-BR)"
    - "src/lib/env.ts contains comment with 'openssl rand -hex 32'"
    - "src/lib/env.ts does NOT contain 'ABACATEPAY_HUB_PRODUCT_ID' (D-05 — sem subscription nativa)"
    - "pnpm typecheck exits 0"
  </acceptance_criteria>
  <done>
    `src/lib/env.ts` adiciona HUB_PRICE_BRL e CRON_SECRET ao serverSchema. `requireServerEnv("HUB_PRICE_BRL")` e `requireServerEnv("CRON_SECRET")` ficam disponíveis pra Plans 04-04 e 04-06.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar vercel.json com Vercel Cron config</name>
  <files>vercel.json</files>
  <read_first>
    - .planning/phases/04-subscription-mensal/04-CONTEXT.md (D-11 schedule 0 9 * * * UTC)
    - .planning/phases/04-subscription-mensal/04-RESEARCH.md (Vercel Cron docs reference)
  </read_first>
  <action>
Criar `vercel.json` na raiz do projeto com conteúdo exato:

```json
{
  "crons": [
    {
      "path": "/api/cron/subscriptions/charge-due",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Notas:
- Schedule `0 9 * * *` = 09:00 UTC diário = 06:00 BRT (antes do horário comercial — D-11).
- Path `/api/cron/subscriptions/charge-due` referencia endpoint criado em Plan 04-04.
- 1 cron handler único faz both charge-due AND sweep-overdue (Claude's Discretion CONTEXT.md — escolha simples).
- NÃO incluir region/runtime overrides — Vercel padrão Edge é incompatível com `crypto` Node; deixa `nodejs` default.

Confirmar:
- Arquivo na RAIZ (`C:/Users/ADM/projects/formuladota-v2/vercel.json`), não em subpasta.
- JSON válido (sem trailing comma).
- Sem outras configs (`buildCommand`, `framework`, etc.) — Vercel detecta Next.js automaticamente.
  </action>
  <verify>
    <automated>test -f vercel.json && node -e "const c=require('./vercel.json'); if(c.crons[0].path!=='/api/cron/subscriptions/charge-due') process.exit(1); if(c.crons[0].schedule!=='0 9 * * *') process.exit(1); console.log('OK')"</automated>
  </verify>
  <acceptance_criteria>
    - "vercel.json exists at project root"
    - "vercel.json is valid JSON (parseable via require)"
    - "vercel.json contains '\"path\": \"/api/cron/subscriptions/charge-due\"'"
    - "vercel.json contains '\"schedule\": \"0 9 * * *\"'"
    - "vercel.json crons array length is 1 (single entry — vide D-11 + Claude's Discretion 1 cron único)"
  </acceptance_criteria>
  <done>
    `vercel.json` criado com 1 entry em crons[]. Schedule diário 09:00 UTC pra `/api/cron/subscriptions/charge-due`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Atualizar .env.example documentando HUB_PRICE_BRL + CRON_SECRET</name>
  <files>.env.example</files>
  <read_first>
    - .env.example (estado atual — adicionar seção nova ao final OU ao lado de AbacatePay)
    - CLAUDE.md linhas 89-118 (template `.env.example` referência)
  </read_first>
  <action>
Editar `.env.example` adicionando seção "Phase 4 — Subscription Mensal PIX Manual" antes da seção "App" (final):

```
# Phase 4 — Subscription Mensal PIX Manual
# Preço da mensalidade HUB em reais (string, parseInt no consumo)
HUB_PRICE_BRL=47

# Token Bearer pra validar Vercel Cron headers em /api/cron/*
# Gerar via: openssl rand -hex 32
# Validado via crypto.timingSafeEqual no handler (per C8)
CRON_SECRET=
```

Se `.env.example` não existe ainda no projeto, criar com TODAS as vars do CLAUDE.md linhas 93-118 mais as 2 novas. Se existir, apenas anexar a seção nova.

Conferir:
- Não escrever VALOR REAL do CRON_SECRET (só `=` vazio — placeholder).
- Não commitar `.env.local` (já em .gitignore presumivelmente).
- Comentários em PT-BR (per C12).
  </action>
  <verify>
    <automated>test -f .env.example && grep -q "HUB_PRICE_BRL=47" .env.example && grep -q "CRON_SECRET=" .env.example && grep -q "openssl rand -hex 32" .env.example</automated>
  </verify>
  <acceptance_criteria>
    - ".env.example exists at project root"
    - ".env.example contains 'HUB_PRICE_BRL=47'"
    - ".env.example contains 'CRON_SECRET=' (with empty value placeholder, NOT real secret)"
    - ".env.example contains 'openssl rand -hex 32' instruction"
    - ".env.example contains comment 'Phase 4 — Subscription Mensal PIX Manual' or similar"
  </acceptance_criteria>
  <done>
    `.env.example` documenta as 2 novas env vars com comentários PT-BR. Pedro consegue copiar pra `.env.local` e configurar valores reais.
  </done>
</task>

</tasks>

<verification>
1. Validar `pnpm typecheck` passa após mudanças em src/lib/env.ts.
2. Validar `vercel.json` é JSON válido via `node -e "require('./vercel.json')"`.
3. Pedro deve adicionar `CRON_SECRET=<valor real>` em `.env.local` LOCAL (gerar via `openssl rand -hex 32`) E em Vercel project env vars (production) ANTES de deploy. Sem isso, cron handler do Plan 04-04 lança erro `requireServerEnv` no primeiro tick.
4. Validar Plan 04-01 não conflita com este (sem overlap de arquivos):
   - 04-01 toca: supabase/migrations/008_*.sql, src/types/database.ts
   - 04-02 toca: src/lib/env.ts, vercel.json, .env.example
   - Zero overlap → paralelo Wave 1 OK
</verification>

<success_criteria>
- [x] `src/lib/env.ts` adiciona HUB_PRICE_BRL + CRON_SECRET ao serverSchema
- [x] `vercel.json` criado na raiz com 1 cron entry (schedule 0 9 * * *, path charge-due)
- [x] `.env.example` documenta ambas vars com comentário PT-BR
- [x] `pnpm typecheck` exits 0
- [x] Sem overlap de arquivos com Plan 04-01 (paralelizável Wave 1)
</success_criteria>

<output>
Após completar todas tasks, criar `.planning/phases/04-subscription-mensal/04-02-SUMMARY.md` seguindo template `C:/Users/ADM/.claude/get-shit-done/templates/summary.md` com:
- Lembrar Pedro de gerar CRON_SECRET local + adicionar em Vercel env vars antes de Plan 04-04 deploy
- Confirmar que vercel.json é detectado automaticamente pelo Vercel CLI (sem build command override)
</output>
