-- formuladota v2 — Phase 1.5
-- Cultura, doutrina e moderação progressiva
-- Implementa PRD §0 (cultura) + §11 (sistema progressivo)

-- =========================================
-- PROFILES — campos de doutrina e comportamento
-- =========================================
alter table public.profiles
  add column if not exists doctrine_accepted_at timestamptz,
  add column if not exists doctrine_version integer default 1 not null,
  add column if not exists behavior_status text
    check (behavior_status in ('ok','warned','suspended','banned'))
    default 'ok' not null,
  add column if not exists suspended_until timestamptz,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_reason text;

-- Versão atual da doutrina — incrementar quando texto canônico mudar.
-- Triggers de aceite vão comparar com este valor.
create table if not exists public.doctrine_versions (
  version integer primary key,
  text_hash text not null,                 -- SHA256 do A FÓRMULA DO DOTA DE CORRIDA.txt
  published_at timestamptz default now() not null,
  notes text
);

insert into public.doctrine_versions (version, text_hash, notes)
values (1, 'pending_calc_at_first_deploy', 'Versão inicial — A Fórmula do Dota de Corrida (1ª aula da Fórmula do MMR)')
on conflict (version) do nothing;

-- =========================================
-- USER_WARNINGS — trilha de violações
-- =========================================
create table if not exists public.user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Princípio violado: 1-14 (positivos) OU anti-padrão 1-10 (negativos)
  principle_violated integer check (principle_violated between 1 and 14),
  antipattern_violated integer check (antipattern_violated between 1 and 10),
  -- Pelo menos um deve ser preenchido
  constraint principle_or_antipattern check (
    principle_violated is not null or antipattern_violated is not null
  ),

  severity text check (severity in ('advertencia','suspensao','banimento')) not null,
  source text check (source in ('pedro_admin','discord_bot','report_user','auto_detect')) not null,
  status text check (status in ('pendente','aplicada','contestada','revertida')) default 'aplicada' not null,

  notes text,
  issued_by uuid references public.profiles(id),
  issued_at timestamptz default now() not null,
  suspension_days integer check (suspension_days > 0)
);

create index if not exists idx_warnings_user_active on public.user_warnings(user_id, issued_at desc);
create index if not exists idx_warnings_pending on public.user_warnings(status) where status = 'pendente';

-- =========================================
-- BEHAVIOR_STATUS_LOG — auditoria de mudanças
-- =========================================
create table if not exists public.behavior_status_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  from_status text not null,
  to_status text not null,
  reason text,
  warning_id uuid references public.user_warnings(id),
  changed_by uuid references public.profiles(id),
  changed_at timestamptz default now() not null
);

create index if not exists idx_behavior_log_user on public.behavior_status_log(user_id, changed_at desc);

-- =========================================
-- TRIGGER — aplicar regra progressiva ao inserir warning
-- =========================================
create or replace function public.apply_warning_progression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_new_status text;
  v_suspended_until timestamptz;
  v_banned_at timestamptz;
  v_reason text;
begin
  -- Só processa warnings com status 'aplicada' (admin já validou)
  if new.status <> 'aplicada' then
    return new;
  end if;

  select behavior_status into v_current_status
  from public.profiles where id = new.user_id;

  -- Define ação baseada na severidade do warning + status atual
  if new.severity = 'advertencia' then
    v_new_status := 'warned';
    v_reason := 'Advertência registrada — princípio/anti-padrão violado';

  elsif new.severity = 'suspensao' then
    v_new_status := 'suspended';
    v_suspended_until := now() + make_interval(days => coalesce(new.suspension_days, 7));
    v_reason := 'Suspensão por ' || coalesce(new.suspension_days, 7) || ' dias';

  elsif new.severity = 'banimento' then
    v_new_status := 'banned';
    v_banned_at := now();
    v_reason := 'Banimento — ' || coalesce(new.notes, 'sem motivo registrado');
  end if;

  -- Atualiza profile
  update public.profiles
  set
    behavior_status = v_new_status,
    suspended_until = case when v_new_status = 'suspended' then v_suspended_until else suspended_until end,
    banned_at = case when v_new_status = 'banned' then v_banned_at else banned_at end,
    banned_reason = case when v_new_status = 'banned' then v_reason else banned_reason end
  where id = new.user_id;

  -- Log auditoria
  insert into public.behavior_status_log (user_id, from_status, to_status, reason, warning_id, changed_by)
  values (new.user_id, v_current_status, v_new_status, v_reason, new.id, new.issued_by);

  return new;
end;
$$;

drop trigger if exists trg_warning_progression on public.user_warnings;
create trigger trg_warning_progression
  after insert on public.user_warnings
  for each row execute function public.apply_warning_progression();

-- =========================================
-- FUNÇÃO — auto-reset após 180d sem violações (rodar via cron / edge function)
-- =========================================
create or replace function public.reset_dormant_behavior()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset_count integer;
begin
  with reset_users as (
    update public.profiles p
    set behavior_status = 'ok',
        suspended_until = null
    where p.behavior_status = 'warned'
      and not exists (
        select 1 from public.user_warnings w
        where w.user_id = p.id
          and w.status = 'aplicada'
          and w.issued_at > now() - interval '180 days'
      )
    returning p.id
  )
  select count(*) into v_reset_count from reset_users;

  return v_reset_count;
end;
$$;

-- =========================================
-- HELPERS — checagens rápidas em RLS / Server Actions
-- =========================================
create or replace function public.has_accepted_doctrine(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    join public.doctrine_versions dv on dv.version = p.doctrine_version
    where p.id = p_user_id
      and p.doctrine_accepted_at is not null
      and p.doctrine_version = (select max(version) from public.doctrine_versions)
  );
$$;

create or replace function public.is_user_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select
      behavior_status = 'ok'
      or (behavior_status = 'warned')
      or (behavior_status = 'suspended' and suspended_until < now())
    from public.profiles where id = p_user_id),
    false
  );
$$;

-- =========================================
-- RLS — usuário lê próprios warnings; admin lê tudo
-- =========================================
alter table public.user_warnings enable row level security;
alter table public.behavior_status_log enable row level security;
alter table public.doctrine_versions enable row level security;

create policy "users see own warnings"
  on public.user_warnings for select
  using (auth.uid() = user_id or public.is_admin());

create policy "admin manages warnings"
  on public.user_warnings for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "users see own behavior log"
  on public.behavior_status_log for select
  using (auth.uid() = user_id or public.is_admin());

create policy "admin manages behavior log"
  on public.behavior_status_log for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "everyone reads doctrine versions"
  on public.doctrine_versions for select
  using (true);

create policy "admin manages doctrine versions"
  on public.doctrine_versions for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================
-- BLOQUEIO de compras em status incompatível
-- =========================================
-- Ajuste na policy de purchases — só user 'ok' ou 'warned' pode criar nova compra.
-- Suspensos/banidos não podem comprar.
drop policy if exists "users create own purchases" on public.purchases;

create policy "active users create own purchases"
  on public.purchases for insert
  with check (
    auth.uid() = user_id
    and public.has_accepted_doctrine(auth.uid())
    and public.is_user_active(auth.uid())
  );
