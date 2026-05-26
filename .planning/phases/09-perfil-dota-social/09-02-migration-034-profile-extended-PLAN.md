---
phase: 09-perfil-dota-social
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/034_profile_extended.sql
autonomous: false
requirements:
  - D-18
  - D-19
  - D-20
  - D-21
  - D-37
  - D-38
must_haves:
  truths:
    - "Coluna profiles.status_message existe com CHECK length <= 60 (habilita D-18)"
    - "Coluna profiles.hero_portrait_slug TEXT nullable existe (habilita D-20)"
    - "Coluna profiles.favorite_heroes JSONB default '[]' com CHECK array length <= 3 existe (habilita D-19)"
    - "Coluna profiles.avatar_custom_url TEXT nullable existe (habilita D-21)"
    - "Coluna profiles.last_seen_at TIMESTAMPTZ nullable existe (habilita D-37)"
    - "Migration 034 aplicada via supabase db push (gen-types será executado uma vez no plan 04 — sem race)"
  artifacts:
    - path: "supabase/migrations/034_profile_extended.sql"
      provides: "Migration ALTER TABLE profiles com 5 colunas + comments"
      contains: "ALTER TABLE profiles"
  key_links:
    - from: "Server Actions (plans 09-05a/09-05b)"
      to: "supabase.from('profiles').update({ status_message, favorite_heroes, hero_portrait_slug, avatar_custom_url, last_seen_at })"
      via: "Typed Supabase client com schema atualizado (gen-types em plan 04)"
      pattern: "profiles.*update"
---

<objective>
Adicionar 5 colunas à tabela `profiles` que sustentam todas as features de edição da Phase 9: status_message (D-18), hero_portrait_slug (D-20), favorite_heroes JSONB array (D-19), avatar_custom_url (D-21), last_seen_at (D-37).

Purpose: Sem essas colunas, as Server Actions de edição (plans 09-05a/09-05b) não têm onde persistir nada. Sem `last_seen_at`, o fallback "visto há 2h" da lista de amigos (D-37) não funciona. Sem CHECK constraints, app pode salvar dados inválidos burlando validação Zod.

Output: Migration SQL `034_profile_extended.sql` aplicada via `supabase db push` (após aprovação Pedro). **Tipos TypeScript NÃO são regenerados aqui** — `pnpm db:gen-types` roda UMA ÚNICA VEZ no final do plan 04 (gera tipos de todas as 3 migrations Wave 1 de uma vez, evitando race condition em `src/types/database.ts`).

Endereça decisão: D-38 (migration profile_extended). Habilita D-18, D-19, D-20, D-21, D-37 que são consumidos por Server Actions/components em waves posteriores.

**REQUER APROVAÇÃO PEDRO** — schema change per CLAUDE.md "Com aprovação Pedro: Schema changes (migrations)".

**ORDEM SERIAL OBRIGATÓRIA WAVE 1 (decisão revisão checker):** Plans 02 → 03 → 04 rodam em sequência (não paralelo). `pnpm db:gen-types` é executado APENAS no final do plan 04, regenerando tipos pra todas as 3 migrations de uma vez. Isso elimina race condition em `src/types/database.ts`.
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@CLAUDE.md
@supabase/migrations/033_match_voice_coordination.sql

<interfaces>
<!-- Próxima migration sequencial é 034_ (033 é última existente). -->
<!-- Schema profiles atual já tem: id, username, avatar_url, role, is_admin, behavior_status, doctrine_accepted_at, etc. -->
<!-- Padrão de migration verificado em 033_match_voice_coordination.sql -->

<!-- D-38 spec exata (CONTEXT.md): -->
<!-- profiles.status_message TEXT CHECK (char_length(status_message) <= 60) -->
<!-- profiles.hero_portrait_slug TEXT (validação app — não FK pois heroes não é tabela DB) -->
<!-- profiles.favorite_heroes JSONB DEFAULT '[]'::jsonb CHECK (jsonb_array_length(favorite_heroes) <= 3) -->
<!-- profiles.avatar_custom_url TEXT -->
<!-- profiles.last_seen_at TIMESTAMPTZ -->
</interfaces>
</context>

