-- formuladota v2 — Phase 3 Migration 005
-- Multi-coach schema + Steam OAuth + roles + trial preparation
-- Idempotente: usa "if not exists" e "on conflict do nothing"
--
-- Ordem segura:
--   1. Criar coaches (vazia)
--   2. Criar steam_links (vazia)
--   3. ALTER profiles ADD role + trial_ends_at
--   4. ALTER packages ADD coach_id (NULLABLE inicialmente)
--   5. Helper is_coach()
--   6. RLS policies (coaches + steam_links)
--   7. Seed Pedro em coaches
--   8. UPDATE profiles SET role='admin' WHERE is_admin=true
--   9. Backfill packages.coach_id
--  10. ALTER packages.coach_id SET NOT NULL

-- =========================================
-- 1. TABELA coaches
-- Multi-coach desde Phase 3: schema suporta N coaches.
-- V2 lança UI com Pedro-only; outros coaches entram via painel admin (V3).
-- slug é usado em URL futura /coach/[slug].
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
-- 2. TABELA steam_links (vínculo Steam OpenID 2.0 → user)
-- ----------------------------------------
-- IMPORTANTE — H1.2 (Hub multi-redes):
-- Esta tabela é o PATTERN CANÔNICO de identidade externa do Hub.
-- V2 (Milestone V4) replica este shape para youtube_links, twitch_links, x_links:
--   PK user_id (1:1 com profiles, on delete cascade)
--   identificador externo unique (steam_id_64, youtube_channel_id, twitch_user_id, x_handle)
--   persona / avatar_url / verified_at
--   RLS: user vê/gerencia próprio; admin vê todos
-- Mudanças aqui: pensar em "isso vai ser replicado em outras redes" — manter
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
-- role: hierarquia admin ⊃ coach ⊃ player.
-- is_admin boolean mantido por compatibilidade legacy com policies existentes.
-- trial_ends_at: NULL por padrão — Phase 4 ativa lógica de trial 7 dias.
-- =========================================
alter table public.profiles
  add column if not exists role text check (role in ('admin','coach','player')) default 'player' not null,
  add column if not exists trial_ends_at timestamptz;

create index if not exists idx_profiles_role on public.profiles(role);

-- =========================================
-- 4. packages: coach_id FK (multi-coach refactor)
-- NULLABLE inicialmente para permitir backfill seguro antes de tornar NOT NULL.
-- =========================================
alter table public.packages
  add column if not exists coach_id uuid references public.coaches(id) on delete restrict;

-- =========================================
-- 5. HELPER RLS — is_coach (complementa is_admin de Migration 002)
-- Retorna true se profile.role IN ('coach','admin')
-- Usado nas policies de coaches e steam_links abaixo.
-- =========================================
create or replace function public.is_coach()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role in ('coach','admin') from public.profiles where id = auth.uid()), false);
$$;

-- =========================================
-- 6. RLS coaches — todos veem ativo=true; admin CRUD completo
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
-- Pattern canônico H1.2 — será replicado em youtube_links/twitch_links/x_links na V2.
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
-- 8. SEED Pedro como coach #1
-- Idempotente: ON CONFLICT (slug) DO NOTHING — re-execução segura.
-- Busca perfil onde is_admin=true (coluna legacy de Migration 001).
-- LIMIT 1 caso exista mais de um admin no futuro.
-- =========================================
insert into public.coaches (profile_id, slug, bio, ativo)
select id,
       'pedro-paulo',
       'Pedro Paulo (PPA) — Immortal / Top 0.5% / 7000 MMR. 15+ anos de Dota, 50.000h jogadas, criador da Fórmula do Dota de Corrida.',
       true
from public.profiles
where is_admin = true
limit 1
on conflict (slug) do nothing;

-- =========================================
-- 9. Atualizar role do admin no profile
-- Pedro: is_admin=true → role='admin' (mantém ambos para compatibilidade com policies legacy)
-- Condição "role <> 'admin'" evita UPDATE desnecessário em re-execução.
-- =========================================
update public.profiles
  set role = 'admin'
  where is_admin = true and role <> 'admin';

-- =========================================
-- 10. Backfill packages.coach_id → Pedro
-- Todos os 4 pacotes seedados em Migration 003 apontam para Pedro.
-- Condição "where coach_id is null" garante idempotência.
-- =========================================
update public.packages
  set coach_id = (select id from public.coaches where slug = 'pedro-paulo')
  where coach_id is null;

-- =========================================
-- 11. Tornar coach_id NOT NULL após backfill (condicional)
-- Segurança: qualquer INSERT futuro em packages DEVE incluir coach_id.
--
-- IMPORTANTE: Só aplica NOT NULL se NÃO houver linhas com coach_id null
-- (cenário: Pedro ainda não logou via Discord, profiles vazia, INSERT em coaches
-- não inseriu nada via "select from profiles where is_admin=true limit 1",
-- backfill deixou coach_id null nos pacotes existentes).
-- Pós-Pedro-logar: re-rodar esta migration (idempotente) finaliza o NOT NULL.
-- Plan 03-04 (middleware) garante que Pedro será forçado a criar profile no primeiro acesso.
-- =========================================
do $$
begin
  if not exists (select 1 from public.packages where coach_id is null) then
    -- Ajusta apenas se backfill foi 100% — segurança em re-execução.
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'packages'
        and column_name = 'coach_id'
        and is_nullable = 'YES'
    ) then
      alter table public.packages alter column coach_id set not null;
      raise notice 'packages.coach_id set NOT NULL';
    end if;
  else
    raise notice 'packages.coach_id permanece NULLABLE — Pedro ainda não criou profile (re-rodar migration depois do primeiro login Discord)';
  end if;
end $$;
