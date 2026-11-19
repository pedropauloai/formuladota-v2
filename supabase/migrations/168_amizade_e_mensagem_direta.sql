-- 168: amizade só com o aceite do outro, bloqueio com dono e mensagem direta só entre amigos (18/11/2026).
-- O site já seguia essas regras, mas a chamada direta à API passava por cima: dava para criar a
-- amizade já aceita, aceitar o próprio pedido, desfazer um bloqueio sofrido e seguir mandando
-- mensagem direta para quem desfez a amizade ou bloqueou.

-- Quem bloqueou: só ele desfaz o bloqueio.
alter table public.friendships
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null;

create or replace function public.friendships_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  -- Serviço (sem usuário) e admin seguem livres.
  if v_me is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'blocked' then
      new.blocked_by := v_me;
    elsif new.status = 'pending' then
      new.blocked_by := null;
    else
      raise exception 'Pedido de amizade começa pendente.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'O par da amizade não muda.' using errcode = '42501';
  end if;

  if old.status = 'blocked' then
    if new.status = 'blocked' then
      new.blocked_by := old.blocked_by;
      return new;
    end if;
    if old.blocked_by is distinct from v_me then
      raise exception 'Só quem bloqueou desfaz o bloqueio.' using errcode = '42501';
    end if;
  end if;

  if new.status = 'blocked' then
    new.blocked_by := v_me;
    return new;
  end if;

  if new.status is distinct from old.status then
    -- Fora o bloqueio, a única mudança é a resposta de quem recebeu o pedido.
    if not (old.status = 'pending' and new.status in ('accepted', 'rejected') and v_me = old.addressee_id) then
      raise exception 'Só quem recebeu o pedido responde a ele.' using errcode = '42501';
    end if;
  end if;

  new.blocked_by := null;
  return new;
end;
$$;

drop trigger if exists friendships_guard_trigger on public.friendships;
create trigger friendships_guard_trigger
  before insert or update on public.friendships
  for each row execute function public.friendships_guard();

-- Quem foi bloqueado não apaga o bloqueio (apagar a linha o desfaria).
alter policy "Participants delete friendship" on public.friendships
  using (
    ((requester_id = (select auth.uid())) or (addressee_id = (select auth.uid())))
    and (status <> 'blocked' or blocked_by = (select auth.uid()))
  );

-- Mensagem direta só entre amigos aceitos: abrir a conversa já exigia isso, mandar não.
alter policy "dm msg member insert" on public.dm_messages
  with check (
    (sender_id = (select auth.uid()))
    and exists (
      select 1
      from public.dm_conversations c
      join public.friendships f
        on least(f.requester_id, f.addressee_id) = c.user_a
       and greatest(f.requester_id, f.addressee_id) = c.user_b
      where c.id = dm_messages.conversation_id
        and ((c.user_a = (select auth.uid())) or (c.user_b = (select auth.uid())))
        and f.status = 'accepted'
    )
  );

-- A lista de conversas só mostra quem ainda é amigo: bloqueio ou amizade desfeita tiram a conversa
-- da lista dos dois lados (o histórico fica guardado e volta se a amizade voltar).
create or replace function public.dm_inbox()
returns table(conversation_id uuid, other_user_id uuid, last_message_at timestamp with time zone, last_preview text, last_sender_id uuid, unread_count integer)
language sql
security definer
set search_path to 'public'
as $function$
  select
    c.id,
    case when c.user_a = auth.uid() then c.user_b else c.user_a end as other_user_id,
    c.last_message_at,
    c.last_message_preview,
    c.last_sender_id,
    coalesce((
      select count(*)::int from public.dm_messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select r.last_read_at from public.dm_reads r
           where r.conversation_id = c.id and r.user_id = auth.uid()),
          'epoch'::timestamptz
        )
    ), 0) as unread_count
  from public.dm_conversations c
  where (c.user_a = auth.uid() or c.user_b = auth.uid())
    and c.last_message_at is not null
    and auth.uid() is not null
    and exists (
      select 1 from public.friendships f
      where least(f.requester_id, f.addressee_id) = c.user_a
        and greatest(f.requester_id, f.addressee_id) = c.user_b
        and f.status = 'accepted'
    )
  order by c.last_message_at desc;
$function$;

-- "Visto há" e recado dos amigos: a regra de profiles esconde as linhas dos outros, e a lista de
-- amigos mostrava traço para todo amigo offline (menos para o admin).
create or replace function public.my_friends_presence()
returns table(user_id uuid, last_seen_at timestamp with time zone, status_message text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.last_seen_at, p.status_message
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
  where ((f.requester_id = (select auth.uid())) or (f.addressee_id = (select auth.uid())))
    and f.status in ('accepted', 'pending');
$$;

revoke all on function public.my_friends_presence() from public, anon;
grant execute on function public.my_friends_presence() to authenticated;
