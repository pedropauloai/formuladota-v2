---
phase: 03-steam-oauth-roles-multicoach
plan: 01
plan_id: 03-01
title: Migration 005 — coaches, steam_links, profiles.role, packages.coach_id, helpers RLS, seed Pedro
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/005_steam_roles_multicoach.sql
  - src/types/database.ts
autonomous: true
requirements_addressed:
  - H1.2
  - H1.3
  - H1.4
  - C4
  - C12
must_haves:
  truths:
    - "Tabela coaches existe e tem Pedro inserido como coach #1 (slug 'pedro-paulo', ativo=true)"
    - "Tabela steam_links existe com FK user_id → profiles(id), unique steam_id_64, com RLS ativo — fundação do pattern multi-redes (V2 cria youtube_links, twitch_links seguindo este molde)"
    - "Coluna profiles.role enum ('admin','coach','player') default 'player' criada e Pedro=admin"
    - "Coluna profiles.trial_ends_at criada (default NULL) — preparada para Phase 4"
    - "Coluna packages.coach_id NOT NULL FK coaches(id) — todos os 4 pacotes ligados a Pedro"
    - "Helper RLS public.is_coach() retorna true para profiles com role IN ('coach','admin')"
    - "RLS ativada em coaches e steam_links com policies do CONTEXT.md exato (5 policies novas)"
    - "src/types/database.ts atualizado contendo tabelas coaches, steam_links e novas colunas profiles/packages"
  artifacts:
    - path: "supabase/migrations/005_steam_roles_multicoach.sql"
      provides: "DDL completo da Phase 3 (coaches, steam_links, alterations profiles/packages, helper, RLS, seed Pedro). steam_links é o pattern de identidade externa que será replicado em V2 (youtube_links, twitch_links)."
      contains: "create table public.coaches, create table public.steam_links, alter table public.profiles add column if not exists role, alter table public.packages add column if not exists coach_id, create or replace function public.is_coach"
    - path: "src/types/database.ts"
      provides: "Types regenerados com coaches, steam_links e colunas role/trial_ends_at/coach_id"
      contains: "coaches: {, steam_links: {, role: \"admin\" | \"coach\" | \"player\", coach_id:"
  key_links:
    - from: "supabase/migrations/005_steam_roles_multicoach.sql"
      to: "public.profiles (Pedro is_admin=true)"
      via: "INSERT INTO coaches (profile_id) SELECT id FROM profiles WHERE is_admin=true"
      pattern: "from public.profiles where is_admin = true"
    - from: "supabase/migrations/005_steam_roles_multicoach.sql"
      to: "public.packages.coach_id"
      via: "UPDATE packages SET coach_id = (SELECT id FROM coaches WHERE slug='pedro-paulo')"
      pattern: "update public.packages\\s+set coach_id"
    - from: "src/types/database.ts"
      to: "Migration 005 schema"
      via: "Regen via psql introspection (Docker indisponível)"
      pattern: "coaches: \\{[\\s\\S]+steam_links: \\{"
---

<objective>
Aplicar Migration 005 que adiciona schema multi-coach + Steam OAuth + sistema de roles ao Supabase, e regenerar `src/types/database.ts` para refletir o novo schema. Esta é a fundação SQL de TODA a Phase 3 — sem isso, nem Steam linking nem refator multi-coach funcionam.

A tabela `steam_links` também é a fundação estrutural do pattern de identidade externa (per requirement **H1.2**): em V2 criamos `youtube_links`, `twitch_links` seguindo o MESMO shape (PK `user_id`, identificador externo unique, persona/avatar, verified_at, RLS user-owns-self).

Purpose: Centralizar toda mudança de DDL da Phase 3 numa migration única e idempotente, mantendo consistência com pattern de Migrations 002/004 (helpers RLS via security definer, policies em camadas, seed condicional via on conflict).

