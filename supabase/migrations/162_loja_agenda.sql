-- 162_loja_agenda.sql: agenda da loja (18/11/2026). O comprador escolhe o horário (ou a live) na
-- própria compra, sem WhatsApp; o Pedro controla disponibilidade, bloqueios, lives e agendamentos
-- no painel. Spec: docs/loja/agenda.md.

create extension if not exists btree_gist;

-- Como cada produto usa a agenda.
alter table public.store_products
  add column if not exists booking_mode text not null default 'nenhum',
  add column if not exists session_minutes integer,
  add column if not exists sessions_per_order integer not null default 1,
  add column if not exists live_seat text;

alter table public.store_products drop constraint if exists store_products_booking_mode_check;
alter table public.store_products add constraint store_products_booking_mode_check
  check (booking_mode in ('nenhum', 'agenda', 'live'));
alter table public.store_products drop constraint if exists store_products_session_minutes_check;
alter table public.store_products add constraint store_products_session_minutes_check
  check (session_minutes is null or session_minutes between 15 and 480);
alter table public.store_products drop constraint if exists store_products_sessions_per_order_check;
alter table public.store_products add constraint store_products_sessions_per_order_check
  check (sessions_per_order between 1 and 12);
alter table public.store_products drop constraint if exists store_products_live_seat_check;
alter table public.store_products add constraint store_products_live_seat_check
  check (live_seat is null or live_seat in ('party', 'replay'));
-- Produto de agenda precisa de duração; produto de live precisa dizer qual vaga ocupa.
alter table public.store_products drop constraint if exists store_products_booking_config_check;
alter table public.store_products add constraint store_products_booking_config_check
  check ((booking_mode <> 'agenda' or session_minutes is not null) and (booking_mode <> 'live' or live_seat is not null));

-- Entrega de produto sem horário (análise gravada): link e recado que aparecem na página do pedido.
alter table public.store_orders
  add column if not exists delivery_url text,
  add column if not exists delivery_note text;
alter table public.store_orders drop constraint if exists store_orders_delivery_url_check;
alter table public.store_orders add constraint store_orders_delivery_url_check
  check (delivery_url is null or delivery_url ~ '^https://');

