---
phase: 09-perfil-dota-social
plan: 04
type: execute
wave: 1
depends_on: ["09-03"]
files_modified:
  - supabase/migrations/036_storage_profile_avatars.sql
  - src/types/database.ts
autonomous: false
requirements:
  - D-40
must_haves:
  truths:
    - "Bucket 'profile-avatars' existe no Supabase Storage como public read"
    - "Storage policy: user só pode INSERT em path {auth.uid()}/{filename}"
    - "Storage policy: leitura pública (SELECT sem restrição)"
    - "Storage policy: user só pode DELETE em path {auth.uid()}/{filename}"
    - "src/types/database.ts regenerado UMA vez cobrindo as 3 migrations Wave 1 (034 + 035 + 036)"
  artifacts:
    - path: "supabase/migrations/036_storage_profile_avatars.sql"
      provides: "Bucket profile-avatars + 3 storage policies"
      contains: "profile-avatars"
    - path: "src/types/database.ts"
      provides: "Types regenerados após todas as migrations 034/035/036 (única regeneração Wave 1)"
      contains: "friendships"
  key_links:
    - from: "AvatarUpload component (plan 09-08)"
      to: "supabase.storage.from('profile-avatars').upload(userId/file.ext)"
      via: "Browser client com user JWT"
      pattern: "storage\\.from\\(.profile-avatars.\\)"
    - from: "uploadAvatar Server Action (plan 09-05a)"
      to: "supabase.storage.from('profile-avatars').getPublicUrl(path)"
      via: "URL pública persistida em profiles.avatar_custom_url"
      pattern: "getPublicUrl"
---

<objective>
Criar bucket Supabase Storage `profile-avatars` com policies de upload/leitura/delete que garantem que cada user só manipule seus próprios arquivos. **E regenerar `src/types/database.ts` UMA vez cobrindo as 3 migrations Wave 1 (034 + 035 + 036) — única regeneração da fase, evita race condition.**

Purpose: Sem o bucket, `AvatarUpload` (plan 09-08) e `uploadAvatar` (plan 09-05a) não têm onde persistir o avatar custom. Sem policies corretas, qualquer user logado pode sobrescrever avatar de outro user (security hole). Sem types atualizados, Server Actions (plans 09-05a/09-05b) não compilam com referências às novas colunas/tabela.

Output: Migration `036_storage_profile_avatars.sql` aplicada via `supabase db push`. **`src/types/database.ts` regenerado uma única vez via `pnpm db:gen-types`** — cobrindo `profiles.status_message/hero_portrait_slug/favorite_heroes/avatar_custom_url/last_seen_at` (034) + tabela `friendships` (035).

Endereça decisão: D-40 (migration storage profile-avatars).

**REQUER APROVAÇÃO PEDRO** — schema change (storage policies são DDL).

**FIM DA SERIALIZED WAVE 1:** Após este plan, Wave 2 desbloqueada (plans 09-05a e 09-05b podem rodar em paralelo — sem deps entre si).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@CLAUDE.md

<interfaces>
<!-- Padrão Supabase Storage Policies (RESEARCH "Padrão 5"): -->
<!-- storage.foldername(name) retorna array de path segments -->
<!-- Ex: file "abc-123/avatar.png" → storage.foldername(name)[1] = "abc-123" -->
<!-- Policy: auth.uid()::text = (storage.foldername(name))[1] garante que -->
<!-- user só faz upload em path que começa com seu próprio UUID -->

<!-- Bucket public read: avatares são públicos (mostrados em qualquer lista de amigos) -->
</interfaces>
</context>

