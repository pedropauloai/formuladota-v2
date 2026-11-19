-- 174_fila_da_party.sql: fila da party ao vivo (19/11/2026). A vaga na party se compra na hora,
-- durante a live, e a pessoa entra na fila; o Pedro chama, marca quem jogou e pula quem não
-- apareceu. Spec: docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql.

-- 1. Live no ar. O Pedro abre e encerra no painel; a live de teste nunca aparece em produção.
alter table public.store_live_sessions
  add column if not exists on_air_at timestamptz,
  add column if not exists off_air_at timestamptz,
  add column if not exists seats_per_match smallint not null default 4,
  add column if not exists youtube_video_id text,
  add column if not exists is_test boolean not null default false;

alter table public.store_live_sessions drop constraint if exists store_live_sessions_status_check;
alter table public.store_live_sessions add constraint store_live_sessions_status_check
  check (status in ('marcada', 'ao_vivo', 'encerrada', 'cancelada'));
-- A party do Dota tem 5 lugares: o Pedro e até 4.
alter table public.store_live_sessions drop constraint if exists store_live_sessions_seats_per_match_check;
alter table public.store_live_sessions add constraint store_live_sessions_seats_per_match_check
  check (seats_per_match between 1 and 4);
alter table public.store_live_sessions drop constraint if exists store_live_sessions_youtube_video_id_check;
alter table public.store_live_sessions add constraint store_live_sessions_youtube_video_id_check
  check (youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$');

create unique index if not exists store_live_sessions_uma_no_ar
  on public.store_live_sessions (is_test) where status = 'ao_vivo';
create index if not exists store_live_sessions_estado_idx
  on public.store_live_sessions (is_test, status, starts_at);

-- 2. A fila mora na reserva da vaga: cada reserva de party paga vira uma entrada.
alter table public.store_bookings
  add column if not exists queue_state text,
  add column if not exists queued_at timestamptz,
  add column if not exists matches_played smallint not null default 0,
  add column if not exists called_at timestamptz,
  add column if not exists no_shows smallint not null default 0,
  add column if not exists finished_at timestamptz;

alter table public.store_bookings drop constraint if exists store_bookings_queue_state_check;
alter table public.store_bookings add constraint store_bookings_queue_state_check
  check (queue_state is null or queue_state in ('aguardando', 'na_party', 'concluido', 'removido'));
alter table public.store_bookings drop constraint if exists store_bookings_matches_played_check;
alter table public.store_bookings add constraint store_bookings_matches_played_check
  check (matches_played between 0 and seats);

create index if not exists store_bookings_fila_idx
  on public.store_bookings (is_test, queued_at) where queue_state in ('aguardando', 'na_party');

-- 3. O pedido da fila não pede WhatsApp: o Pedro convida pela Steam.
alter table public.store_orders alter column buyer_whatsapp drop not null;

-- 4. Pagamento confirmado entra na fila; cancelamento e reembolso tiram. clock_timestamp() e não
-- now(): duas confirmações na mesma transação (o cron concilia em lote) ainda ficam em ordem.
create or replace function public.store_bookings_entra_na_fila()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'live' and new.status = 'confirmado' and new.queue_state is null
     and exists (select 1 from public.store_products p where p.id = new.product_id and p.live_seat = 'party') then
    new.queue_state := 'aguardando';
    new.queued_at := coalesce(new.queued_at, clock_timestamp());
  elsif new.status = 'cancelado' and new.queue_state in ('aguardando', 'na_party') then
    new.queue_state := 'removido';
    new.finished_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists store_bookings_fila on public.store_bookings;
create trigger store_bookings_fila
  before insert or update of status on public.store_bookings
  for each row execute function public.store_bookings_entra_na_fila();

-- Reserva de party já paga antes desta migration (nenhuma em 19/11/2026) entra na fila.
update public.store_bookings b set queue_state = 'aguardando', queued_at = b.updated_at
  from public.store_products p
 where p.id = b.product_id and p.live_seat = 'party' and b.kind = 'live' and b.status = 'confirmado' and b.queue_state is null;

-- 5. A live da fila: a que está no ar; sem ela, a próxima marcada.
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
      order by starts_at limit 1)
  );
$$;

-- Partidas que ocupam a fila da live: o que falta jogar de quem pagou (nesta live e nas anteriores,
-- que passam para a seguinte) e as reservas desta live ainda dentro do prazo de pagamento.
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
   where b.kind = 'live' and b.is_test = cur.is_test and l.starts_at <= cur.starts_at
     and (b.queue_state in ('aguardando', 'na_party')
          or (b.status = 'reservado' and b.live_session_id = cur.id and (b.hold_until is null or b.hold_until >= now())));
$$;

-- Reserva partidas na fila da live atual (no ar ou a próxima marcada), com trava na linha da live
-- para duas compras não passarem da lotação. Devolve null sem live ou sem vaga.
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
  if not found or v_live.status not in ('ao_vivo', 'marcada') or (v_live.status = 'marcada' and v_live.starts_at <= now()) then
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

