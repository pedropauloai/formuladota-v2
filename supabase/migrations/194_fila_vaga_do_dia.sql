-- 194_fila_vaga_do_dia.sql: a vaga na party passa a valer pelo dia (decisão do Pedro em 23/11/2026:
-- "R$ 25 pela vaga do dia... a pessoa pode jogar comigo até o quanto ela quiser, naquele dia", no
-- revezamento). A vaga do dia vale pela live: depois de cada partida, quem tem a vaga do dia volta
-- para a fila se alguém espera o lugar (quem nunca jogou vai na frente) e continua na party se
-- ninguém espera. No fim da live, a vaga que jogou termina; a que não jogou passa para a próxima.
-- O Battlepass segue a mesma regra, todo dia. A cortesia e as vagas antigas continuam por partida.
-- Base: as funções em produção depois das migrations 174 a 179 e 192. Spec: docs/loja/fila-da-party.md
-- (decisão 24). Teste: scripts/seguranca/fila-da-party.sql (casos AG em diante).

-- 1. Como a vaga vale: por partida (as antigas e a cortesia) ou pelo dia.
alter table public.store_products add column if not exists party_mode text not null default 'partidas';
alter table public.store_products drop constraint if exists store_products_party_mode_check;
alter table public.store_products add constraint store_products_party_mode_check check (party_mode in ('partidas', 'dia'));

alter table public.store_bookings add column if not exists modo text not null default 'partidas';
alter table public.store_bookings drop constraint if exists store_bookings_modo_check;
alter table public.store_bookings add constraint store_bookings_modo_check check (modo in ('partidas', 'dia'));
-- A vaga do dia joga quantas partidas couberem: o teto das partidas compradas vale só por partida.
alter table public.store_bookings drop constraint if exists store_bookings_matches_played_check;
alter table public.store_bookings add constraint store_bookings_matches_played_check
  check (matches_played >= 0 and (modo = 'dia' or matches_played <= seats));

-- 2. A vaga na party vende pelo dia, uma por compra; o assinante que está na fila entra no revezamento.
update public.store_products set
  party_mode = 'dia',
  price_unit = 'por dia',
  max_quantity = 1,
  summary = 'Você entra na party da live e joga com o PPA quantas partidas couberem no dia, com a partida transmitida no canal.',
  description_md = $md$Você joga no mesmo time do PPA durante a live, e a partida vai ao ar no canal do FORMULADOTA pela visão dele.

- A vaga vale pela live do dia, no revezamento: depois de cada partida, quem ainda não jogou entra na frente, e você volta na sua vez, quantas vezes couber na live.
- Não jogou nenhuma partida? A vaga passa para a próxima live.
- A live fica gravada no canal para você rever.$md$,
  delivery_md = $md$- Garanta a vaga na página da party, com Pix ou cartão.
- Na sua vez, o PPA convida você pelo ID do Dota.$md$
where slug = 'vaga-na-party';

update public.store_product_variants v set label = 'Vaga do dia'
  from public.store_products p
 where p.id = v.product_id and p.slug = 'vaga-na-party';

update public.store_bookings set modo = 'dia', updated_at = now()
 where source = 'battlepass' and queue_state in ('aguardando', 'na_party');