<tasks>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 0: Aprovação Pedro pra migration 036 + confirmar plano Supabase</name>
  <decision>Aprovar criação do bucket profile-avatars e confirmar se plano Supabase suporta Image Transform?</decision>
  <context>
    CLAUDE.md exige aprovação Pedro pra schema changes.

    Esta migration:
    - INSERT em `storage.buckets` (bucket profile-avatars, public=true)
    - 3 policies em `storage.objects` (INSERT/SELECT/DELETE) filtradas por auth.uid()
    - Sem afetar buckets existentes

    Confirmação necessária do plano Supabase (LOW confidence no RESEARCH):
    - **Image Transform** (resize server-side) é feature do plano Pro+. Se disponível, podemos pedir resize automático no `getPublicUrl({ width: 256, height: 256 })`.
    - Se NÃO disponível, plan 09-08 fará crop client-side via Canvas API antes do upload (sem perda funcional, só mais código no client).

    Limites práticos do bucket:
    - Avatar max 5MB (validado client-side em plan 09-08 — Supabase não impõe por bucket)
    - Path convention: `{user.id}/{Date.now()}.{ext}` (Date.now permite versionamento + upsert sem cache stale)

    Riscos:
    - Baixo: bucket novo, sem afetar storage existente
    - Médio: se policies estiverem mal feitas, user pode upload em folder alheio
  </context>
  <options>
    <option id="approve-pro">
      <name>Aprovar + Pedro confirma plano Pro (Image Transform disponível)</name>
      <pros>Resize server-side reduz código client. Mais robusto.</pros>
      <cons>Custo do plano Pro.</cons>
    </option>
    <option id="approve-free">
      <name>Aprovar + plano free (sem Image Transform — crop client-side)</name>
      <pros>Zero custo extra. Crop via Canvas API é trivial.</pros>
      <cons>Mais 30-50 linhas no AvatarUpload (Canvas crop antes do upload).</cons>
    </option>
    <option id="reject">
      <name>Rejeitar migration</name>
      <pros>Pedro mantém controle de custo Supabase.</pros>
      <cons>Avatar custom não funciona — degrade pra "só Discord/Steam avatar".</cons>
    </option>
  </options>
  <files>supabase/migrations/036_storage_profile_avatars.sql</files>
  <action>Pausar execução e apresentar a decisão acima ao Pedro. Aguardar resposta (approve-pro/approve-free/reject). Não prosseguir pra Task 1 sem aprovação explícita. Anotar qual plano Supabase (Pro com Image Transform vs Free com Canvas crop) — isso afeta a implementação do AvatarUpload no plan 09-08.</action>
  <verify><automated>echo "Manual approval checkpoint — Pedro decides Supabase plan before Task 1 runs"</automated></verify>
  <done>Pedro respondeu approve-pro OU approve-free OU reject. Decisão registrada no SUMMARY pra propagar pra plan 09-08.</done>
  <resume-signal>Select: approve-pro, approve-free, ou reject</resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 1: Criar supabase/migrations/036_storage_profile_avatars.sql</name>
  <files>supabase/migrations/036_storage_profile_avatars.sql</files>
  <read_first>
    - supabase/migrations/033_match_voice_coordination.sql (padrão visual + comentários PT-BR)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 5: Supabase Storage — Upload de Avatar"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisão D-40
  </read_first>
  <action>
    Criar `supabase/migrations/036_storage_profile_avatars.sql`:

    ```sql
    -- ============================================================================
    -- Migration 036 — Storage Profile Avatars (Phase 9 — Perfil Dota 2 + Social)
    -- ============================================================================
    -- Bucket profile-avatars: upload de avatar customizado pelo user.
    --   - Path convention: {auth.uid()}/{timestamp}.{ext}
    --   - Public read (avatar aparece em qualquer lista pública)
    --   - User só pode INSERT/DELETE em seu próprio folder (auth.uid() == folder)
    --
    -- Validação adicional (tamanho max 5MB, MIME) acontece no Client Component
    -- (plan 09-08) ANTES do upload. Bucket não impõe limites explícitos.
    --
    -- Per decisão D-40 (CONTEXT 09 — Pedro aprovou em discuss-phase).
    -- ============================================================================

    -- Criar bucket (idempotente)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'profile-avatars',
      'profile-avatars',
      true,  -- public read (URL pública pra mostrar em lista de amigos)
      5242880,  -- 5MB hard limit (5 * 1024 * 1024 bytes)
      ARRAY['image/png', 'image/jpeg', 'image/webp']  -- MIME whitelist
    )
    ON CONFLICT (id) DO UPDATE
      SET public = EXCLUDED.public,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;

    -- ============================================================================
    -- Storage Policies (D-40)
    -- ============================================================================

    -- INSERT: user só pode upload em seu próprio folder
    -- storage.foldername(name) retorna array de path segments
    -- Path "{uuid}/file.png" → foldername[1] == uuid
    DROP POLICY IF EXISTS "User uploads own avatar" ON storage.objects;
    CREATE POLICY "User uploads own avatar" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    -- UPDATE: user pode sobrescrever seu próprio avatar (upsert=true no client)
    DROP POLICY IF EXISTS "User updates own avatar" ON storage.objects;
    CREATE POLICY "User updates own avatar" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    -- SELECT: leitura pública (avatar é dado público)
    DROP POLICY IF EXISTS "Public read profile avatars" ON storage.objects;
    CREATE POLICY "Public read profile avatars" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'profile-avatars');

    -- DELETE: user só pode deletar seu próprio avatar
    DROP POLICY IF EXISTS "User deletes own avatar" ON storage.objects;
    CREATE POLICY "User deletes own avatar" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    COMMENT ON POLICY "User uploads own avatar"      ON storage.objects IS 'Phase 9 — user só faz upload em folder com seu próprio UUID.';
    COMMENT ON POLICY "Public read profile avatars"  ON storage.objects IS 'Phase 9 — avatares são públicos (lista de amigos).';
    ```

    Verificar que `storage.buckets` aceita coluna `allowed_mime_types` (deve aceitar — feature padrão Supabase Storage). Se Supabase Storage local não suportar (CLI version antigo), remover `allowed_mime_types` e mover validação MIME pro client (plan 09-08).
  </action>
  <verify>
    <automated>grep -cE "(CREATE POLICY|INSERT INTO storage.buckets)" supabase/migrations/036_storage_profile_avatars.sql</automated>
  </verify>
  <acceptance_criteria>
    - `supabase/migrations/036_storage_profile_avatars.sql` existe
    - `grep "INSERT INTO storage.buckets" supabase/migrations/036_storage_profile_avatars.sql` retorna 1 match
    - `grep "'profile-avatars'" supabase/migrations/036_storage_profile_avatars.sql` retorna >=4 matches (bucket id + 4 policies)
    - `grep -c "CREATE POLICY" supabase/migrations/036_storage_profile_avatars.sql` retorna 4 (INSERT/UPDATE/SELECT/DELETE)
    - `grep "auth.uid()::text = (storage.foldername(name))" supabase/migrations/036_storage_profile_avatars.sql` retorna 3 matches (INSERT/UPDATE/DELETE — SELECT é público)
    - `grep "ON CONFLICT (id) DO UPDATE" supabase/migrations/036_storage_profile_avatars.sql` retorna 1 match (idempotência)
    - `grep "5242880" supabase/migrations/036_storage_profile_avatars.sql` retorna 1 match (5MB limit)
  </acceptance_criteria>
  <done>Migration SQL pronta com bucket + 4 policies + MIME whitelist + size limit. Idempotente (ON CONFLICT + DROP POLICY IF EXISTS).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Aplicar migration storage</name>
  <files>(nenhum — apenas DB push)</files>
  <read_first>
    - supabase/migrations/036_storage_profile_avatars.sql (criada na Task 1)
  </read_first>
  <action>
    1. Aplicar migration:
       ```bash
       supabase db push
       ```

       Storage migrations às vezes precisam ser aplicadas via Supabase Dashboard manualmente se a CLI não tiver permissões. Se `supabase db push` falhar com erro de permission em `storage.objects`, instruir Pedro a copiar o SQL e colar em Supabase Dashboard → SQL Editor.

    2. Validar via Supabase Dashboard que:
       - Bucket `profile-avatars` aparece em Storage → Buckets
       - Bucket é Public
       - 4 policies aparecem em Storage → Policies
  </action>
  <verify>
    <automated>echo "Manual verification required — check Supabase Dashboard for bucket 'profile-avatars'"</automated>
  </verify>
  <acceptance_criteria>
    - Pedro confirma via Supabase Dashboard que bucket `profile-avatars` existe e é Public
    - Pedro confirma que 4 policies aparecem na lista de Storage Policies
    - `supabase db push` saiu com exit code 0 (ou Pedro confirmou aplicação manual via Dashboard)
  </acceptance_criteria>
  <done>Bucket pronto pra receber uploads. Plan 09-08 pode usar `supabase.storage.from('profile-avatars').upload(...)` sem ajustes.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Regenerar src/types/database.ts (única regeneração Wave 1 — cobre 034/035/036)</name>
  <files>src/types/database.ts</files>
  <read_first>
    - CLAUDE.md (comando `pnpm db:gen-types`)
    - supabase/migrations/034_profile_extended.sql (plan 09-02 — colunas profiles novas)
    - supabase/migrations/035_friendships.sql (plan 09-03 — tabela friendships)
    - supabase/migrations/036_storage_profile_avatars.sql (Task 1 deste plan)
  </read_first>
  <action>
    Esta é a ÚNICA execução de `pnpm db:gen-types` da Wave 1 — cobre as 3 migrations aplicadas em ordem serial (034 → 035 → 036).

    1. Regenerar tipos TypeScript:
       ```bash
       pnpm db:gen-types
       ```

       Esperado: arquivo `src/types/database.ts` modificado contendo:
       - 5 colunas novas em `Tables<"profiles">["Row"]`: `status_message`, `hero_portrait_slug`, `favorite_heroes`, `avatar_custom_url`, `last_seen_at`
       - Entry completo `Tables<"friendships">` com `Row`/`Insert`/`Update`
       - Status enum tipado: `'pending' | 'accepted' | 'rejected' | 'blocked'`

    2. Confirmar via typecheck que nada quebrou:
       ```bash
       pnpm typecheck
       ```

       Se algum arquivo existente referenciar `profiles.last_seen_at` (improvável — colunas novas), ajustar. Se typecheck quebrar por outro motivo, abortar e reportar erro.

    3. **NÃO MODIFICAR arquivos além de `src/types/database.ts`.** Outras refatorações ficam pros plans Wave 2+.
  </action>
  <verify>
    <automated>grep -E "(status_message|hero_portrait_slug|favorite_heroes|avatar_custom_url|last_seen_at|friendships)" src/types/database.ts | head -10 && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep "status_message" src/types/database.ts` retorna >=1 match
    - `grep "hero_portrait_slug" src/types/database.ts` retorna >=1 match
    - `grep "favorite_heroes" src/types/database.ts` retorna >=1 match
    - `grep "avatar_custom_url" src/types/database.ts` retorna >=1 match
    - `grep "last_seen_at" src/types/database.ts` retorna >=1 match
    - `grep "friendships:" src/types/database.ts` retorna >=1 match (entry no Tables type)
    - `grep "requester_id" src/types/database.ts` retorna >=1 match
    - `grep "addressee_id" src/types/database.ts` retorna >=1 match
    - `grep "'pending' | 'accepted' | 'rejected' | 'blocked'" src/types/database.ts` retorna >=1 match (status enum)
    - `pnpm typecheck` retorna 0 erros
  </acceptance_criteria>
  <done>Tipos TS regenerados UMA vez cobrindo as 3 migrations Wave 1. Server Actions e queries em Wave 2 (plans 09-05a/09-05b) podem consumir com type-safety.</done>
</task>

</tasks>

<verification>
- Bucket visível em Supabase Dashboard
- Test manual (após plan 09-08 entregar): login como user A, tentar upload em folder de user B → falha por RLS
- Test manual: avatar URL pública retorna 200 sem autenticação
- `pnpm typecheck` retorna 0 erros
- `src/types/database.ts` contém todas as 5 colunas novas + tabela friendships
</verification>

<success_criteria>
- Bucket profile-avatars existe
- 4 policies (INSERT/UPDATE/SELECT/DELETE) ativas e filtrando por auth.uid()
- MIME whitelist e size limit aplicados
- Pedro confirmou plano Supabase (Pro/Free) → plan 09-08 sabe se faz Canvas crop ou usa Image Transform
- `src/types/database.ts` regenerado UMA vez cobrindo 034 + 035 + 036
- Wave 2 desbloqueada (plans 09-05a e 09-05b podem rodar em paralelo)
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-04-SUMMARY.md` com:
- Aprovação Pedro (Task 0) + opção escolhida (Pro/Free Image Transform)
- Output do `supabase db push` ou confirmação de aplicação manual
- Screenshot/print do bucket no Dashboard (Pedro registra)
- Snippet do `Tables<"profiles">["Row"]` e `Tables<"friendships">["Row"]` regenerados
- Nota pro plan 09-08: usar Canvas crop ou Image Transform
</output>
</content>
</invoke>