---
phase: 09-perfil-dota-social
plan: 03
type: execute
wave: 1
depends_on: ["09-02"]
files_modified:
  - supabase/migrations/035_friendships.sql
autonomous: false
requirements:
  - D-27
  - D-28
  - D-29
  - D-30
  - D-31
  - D-32
  - D-33
must_haves:
  truths:
    - "Tabela friendships existe com 6 colunas: id, requester_id, addressee_id, status, created_at, updated_at"
    - "Status restrito a pending|accepted|rejected|blocked via CHECK"
    - "Constraint unique_pair previne pares duplicados em direções invertidas (pitfall 6)"
    - "CHECK no_self_friendship previne requester == addressee"
    - "RLS habilitada com 4 policies (SELECT/INSERT/UPDATE/DELETE) per D-30/D-31"
    - "2 indexes pra queries de pedidos pendentes (D-33)"
    - "Tipos TS regenerados UMA vez no plan 04 (sem race condition Wave 1)"
  artifacts:
    - path: "supabase/migrations/035_friendships.sql"
      provides: "Tabela friendships + RLS + indexes + unique constraint"
      contains: "CREATE TABLE friendships"
  key_links:
    - from: "Server Actions friends.ts (plan 09-05b)"
      to: "friendships table via supabase.from('friendships')"
      via: "RLS auth.uid() = requester_id OR auth.uid() = addressee_id"
      pattern: "from\\(.friendships.\\)"
    - from: "FriendsList (plan 09-06)"
      to: "friendships query JOIN profiles"
      via: "SELECT friendships JOIN profiles ON ..."
      pattern: "from\\(.friendships.\\)"
---

<objective>
Criar tabela `friendships` com schema mutual-confirmation (estilo Dota 2/Discord — não follow assimétrico), RLS obrigatória, indexes para queries de pedidos pendentes, e constraints CHECK pra prevenir duplicatas bidirecionais (pitfall 6 do RESEARCH).

Purpose: Sem essa tabela, todo o sistema social da Phase 9 (D-27 a D-33) não existe. A constraint UNIQUE simples `(requester_id, addressee_id)` é insuficiente — usuário A pode enviar pra B e B pode enviar pra A simultaneamente, gerando duas rows pro mesmo par. RESEARCH pitfall 6 mostra a solução canônica via `LEAST/GREATEST`.

Output: Migration SQL `035_friendships.sql` aplicada via `supabase db push`. **Tipos TypeScript NÃO são regenerados aqui** — `pnpm db:gen-types` roda UMA ÚNICA VEZ no plan 04 cobrindo as 3 migrations Wave 1.

Endereça decisões: D-27 (tabela), D-28 (estados), D-29 (mutual), D-30 (RLS), D-31 (Server Actions consomem), D-32 (sem limite), D-33 (indexes).

**REQUER APROVAÇÃO PEDRO** — schema change per CLAUDE.md.

**SERIALIZED WAVE 1:** Este plan depende do plan 09-02 (serial). Plan 09-04 depende deste. Sem paralelismo Wave 1 (evita race em `src/types/database.ts`).
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
<!-- D-29: Modelo mutual com confirmação (estilo Dota 2/Discord — não follow assimétrico) -->
<!-- D-28: Estados: pending / accepted / rejected / blocked -->
<!-- D-30: RLS user só vê friendships onde requester_id = auth.uid() OR addressee_id = auth.uid() -->
<!-- D-33: Indexes em (requester_id, status) e (addressee_id, status) -->

<!-- Pitfall 6 (RESEARCH.md): UNIQUE simples não detecta inversão. -->
<!-- Solução canônica: UNIQUE (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)) -->
<!-- Em PostgreSQL precisa de EXCLUDE constraint ou unique index funcional. -->

<!-- Discretion (RESEARCH): rejected = deletar imediatamente no MVP (sem lógica de 7d) -->
</interfaces>
</context>

