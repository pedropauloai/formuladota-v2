-- 190_battlepass.sql: Battlepass FORMULADOTA, a mensalidade de R$ 120 (19/11/2026).
-- Cartão com renovação automática (assinatura do Mercado Pago) ou 30 dias no Pix; cada pagamento
-- num livro próprio; participação na party do PPA, base do revezamento da fila.
-- Spec: docs/battlepass/spec.md. Teste: scripts/seguranca/battlepass.sql.

-- 1. A assinatura ganha o tier battlepass, o provedor pix e a marca de teste (o e2e roda no
--    sandbox contra este banco, como o da loja).
alter table public.subscriptions drop constraint if exists subscriptions_tier_check;
alter table public.subscriptions add constraint subscriptions_tier_check
  check (tier in ('plus', 'premium', 'battlepass'));
alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider in ('mp', 'stripe', 'pix'));
alter table public.subscriptions add column if not exists is_test boolean not null default false;

-- 2. Ninguém grava assinatura pelo navegador: a linha nasce e muda só no servidor (service role).
--    A política de INSERT antiga deixava o próprio usuário criar uma linha 'authorized' com data no
--    futuro e ganhar o benefício sem pagar.
drop policy if exists "users insert own subscription" on public.subscriptions;
drop policy if exists subscriptions_delete_own_inactive on public.subscriptions;
revoke insert, update, delete, truncate, references, trigger on public.subscriptions from anon, authenticated;
revoke all on public.subscriptions from anon;

-- 3. Livro de pagamentos do Battlepass: cada cobrança do cartão e cada Pix de 30 dias, com o
--    período que o pagamento cobre. Só o dono lê os seus; só o servidor escreve.
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (method in ('cartao', 'pix')),
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'em_revisao', 'expirado', 'cancelado', 'reembolso_pedido', 'reembolsado')),
  amount_cents integer not null check (amount_cents > 0),
  paid_amount_cents integer check (paid_amount_cents is null or paid_amount_cents >= 0),
  mp_payment_id text unique,
  mp_authorized_payment_id text unique,
  pix_copia_e_cola text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  refund_requested_at timestamptz,
  checked_at timestamptz,
  gateway_payload jsonb,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_payments_periodo_check
    check (period_start is null or period_end is null or period_end > period_start)
);

create index if not exists subscription_payments_user_idx
  on public.subscription_payments (user_id, created_at desc);
create index if not exists subscription_payments_sub_idx
  on public.subscription_payments (subscription_id);
create index if not exists subscription_payments_pendentes_idx
  on public.subscription_payments (is_test, checked_at) where status = 'pendente';

alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;
drop policy if exists subscription_payments_select_own on public.subscription_payments;
create policy subscription_payments_select_own on public.subscription_payments
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- 4. Participação na party do PPA: uma linha por pessoa por partida (ou por chamada perdida).
--    A última linha de cada pessoa decide a vez dela no revezamento da fila.
create table if not exists public.party_participacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'jogou' check (kind in ('jogou', 'nao_apareceu')),
  dota_match_id bigint check (dota_match_id is null or dota_match_id > 0),
  played_at timestamptz not null,
  -- A OpenDota mostrou a Steam vinculada da pessoa no time do PPA nesta partida.
  confirmed boolean not null default false,
  live_session_id uuid references public.store_live_sessions (id) on delete set null,
  booking_id uuid references public.store_bookings (id) on delete set null,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  constraint party_participacoes_partida_check check (kind = 'nao_apareceu' or dota_match_id is not null)
);

create unique index if not exists party_participacoes_partida_uniq
  on public.party_participacoes (user_id, dota_match_id) where dota_match_id is not null;
create index if not exists party_participacoes_ultima_idx
  on public.party_participacoes (is_test, user_id, played_at desc);
create index if not exists party_participacoes_booking_idx
  on public.party_participacoes (booking_id) where booking_id is not null;
create index if not exists party_participacoes_live_idx
  on public.party_participacoes (live_session_id) where live_session_id is not null;

alter table public.party_participacoes enable row level security;
revoke all on public.party_participacoes from anon, authenticated;
grant select on public.party_participacoes to authenticated;
drop policy if exists party_participacoes_select_own on public.party_participacoes;
create policy party_participacoes_select_own on public.party_participacoes
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- 5. Battlepass ativo: tier battlepass com o período no futuro. O cartão autorizado ganha 3 dias de
--    folga, o tempo de o Mercado Pago tentar de novo uma cobrança recusada antes de pausar.
create or replace function public.battlepass_ativo(p_user_id uuid, p_is_test boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = p_user_id and s.tier = 'battlepass' and s.is_test = p_is_test
       and s.status in ('authorized', 'cancelled')
       and s.next_payment_date is not null
       and s.next_payment_date
           + case when s.provider = 'mp' and s.status = 'authorized' then interval '3 days' else interval '0' end
           > now()
  );
