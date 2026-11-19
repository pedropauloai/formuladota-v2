-- 176_fila_trava.sql: duas travas que a revisão da fila pediu (19/11/2026).
-- 1. Uma vaga por pessoa na party: quem comprou duas vezes ocupa um lugar só, e a segunda compra
--    espera a primeira terminar (antes, "Completar a party" chamava as duas, e "Partida terminou"
--    descontava duas partidas de quem jogou uma).
-- 2. "Partida terminou" não conta duas vezes: a live guarda quantas partidas já terminaram, e o
--    painel manda o número que mostrava; o segundo toque, ou a requisição repetida, não desconta.
-- Spec: docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql.

alter table public.store_live_sessions add column if not exists match_count integer not null default 0;

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
    join public.store_orders o on o.id = b.order_id
   where b.queue_state = 'aguardando' and b.is_test = v_live.is_test and l.starts_at <= v_live.starts_at
     and (p_booking_id is null or b.id = p_booking_id)
     and (o.user_id is null or not exists (
       select 1
         from public.store_bookings b2
         join public.store_orders o2 on o2.id = b2.order_id
        where b2.queue_state = 'na_party' and b2.is_test = v_live.is_test and o2.user_id = o.user_id))
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

drop function if exists public.party_fila_partida_terminou(uuid);
create or replace function public.party_fila_partida_terminou(p_live_id uuid, p_expected_count integer)
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
  -- O painel mostrava outro número: esta partida já foi marcada (segundo toque ou repetição).
  if v_live.match_count <> p_expected_count then
    return -1;
  end if;
  update public.store_live_sessions set match_count = match_count + 1 where id = p_live_id;
  for v_id in select id from public.store_bookings where queue_state = 'na_party' and is_test = v_live.is_test loop
    perform public.party_fila_jogou(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.party_fila_partida_terminou(uuid, integer) from public, anon, authenticated;
grant execute on function public.party_fila_partida_terminou(uuid, integer) to service_role;
