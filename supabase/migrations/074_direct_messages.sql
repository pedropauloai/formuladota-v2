-- 074 — Mensagens diretas (DM) entre amigos. Chat 1-1 persistente, com histórico
-- (decisão Pedro 2026-06-30: "DM + chat de grupo"). Pareamento canônico
-- (user_a < user_b) garante 1 conversa por par, como friendships (035).
--
-- Arquitetura (espelha o padrão do projeto):
--   - dm_conversations: 1 linha por par. Guarda preview + timestamp do último →
--     a caixa de entrada não varre dm_messages.
--   - dm_messages: as mensagens. Vai pra publication realtime → push instantâneo
--     (RLS do stream usa a MESMA policy de select → só os 2 do par recebem).
--   - dm_reads: last_read_at por (conversa, user) → não-lidas = msgs depois disso.
-- RLS é a autoridade. Criar conversa = RPC SECURITY DEFINER (exige amizade aceita).
-- Mandar mensagem = INSERT direto (RLS checa que você é membro da conversa).

-- ===========================================================================
-- 1. Conversas (par canônico user_a < user_b)
-- ===========================================================================
create table if not exists public.dm_conversations (
  id                   uuid primary key default gen_random_uuid(),
  user_a               uuid not null references public.profiles(id) on delete cascade,
  user_b               uuid not null references public.profiles(id) on delete cascade,
  last_message_at      timestamptz,
  last_message_preview text,
  last_sender_id       uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  constraint dm_no_self     check (user_a <> user_b),
  constraint dm_pair_order  check (user_a < user_b),
  constraint dm_pair_unique unique (user_a, user_b)
);

-- Inbox: "minhas conversas ordenadas por recência" — um lado por índice.
create index if not exists dm_conv_user_a_idx
  on public.dm_conversations (user_a, last_message_at desc nulls last);
create index if not exists dm_conv_user_b_idx
  on public.dm_conversations (user_b, last_message_at desc nulls last);

-- ===========================================================================
-- 2. Mensagens
-- ===========================================================================
create table if not exists public.dm_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);

create index if not exists dm_messages_conv_idx
  on public.dm_messages (conversation_id, created_at);

-- ===========================================================================
-- 3. Estado de leitura por (conversa, user)
-- ===========================================================================
create table if not exists public.dm_reads (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ===========================================================================
-- 4. RLS
-- ===========================================================================
alter table public.dm_conversations enable row level security;
alter table public.dm_messages      enable row level security;
alter table public.dm_reads         enable row level security;

-- Conversa: os 2 participantes leem. Escrita só via RPC (SECURITY DEFINER).
drop policy if exists "dm conv participants read" on public.dm_conversations;
create policy "dm conv participants read" on public.dm_conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- Mensagem: membro da conversa lê. Sem recursão (a policy de conversa não cita msgs).
drop policy if exists "dm msg members read" on public.dm_messages;
create policy "dm msg members read" on public.dm_messages
  for select using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = dm_messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Mensagem: só EU mando, e só numa conversa em que sou membro.
drop policy if exists "dm msg member insert" on public.dm_messages;
create policy "dm msg member insert" on public.dm_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.dm_conversations c
      where c.id = dm_messages.conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Estado de leitura: cada um lê/grava o PRÓPRIO marcador.
drop policy if exists "dm reads own select" on public.dm_reads;
create policy "dm reads own select" on public.dm_reads
  for select using (user_id = auth.uid());
drop policy if exists "dm reads own insert" on public.dm_reads;
create policy "dm reads own insert" on public.dm_reads
  for insert with check (user_id = auth.uid());
drop policy if exists "dm reads own update" on public.dm_reads;
create policy "dm reads own update" on public.dm_reads
  for update using (user_id = auth.uid());

-- ===========================================================================
-- 5. Trigger: mantém o preview da conversa fresco a cada mensagem
-- ===========================================================================
create or replace function public.dm_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_conversations
    set last_message_at      = new.created_at,
        last_message_preview = left(new.body, 120),
        last_sender_id       = new.sender_id
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_touch on public.dm_messages;
create trigger dm_messages_touch
  after insert on public.dm_messages
  for each row execute function public.dm_touch_conversation();

-- ===========================================================================
-- 6. RPC: pega/cria a conversa com um amigo (exige amizade ACEITA)
-- ===========================================================================
create or replace function public.dm_get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := auth.uid();
  v_a   uuid;
  v_b   uuid;
  v_id  uuid;
begin
  if v_me is null or p_other is null or v_me = p_other then
    return null;
  end if;

  -- Anti-spam: só conversa com AMIGO aceito (mesma regra de lobby_invites/055).
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = v_me and f.addressee_id = p_other)
        or (f.addressee_id = v_me and f.requester_id = p_other))
  ) then
    return null;
  end if;

  v_a := least(v_me, p_other);
  v_b := greatest(v_me, p_other);

  insert into public.dm_conversations (user_a, user_b)
  values (v_a, v_b)
  on conflict (user_a, user_b) do nothing;

  select id into v_id from public.dm_conversations where user_a = v_a and user_b = v_b;
  return v_id;
end;
$$;

grant execute on function public.dm_get_or_create_conversation(uuid) to authenticated;

-- ===========================================================================
-- 7. RPC: caixa de entrada (conversas + não-lidas) numa chamada
-- ===========================================================================
create or replace function public.dm_inbox()
returns table (
  conversation_id uuid,
  other_user_id   uuid,
  last_message_at timestamptz,
  last_preview    text,
  last_sender_id  uuid,
  unread_count    int
)
language sql
security definer
set search_path = public
as $$
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
  order by c.last_message_at desc;
$$;

grant execute on function public.dm_inbox() to authenticated;

-- ===========================================================================
-- 8. Realtime: novas mensagens fazem push pros 2 lados
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;