<tasks>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 0: Aprovação Pedro pra migration 035 + comportamento de rejected</name>
  <decision>Aprovar criação e push da migration 035_friendships.sql E confirmar comportamento de friendship rejeitada?</decision>
  <context>
    CLAUDE.md exige aprovação Pedro pra schema changes.

    Esta migration:
    - Cria 1 tabela nova `friendships` (sem alterar tabelas existentes)
    - 4 RLS policies (SELECT/INSERT/UPDATE/DELETE) — todas filtram por auth.uid()
    - 2 indexes pra performance de queries de pedidos pendentes
    - 2 CHECK constraints + 1 UNIQUE INDEX funcional (LEAST/GREATEST)
    - Reversível com `DROP TABLE friendships CASCADE`

    Decisão adicional (RESEARCH.md "Claude's Discretion"):
    - Quando user rejeita pedido (acceptFriendRequest com `status='rejected'`):
      - Opção A (MVP simples): DELETE row imediatamente — sender pode re-enviar
      - Opção B (anti-spam): UPDATE status='rejected' e manter row 7 dias antes de auto-delete
    - Recomendação RESEARCH: Opção A pro MVP.

    Riscos:
    - Baixo: tabela nova, sem afetar features atuais
    - Médio: se RLS estiver mal configurado, user pode ver friendships alheios
  </context>
  <options>
    <option id="approve-delete">
      <name>Aprovar + rejected = DELETE imediato (MVP simples)</name>
      <pros>Schema mais limpo. Menos lógica de cleanup. Sender pode re-enviar (intencional).</pros>
      <cons>Sender pode spammar re-pedidos. Se virar problema, adicionamos rate limiting depois.</cons>
    </option>
    <option id="approve-keep">
      <name>Aprovar + rejected = manter row 7d</name>
      <pros>Anti-spam built-in. Histórico de rejeições preservado.</pros>
      <cons>Precisa scheduled function/trigger pra auto-delete. Complexidade extra no MVP.</cons>
    </option>
    <option id="reject">
      <name>Rejeitar migration</name>
      <pros>Pedro mantém controle.</pros>
      <cons>Phase 9 social layer não avança.</cons>
    </option>
  </options>
  <files>supabase/migrations/035_friendships.sql</files>
  <action>Pausar execução e apresentar a decisão acima ao Pedro. Aguardar resposta (approve-delete/approve-keep/reject). Não prosseguir pra Task 1 sem aprovação explícita. Anotar qual comportamento de rejected foi escolhido pra refletir no plan 09-05b (rejectFriendRequest implementation).</action>
  <verify><automated>echo "Manual approval checkpoint — Pedro decides rejected behavior before Task 1 runs"</automated></verify>
  <done>Pedro respondeu approve-delete OU approve-keep OU reject. Decisão registrada no SUMMARY pra propagar pra plan 09-05b.</done>
  <resume-signal>Select: approve-delete, approve-keep, ou reject</resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 1: Criar supabase/migrations/035_friendships.sql</name>
  <files>supabase/migrations/035_friendships.sql</files>
  <read_first>
    - supabase/migrations/033_match_voice_coordination.sql (padrão visual + RLS pattern)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 4: Friendships Schema + RLS" e "Pitfall 6"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-27 a D-33
  </read_first>
  <action>
    Criar `supabase/migrations/035_friendships.sql`:

    ```sql
    -- ============================================================================
    -- Migration 035 — Friendships (Phase 9 — Perfil Dota 2 + Social)
    -- ============================================================================
    -- Sistema mutual de amizades estilo Dota 2/Discord:
    --   - User A envia pedido (status=pending)
    --   - User B aceita (status=accepted) ou rejeita (DELETE — decisão Pedro)
    --   - Qualquer participante pode remover (DELETE) ou bloquear (status=blocked)
    --
    -- Constraints anti-burlamento:
    --   - no_self_friendship: requester != addressee
    --   - unique_pair: previne duplicata bidirecional (pitfall 6 RESEARCH —
    --     LEAST/GREATEST via UNIQUE INDEX funcional)
    --
    -- RLS (D-30): user só vê/manipula friendships onde participa.
    -- Indexes (D-33): queries "minhas amizades aceitas" e "pedidos pendentes" rápidas.
    --
    -- Per decisões D-27 a D-33 (CONTEXT 09 — Pedro aprovou em discuss-phase).
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS friendships (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      addressee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      status        TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

      -- Impede self-friendship
      CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id)
    );

    -- Previne duplicatas bidirecionais (pitfall 6):
    -- UNIQUE INDEX funcional com LEAST/GREATEST garante que (A,B) e (B,A) colidam.
    CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair
      ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

    -- Indexes pra queries de pedidos pendentes e amizades aceitas (D-33)
    CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
      ON friendships (requester_id, status);

    CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
      ON friendships (addressee_id, status);

    -- Trigger pra updated_at automático (padrão consistente com outras tables)
    CREATE OR REPLACE FUNCTION friendships_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS friendships_updated_at_trigger ON friendships;
    CREATE TRIGGER friendships_updated_at_trigger
      BEFORE UPDATE ON friendships
      FOR EACH ROW
      EXECUTE FUNCTION friendships_set_updated_at();

    -- ============================================================================
    -- RLS Policies (D-30)
    -- ============================================================================

    ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

    -- SELECT: user vê friendships onde é requester OU addressee
    DROP POLICY IF EXISTS "User sees own friendships" ON friendships;
    CREATE POLICY "User sees own friendships" ON friendships
      FOR SELECT
      USING (
        requester_id = auth.uid() OR addressee_id = auth.uid()
      );

    -- INSERT: user só pode INSERT como requester (não pode forjar pedido de outro user)
    DROP POLICY IF EXISTS "User sends friend request" ON friendships;
    CREATE POLICY "User sends friend request" ON friendships
      FOR INSERT
      WITH CHECK (
        requester_id = auth.uid()
      );

    -- UPDATE: qualquer participante (requester ou addressee) pode atualizar status
    -- (ex: addressee aceita pending → accepted; requester cancela)
    DROP POLICY IF EXISTS "Participants update friendship" ON friendships;
    CREATE POLICY "Participants update friendship" ON friendships
      FOR UPDATE
      USING (
        requester_id = auth.uid() OR addressee_id = auth.uid()
      )
      WITH CHECK (
        requester_id = auth.uid() OR addressee_id = auth.uid()
      );

    -- DELETE: qualquer participante pode remover a amizade
    -- (decisão Pedro: rejected = DELETE imediato)
    DROP POLICY IF EXISTS "Participants delete friendship" ON friendships;
    CREATE POLICY "Participants delete friendship" ON friendships
      FOR DELETE
      USING (
        requester_id = auth.uid() OR addressee_id = auth.uid()
      );

    -- ============================================================================
    -- Comments documentando schema (visível no Supabase Studio)
    -- ============================================================================

    COMMENT ON TABLE  friendships                IS 'Amizades mutuais estilo Dota 2/Discord. RLS por participação. Pitfall 6: unique_pair previne duplicata bidirecional via LEAST/GREATEST.';
    COMMENT ON COLUMN friendships.requester_id   IS 'Quem enviou o pedido inicial.';
    COMMENT ON COLUMN friendships.addressee_id   IS 'Quem recebeu o pedido. Pode aceitar (UPDATE status=accepted) ou rejeitar (DELETE).';
    COMMENT ON COLUMN friendships.status         IS 'pending|accepted|rejected|blocked. rejected é estado transitório — Server Action deleta imediatamente (decisão Pedro).';
    ```

    Garantir idempotência: `IF NOT EXISTS` em CREATE TABLE/INDEX, `DROP POLICY IF EXISTS` antes de CREATE POLICY, `DROP TRIGGER IF EXISTS` antes de CREATE TRIGGER.
  </action>
  <verify>
    <automated>grep -cE "CREATE (TABLE|INDEX|UNIQUE INDEX|TRIGGER|POLICY|OR REPLACE FUNCTION)" supabase/migrations/035_friendships.sql</automated>
  </verify>
  <acceptance_criteria>
    - `supabase/migrations/035_friendships.sql` existe
    - `grep "CREATE TABLE IF NOT EXISTS friendships" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep "CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep "no_self_friendship" supabase/migrations/035_friendships.sql` retorna 2+ matches (constraint + comment)
    - `grep "LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep "ENABLE ROW LEVEL SECURITY" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep -c "CREATE POLICY" supabase/migrations/035_friendships.sql` retorna 4 (SELECT/INSERT/UPDATE/DELETE)
    - `grep "idx_friendships_requester_status" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep "idx_friendships_addressee_status" supabase/migrations/035_friendships.sql` retorna 1 match
    - `grep "friendships_updated_at_trigger" supabase/migrations/035_friendships.sql` retorna 2 matches (DROP + CREATE)
  </acceptance_criteria>
  <done>Migration SQL pronta seguindo padrão consistente do projeto, RLS habilitada com 4 policies, unique constraint funcional protege contra pitfall 6.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Aplicar migration 035 (gen-types diferido pro plan 04)</name>
  <files>(nenhum — apenas DB push)</files>
  <read_first>
    - supabase/migrations/035_friendships.sql (criada na Task 1)
    - CLAUDE.md (comando pnpm db:gen-types)
  </read_first>
  <action>
    1. Aplicar migration:
       ```bash
       supabase db push
       ```

       Migration 034 (plan 09-02) já foi aplicada (este plan depende dele). Aceitar prompt de confirmação se aparecer.

       Se falhar com erro de FK em profiles (tabela target não existe), abortar — provavelmente o setup de migrations anteriores está corrompido.

    2. **NÃO executar `pnpm db:gen-types` aqui.** Decisão revisão checker: gen-types roda UMA vez no final do plan 04 cobrindo as 3 migrations Wave 1 (034 + 035 + 036) — evita race condition em `src/types/database.ts`.

       Apenas verificar via Supabase Studio que `friendships` table existe com RLS habilitada.
  </action>
  <verify>
    <automated>echo "Migration 035 push executado. Validação de tipos diferida pro plan 04."</automated>
  </verify>
  <acceptance_criteria>
    - `supabase db push` exit 0
    - Confirmação visual via Supabase Studio que `friendships` table existe
    - Confirmação que RLS está habilitada (badge ENABLED no Studio)
    - `src/types/database.ts` **NÃO foi modificado** neste plan
  </acceptance_criteria>
  <done>Tabela friendships criada no DB, RLS ativa. Plan 04 pode prosseguir (próximo serial Wave 1) e regenerar tipos no final.</done>
</task>

</tasks>

<verification>
- Validação manual via Supabase Studio:
  - Tentar inserir friendship com requester_id == addressee_id → falha CHECK
  - Inserir (A, B, pending), depois (B, A, pending) → falha unique_pair
  - SELECT como user X retorna apenas friendships onde X participa
- `src/types/database.ts` continua intacto (gen-types diferido pro plan 04)
</verification>

<success_criteria>
- Tabela friendships existe com 6 colunas + constraints + RLS + 2 indexes + trigger updated_at
- Plans 09-05b (Server Actions friends.ts), 09-06 (FriendsList) terão fundação social pronta após plan 04 regenerar tipos
- Pitfall 6 mitigado: impossível ter dupla amizade A↔B
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-03-SUMMARY.md` com:
- Confirmação aprovação Pedro (Task 0) + qual opção escolheu (rejected behavior)
- Output do `supabase db push` (sucesso/erro)
- Confirmação visual da table no Studio
- Nota explícita: "src/types/database.ts NÃO modificado — gen-types único no plan 04"
</output>
</content>
</invoke>