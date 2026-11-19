-- 177_fila_sempre_aberta.sql: a vaga na party vende sempre, com ou sem live (pedido do Pedro em
-- 19/11/2026: "não precisa de ter live marcada... as vendas podem acontecer sempre"). Quem compra
-- fora da live garante o lugar e joga na próxima live que o Pedro abrir, na ordem do pagamento.
-- A fila aberta é uma linha fixa de store_live_sessions (status 'fila'), uma por ambiente, com o
-- próprio tamanho; a data dela fica no passado de propósito, para quem comprou fora entrar na fila
-- de qualquer live. Spec: docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql.

alter table public.store_live_sessions drop constraint if exists store_live_sessions_status_check;
alter table public.store_live_sessions add constraint store_live_sessions_status_check
  check (status in ('marcada', 'ao_vivo', 'encerrada', 'cancelada', 'fila'));

create unique index if not exists store_live_sessions_uma_fila
  on public.store_live_sessions (is_test) where status = 'fila';

-- A fila aberta de produção e a de teste. 20 partidas: cerca de uma live de 5 partidas com a party cheia.
insert into public.store_live_sessions (starts_at, ends_at, party_seats, seats_per_match, status, notes, is_test)
select '2026-01-01 00:00:00-03', '2026-01-01 00:01:00-03', 20, 4, 'fila', 'Fila aberta: vende a vaga fora da live', v.is_test
  from (values (false), (true)) as v(is_test)
 where not exists (select 1 from public.store_live_sessions s where s.status = 'fila' and s.is_test = v.is_test);

-- A live da fila: a que está no ar; sem ela, a próxima marcada; sem nenhuma, a fila aberta.
create or replace function public.party_fila_live_atual(p_is_test boolean)
returns uuid
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select id from public.store_live_sessions where is_test = p_is_test and status = 'ao_vivo' limit 1),
    (select id from public.store_live_sessions
      where is_test = p_is_test and status = 'marcada' and starts_at > now()
      order by starts_at limit 1),
    (select id from public.store_live_sessions where is_test = p_is_test and status = 'fila' limit 1)
  );
$$;

-- Partidas que ocupam a fila: o que falta jogar de quem pagou (nesta live e nas anteriores; na fila
-- aberta, de todas) e as reservas ainda dentro do prazo de pagamento desta live e da fila aberta.
create or replace function public.party_fila_ocupacao(p_live_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(b.seats - b.matches_played), 0)::integer
    from public.store_bookings b
    join public.store_products p on p.id = b.product_id and p.live_seat = 'party'
    join public.store_live_sessions l on l.id = b.live_session_id
    join public.store_live_sessions cur on cur.id = p_live_id
   where b.kind = 'live' and b.is_test = cur.is_test
     and (l.starts_at <= cur.starts_at or cur.status = 'fila')
     and (b.queue_state in ('aguardando', 'na_party')
          or (b.status = 'reservado' and (b.hold_until is null or b.hold_until >= now())
              and (b.live_session_id = cur.id or l.status = 'fila' or cur.status = 'fila')));
$$;

-- Reserva partidas na fila da live atual (no ar, a próxima marcada ou a fila aberta), com trava na
-- linha da live para duas compras não passarem da lotação. Devolve null sem vaga.
create or replace function public.store_reservar_fila(
  p_order_id uuid, p_product_id uuid, p_seats integer, p_hold_until timestamptz, p_is_test boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_id uuid;
begin
  if p_seats is null or p_seats < 1 then
    return null;
  end if;
  if not exists (select 1 from public.store_products where id = p_product_id and live_seat = 'party') then
    return null;
  end if;
  select * into v_live from public.store_live_sessions where id = public.party_fila_live_atual(p_is_test) for update;
  if not found or v_live.status not in ('ao_vivo', 'marcada', 'fila') or (v_live.status = 'marcada' and v_live.starts_at <= now()) then
    return null;
  end if;
  if public.party_fila_ocupacao(v_live.id) + p_seats > v_live.party_seats then
    return null;
  end if;
  insert into public.store_bookings (order_id, product_id, kind, starts_at, ends_at, live_session_id, seats, status, hold_until, is_test)
  values (p_order_id, p_product_id, 'live', v_live.starts_at, v_live.ends_at, v_live.id, p_seats,
          case when p_hold_until is null then 'confirmado' else 'reservado' end, p_hold_until, p_is_test)
  returning id into v_id;
  return v_id;
end;
$$;

-- Abrir a live: já no ar, nada muda; a marcada para agora (até 12 h atrás ou 3 h à frente) vira a
-- live no ar com as reservas dela; sem nenhuma, nasce uma agora, com o tamanho da fila aberta.
-- A fila aberta nunca vira a live: continua de pé para vender de novo quando a live acabar.
create or replace function public.party_fila_abrir_live(
  p_is_test boolean, p_party_seats integer, p_seats_per_match integer, p_youtube_video_id text
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_fila public.store_live_sessions%rowtype;
begin
  select id into v_id from public.store_live_sessions where is_test = p_is_test and status = 'ao_vivo' limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select * into v_fila from public.store_live_sessions where is_test = p_is_test and status = 'fila' limit 1;
  select id into v_id from public.store_live_sessions
   where is_test = p_is_test and status = 'marcada'
     and starts_at between now() - interval '12 hours' and now() + interval '3 hours'
   order by abs(extract(epoch from (starts_at - now())))
   limit 1
   for update;
  begin
    if v_id is not null then
      update public.store_live_sessions
         set status = 'ao_vivo', on_air_at = now(), off_air_at = null,
             party_seats = coalesce(p_party_seats, party_seats),
             seats_per_match = coalesce(p_seats_per_match, seats_per_match),
             youtube_video_id = coalesce(p_youtube_video_id, youtube_video_id)
       where id = v_id;
    else
      insert into public.store_live_sessions (starts_at, ends_at, party_seats, seats_per_match, status, on_air_at, youtube_video_id, is_test)
      values (now(), now() + interval '6 hours', coalesce(p_party_seats, v_fila.party_seats, 8),
              coalesce(p_seats_per_match, v_fila.seats_per_match, 4), 'ao_vivo', now(), p_youtube_video_id, p_is_test)
      returning id into v_id;
    end if;
  exception when unique_violation then
    -- Dois toques em "Abrir": o segundo encontra a live que o primeiro abriu.
    select id into v_id from public.store_live_sessions where is_test = p_is_test and status = 'ao_vivo' limit 1;
  end;
  return v_id;
end;
$$;

-- Só o servidor (service role) mexe na fila: nem visitante nem usuário logado chamam direto.
revoke all on function public.party_fila_live_atual(boolean) from public, anon, authenticated;
revoke all on function public.party_fila_ocupacao(uuid) from public, anon, authenticated;
revoke all on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_abrir_live(boolean, integer, integer, text) from public, anon, authenticated;
grant execute on function public.party_fila_live_atual(boolean) to service_role;
grant execute on function public.party_fila_ocupacao(uuid) to service_role;
grant execute on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) to service_role;
grant execute on function public.party_fila_abrir_live(boolean, integer, integer, text) to service_role;