Output:
- `supabase/migrations/005_steam_roles_multicoach.sql` aplicado no projeto Supabase `nyvbfdsxjpiwgdroptdi`
- `src/types/database.ts` regenerado contendo `coaches`, `steam_links`, `profiles.role`, `profiles.trial_ends_at`, `packages.coach_id`
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
@.planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md
@supabase/migrations/001_initial_schema.sql
@supabase/migrations/002_rls_policies.sql
@supabase/migrations/003_seed_packages.sql
@supabase/migrations/004_doctrine_and_moderation.sql
@src/types/database.ts

<interfaces>
<!-- Helper existente em Migration 002 (replicar pattern) -->
```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
```

<!-- Profile schema relevante (após Migrations 001+004) -->
```sql
public.profiles (
  id uuid primary key,
  is_admin boolean default false not null,
  doctrine_accepted_at timestamptz,
  behavior_status text check (... 'ok','warned','suspended','banned'),
  ...
)
```

<!-- Pattern Database type a manter -->
```typescript
// Cada table em src/types/database.ts requer:
//   Row, Insert, Update, Relationships: []
// Top-level requer:
//   Views: Record<never, never>;
//   Functions: Record<never, never>;
// (caso contrário .from() retorna 'never' — visto em Phase 2)
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar arquivo Migration 005 com schema, helper RLS, policies e seed Pedro</name>
  <files>supabase/migrations/005_steam_roles_multicoach.sql</files>
  <read_first>
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (seção `<specifics>` tem o SQL skeleton COMPLETO — copie literalmente)
    - supabase/migrations/002_rls_policies.sql (pattern helper is_admin + policies "admin manages X")
    - supabase/migrations/004_doctrine_and_moderation.sql (pattern alter table add column if not exists, security definer com search_path)
    - .planning/REQUIREMENTS.md seção H1 (H1.2 multi-redes pattern, H1.3 roles, H1.4 multi-coach)
  </read_first>
  <action>
    Criar arquivo `supabase/migrations/005_steam_roles_multicoach.sql`. Copie o SQL skeleton EXATO da seção `<specifics>` do 03-CONTEXT.md (linhas 148-214) sem editar lógica. Adicione comentários PT-BR em cada bloco (per C12 — Pedro é beginner). Estrutura final OBRIGATÓRIA:

    ```sql
    -- formuladota v2 — Phase 3 Migration 005
    -- Multi-coach schema + Steam OAuth + roles + trial preparation
    -- Idempotente: usa "if not exists" e "on conflict do nothing"

    -- =========================================
    -- 1. TABELA coaches (multi-coach desde Phase 3 — V2 lança UI Pedro-only)
    -- =========================================
    create table if not exists public.coaches (
      id uuid primary key default gen_random_uuid(),
      profile_id uuid references public.profiles(id) on delete cascade not null unique,
      slug text unique not null,
      bio text,
      ativo boolean default true not null,
      accepted_at timestamptz default now() not null
    );

    create index if not exists idx_coaches_ativo on public.coaches(ativo) where ativo = true;
    create index if not exists idx_coaches_profile on public.coaches(profile_id);

    -- =========================================
    -- 2. TABELA steam_links (vinculo Steam OpenID 2.0 → user)
    -- ----------------------------------------
    -- IMPORTANTE — H1.2 (Hub multi-redes):
    -- Esta tabela é o PATTERN CANÔNICO de identidade externa do Hub.
    -- V2 (Milestone V4) replica este shape para youtube_links, twitch_links, x_links:
    --   PK user_id (1:1 com profiles, on delete cascade)
    --   identificador externo unique (steam_id_64, youtube_channel_id, twitch_user_id, x_handle)
    --   persona / avatar_url / verified_at
    --   RLS: user vê/gerencia próprio; admin vê todos
    -- Mudanças aqui pensar em "isso vai ser replicado em outras redes" — manter
    -- shape mínimo e sem regras específicas de Steam que não façam sentido em outras redes.
    -- =========================================
    create table if not exists public.steam_links (
      user_id uuid primary key references public.profiles(id) on delete cascade,
      steam_id_64 text unique not null,
      persona text,
      avatar_url text,
      verified_at timestamptz default now() not null
    );

    create index if not exists idx_steam_links_steamid on public.steam_links(steam_id_64);

    -- =========================================
    -- 3. profiles: role enum + trial_ends_at (Phase 4 prep)
    -- =========================================
    alter table public.profiles
      add column if not exists role text check (role in ('admin','coach','player')) default 'player' not null,
      add column if not exists trial_ends_at timestamptz;

    create index if not exists idx_profiles_role on public.profiles(role);

    -- =========================================
    -- 4. packages: coach_id FK (multi-coach refactor)
    -- =========================================
    alter table public.packages
      add column if not exists coach_id uuid references public.coaches(id) on delete restrict;

    -- =========================================
    -- 5. HELPER RLS — is_coach (complementa is_admin)
    -- Retorna true se profile.role IN ('coach','admin')
    -- =========================================
    create or replace function public.is_coach()
    returns boolean
    language sql stable security definer set search_path = public
    as $$
      select coalesce((select role in ('coach','admin') from public.profiles where id = auth.uid()), false);
    $$;

    -- =========================================
    -- 6. RLS coaches — todos veem ativo=true; admin CRUD
    -- =========================================
    alter table public.coaches enable row level security;

    drop policy if exists "everyone reads active coaches" on public.coaches;
    create policy "everyone reads active coaches"
      on public.coaches for select
      using (ativo = true or public.is_admin());

    drop policy if exists "admin manages coaches" on public.coaches;
    create policy "admin manages coaches"
      on public.coaches for all
      using (public.is_admin())
      with check (public.is_admin());

    -- =========================================
    -- 7. RLS steam_links — user vê/gerencia próprio; admin vê todos
    -- (Pattern replicado em youtube_links/twitch_links na V2 — H1.2)
    -- =========================================
    alter table public.steam_links enable row level security;

    drop policy if exists "users see own steam_link" on public.steam_links;
    create policy "users see own steam_link"
      on public.steam_links for select
      using (auth.uid() = user_id or public.is_admin());

    drop policy if exists "users manage own steam_link" on public.steam_links;
    create policy "users manage own steam_link"
      on public.steam_links for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    -- =========================================
    -- 8. SEED Pedro como coach #1 + role='admin' + backfill packages
    -- =========================================
    -- Insere Pedro em coaches (idempotente via on conflict do slug único)
    insert into public.coaches (profile_id, slug, bio, ativo)
    select id,
           'pedro-paulo',
           'Pedro Paulo (PPA) — Immortal / Top 0.5% / 7000 MMR. 15+ anos de Dota, 50.000h jogadas, criador da Fórmula do Dota de Corrida.',
           true
    from public.profiles
    where is_admin = true
    limit 1
    on conflict (slug) do nothing;

    -- Pedro: is_admin=true → role='admin' (mantém ambos para compatibilidade legacy)
    update public.profiles
      set role = 'admin'
      where is_admin = true and role <> 'admin';

    -- Backfill: todos pacotes existentes apontam pra Pedro
    update public.packages
      set coach_id = (select id from public.coaches where slug = 'pedro-paulo')
      where coach_id is null;

    -- Tornar coach_id NOT NULL após backfill (segurança a partir daqui)
    alter table public.packages alter column coach_id set not null;
    ```

    Depois aplique a migration via Supabase MCP (`mcp__supabase__apply_migration` com `name: 'steam_roles_multicoach'`). Caso MCP indisponível, instrua execução manual via Supabase SQL Editor (projeto `nyvbfdsxjpiwgdroptdi`).

    NÃO modifique policies de purchases/profiles/packages existentes (Phase 2). Esta migration APENAS adiciona.
  </action>
  <verify>
    <automated>test -f C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "create table if not exists public.coaches" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "create table if not exists public.steam_links" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "PATTERN CANÔNICO de identidade externa" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "alter table public.profiles" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "create or replace function public.is_coach" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "insert into public.coaches" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql && grep -q "alter column coach_id set not null" C:/Users/ADM/projects/formuladota-v2/supabase/migrations/005_steam_roles_multicoach.sql</automated>
  </verify>
  <acceptance_criteria>
    - Arquivo `supabase/migrations/005_steam_roles_multicoach.sql` existe
    - Contém `create table if not exists public.coaches` e `create table if not exists public.steam_links`
    - Contém comentário PT-BR documentando steam_links como PATTERN CANÔNICO de identidade externa (H1.2 — replicado em V2 para youtube_links/twitch_links/x_links): `grep -q "PATTERN CANÔNICO de identidade externa" supabase/migrations/005_steam_roles_multicoach.sql`
    - Contém `alter table public.profiles add column if not exists role text check (role in ('admin','coach','player'))`
    - Contém `alter table public.packages add column if not exists coach_id uuid references public.coaches(id)`
    - Contém helper `create or replace function public.is_coach()` retornando boolean
    - Contém 4 policies novas (2 coaches + 2 steam_links) com `is_admin()` / `auth.uid() = user_id`
    - Contém `insert into public.coaches` com slug 'pedro-paulo' + `update public.profiles set role = 'admin' where is_admin = true`
    - Contém `update public.packages set coach_id = ...` + `alter column coach_id set not null` (na ordem)
    - Migration aplicada com sucesso no Supabase (verificar via MCP `mcp__supabase__list_tables` retornar `coaches` e `steam_links`)
  </acceptance_criteria>
  <done>
    Migration 005 escrita, idempotente, aplicada no Supabase. Tabelas `coaches` e `steam_links` existem; Pedro está em `coaches` com slug `pedro-paulo`; profile do Pedro tem `role='admin'`; todos pacotes têm `coach_id` apontando pra Pedro; coluna `packages.coach_id` é NOT NULL. SQL documenta steam_links como pattern canônico H1.2.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Atualizar src/types/database.ts com tabelas coaches, steam_links e novas colunas</name>
  <files>src/types/database.ts</files>
  <read_first>
    - src/types/database.ts (entender pattern existente: Row/Insert/Update/Relationships:[] em cada table; Views/Functions/Enums/CompositeTypes como Record<never, never>)
    - supabase/migrations/005_steam_roles_multicoach.sql (criada na Task 1 — fonte da verdade do schema)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão: regen manual via psql introspection — Supabase CLI requer Docker que não está disponível)
  </read_first>
  <action>
    Editar `src/types/database.ts` adicionando duas novas tables e atualizando colunas de `profiles` e `packages`. NÃO regenerar via `pnpm db:gen-types` (Docker indisponível) — fazer manualmente seguindo pattern existente exato.

    1. Em `Tables: { ... }`, adicionar entradas (em ordem alfabética por nome de table):

    ```typescript
    coaches: {
      Row: {
        id: string;
        profile_id: string;
        slug: string;
        bio: string | null;
        ativo: boolean;
        accepted_at: string;
      };
      Insert: {
        id?: string;
        profile_id: string;
        slug: string;
        bio?: string | null;
        ativo?: boolean;
        accepted_at?: string;
      };
      Update: {
        id?: string;
        profile_id?: string;
        slug?: string;
        bio?: string | null;
        ativo?: boolean;
        accepted_at?: string;
      };
      Relationships: [];
    };
    steam_links: {
      Row: {
        user_id: string;
        steam_id_64: string;
        persona: string | null;
        avatar_url: string | null;
        verified_at: string;
      };
      Insert: {
        user_id: string;
        steam_id_64: string;
        persona?: string | null;
        avatar_url?: string | null;
        verified_at?: string;
      };
      Update: {
        user_id?: string;
        steam_id_64?: string;
        persona?: string | null;
        avatar_url?: string | null;
        verified_at?: string;
      };
      Relationships: [];
    };
    ```

    2. Em `profiles.Row`, adicionar APÓS `is_admin: boolean;`:
    ```typescript
    role: "admin" | "coach" | "player";
    trial_ends_at: string | null;
    ```
    Replicar em `Insert` (com `?` opcionais) e `Update` (todos opcionais).

    3. Em `packages.Row`, adicionar APÓS `display_order: number;`:
    ```typescript
    coach_id: string;
    ```
    Em `Insert`: `coach_id: string;` (obrigatório, NOT NULL no DB).
    Em `Update`: `coach_id?: string;` (opcional).

    4. Posicionar `coaches` antes de `doctrine_versions` (alfabético) e `steam_links` antes de `user_stats`.

    5. NÃO mudar `Views`, `Functions`, `Enums`, `CompositeTypes` — todos seguem `Record<never, never>` (per nota em linhas 391-396 do arquivo atual).

    Limite: arquivo deve permanecer válido TS strict zero `any` (per C1) e legível. Comentário PT-BR no topo do bloco de cada tabela nova (per C12).
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "coaches: {" src/types/database.ts && grep -q "steam_links: {" src/types/database.ts && grep -q 'role: "admin" | "coach" | "player"' src/types/database.ts && grep -q "trial_ends_at: string | null" src/types/database.ts && grep -q "coach_id: string" src/types/database.ts && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/types/database.ts` contém entrada `coaches: { Row, Insert, Update, Relationships: [] }` no objeto `Tables`
    - Contém entrada `steam_links: { Row, Insert, Update, Relationships: [] }`
    - Em `profiles.Row` há `role: "admin" | "coach" | "player"` e `trial_ends_at: string | null`
    - Em `packages.Row` há `coach_id: string` (não nullable, pois NOT NULL no DB)
    - `pnpm typecheck` passa (exit 0) sem erros novos
    - Zero ocorrências de `any` ou `unknown` cast no arquivo: `grep -E '\\b(any|unknown)\\b' src/types/database.ts | grep -v "// "` retorna vazio
  </acceptance_criteria>
  <done>
    Types regenerados manualmente; `pnpm typecheck` passa; todas tables/colunas novas tipadas. Pronto pra Plans 03-02..03-05 importarem `Tables<"coaches">` e `Tables<"steam_links">`.
  </done>