$$;

-- Quem de uma lista tem o Battlepass ativo (o selo ao lado do nome na fila e no perfil).
create or replace function public.battlepass_membros(p_user_ids uuid[], p_is_test boolean)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct u.id
    from unnest(coalesce(p_user_ids, '{}'::uuid[])) as u(id)
   where public.battlepass_ativo(u.id, p_is_test);
$$;

-- 6. Pix de 30 dias confirmado: marca o pagamento e soma 30 dias a partir do fim do período atual
--    (ou de agora, se já acabou). Trava no pagamento e na assinatura: quem chegar segundo (webhook,
--    página, cron) não soma de novo. Dinheiro recebido nunca fica sem acesso: se a assinatura não
--    pode voltar a valer (outra já ativa), o pagamento vai para revisão do Pedro.
create or replace function public.battlepass_pix_confirmar(
  p_payment_id uuid, p_mp_payment_id text, p_paid_cents integer, p_gateway jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.subscription_payments%rowtype;
  v_sub public.subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_pay from public.subscription_payments
   where id = p_payment_id and method = 'pix' for update;
  if not found or v_pay.status not in ('pendente', 'expirado', 'cancelado') then
    return 'nada';
  end if;
  select * into v_sub from public.subscriptions where id = v_pay.subscription_id for update;
  v_start := greatest(now(), coalesce(v_sub.next_payment_date, now()));
  v_end := v_start + interval '30 days';
  begin
    update public.subscriptions
       set status = 'authorized', started_at = coalesce(started_at, now()), next_payment_date = v_end,
           cancelled_at = null, updated_at = now()
     where id = v_sub.id;
  exception when unique_violation then
    update public.subscription_payments
       set status = 'em_revisao', paid_at = now(), paid_amount_cents = p_paid_cents,
           mp_payment_id = p_mp_payment_id, gateway_payload = p_gateway, updated_at = now()
     where id = v_pay.id;
    return 'revisar';
  end;
  update public.subscription_payments
     set status = 'pago', paid_at = now(), paid_amount_cents = p_paid_cents, mp_payment_id = p_mp_payment_id,
         period_start = v_start, period_end = v_end, gateway_payload = p_gateway, updated_at = now()
   where id = v_pay.id;
  return 'pago';
end;
$$;

-- 7. Cobrança do cartão aprovada (evento de cobrança da assinatura ou conferência no Mercado Pago):
--    grava o pagamento uma vez só, pelo ID da cobrança, e estica o período da assinatura.
create or replace function public.battlepass_cartao_cobranca(
  p_subscription_id uuid, p_authorized_payment_id text, p_mp_payment_id text, p_paid_cents integer,
  p_paid_at timestamptz, p_next_payment_date timestamptz, p_gateway jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_end timestamptz;
begin
  if p_authorized_payment_id is null or p_paid_cents is null or p_paid_cents < 1 or p_paid_at is null then
    return false;
  end if;
  select * into v_sub from public.subscriptions
   where id = p_subscription_id and tier = 'battlepass' for update;
  if not found then
    return false;
  end if;
  v_end := greatest(coalesce(p_next_payment_date, p_paid_at + interval '30 days'), p_paid_at + interval '1 day');
  insert into public.subscription_payments (
    subscription_id, user_id, method, status, amount_cents, paid_amount_cents, mp_payment_id,
    mp_authorized_payment_id, period_start, period_end, paid_at, gateway_payload, is_test)
  values (
    v_sub.id, v_sub.user_id, 'cartao', 'pago', p_paid_cents, p_paid_cents, p_mp_payment_id,
    p_authorized_payment_id, p_paid_at, v_end, p_paid_at, p_gateway, v_sub.is_test)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  update public.subscriptions
     set status = case when status = 'pending' then 'authorized' else status end,
         started_at = coalesce(started_at, p_paid_at),
         next_payment_date = greatest(coalesce(next_payment_date, v_end), v_end),
         updated_at = now()
   where id = v_sub.id;
  return true;
end;
$$;

-- 8. Garantia de 7 dias, uma vez por pessoa: nos 7 dias depois do primeiro pagamento do Battlepass,
--    tudo o que foi pago nesse prazo volta. O acesso termina na hora, Pix pendente é cancelado, e os
--    pagamentos ficam marcados para o Pedro devolver no Mercado Pago. Devolve o total, ou null.
create or replace function public.battlepass_pedir_reembolso(p_user_id uuid, p_is_test boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first public.subscription_payments%rowtype;
  v_total integer;
begin
  select * into v_first from public.subscription_payments
   where user_id = p_user_id and is_test = p_is_test and paid_at is not null
     and status in ('pago', 'reembolso_pedido', 'reembolsado')
   order by paid_at asc
   limit 1
   for update;
  if not found or v_first.status <> 'pago' or v_first.paid_at < now() - interval '7 days' then
    return null;
  end if;
  with marcados as (
    update public.subscription_payments
       set status = 'reembolso_pedido', refund_requested_at = now(), updated_at = now()
     where user_id = p_user_id and is_test = p_is_test and status = 'pago'
       and paid_at <= v_first.paid_at + interval '7 days'
    returning coalesce(paid_amount_cents, amount_cents) as valor
  )
  select coalesce(sum(valor), 0)::integer into v_total from marcados;
  update public.subscription_payments set status = 'cancelado', updated_at = now()
   where user_id = p_user_id and is_test = p_is_test and status = 'pendente';
  update public.subscriptions
     set status = 'cancelled', cancelled_at = now(), next_payment_date = now(), updated_at = now()
   where user_id = p_user_id and is_test = p_is_test and tier = 'battlepass'
     and status in ('pending', 'authorized', 'paused', 'cancelled')
     and (next_payment_date is null or next_payment_date > now());
  return v_total;
end;
$$;

-- 9. Última vez de cada pessoa na party do PPA (o revezamento da fila ordena por ela).
create or replace function public.party_ultima_vez(p_user_ids uuid[], p_is_test boolean)
returns table (user_id uuid, ultima timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, max(p.played_at) as ultima
    from public.party_participacoes p
   where p.user_id = any (coalesce(p_user_ids, '{}'::uuid[])) and p.is_test = p_is_test
   group by p.user_id;
$$;

-- 10. O lobby elite aceita o Battlepass (os critérios de habilidade continuam: Imortal da Valve e
--     Místico nível 30).
create or replace function public.can_join_elite(p_uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_paid boolean;
  v_mmr int;
  v_level int;
begin
  select exists(
    select 1 from subscriptions
    where user_id = p_uid
      and tier in ('premium', 'battlepass')
      and status in ('authorized', 'cancelled')
      and next_payment_date is not null
      and next_payment_date > now()
  ) into v_paid;
  select mmr_atual into v_mmr from profiles where id = p_uid;
  select current_level into v_level from user_levels where user_id = p_uid;
  return coalesce(v_paid, false)
     and coalesce(v_mmr, 0) >= 6000
     and coalesce(v_level, 1) >= 30;
end;
$$;

create or replace function public.active_subscription_tier()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then 'battlepass'
    else (
      select s.tier
        from public.subscriptions s
       where s.user_id = auth.uid()
         and s.status in ('authorized', 'cancelled')
         and s.next_payment_date is not null
         and s.next_payment_date > now()
       order by case s.tier when 'battlepass' then 0 when 'premium' then 1 else 2 end
       limit 1
    )
  end;
$$;

create or replace function public.has_subscription_tier(p_tier text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_tier
    when 'plus' then public.active_subscription_tier() in ('plus', 'premium', 'battlepass')
    when 'premium' then public.active_subscription_tier() in ('premium', 'battlepass')
    when 'battlepass' then public.active_subscription_tier() = 'battlepass'
    else false
  end;
$$;

-- 11. Só o servidor (service role) chama as funções novas; as antigas continuam fechadas (164).
revoke all on function public.battlepass_ativo(uuid, boolean) from public, anon, authenticated;
revoke all on function public.battlepass_membros(uuid[], boolean) from public, anon, authenticated;
revoke all on function public.battlepass_pix_confirmar(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.battlepass_cartao_cobranca(uuid, text, text, integer, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.battlepass_pedir_reembolso(uuid, boolean) from public, anon, authenticated;
revoke all on function public.party_ultima_vez(uuid[], boolean) from public, anon, authenticated;
revoke all on function public.can_join_elite(uuid) from public, anon, authenticated;
revoke all on function public.active_subscription_tier() from public, anon, authenticated;
revoke all on function public.has_subscription_tier(text) from public, anon, authenticated;
grant execute on function public.battlepass_ativo(uuid, boolean) to service_role;
grant execute on function public.battlepass_membros(uuid[], boolean) to service_role;
grant execute on function public.battlepass_pix_confirmar(uuid, text, integer, jsonb) to service_role;
grant execute on function public.battlepass_cartao_cobranca(uuid, text, text, integer, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.battlepass_pedir_reembolso(uuid, boolean) to service_role;
grant execute on function public.party_ultima_vez(uuid[], boolean) to service_role;
grant execute on function public.can_join_elite(uuid) to service_role;
grant execute on function public.active_subscription_tier() to service_role;
grant execute on function public.has_subscription_tier(text) to service_role;
