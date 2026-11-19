-- 179_fila_tirar_da_party.sql: o Pedro troca jogadores da party a toda hora (pedido de 19/11/2026:
-- "o ideal seria só remover o jogador ali daquela party... vou ficar substituindo os jogadores o
-- tempo todo"). Tirar da party devolve a pessoa para a fila no mesmo lugar: sem falta, sem gastar
-- a vez do revezamento e sem mexer nas partidas. "Não apareceu" continua para quem faltou.
-- Spec: docs/loja/fila-da-party.md. Teste: scripts/seguranca/fila-da-party.sql.

create or replace function public.party_fila_tirar_da_party(p_booking_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update public.store_bookings
     set queue_state = 'aguardando', called_at = null, updated_at = now()
   where id = p_booking_id and queue_state = 'na_party';
  return found;
end;
$$;

revoke all on function public.party_fila_tirar_da_party(uuid) from public, anon, authenticated;
grant execute on function public.party_fila_tirar_da_party(uuid) to service_role;
