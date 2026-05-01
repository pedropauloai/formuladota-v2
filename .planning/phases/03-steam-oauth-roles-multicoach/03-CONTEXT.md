# Phase 3: Steam OAuth + Roles + Multi-coach Refactor — Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** Pedro decisões pivô 2026-05-01 + ROADMAP.md + REQUIREMENTS.md (H1.1-H1.4)

<domain>
## Phase Boundary

**O que está dentro do escopo:**
- Migration 005 com schema novo: `steam_links`, `coaches`, alteração `profiles` (adiciona `role` enum), alteração `packages` (adiciona `coach_id` FK NOT NULL)
- Steam OAuth via OpenID 2.0 — flow completo: Server Action `signInWithSteam()`, callback handler `/auth/steam/callback`, persistência em `steam_links`
- Steam Web API para fetch persona/avatar (`ISteamUser/GetPlayerSummaries`)
- Página `/vincular/steam` (Server Component que mostra status atual + botão "Vincular Steam") e `/vincular` (futuro hub multi-redes — placeholder Phase 3, expansão V2)
- Refator `PackageCard` (já existente em `src/components/catalog/`) pra mostrar dados do coach (nome + avatar)
- Refator `/pacotes/page.tsx` pra fazer JOIN packages × coaches × profiles (Pedro como coach #1)
- Seed Pedro como coach #1: `INSERT INTO coaches` com slug `"pedro-paulo"`, bio contendo "Immortal/7000 MMR"
- RLS policies pra `coaches` (admin CRUD, todos veem ativo=true) e `steam_links` (user vê próprio, admin vê todos)
- Helper RLS `is_coach(user_id)` complementar a `is_admin()` existente
- Middleware update: após login Discord, se `steam_links` vazio pro user → redirect pra `/vincular/steam` (semelhante a doutrina obrigatória — Steam é obrigatório pra acessar `/pacotes` e futuramente lobbies)

**O que está FORA do escopo:**
- Subscription mensal (Phase 4)
- Bot Steam pra criar lobby (Phase 5)
- Páginas vincular YouTube/Twitch/X (V2 Milestone V4)
- Multi-coach UI (UI mostra Pedro-only nesta phase; estrutura preparada)
- Coach onboarding KYC fiscal (V3 Milestone)
- Split de payment (V3)

</domain>

<decisions>
## Implementation Decisions (locked)

### Auth — Steam OpenID 2.0
- **NÃO substitui Discord** — adiciona. Discord segue auth primário Supabase (cookie de sessão).
- **Tabela paralela `steam_links`** com FK `user_id → profiles(id)`. SteamID 64 + persona + avatar persistidos.
- **Lib**: `node-steam-openid` (verificada em `.planning/research/integrations.md`) — wrapper minimalista pro flow OpenID 2.0.
- **Steam Web API key** (`STEAM_WEB_API_KEY`) necessária pra `GetPlayerSummaries` que pega persona/avatar pós-validação OpenID. Pedro precisa criar em https://steamcommunity.com/dev/apikey usando domínio `formuladota.com`.
- **Realm OpenID**: `process.env.NEXT_PUBLIC_SITE_URL` (em dev: `http://localhost:3000/`).
- **Return URL**: `${SITE_URL}/auth/steam/callback?state=<csrf>`.

### Schema — Multi-coach desde Phase 3
- Tabela `coaches` (FK `profiles.id`, `slug` UNIQUE, `bio` text, `ativo` boolean, `accepted_at`). Slug usado em URL futura `/coach/[slug]`.
- Pedro = único coach inserido nesta phase. UI mostra apenas Pedro mas DB pronto pra N coaches.
- `packages.coach_id` UUID NOT NULL FK `coaches(id)`. Backfill: todos 4 pacotes seedados → Pedro.

### Roles
- Adicionar coluna `role` em `profiles`: `text check ('admin','coach','player') default 'player'`.
- `is_admin` boolean **mantido** (legacy do schema 001) — mais granular, segue funcionando.
- `role='admin'` ⊃ permissões de `coach` ⊃ permissões de `player`.
- Pedro: `is_admin=true` AND `role='admin'` AND existe em `coaches`. Configurado via UPDATE SQL no seed da Migration 005.
- Helper `is_coach(uuid) returns boolean` — checa `role IN ('coach','admin')`.

### RLS — pattern consistente
- `coaches.select`: `ativo = true OR public.is_admin()`
- `coaches.all`: apenas `is_admin()` (CRUD restrito a admin)
- `steam_links.select`: `auth.uid() = user_id OR public.is_admin()`
- `steam_links.insert`: `auth.uid() = user_id` (user vincula só a própria conta)
- `steam_links.update/delete`: `auth.uid() = user_id` (user pode revincular ou remover)
- Atualizar policy `packages.select` (já é "todos veem ativo=true") — sem mudança porque `coach_id` é só FK.

### Middleware enforcement
- Adicionar à fila de checagens (após doutrina e behavior_status):
  - User logado SEM Steam vinculado tentando acessar `/pacotes`, `/checkout/[id]`, `/partidas`, `/criar-lobby` (futuro), `/me` (futuro) → redirect `/vincular/steam`
  - Lista `STEAM_REQUIRED_PATHS` em `src/lib/supabase/middleware.ts`
  - User vinculado em `/vincular/steam` → redirect `/perfil` (não fica preso)

### UI — Página `/vincular/steam`
- Server Component que mostra:
  - **Sem Steam vinculado**: card cyan com texto explicativo + botão "Continuar com Steam" (Server Action `signInWithSteam`)
  - **Com Steam vinculado**: card verde com persona/avatar + SteamID 64 + botão "Revincular" (sobrescreve)
- Helper `getSteamLink(userId)` em `src/lib/supabase/server.ts` ou módulo dedicado `src/lib/steam.ts`.

### Refator PackageCard (já existe em `src/components/catalog/package-card.tsx`)
- Receber prop adicional `coach: { username: string, avatar_url: string | null, badge: string }`.
- Renderizar acima do nome do pacote: avatar (h-8 w-8) + "Por: {username}" + badge "Immortal" (cyan small).
- Phase 3 mostra apenas Pedro porque é coach único — preparar componente, não condicionar visualmente.

### Refator `/pacotes/page.tsx`
- Query Supabase com JOIN: `select packages.*, coaches.id as coach_id, coaches.slug, profiles.username, profiles.avatar_url, profiles.is_admin from packages join coaches on packages.coach_id=coaches.id join profiles on coaches.profile_id=profiles.id where packages.ativo=true and coaches.ativo=true order by packages.display_order`.
- Em caso de TS reclamar do JOIN (visto na Phase 2 com `Relationships:[]`), usar 2-query approach: primeira query packages ativos, segunda query coaches+profiles dos coach_ids únicos, merge no JS via `Map<coach_id, coach>`.
- ZERO `any` ou `unknown` casts (per C1).

### Migrations seguras
- Migration 005 NÃO modifica policies de `purchases` (Phase 2 entregou). Apenas adiciona, não remove.
- Default `coach_id` no INSERT de `packages` em Migration 003 já existente — backfill via UPDATE em 005 (não dropar e recriar).
- Toda mudança em `profiles.role` tem trigger pra também setar `is_admin=true` quando `role='admin'` (consistência).

### Trial 7 dias (preparado mas não ativado)
- Adicionar coluna `profiles.trial_ends_at timestamptz` agora pra reduzir migration churn quando Phase 4 chegar. Default `NULL`. Phase 4 ativa.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vision e contrato
- `.planning/PROJECT.md` — visão pós-pivô formuladota = HUB
- `.planning/ROADMAP.md` — Phase 3 escopo + acceptance
- `.planning/REQUIREMENTS.md` — H1.1 Steam OAuth, H1.2 multi-redes, H1.3 roles, H1.4 multi-coach + cross-cutting C1-C13

### Schema atual (não modificar nesta phase, só adicionar via Migration 005)
- `supabase/migrations/001_initial_schema.sql` — `profiles`, `packages`, `purchases`
- `supabase/migrations/002_rls_policies.sql` — pattern policy + helper `is_admin()`
- `supabase/migrations/003_seed_packages.sql` — 4 pacotes seedados (precisam ser ligados a Pedro via `coach_id`)
- `supabase/migrations/004_doctrine_and_moderation.sql` — pattern de helpers RLS, trigger progressivo

### Lib patterns existentes (replicar)
- `src/lib/supabase/server.ts` — pattern `createClient()` cookie-based pro Server Component / Server Action
- `src/lib/supabase/middleware.ts` — enforcement em camadas (banned > suspended > !accepted) — adicionar STEAM_REQUIRED_PATHS layer
- `src/lib/env.ts` — pattern `requireServerEnv` + Zod parse env vars (adicionar `STEAM_WEB_API_KEY`)
- `src/app/onboarding/doutrina/actions.ts` — pattern Server Action com Zod + redirect
- `src/app/auth/callback/route.ts` — pattern API Route handler de OAuth callback (referência pro Steam callback)

### Frontend patterns existentes (replicar visual)
- `src/components/catalog/package-card.tsx` — alvo de refator
- `src/app/pacotes/page.tsx` — alvo de refator
- `src/app/codigo-de-conduta/page.tsx` — pattern Server Component cyberpunk com TOC
- `src/app/onboarding/doutrina/page.tsx` — pattern fluxo obrigatório (referência pra `/vincular/steam`)

### Research
- `.planning/research/integrations.md` — Steam OpenID 2.0 flow detalhado, libs Node.js (`node-steam-openid`, `passport-steam`), Steam Web API key setup, integração com Supabase Auth
- `.planning/research/hub-stack-deep-dive.md` — atualizado pós-pivô

### Tipos
- `src/types/database.ts` — atualizar pós-Migration 005 via `gsd-tools` ou regen manual (Supabase introspection)

</canonical_refs>

<specifics>
## Specific Ideas

### Lib `node-steam-openid` (deferred decisão final ao planner)
- Pacote: `pnpm add node-steam-openid`
- Uso típico: instanciar com `realm`, `returnUrl`, `apiKey`, depois `getRedirectUrl()` e `authenticate(query)` retorna SteamID 64 + persona.
- Alternativa: implementação manual (~80 linhas em Edge Function) — mais limpa mas reinventa roda. Lib é bem mantida e simples.

### Steam Web API setup (Pedro)
- URL: https://steamcommunity.com/dev/apikey
- Domínio: `formuladota.com` (Pedro registra com domínio que ele tem na Hostinger)
- Variável: `STEAM_WEB_API_KEY` (server-only, NUNCA expor)
- Adicionar a `.env.example` na Phase 3

### Migration 005 SQL skeleton
```sql
-- 1. Tabela coaches
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null unique,
  slug text unique not null,
  bio text,
  ativo boolean default true not null,
  accepted_at timestamptz default now() not null
);

-- 2. Tabela steam_links
create table public.steam_links (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  steam_id_64 text unique not null,
  persona text,
  avatar_url text,
  verified_at timestamptz default now() not null
);

-- 3. profiles: role enum + trial_ends_at + (existing is_admin mantido)
alter table public.profiles
  add column if not exists role text check (role in ('admin','coach','player')) default 'player' not null,
  add column if not exists trial_ends_at timestamptz;

-- 4. packages: coach_id FK
alter table public.packages
  add column if not exists coach_id uuid references public.coaches(id) on delete restrict;

-- 5. Helper is_coach
create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role in ('coach','admin') from public.profiles where id = auth.uid()), false);
$$;

-- 6. RLS coaches
alter table public.coaches enable row level security;
create policy "everyone reads active coaches" on public.coaches for select
  using (ativo = true or public.is_admin());
create policy "admin manages coaches" on public.coaches for all
  using (public.is_admin()) with check (public.is_admin());

-- 7. RLS steam_links
alter table public.steam_links enable row level security;
create policy "users see own steam_link" on public.steam_links for select
  using (auth.uid() = user_id or public.is_admin());
create policy "users manage own steam_link" on public.steam_links for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. Seed Pedro como coach + role
insert into public.coaches (profile_id, slug, bio, ativo)
select id, 'pedro-paulo',
  'Pedro Paulo (PPA) — Immortal / Top 0.5% / 7000 MMR. 15+ anos de Dota, 50.000h jogadas, criador da Fórmula do Dota de Corrida.',
  true
from public.profiles where is_admin = true limit 1
on conflict (slug) do nothing;

update public.profiles set role = 'admin' where is_admin = true;

update public.packages
set coach_id = (select id from public.coaches where slug = 'pedro-paulo')
where coach_id is null;

-- 9. Tornar coach_id NOT NULL após backfill
alter table public.packages alter column coach_id set not null;
```

### Página `/vincular/steam` skeleton
- Server Component que busca `steam_link` do user logado
- Se logado mas sem Steam: card cyberpunk com explicação + form action `signInWithSteam`
- Se já vinculado: card verde com persona/avatar + botão revincular

</specifics>

<deferred>
## Deferred Ideas (NOT in Phase 3)

- Multi-coach UI (Phase 3 prepara schema; UI multi-coach lança em V3 Milestone)
- Onboarding de coaches plurais (KYC fiscal, split payment) — V3
- Vinculação YouTube/Twitch/X — V2 Milestone V4
- Anti-smurf score via Discord Connections — V2
- Steam token refresh (Steam OpenID não usa tokens — sessão validada apenas no momento do login. Não precisa refresh)
- Página `/coach/[slug]` (perfil público de coach) — Phase 7

</deferred>

---

*Phase: 03-steam-oauth-roles-multicoach*
*Context gathered: 2026-05-01 via decisões diretas Pedro*