-- 3. Jogou uma partida: a vaga por partida termina quando acabam as partidas; a do dia continua.
create or replace function public.party_fila_jogou(p_booking_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_state text;
begin
  update public.store_bookings
     set matches_played = matches_played + 1,
         queue_state = case when modo = 'partidas' and matches_played + 1 >= seats then 'concluido' else 'na_party' end,
         status = case when modo = 'partidas' and matches_played + 1 >= seats then 'concluido' else status end,
         finished_at = case when modo = 'partidas' and matches_played + 1 >= seats then now() else finished_at end,
         updated_at = now()
   where id = p_booking_id and queue_state = 'na_party'
   returning queue_state into v_state;
  return v_state;
end;
$$;

-- 4. Revezamento depois da partida: quem tem a vaga do dia cede o lugar a quem espera (a vez de quem
--    acabou de jogar é a mais recente) e fica na party quando sobra lugar, sem convite de novo.
--    Fica primeiro quem jogou menos partidas com a vaga; empate, quem entrou antes na fila.
create or replace function public.party_fila_revezar(p_live_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_fixed integer;
  v_waiting integer;
  v_keep integer;
  v_out integer;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id;
  if not found then
    return 0;
  end if;
  select count(*) into v_fixed
    from public.store_bookings where queue_state = 'na_party' and is_test = v_live.is_test and modo = 'partidas';
  select count(distinct coalesce(b.user_id::text, b.id::text)) into v_waiting
    from public.store_bookings b
    join public.store_live_sessions l on l.id = b.live_session_id
   where b.queue_state = 'aguardando' and b.is_test = v_live.is_test and l.starts_at <= v_live.starts_at
     and (b.user_id is null or not exists (
       select 1 from public.store_bookings b2
        where b2.queue_state = 'na_party' and b2.is_test = v_live.is_test and b2.user_id = b.user_id));
  v_keep := greatest(0, v_live.seats_per_match - v_fixed - v_waiting);
  with dia as (
    select id, row_number() over (order by matches_played, queued_at, id) as n
      from public.store_bookings
     where queue_state = 'na_party' and is_test = v_live.is_test and modo = 'dia'
  )
  update public.store_bookings b
     set queue_state = 'aguardando', called_at = null, updated_at = now()
    from dia
   where b.id = dia.id and dia.n > v_keep;
  get diagnostics v_out = row_count;
  return v_out;
end;
$$;

-- 5. Partida terminou: igual à 192 e, no fim, o revezamento da vaga do dia.
create or replace function public.party_fila_partida_terminou(
  p_live_id uuid, p_expected_count integer,
  p_dota_match_id bigint default null, p_played_at timestamptz default null, p_confirmed uuid[] default null
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_row record;
  v_at timestamptz := coalesce(p_played_at, now());
  v_count integer := 0;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id for update;
  if not found or v_live.status <> 'ao_vivo' then
    return 0;
  end if;
  -- O painel mostrava outro número: esta partida já foi marcada (segundo toque ou repetição).
  if v_live.match_count <> p_expected_count then
    return -1;
  end if;
  update public.store_live_sessions set match_count = match_count + 1 where id = p_live_id;
  for v_row in select id, user_id from public.store_bookings where queue_state = 'na_party' and is_test = v_live.is_test loop
    if v_row.user_id is not null then
      insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, confirmed, live_session_id, booking_id, is_test)
      values (v_row.user_id, 'jogou', p_dota_match_id, v_at, coalesce(v_row.user_id = any (p_confirmed), false), p_live_id, v_row.id, v_live.is_test)
      on conflict do nothing;
    end if;
    perform public.party_fila_jogou(v_row.id);
    v_count := v_count + 1;
  end loop;
  if p_dota_match_id is not null and p_confirmed is not null then
    insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, confirmed, live_session_id, is_test)
    select u.id, 'jogou', p_dota_match_id, v_at, true, p_live_id, v_live.is_test
      from unnest(p_confirmed) as u(id)
     where exists (select 1 from public.profiles pr where pr.id = u.id)
    on conflict do nothing;
  end if;
  perform public.party_fila_revezar(p_live_id);
  return v_count;
end;
$$;

-- 6. Encerrar a live: a vaga do dia que jogou termina o dia; a que não jogou passa para a próxima
--    live; quem estava na party com partidas por jogar volta para a frente da fila (como na 174).
create or replace function public.party_fila_encerrar_live(p_live_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id for update;
  if not found or v_live.status <> 'ao_vivo' then
    return false;
  end if;
  update public.store_live_sessions set status = 'encerrada', off_air_at = now() where id = p_live_id;
  update public.store_bookings
     set queue_state = 'concluido', status = 'concluido', called_at = null, finished_at = now(), updated_at = now()
   where is_test = v_live.is_test and modo = 'dia' and matches_played > 0 and queue_state in ('aguardando', 'na_party');
  update public.store_bookings set queue_state = 'aguardando', called_at = null, updated_at = now()
   where queue_state = 'na_party' and is_test = v_live.is_test;
  return true;
end;
$$;

-- 7. Lotação: a vaga do dia ocupa um lugar até jogar a primeira partida (é o que a live deve a ela);
--    a vaga por partida, as partidas que faltam. Só conta o que foi pago, como na 192.
create or replace function public.party_fila_ocupacao(p_live_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(case when b.modo = 'dia' then (case when b.matches_played = 0 then 1 else 0 end)
                           else b.seats - b.matches_played end), 0)::integer
    from public.store_bookings b
    join public.store_products p on p.id = b.product_id and p.live_seat = 'party'
    join public.store_live_sessions l on l.id = b.live_session_id
    join public.store_live_sessions cur on cur.id = p_live_id
   where b.kind = 'live' and b.is_test = cur.is_test and b.source = 'pedido'
     and (l.starts_at <= cur.starts_at or cur.status = 'fila')
     and (b.queue_state in ('aguardando', 'na_party')
          or (b.status = 'reservado' and (b.hold_until is null or b.hold_until >= now())
              and (b.live_session_id = cur.id or l.status = 'fila' or cur.status = 'fila')));
$$;

-- 8. Reserva: o produto diz como a vaga vale; a do dia é uma por compra (como na 177, com o modo).
create or replace function public.store_reservar_fila(
  p_order_id uuid, p_product_id uuid, p_seats integer, p_hold_until timestamptz, p_is_test boolean
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_mode text;
  v_id uuid;
begin
  select party_mode into v_mode from public.store_products where id = p_product_id and live_seat = 'party';
  if v_mode is null or p_seats is null or p_seats < 1 or (v_mode = 'dia' and p_seats <> 1) then
    return null;
  end if;
  select * into v_live from public.store_live_sessions where id = public.party_fila_live_atual(p_is_test) for update;
  if not found or v_live.status not in ('ao_vivo', 'marcada', 'fila') or (v_live.status = 'marcada' and v_live.starts_at <= now()) then
    return null;
  end if;
  if public.party_fila_ocupacao(v_live.id) + p_seats > v_live.party_seats then
    return null;
  end if;
  insert into public.store_bookings (order_id, product_id, kind, starts_at, ends_at, live_session_id, seats, modo, status, hold_until, is_test)
  values (p_order_id, p_product_id, 'live', v_live.starts_at, v_live.ends_at, v_live.id, p_seats, v_mode,
          case when p_hold_until is null then 'confirmado' else 'reservado' end, p_hold_until, p_is_test)
  returning id into v_id;
  return v_id;
end;
$$;

-- 9. Battlepass: a entrada nova nasce no revezamento do dia (como na 192, com o modo).
create or replace function public.party_fila_entrar_battlepass(p_user_id uuid, p_is_test boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_product uuid;
  v_id uuid;
begin
  if not public.battlepass_ativo(p_user_id, p_is_test) then
    return null;
  end if;
  if not exists (select 1 from public.steam_links where user_id = p_user_id) then
    return null;
  end if;
  select id into v_id from public.store_bookings
   where user_id = p_user_id and is_test = p_is_test and queue_state in ('aguardando', 'na_party')
   limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select id into v_product from public.store_products where slug = 'vaga-na-party' and live_seat = 'party' limit 1;
  if v_product is null then
    return null;
  end if;
  select * into v_live from public.store_live_sessions where id = public.party_fila_live_atual(p_is_test) for update;
  if not found or v_live.status not in ('ao_vivo', 'marcada', 'fila') then
    return null;
  end if;
  begin
    insert into public.store_bookings (order_id, user_id, source, product_id, kind, starts_at, ends_at, live_session_id, seats, modo, status, is_test)
    values (null, p_user_id, 'battlepass', v_product, 'live', v_live.starts_at, v_live.ends_at, v_live.id, 1, 'dia', 'confirmado', p_is_test)
    returning id into v_id;
  exception when unique_violation then
    -- Dois toques ao mesmo tempo: o segundo encontra a entrada que o primeiro criou.
    select id into v_id from public.store_bookings
     where user_id = p_user_id and is_test = p_is_test and source = 'battlepass' and queue_state in ('aguardando', 'na_party')
     limit 1;
  end;
  return v_id;
end;
$$;

-- 10. Mais ou menos partidas só existe na vaga por partida (a do dia não tem saldo).
create or replace function public.party_fila_ajustar_partidas(p_booking_id uuid, p_delta integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_seats integer;
begin
  update public.store_bookings
     set seats = seats + p_delta, updated_at = now()
   where id = p_booking_id and modo = 'partidas' and queue_state in ('aguardando', 'na_party')
     and seats + p_delta between matches_played + 1 and 20
  returning seats into v_seats;
  return v_seats;
end;
$$;

-- 11. Só o servidor (service role) mexe na fila.
revoke all on function public.party_fila_jogou(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_revezar(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_partida_terminou(uuid, integer, bigint, timestamptz, uuid[]) from public, anon, authenticated;
revoke all on function public.party_fila_encerrar_live(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_ocupacao(uuid) from public, anon, authenticated;
revoke all on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_entrar_battlepass(uuid, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_ajustar_partidas(uuid, integer) from public, anon, authenticated;
grant execute on function public.party_fila_jogou(uuid) to service_role;
grant execute on function public.party_fila_revezar(uuid) to service_role;
grant execute on function public.party_fila_partida_terminou(uuid, integer, bigint, timestamptz, uuid[]) to service_role;
grant execute on function public.party_fila_encerrar_live(uuid) to service_role;
grant execute on function public.party_fila_ocupacao(uuid) to service_role;
grant execute on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) to service_role;
grant execute on function public.party_fila_entrar_battlepass(uuid, boolean) to service_role;
grant execute on function public.party_fila_ajustar_partidas(uuid, integer) to service_role;