-- 6. Operação da fila pelo painel do Pedro.

-- Abrir a live: já no ar, nada muda; a marcada para agora (até 12 h atrás ou 3 h à frente) vira a
-- live no ar com as reservas dela; sem nenhuma, nasce uma agora.
create or replace function public.party_fila_abrir_live(
  p_is_test boolean, p_party_seats integer, p_seats_per_match integer, p_youtube_video_id text
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.store_live_sessions where is_test = p_is_test and status = 'ao_vivo' limit 1;
  if v_id is not null then
    return v_id;
  end if;
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
      values (now(), now() + interval '6 hours', coalesce(p_party_seats, 8), coalesce(p_seats_per_match, 4), 'ao_vivo', now(), p_youtube_video_id, p_is_test)
      returning id into v_id;
    end if;
  exception when unique_violation then
    -- Dois toques em "Abrir": o segundo encontra a live que o primeiro abriu.
    select id into v_id from public.store_live_sessions where is_test = p_is_test and status = 'ao_vivo' limit 1;
  end;
  return v_id;
end;
$$;

-- Encerrar a live: quem estava na party e não terminou volta para a frente da fila.
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
  update public.store_bookings set queue_state = 'aguardando', called_at = null, updated_at = now()
   where queue_state = 'na_party' and is_test = v_live.is_test;
  return true;
end;
$$;

-- Chamar para a party o próximo da fila (ou o escolhido), se houver lugar. Trava na linha da live:
-- dois toques seguidos não chamam duas pessoas para o mesmo lugar.
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
   order by b.queued_at, b.id
   limit 1;
  if v_id is null then
    return null;
  end if;
  update public.store_bookings set queue_state = 'na_party', called_at = now(), updated_at = now()
   where id = v_id and queue_state = 'aguardando';
  return v_id;
end;
$$;

-- Jogou uma partida: quem completou as partidas compradas sai da party como concluído.
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
         queue_state = case when matches_played + 1 >= seats then 'concluido' else 'na_party' end,
         status = case when matches_played + 1 >= seats then 'concluido' else status end,
         finished_at = case when matches_played + 1 >= seats then now() else finished_at end,
         updated_at = now()
   where id = p_booking_id and queue_state = 'na_party'
   returning queue_state into v_state;
  return v_state;
end;
$$;

-- Partida terminou: todos da party jogaram uma.
create or replace function public.party_fila_partida_terminou(p_live_id uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_id uuid;
  v_count integer := 0;
begin
  select * into v_live from public.store_live_sessions where id = p_live_id for update;
  if not found or v_live.status <> 'ao_vivo' then
    return 0;
  end if;
  for v_id in select id from public.store_bookings where queue_state = 'na_party' and is_test = v_live.is_test loop
    perform public.party_fila_jogou(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Não apareceu: volta para o fim da fila sem perder a vaga.
create or replace function public.party_fila_ausente(p_booking_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings
     set queue_state = 'aguardando', queued_at = clock_timestamp(), called_at = null,
         no_shows = no_shows + 1, updated_at = now()
   where id = p_booking_id and queue_state = 'na_party';
  return found;
end;
$$;

-- Tirar da fila: sai sem jogar; reembolso, quando houver, é à parte.
create or replace function public.party_fila_remover(p_booking_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings set queue_state = 'removido', finished_at = now(), updated_at = now()
   where id = p_booking_id and queue_state in ('aguardando', 'na_party');
  return found;
end;
$$;

-- Só o servidor (service role) mexe na fila: nem visitante nem usuário logado chamam direto.
revoke all on function public.store_bookings_entra_na_fila() from public, anon, authenticated;
revoke all on function public.party_fila_live_atual(boolean) from public, anon, authenticated;
revoke all on function public.party_fila_ocupacao(uuid) from public, anon, authenticated;
revoke all on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_abrir_live(boolean, integer, integer, text) from public, anon, authenticated;
revoke all on function public.party_fila_encerrar_live(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_chamar(uuid, uuid) from public, anon, authenticated;
revoke all on function public.party_fila_jogou(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_partida_terminou(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_ausente(uuid) from public, anon, authenticated;
revoke all on function public.party_fila_remover(uuid) from public, anon, authenticated;
grant execute on function public.party_fila_live_atual(boolean) to service_role;
grant execute on function public.party_fila_ocupacao(uuid) to service_role;
grant execute on function public.store_reservar_fila(uuid, uuid, integer, timestamptz, boolean) to service_role;
grant execute on function public.party_fila_abrir_live(boolean, integer, integer, text) to service_role;
grant execute on function public.party_fila_encerrar_live(uuid) to service_role;
grant execute on function public.party_fila_chamar(uuid, uuid) to service_role;
grant execute on function public.party_fila_jogou(uuid) to service_role;
grant execute on function public.party_fila_partida_terminou(uuid) to service_role;
grant execute on function public.party_fila_ausente(uuid) to service_role;
grant execute on function public.party_fila_remover(uuid) to service_role;
