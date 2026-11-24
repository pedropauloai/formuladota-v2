-- 201: mandar mensagem no chat da sala (e do canal de texto) com o ritmo conferido no próprio banco: uma a
-- cada 2 s por pessoa e sala. A comparação usa o relógio do banco dos dois lados (o servidor do site e o
-- banco podem estar com o relógio alguns segundos diferente, visto no e2e em 24/11/2026) e dois pedidos
-- colados da mesma pessoa esperam um pelo outro, então não passam juntos. Devolve o id da mensagem, ou
-- nulo quando foi cedo demais. O resto da regra (presença, chat fechado, tamanho) segue no servidor.
create or replace function public.voice_chat_send(p_room uuid, p_user uuid, p_body text)
returns bigint
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_room::text || ':' || p_user::text, 0));
  if exists (select 1 from public.voice_room_messages m
              where m.room_id = p_room and m.user_id = p_user and m.created_at > clock_timestamp() - interval '2 seconds') then
    return null;
  end if;
  insert into public.voice_room_messages (room_id, user_id, body, created_at)
  values (p_room, p_user, p_body, clock_timestamp())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.voice_chat_send(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.voice_chat_send(uuid, uuid, text) to service_role;
