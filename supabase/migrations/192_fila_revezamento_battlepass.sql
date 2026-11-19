-- 192_fila_revezamento_battlepass.sql: o Battlepass na fila da party (19/11/2026).
-- Regra do Pedro: o assinante entra na fila sem pagar, quantas vezes quiser, uma entrada por vez; a
-- ordem da fila, para todos, é a hora da última vez na party do PPA (quem nunca jogou vai primeiro,
-- empate pela hora em que entrou); "não apareceu" conta como vez gasta; "Partida terminou" grava a
-- participação de quem jogou, com o ID da partida e a conferência da OpenDota.
-- Base: as funções da fila em produção depois das migrations 174 a 177. Spec: docs/battlepass/spec.md
-- e docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql e battlepass.sql.

-- 1. A entrada da fila conhece o dono sem passar pelo pedido; a do assinante não tem pedido.
alter table public.store_bookings add column if not exists user_id uuid references public.profiles (id) on delete cascade;
alter table public.store_bookings add column if not exists source text not null default 'pedido';
alter table public.store_bookings drop constraint if exists store_bookings_source_check;
alter table public.store_bookings add constraint store_bookings_source_check check (source in ('pedido', 'battlepass'));
alter table public.store_bookings alter column order_id drop not null;
alter table public.store_bookings drop constraint if exists store_bookings_dono_check;
alter table public.store_bookings add constraint store_bookings_dono_check
  check ((source = 'pedido' and order_id is not null) or (source = 'battlepass' and order_id is null and user_id is not null));

update public.store_bookings b set user_id = o.user_id
  from public.store_orders o
 where o.id = b.order_id and b.user_id is null and o.user_id is not null;

create or replace function public.store_bookings_dono()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is null and new.order_id is not null then
    select o.user_id into new.user_id from public.store_orders o where o.id = new.order_id;
  end if;
  return new;
end;
$$;

drop trigger if exists store_bookings_dono on public.store_bookings;
create trigger store_bookings_dono
  before insert on public.store_bookings
  for each row execute function public.store_bookings_dono();

create index if not exists store_bookings_user_idx on public.store_bookings (user_id) where user_id is not null;
-- Uma entrada do Battlepass de pé por pessoa.
create unique index if not exists store_bookings_battlepass_uma
  on public.store_bookings (user_id, is_test)
  where source = 'battlepass' and queue_state in ('aguardando', 'na_party');

-- Partida registrada sem o ID (OpenDota fora do ar) ainda conta para o revezamento.
alter table public.party_participacoes drop constraint if exists party_participacoes_partida_check;

-- 2. A vez de cada um no revezamento: a última vez na party do PPA (jogou ou não apareceu).
create or replace function public.party_fila_vez(p_user_id uuid, p_is_test boolean)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(p.played_at) from public.party_participacoes p where p.user_id = p_user_id and p.is_test = p_is_test;
$$;

-- 3. Lotação da fila: conta só o que foi pago (o assinante não paga por partida).
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
   where b.kind = 'live' and b.is_test = cur.is_test and b.source = 'pedido'
     and (l.starts_at <= cur.starts_at or cur.status = 'fila')
     and (b.queue_state in ('aguardando', 'na_party')
          or (b.status = 'reservado' and (b.hold_until is null or b.hold_until >= now())
              and (b.live_session_id = cur.id or l.status = 'fila' or cur.status = 'fila')));
$$;

