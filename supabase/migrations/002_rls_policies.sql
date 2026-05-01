-- formuladota v2 — Row Level Security
-- Princípio: usuário vê só o que é dele. Admin vê tudo.

-- Helper: detecta admin sem recursão infinita em policy
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =========================================
-- Habilitar RLS
-- =========================================
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.purchases enable row level security;
alter table public.availability_windows enable row level security;
alter table public.matches enable row level security;
alter table public.sessions enable row level security;
alter table public.user_stats enable row level security;

-- =========================================
-- PROFILES
-- =========================================
create policy "users see own profile or admin sees all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

create policy "admin updates any profile"
  on public.profiles for update
  using (public.is_admin());

-- =========================================
-- PACKAGES
-- =========================================
create policy "everyone reads active packages, admin reads all"
  on public.packages for select
  using (ativo = true or public.is_admin());

create policy "admin manages packages"
  on public.packages for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================
-- PURCHASES
-- =========================================
create policy "users see own purchases"
  on public.purchases for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users create own purchases"
  on public.purchases for insert
  with check (auth.uid() = user_id);

create policy "admin updates purchases"
  on public.purchases for update
  using (public.is_admin());

-- =========================================
-- AVAILABILITY_WINDOWS
-- =========================================
create policy "everyone reads active windows"
  on public.availability_windows for select
  using (ativo = true or public.is_admin());

create policy "admin manages windows"
  on public.availability_windows for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================
-- MATCHES
-- =========================================
create policy "users see own matches"
  on public.matches for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users create own matches"
  on public.matches for insert
  with check (auth.uid() = user_id);

create policy "users cancel own matches +24h"
  on public.matches for update
  using (auth.uid() = user_id and status = 'agendada' and data_agendada > now() + interval '24 hours')
  with check (status = 'cancelada');

create policy "admin updates matches"
  on public.matches for update
  using (public.is_admin());

-- =========================================
-- SESSIONS
-- =========================================
create policy "users see own sessions"
  on public.sessions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "users create own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "admin updates sessions"
  on public.sessions for update
  using (public.is_admin());

-- =========================================
-- USER_STATS
-- =========================================
create policy "users see own stats"
  on public.user_stats for select
  using (auth.uid() = user_id or public.is_admin());

create policy "admin updates stats"
  on public.user_stats for update
  using (public.is_admin());
