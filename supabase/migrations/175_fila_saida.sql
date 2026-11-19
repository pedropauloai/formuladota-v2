-- 175_fila_saida.sql: quem comprou sai da fila sozinho, enquanto espera (19/11/2026), e toda saída
-- guarda o motivo: "saiu" (a pessoa), "tirado" (o Pedro) ou "cancelado" (pedido cancelado ou
-- reembolsado). Quem saiu recebe de volta o valor das partidas que não jogou (o Pedro devolve no
-- Mercado Pago, avisado no canal de vendas). Spec: docs/loja/fila-da-party.md.

alter table public.store_bookings add column if not exists queue_exit text;
alter table public.store_bookings drop constraint if exists store_bookings_queue_exit_check;
alter table public.store_bookings add constraint store_bookings_queue_exit_check
  check (queue_exit is null or queue_exit in ('saiu', 'tirado', 'cancelado'));

-- Pagamento confirmado entra na fila; cancelamento e reembolso tiram, com o motivo.
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
    new.queue_exit := 'cancelado';
    new.finished_at := now();
  end if;
  return new;
end;
$$;

-- Tirar da fila (o Pedro): sai sem jogar; reembolso, quando houver, é à parte.
create or replace function public.party_fila_remover(p_booking_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings
     set queue_state = 'removido', queue_exit = 'tirado', finished_at = now(), updated_at = now()
   where id = p_booking_id and queue_state in ('aguardando', 'na_party');
  return found;
end;
$$;

-- Sair da fila (a própria pessoa): só a dona da vaga e só enquanto espera. Quem já está na party
-- joga ou o Pedro marca que não apareceu. O servidor confere o login e passa o id de quem pediu.
create or replace function public.party_fila_sair(p_booking_id uuid, p_user_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings b
     set queue_state = 'removido', queue_exit = 'saiu', finished_at = now(), updated_at = now()
    from public.store_orders o
   where b.id = p_booking_id and o.id = b.order_id and o.user_id = p_user_id and b.queue_state = 'aguardando';
  return found;
end;
$$;

revoke all on function public.party_fila_sair(uuid, uuid) from public, anon, authenticated;
grant execute on function public.party_fila_sair(uuid, uuid) to service_role;