-- 4. Chamar o próximo: pelo revezamento, uma vaga por pessoa na party.
create or replace function public.party_fila_chamar(p_live_id uuid, p_booking_id uuid default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_id uuid;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id for update;
  if not found or v_live.status <> 'ao_vivo' then
    return null;
  end if;
  if (select count(*) from public.store_bookings where queue_state = 'na_party' and is_test = v_live.is_test) >= v_live.seats_per_match then
    return null;
  end if;
  select b.id into v_id
    from public.store_bookings b
    join public.store_live_sessions l on l.id = b.live_session_id
   where b.queue_state = 'aguardando' and b.is_test = v_live.is_test and l.starts_at <= v_live.starts_at
     and (p_booking_id is null or b.id = p_booking_id)
     and (b.user_id is null or not exists (
       select 1 from public.store_bookings b2
        where b2.queue_state = 'na_party' and b2.is_test = v_live.is_test and b2.user_id = b.user_id))
   order by public.party_fila_vez(b.user_id, b.is_test) asc nulls first, b.queued_at, b.id
   limit 1;
  if v_id is null then
    return null;
  end if;
  update public.store_bookings set queue_state = 'na_party', called_at = now(), updated_at = now()
   where id = v_id and queue_state = 'aguardando';
  return v_id;
end;
$$;

-- 5. Não apareceu: volta para a fila e a vez conta como gasta (vai para o fim do revezamento).
create or replace function public.party_fila_ausente(p_booking_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_row public.store_bookings%rowtype;
begin
  update public.store_bookings
     set queue_state = 'aguardando', queued_at = clock_timestamp(), called_at = null,
         no_shows = no_shows + 1, updated_at = now()
   where id = p_booking_id and queue_state = 'na_party'
   returning * into v_row;
  if not found then
    return false;
  end if;
  if v_row.user_id is not null then
    insert into public.party_participacoes (user_id, kind, played_at, live_session_id, booking_id, is_test)
    values (v_row.user_id, 'nao_apareceu', now(), v_row.live_session_id, v_row.id, v_row.is_test);
  end if;
  return true;
end;
$$;

-- 6. Partida terminou: todos da party jogaram uma, e cada um ganha a participação com o ID da
--    partida e a hora em que ela acabou. Quem a OpenDota mostrou no time do PPA fora da party também
--    conta. Os parâmetros novos têm padrão nulo: a chamada antiga continua valendo.
drop function if exists public.party_fila_partida_terminou(uuid, integer);
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
  return v_count;
end;
$$;

-- 7. Sair da fila pela página: a entrada é de quem pediu e ainda espera.
create or replace function public.party_fila_sair(p_booking_id uuid, p_user_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings b
     set queue_state = 'removido', queue_exit = 'saiu', finished_at = now(), updated_at = now()
   where b.id = p_booking_id and b.user_id = p_user_id and b.queue_state = 'aguardando';
  return found;
end;
$$;

-- 8. Entrar na fila com o Battlepass: sem pagamento, uma entrada de pé por pessoa, exige a Steam
--    vinculada (o convite sai por ela). Devolve a entrada de pé, se já houver uma, ou null.
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
    insert into public.store_bookings (order_id, user_id, source, product_id, kind, starts_at, ends_at, live_session_id, seats, status, is_test)
    values (null, p_user_id, 'battlepass', v_product, 'live', v_live.starts_at, v_live.ends_at, v_live.id, 1, 'confirmado', p_is_test)
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

-- 9. Só o servidor (service role) mexe na fila.
revoke all on function public.store_bookings_dono() from public, anon, authenticated;
revoke all on function public.party_fila_vez(uuid, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_ocupacao(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_chamar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.party_fila_ausente(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_partida_terminou(uuid, integer, bigint, timestamptz, uuid[]) from public, anon, authenticated;
revoke all on function public.party_fila_sair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.party_fila_entrar_battlepass(uuid, boolean) from public, anon, authenticated;
grant execute on function public.party_fila_vez(uuid, boolean) to service_role;
grant execute on function public.party_fila_ocupacao(uuid) to service_role;
grant execute on function public.party_fila_chamar(uuid, uuid) to service_role;
grant execute on function public.party_fila_ausente(uuid) to service_role;
grant execute on function public.party_fila_partida_terminou(uuid, integer, bigint, timestamptz, uuid[]) to service_role;
grant execute on function public.party_fila_sair(uuid, uuid) to service_role;
grant execute on function public.party_fila_entrar_battlepass(uuid, boolean) to service_role;
