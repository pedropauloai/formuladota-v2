-- 093_is_in_active_match.sql — fonte ÚNICA de verdade pra "o jogador está em
-- partida?". Mesma definição do getQueueStatus (server action): existe uma entry
-- match_queue 'matched' cujo lobby está open/in_progress. Quando o lobby encerra
-- (completed/discarded/cancelled), solta o jogador — nunca trava pra sempre.
--
-- Usada pra BLOQUEAR nova entrada na fila (enterQueue/enterPartyQueue). A trava real
-- vive no servidor; o botão "Voltar à partida" na UI é só o espelho disso.
create or replace function public.is_in_active_match(p_user uuid)
returns boolean
language sql
security definer
set search_path to 'public'
stable
as $function$
  select exists (
    select 1
    from match_queue mq
    join lobbies l on l.id = mq.matched_lobby_id
    where mq.user_id = p_user
      and mq.status = 'matched'
      and l.status in ('open', 'in_progress')
  );
$function$;

grant execute on function public.is_in_active_match(uuid) to authenticated;