</task>

</tasks>

<verification>
- Migration 005 aplicada — verificável em Supabase Dashboard SQL Editor: `select count(*) from public.coaches where slug='pedro-paulo'` retorna 1
- `select role from public.profiles where is_admin=true` retorna `admin`
- `select count(*) from public.packages where coach_id is null` retorna 0
- `pnpm typecheck` passa
- `grep "coaches: {" src/types/database.ts` retorna 1 match
- Comentário H1.2 (pattern multi-redes) presente no SQL: `grep -c "PATTERN CANÔNICO de identidade externa" supabase/migrations/005_steam_roles_multicoach.sql` retorna 1
</verification>

<success_criteria>
- Schema Phase 3 vivo no DB (`coaches`, `steam_links`, `profiles.role`, `profiles.trial_ends_at`, `packages.coach_id NOT NULL`)
- Pedro inserido em `coaches` com slug `pedro-paulo` e bio Immortal
- Todos os 4 pacotes da Migration 003 ligados a Pedro (`coach_id` preenchido)
- Helper RLS `is_coach()` funcional
- 4 RLS policies novas ativas (coaches read/all, steam_links read/all)
- `src/types/database.ts` atualizado e `pnpm typecheck` limpo
- H1.2 endereçado: comentário SQL documenta steam_links como pattern canônico (replicado em V2)
</success_criteria>

<output>
After completion, create `.planning/phases/03-steam-oauth-roles-multicoach/03-01-SUMMARY.md` documentando:
- Versão final do SQL aplicado
- Output da aplicação MCP (ou método manual usado)
- Quaisquer ajustes feitos no types/database.ts além do mínimo (preservar `Relationships: []` pattern)
- Confirmar comentário PT-BR sobre H1.2 (pattern multi-redes) presente no SQL
- Próximo passo: Plans 02 e 03 podem rodar em paralelo (ambos consomem schema novo)
</output>