-- Disponibilidade semanal, no horário de Brasília (0 = domingo).
create table if not exists public.store_availability (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Períodos em que nada se agenda (folga, viagem, compromisso).
create table if not exists public.store_blocked_periods (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Lives marcadas: vagas na party e replays ao vivo.
create table if not exists public.store_live_sessions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  party_seats integer not null default 0 check (party_seats between 0 and 100),
  replay_seats integer not null default 0 check (replay_seats between 0 and 100),
  status text not null default 'marcada' check (status in ('marcada', 'cancelada')),
  notes text not null default '' check (char_length(notes) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists store_live_sessions_starts_idx on public.store_live_sessions (starts_at);

-- Agendamentos: um por sessão marcada de um pedido.
create table if not exists public.store_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders (id) on delete cascade,
  product_id uuid not null references public.store_products (id),
  kind text not null check (kind in ('agenda', 'live')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  live_session_id uuid references public.store_live_sessions (id),
  seats integer not null default 1 check (seats between 1 and 20),
  status text not null default 'reservado' check (status in ('reservado', 'confirmado', 'cancelado', 'concluido')),
  -- Reserva enquanto a pessoa paga; null = confirmado sem prazo.
  hold_until timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (kind <> 'live' or live_session_id is not null)
);
create index if not exists store_bookings_order_idx on public.store_bookings (order_id);
create index if not exists store_bookings_starts_idx on public.store_bookings (starts_at);
create index if not exists store_bookings_live_idx on public.store_bookings (live_session_id) where live_session_id is not null;

-- A agenda nunca tem dois horários sobrepostos (reserva viva ou confirmada); teste só bate com teste.
alter table public.store_bookings drop constraint if exists store_bookings_agenda_sem_sobreposicao;
alter table public.store_bookings add constraint store_bookings_agenda_sem_sobreposicao
  exclude using gist (is_test with =, tstzrange(starts_at, ends_at) with &&)
  where (kind = 'agenda' and status in ('reservado', 'confirmado'));

alter table public.store_availability enable row level security;
alter table public.store_blocked_periods enable row level security;
alter table public.store_live_sessions enable row level security;
alter table public.store_bookings enable row level security;
-- Leitura e escrita só pelo servidor (service role) e pelo admin no painel.
drop policy if exists store_availability_admin on public.store_availability;
create policy store_availability_admin on public.store_availability for select using ((select public.is_admin()));
drop policy if exists store_blocked_periods_admin on public.store_blocked_periods;
create policy store_blocked_periods_admin on public.store_blocked_periods for select using ((select public.is_admin()));
drop policy if exists store_live_sessions_admin on public.store_live_sessions;
create policy store_live_sessions_admin on public.store_live_sessions for select using ((select public.is_admin()));
drop policy if exists store_bookings_admin on public.store_bookings;
create policy store_bookings_admin on public.store_bookings for select using ((select public.is_admin()));

-- Reserva um horário da agenda. Libera antes as reservas vencidas no mesmo intervalo; com
-- p_hold_until nulo, já nasce confirmado (sessão extra de pedido pago, remarcação).
-- Devolve null quando o horário foi ocupado por outra compra.
create or replace function public.store_reservar_agenda(
  p_order_id uuid, p_product_id uuid, p_starts timestamptz, p_ends timestamptz,
  p_hold_until timestamptz, p_is_test boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.store_bookings set status = 'cancelado', updated_at = now()
   where kind = 'agenda' and status = 'reservado' and is_test = p_is_test
     and hold_until is not null and hold_until < now()
     and tstzrange(starts_at, ends_at) && tstzrange(p_starts, p_ends);
  insert into public.store_bookings (order_id, product_id, kind, starts_at, ends_at, status, hold_until, is_test)
  values (p_order_id, p_product_id, 'agenda', p_starts, p_ends,
          case when p_hold_until is null then 'confirmado' else 'reservado' end, p_hold_until, p_is_test)
  returning id into v_id;
  return v_id;
exception when exclusion_violation then
  return null;
end;
$$;

-- Reserva vagas numa live, com trava na linha da live para duas compras não passarem do limite.
-- Devolve null quando a live não existe, já começou, foi cancelada ou não tem vaga.
create or replace function public.store_reservar_live(
  p_order_id uuid, p_product_id uuid, p_live_id uuid, p_seats integer,
  p_hold_until timestamptz, p_is_test boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_seat text;
  v_capacity integer;
  v_used integer;
  v_id uuid;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id for update;
  if not found or v_live.status <> 'marcada' or v_live.starts_at <= now() then
    return null;
  end if;
  select live_seat into v_seat from public.store_products where id = p_product_id;
  v_capacity := case when v_seat = 'replay' then v_live.replay_seats else v_live.party_seats end;
  select coalesce(sum(b.seats), 0) into v_used
    from public.store_bookings b
    join public.store_products p on p.id = b.product_id
   where b.live_session_id = p_live_id and b.kind = 'live' and b.is_test = p_is_test
     and p.live_seat = v_seat
     and (b.status = 'confirmado' or (b.status = 'reservado' and (b.hold_until is null or b.hold_until >= now())));
  if v_used + p_seats > v_capacity then
    return null;
  end if;
  insert into public.store_bookings (order_id, product_id, kind, starts_at, ends_at, live_session_id, seats, status, hold_until, is_test)
  values (p_order_id, p_product_id, 'live', v_live.starts_at, v_live.ends_at, p_live_id, p_seats,
          case when p_hold_until is null then 'confirmado' else 'reservado' end, p_hold_until, p_is_test)
  returning id into v_id;
  return v_id;
end;
$$;

-- Remarca um horário confirmado: troca na mesma transação, ou nada muda.
create or replace function public.store_remarcar_agenda(
  p_booking_id uuid, p_starts timestamptz, p_ends timestamptz
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_old public.store_bookings%rowtype;
  v_id uuid;
begin
  select * into v_old from public.store_bookings where id = p_booking_id and kind = 'agenda' and status = 'confirmado' for update;
  if not found then
    return null;
  end if;
  update public.store_bookings set status = 'cancelado', updated_at = now() where id = p_booking_id;
  insert into public.store_bookings (order_id, product_id, kind, starts_at, ends_at, status, is_test)
  values (v_old.order_id, v_old.product_id, 'agenda', p_starts, p_ends, 'confirmado', v_old.is_test)
  returning id into v_id;
  return v_id;
exception when exclusion_violation then
  return null;
end;
$$;

-- Só o servidor (service role) reserva: nem visitante nem usuário logado chamam direto.
revoke all on function public.store_reservar_agenda(uuid, uuid, timestamptz, timestamptz, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.store_reservar_live(uuid, uuid, uuid, integer, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.store_remarcar_agenda(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- Configuração dos produtos da versão B.
update public.store_products set booking_mode = 'agenda', session_minutes = 90, sessions_per_order = 4 where slug = 'acompanhamento-30-dias';
update public.store_products set booking_mode = 'agenda', session_minutes = 90, sessions_per_order = 1 where slug = 'mentoria';
update public.store_products set booking_mode = 'agenda', session_minutes = 60, sessions_per_order = 1 where slug = 'jogar-junto';
update public.store_products set booking_mode = 'live', live_seat = 'party' where slug = 'vaga-na-party';
update public.store_products set booking_mode = 'live', live_seat = 'replay' where slug = 'replay-ao-vivo';
update public.store_products set booking_mode = 'agenda', session_minutes = 30 where slug = 'e2e-teste';

-- Disponibilidade inicial: 19h às 22h todos os dias (a do Pedro registrada no vault); ele ajusta no painel.
insert into public.store_availability (weekday, start_time, end_time)
select d, time '19:00', time '22:00' from generate_series(0, 6) as d
where not exists (select 1 from public.store_availability);
