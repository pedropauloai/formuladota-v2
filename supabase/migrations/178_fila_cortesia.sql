-- 178_fila_cortesia.sql: o Pedro gerencia a fila pelo painel sem pagamento (pedido de 19/11/2026):
-- põe alguém na fila de cortesia, com as partidas que escolher, e aumenta ou diminui as partidas
-- de quem já está na fila (compra paga, Battlepass ou cortesia). A cortesia não ocupa a vaga à
-- venda (party_fila_ocupacao conta só source = 'pedido', migration 192).
-- Spec: docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql.

alter table public.store_bookings drop constraint if exists store_bookings_source_check;
alter table public.store_bookings add constraint store_bookings_source_check
  check (source in ('pedido', 'battlepass', 'cortesia'));
alter table public.store_bookings drop constraint if exists store_bookings_dono_check;
alter table public.store_bookings add constraint store_bookings_dono_check
  check ((source = 'pedido' and order_id is not null)
      or (source in ('battlepass', 'cortesia') and order_id is null and user_id is not null));

-- Uma cortesia na fila por pessoa: dar de novo soma partidas na mesma entrada.
create unique index if not exists store_bookings_cortesia_uma
  on public.store_bookings (user_id, is_test) where source = 'cortesia' and queue_state in ('aguardando', 'na_party');

-- Põe na fila de cortesia (ou soma partidas à cortesia que a pessoa já tem). Exige Steam vinculada,
-- porque o convite sai pelo ID do Dota. Devolve null sem Steam, sem fila ou com partidas fora de 1 a 20.
create or replace function public.party_fila_adicionar_cortesia(p_user_id uuid, p_matches integer, p_is_test boolean)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_live public.store_live_sessions%rowtype;
  v_product uuid;
  v_id uuid;
begin
  if p_matches is null or p_matches < 1 or p_matches > 20 then
    return null;
  end if;
  if not exists (select 1 from public.steam_links where user_id = p_user_id) then
    return null;
  end if;
  select id into v_id from public.store_bookings
   where user_id = p_user_id and is_test = p_is_test and source = 'cortesia' and queue_state in ('aguardando', 'na_party')
   for update;
  if v_id is not null then
    update public.store_bookings set seats = seats + p_matches, updated_at = now()
     where id = v_id and seats + p_matches <= 20;
    return case when found then v_id else null end;
  end if;
  select id into v_product from public.store_products where slug = 'vaga-na-party' and live_seat = 'party' limit 1;
  select * into v_live from public.store_live_sessions where id = public.party_fila_live_atual(p_is_test);
  if v_product is null or not found then
    return null;
  end if;
  -- Confirmada na hora: o gatilho store_bookings_fila põe na fila.
  insert into public.store_bookings (order_id, user_id, source, product_id, kind, starts_at, ends_at, live_session_id, seats, status, is_test)
  values (null, p_user_id, 'cortesia', v_product, 'live', v_live.starts_at, v_live.ends_at, v_live.id, p_matches, 'confirmado', p_is_test)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  return null;
end;
$$;

-- Aumenta ou diminui as partidas de quem está na fila ou na party. Nunca abaixo de 1 partida por
-- jogar (para tirar alguém, "Tirar da fila") nem acima de 20. Devolve o total novo, ou null.
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
   where id = p_booking_id and queue_state in ('aguardando', 'na_party')
     and seats + p_delta between matches_played + 1 and 20
  returning seats into v_seats;
  return v_seats;
end;
$$;

revoke all on function public.party_fila_adicionar_cortesia(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.party_fila_ajustar_partidas(uuid, integer) from public, anon, authenticated;
grant execute on function public.party_fila_adicionar_cortesia(uuid, integer, boolean) to service_role;
grant execute on function public.party_fila_ajustar_partidas(uuid, integer) to service_role;