<tasks>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 0: Aprovação Pedro pra migration 034</name>
  <decision>Aprovar criação e push da migration 034_profile_extended.sql?</decision>
  <context>
    CLAUDE.md exige aprovação Pedro pra schema changes. Esta migration:
    - Adiciona 5 colunas a `profiles` (todas nullable — zero impacto em rows existentes)
    - 2 CHECK constraints novos (status_message length, favorite_heroes array length)
    - Sem DROP, sem RENAME, sem ALTER de tipo de coluna existente
    - Sem perda de dados possível (apenas ADD COLUMN IF NOT EXISTS)
    - Reversível com `ALTER TABLE profiles DROP COLUMN ...` se necessário

    Riscos:
    - Baixo: rollback trivial (drop columns)
    - Médio: RLS policies existentes em profiles continuam funcionando (não adicionamos colunas em SELECT lists implícitas)
  </context>
  <options>
    <option id="approve">
      <name>Aprovar migration 034</name>
      <pros>Phase 9 desbloqueada. Sem impacto em features atuais.</pros>
      <cons>Schema cresce — mais colunas pra manter no longo prazo.</cons>
    </option>
    <option id="reject">
      <name>Rejeitar / pedir mudanças</name>
      <pros>Pedro mantém controle total sobre schema.</pros>
      <cons>Phase 9 não pode avançar. Discutir alternativas (tabela separada `profile_extras`?)</cons>
    </option>
  </options>
  <files>supabase/migrations/034_profile_extended.sql</files>
  <action>Pausar execução e apresentar a decisão acima ao Pedro. Aguardar resposta (approve/reject/mudança). Não prosseguir pra Task 1 sem aprovação explícita.</action>
  <verify><automated>echo "Manual approval checkpoint — Pedro decides before Task 1 runs"</automated></verify>
  <done>Pedro respondeu approve OU reject. Se reject, plan aborta. Se approve, Task 1 prossegue.</done>
  <resume-signal>Select: approve, reject, ou descreva mudança</resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 1: Criar supabase/migrations/034_profile_extended.sql</name>
  <files>supabase/migrations/034_profile_extended.sql</files>
  <read_first>
    - supabase/migrations/033_match_voice_coordination.sql (padrão visual + estilo de comentários PT-BR)
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisão D-38
    - CLAUDE.md (convenções: comentários PT-BR, RLS obrigatória)
  </read_first>
  <action>
    Criar `supabase/migrations/034_profile_extended.sql` com conteúdo exato:

    ```sql
    -- ============================================================================
    -- Migration 034 — Profile Extended (Phase 9 — Perfil Dota 2 + Social)
    -- ============================================================================
    -- Adiciona 5 colunas a profiles pra suportar identidade visual Dota 2 client:
    --   - status_message      : mensagem curta editável (max 60 chars)
    --   - hero_portrait_slug  : slug do hero exibido como background do /me
    --   - favorite_heroes     : até 3 heróis favoritos (JSONB array de slugs)
    --   - avatar_custom_url   : avatar customizado upload (sobrescreve Discord/Steam)
    --   - last_seen_at        : última vez que o user esteve online (fallback presence)
    --
    -- Todas as colunas nullable — rows existentes ficam com NULL sem impacto.
    -- CHECK constraints garantem validação no nível DB (defesa em profundidade
    -- além do Zod nas Server Actions).
    --
    -- RLS: políticas existentes de profiles seguem cobrindo as novas colunas
    -- (auth.uid() = id pra UPDATE/SELECT do próprio profile).
    --
    -- Per decisão D-38 (CONTEXT 09 — Pedro aprovou em discuss-phase).
    -- ============================================================================

    -- Mensagem curta de status — placeholder pra voz pessoal do user no /me
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS status_message TEXT;

    ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS profiles_status_message_length;

    ALTER TABLE profiles
      ADD CONSTRAINT profiles_status_message_length
      CHECK (status_message IS NULL OR char_length(status_message) <= 60);

    -- Slug do hero usado como portrait gigante de background do /me
    -- Sem FK pra heroes table (catálogo é JSON estático em src/data — D-23).
    -- Validação de slug válido acontece em app (isValidHeroSlug em heroes.ts).
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS hero_portrait_slug TEXT;

    -- Até 3 heróis favoritos exibidos no /me — JSONB array de slugs.
    -- Ex: '["antimage", "invoker", "pudge"]'
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS favorite_heroes JSONB NOT NULL DEFAULT '[]'::jsonb;

    ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS profiles_favorite_heroes_max;

    ALTER TABLE profiles
      ADD CONSTRAINT profiles_favorite_heroes_max
      CHECK (jsonb_array_length(favorite_heroes) <= 3);

    -- Avatar customizado (sobrescreve Discord/Steam). URL pública do bucket
    -- profile-avatars (migration 036).
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS avatar_custom_url TEXT;

    -- Último heartbeat de presença — atualizado a cada 60s pelo Client Component
    -- quando user está com aba aberta. Usado pra fallback "visto há 2h" quando
    -- user está offline (D-37).
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

    -- Index pra queries de "amigos vistos recentemente" (futuro)
    CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
      ON profiles (last_seen_at DESC NULLS LAST)
      WHERE last_seen_at IS NOT NULL;

    -- Comentários documentando as colunas no DB (visíveis no Supabase Studio)
    COMMENT ON COLUMN profiles.status_message      IS 'Mensagem curta editável (max 60 chars). Aparece no /me abaixo do nome.';
    COMMENT ON COLUMN profiles.hero_portrait_slug  IS 'Slug do hero exibido como portrait de background do /me. Validado em app (sem FK).';
    COMMENT ON COLUMN profiles.favorite_heroes     IS 'Array JSONB de slugs de heróis favoritos (max 3). Ordem importa: esquerda→direita = mais preferido→menos.';
    COMMENT ON COLUMN profiles.avatar_custom_url   IS 'Avatar custom upload (bucket profile-avatars). Tem precedência sobre avatar_url do Discord/Steam.';
    COMMENT ON COLUMN profiles.last_seen_at        IS 'Heartbeat de presença — atualizado a cada 60s via Client Component. Fallback offline pra "visto há Xh".';
    ```

    NÃO adicionar/alterar nenhuma RLS policy (as existentes já cobrem `UPDATE/SELECT` por `auth.uid() = id`). NÃO criar tabela nova. NÃO mexer em outras tabelas.
  </action>
  <verify>
    <automated>grep -cE "(ADD COLUMN.*status_message|ADD COLUMN.*hero_portrait_slug|ADD COLUMN.*favorite_heroes|ADD COLUMN.*avatar_custom_url|ADD COLUMN.*last_seen_at)" supabase/migrations/034_profile_extended.sql</automated>
  </verify>
  <acceptance_criteria>
    - `supabase/migrations/034_profile_extended.sql` existe
    - `grep -c "ADD COLUMN" supabase/migrations/034_profile_extended.sql` retorna 5 (uma por coluna)
    - `grep "char_length(status_message) <= 60" supabase/migrations/034_profile_extended.sql` retorna 1 match
    - `grep "jsonb_array_length(favorite_heroes) <= 3" supabase/migrations/034_profile_extended.sql` retorna 1 match
    - `grep "DEFAULT '\[\]'::jsonb" supabase/migrations/034_profile_extended.sql` retorna 1 match
    - `grep "CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at" supabase/migrations/034_profile_extended.sql` retorna 1 match
    - `grep "COMMENT ON COLUMN" supabase/migrations/034_profile_extended.sql` retorna 5 matches
    - Sem DROP TABLE, sem DROP COLUMN, sem ALTER COLUMN TYPE (grep retorna 0)
  </acceptance_criteria>
  <done>Migration SQL pronta no formato esperado, idempotente (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS), seguindo padrão das migrations anteriores.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Aplicar migration 034 (gen-types diferido pro plan 04)</name>
  <files>(nenhum — apenas DB push)</files>
  <read_first>
    - supabase/migrations/034_profile_extended.sql (criada na Task 1)
    - CLAUDE.md (comando `pnpm db:gen-types`)
  </read_first>
  <action>
    1. Aplicar migration via Supabase CLI:
       ```bash
       supabase db push
       ```
       Se já estiver linkado ao projeto remoto, executa diretamente. Se prompt de confirmação aparecer, responder com `y`.

       Alternativa local-only (se db remoto não estiver acessível):
       ```bash
       supabase db reset --local
       ```
       (perigoso em prod — só usar em dev se Pedro confirmar).

       Em caso de falha (constraint conflict, etc), abortar e reportar erro detalhado pro user. NÃO tentar "fix" automático no schema.

    2. **NÃO executar `pnpm db:gen-types` aqui.** Decisão revisão checker: serializar Wave 1 (02 → 03 → 04) e regenerar tipos UMA vez no final do plan 04 evita race condition em `src/types/database.ts`. Plan 03 e plan 04 herdam essa convenção.

       Apenas verificar via `psql`/Supabase Studio que as 5 colunas foram criadas em `profiles`. Se houver erro de schema, abortar.
  </action>
  <verify>
    <automated>echo "Migration 034 push executado. Validação de tipos diferida pro plan 04 (regeneração única)."</automated>
  </verify>
  <acceptance_criteria>
    - `supabase db push` exit 0 (ou Pedro confirma aplicação manual)
    - Confirmação visual via Supabase Studio que as 5 colunas existem em `profiles`
    - `src/types/database.ts` **NÃO foi modificado** neste plan (será no plan 04 — única regeneração Wave 1)
  </acceptance_criteria>
  <done>Migration 034 aplicada com sucesso no DB. Plan 03 pode prosseguir e adicionar tabela friendships. Tipos TS serão regenerados no plan 04 cobrindo as 3 migrations de uma vez.</done>
</task>

</tasks>

<verification>
- Migration SQL passa lint visual (sem erros de sintaxe SQL)
- Rows existentes em profiles intactos (verificar via Supabase Studio que `SELECT count(*) FROM profiles` é o mesmo antes/depois)
- Cookie validation: tentar inserir `status_message` com 70 chars deve falhar com CHECK violation
- `src/types/database.ts` **continua intacto** — sem modificação neste plan (gen-types diferido pro plan 04)
</verification>

<success_criteria>
- Tabela `profiles` tem 5 colunas novas (D-18, D-19, D-20, D-21, D-37 habilitadas)
- Constraints CHECK ativos e funcionais
- Plan 03 pode rodar em seguida (serializado Wave 1)
- Plan 04 regenerará tipos TS UMA vez cobrindo migrations 034 + 035 + 036
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-02-SUMMARY.md` com:
- Confirmação de aprovação Pedro (Task 0)
- Output do `supabase db push` (sucesso ou erro)
- Confirmação visual via Supabase Studio das 5 colunas
- Nota explícita: "src/types/database.ts NÃO modificado — gen-types diferido pro plan 04"
</output>
</content>
</invoke>