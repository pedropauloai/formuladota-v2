-- formuladota v2 — schema inicial
-- Tables: profiles, packages, purchases, availability_windows, matches, sessions, user_stats

-- =========================================
-- PROFILES (extende auth.users)
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_id text unique,
  username text,
  avatar_url text,
  steam_id text,
  email text,
  mmr_inicial integer,
  mmr_atual integer,
  role_preferida text check (role_preferida in ('carry', 'mid', 'offlane', 'sup4', 'sup5')),
  is_admin boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_profiles_discord_id on public.profiles(discord_id);
create index idx_profiles_steam_id on public.profiles(steam_id) where steam_id is not null;

-- =========================================
-- PACKAGES (catálogo de produtos)
-- =========================================
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text check (tipo in ('avulso', 'mensal')) not null,
  qtd_partidas integer not null check (qtd_partidas >= 0),
  qtd_sessoes integer default 0 not null check (qtd_sessoes >= 0),
  preco_brl numeric(10, 2) not null check (preco_brl > 0),
  ativo boolean default true not null,
  display_order integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_packages_ativo_order on public.packages(ativo, display_order);

-- =========================================
-- PURCHASES (compras realizadas)
-- =========================================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete restrict not null,
  status text check (status in ('pendente', 'pago', 'expirado', 'cancelado')) default 'pendente' not null,
  payment_provider text default 'abacatepay' not null,
  external_payment_id text,
  preco_pago numeric(10, 2) not null,
  partidas_compradas integer not null check (partidas_compradas >= 0),
  partidas_usadas integer default 0 not null check (partidas_usadas >= 0),
  sessoes_compradas integer default 0 not null check (sessoes_compradas >= 0),
  sessoes_usadas integer default 0 not null check (sessoes_usadas >= 0),
  data_compra timestamptz default now() not null,
  data_expiracao timestamptz,
  created_at timestamptz default now() not null,
  -- Não pode usar mais que comprou
  constraint partidas_balance check (partidas_usadas <= partidas_compradas),
  constraint sessoes_balance check (sessoes_usadas <= sessoes_compradas)
);

create index idx_purchases_user_status on public.purchases(user_id, status);
create index idx_purchases_external on public.purchases(external_payment_id) where external_payment_id is not null;

-- =========================================
-- AVAILABILITY_WINDOWS (janelas Pedro)
-- =========================================
create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  -- 0=domingo, 6=sábado
  dia_semana integer check (dia_semana between 0 and 6) not null,
  hora_inicio time not null,
  hora_fim time not null,
  ativo boolean default true not null,
  created_at timestamptz default now() not null,
  constraint horario_valido check (hora_fim > hora_inicio)
);

-- =========================================
-- MATCHES (partidas agendadas/realizadas)
-- =========================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete restrict not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  data_agendada timestamptz not null,
  status text check (status in ('agendada', 'realizada', 'cancelada', 'no_show')) default 'agendada' not null,
  dota_match_id text,
  resultado text check (resultado in ('vitoria', 'derrota')),
  mmr_change integer,
  kda text, -- "K/D/A"
  heroi_jogado text,
  duracao_min integer check (duracao_min > 0),
  notas_pedro text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_matches_user_status on public.matches(user_id, status);
create index idx_matches_data on public.matches(data_agendada);
create index idx_matches_dota_id on public.matches(dota_match_id) where dota_match_id is not null;

-- =========================================
-- SESSIONS (sessões teóricas)
-- =========================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete restrict not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  data_agendada timestamptz not null,
  duracao_min integer default 60 not null check (duracao_min > 0),
  tema_conceitos text[],
  notas text,
  status text check (status in ('agendada', 'realizada', 'cancelada')) default 'agendada' not null,
  created_at timestamptz default now() not null
);

create index idx_sessions_user_status on public.sessions(user_id, status);

-- =========================================
-- USER_STATS (cache agregado)
-- =========================================
create table public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_partidas_com_pedro integer default 0 not null,
  vitorias integer default 0 not null,
  derrotas integer default 0 not null,
  mmr_ganho_total integer default 0 not null,
  heroi_mais_jogado text,
  role_mais_jogada text,
  ultima_atualizacao timestamptz default now() not null
);

-- =========================================
-- TRIGGERS
-- =========================================

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Auto-criar profile + user_stats quando user nasce em auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, discord_id, username, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );

  insert into public.user_stats (user_id) values (new.id);

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
