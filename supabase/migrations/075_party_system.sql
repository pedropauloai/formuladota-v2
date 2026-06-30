-- 075 — Sistema de PARTY/grupo (decisão Pedro 2026-06-30: "buscar partidas em
-- grupo, como no Dota"). As tabelas parties/party_members existem desde a 015
-- (Fase B) mas NUNCA foram usadas — esta migration as REVIVE e completa:
--   - 1 party por usuário (índice único) + roles por membro (prefs de fila)
--   - party_invites: convidar amigo pro grupo (espelha lobby_invites/055)
--   - party_messages: chat do grupo (realtime)
--   - RPCs SECURITY DEFINER pra todo o ciclo: criar / aceitar / sair / expulsar /
--     transferir liderança
-- A fila em grupo (mesmo time) vem na migration 076.

-- ===========================================================================
-- 1. Completar parties / party_members
-- ===========================================================================
alter table public.parties
  add column if not exists game_modes text[] not null default array['all_pick']::text[],
  add column if not exists region     text not null default 'brasil',
  add column if not exists updated_at  timestamptz not null default now();

-- Roles preferidas do membro (multi) — lidas pela fila em grupo (076).
alter table public.party_members
  add column if not exists roles jsonb not null default '[]'::jsonb;

-- 1 usuário só pode estar em UMA party. As tabelas estão vazias (código morto
-- até agora), então criar o índice único é seguro.
create unique index if not exists party_members_one_per_user
  on public.party_members (user_id);

-- Máximo 5 membros (um time inteiro). Enforced no RPC de aceite; aqui fica só
-- o índice de leitura por party.
create index if not exists party_members_party_idx
  on public.party_members (party_id);

-- ===========================================================================
-- 2. party_members: policy de UPDATE (membro edita as próprias roles)
-- ===========================================================================
drop policy if exists party_members_update_self on public.party_members;
create policy party_members_update_self on public.party_members
  for update using (user_id = auth.uid());

-- ===========================================================================
-- 3. Convites de party (espelha lobby_invites/055)
-- ===========================================================================
create table if not exists public.party_invites (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references public.parties(id) on delete cascade,
  inviter_id  uuid not null references public.profiles(id) on delete cascade,
  invitee_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (party_id, invitee_id)
);

create index if not exists party_invites_invitee_idx
  on public.party_invites (invitee_id);

alter table public.party_invites enable row level security;

-- Convidado e convidante leem.
drop policy if exists "party invite participants read" on public.party_invites;
create policy "party invite participants read" on public.party_invites
  for select using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Só AMIGO aceito convida (anti-spam), e o convidante tem que estar NA party.
drop policy if exists "friends send party invites" on public.party_invites;
create policy "friends send party invites" on public.party_invites
  for insert with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.party_members pm
      where pm.party_id = party_invites.party_id and pm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = invitee_id)
          or (f.addressee_id = auth.uid() and f.requester_id = invitee_id))
    )
  );

-- Convidado (responder) e convidante (cancelar) deletam.
drop policy if exists "party invite participants delete" on public.party_invites;
create policy "party invite participants delete" on public.party_invites
  for delete using (auth.uid() = invitee_id or auth.uid() = inviter_id);

alter publication supabase_realtime add table public.party_invites;

-- ===========================================================================
-- 4. Chat do grupo
-- ===========================================================================
create table if not exists public.party_messages (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.parties(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists party_messages_party_idx
  on public.party_messages (party_id, created_at);

alter table public.party_messages enable row level security;

-- Membro da party lê e escreve no chat do grupo.
drop policy if exists "party msg members read" on public.party_messages;
create policy "party msg members read" on public.party_messages
  for select using (
    exists (
      select 1 from public.party_members pm
      where pm.party_id = party_messages.party_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "party msg members insert" on public.party_messages;
create policy "party msg members insert" on public.party_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.party_members pm
      where pm.party_id = party_messages.party_id and pm.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.party_messages;
alter publication supabase_realtime add table public.party_members;
alter publication supabase_realtime add table public.parties;

-- ===========================================================================
-- 5. RPCs do ciclo de vida da party (SECURITY DEFINER)
-- ===========================================================================

-- Cria uma party com o chamador como líder (idempotente: se já está numa,
-- devolve a existente). 1 party por usuário (índice único).
create or replace function public.create_party()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_existing uuid;
  v_party   uuid;
begin
  if v_me is null then return null; end if;

  select party_id into v_existing from public.party_members where user_id = v_me;
  if v_existing is not null then return v_existing; end if;

  insert into public.parties (leader_id) values (v_me) returning id into v_party;
  insert into public.party_members (party_id, user_id, roles)
  values (v_party, v_me, '[]'::jsonb);
  return v_party;
end;
$$;

grant execute on function public.create_party() to authenticated;

-- Aceita um convite: valida convidado, checa lotação (<5), sai de qualquer party
-- atual, entra na nova e apaga o convite. Devolve o party_id.
create or replace function public.accept_party_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
  v_count int;
begin
  if v_me is null then return null; end if;

  select party_id into v_party from public.party_invites
  where id = p_invite and invitee_id = v_me;
  if v_party is null then return null; end if;

  -- Party ainda existe?
  if not exists (select 1 from public.parties where id = v_party) then
    delete from public.party_invites where id = p_invite;
    return null;
  end if;

  -- Lotação (máx 5).
  select count(*) into v_count from public.party_members where party_id = v_party;
  if v_count >= 5 then
    delete from public.party_invites where id = p_invite;
    return null;
  end if;

  -- Sai da party atual (se houver) — 1 party por usuário.
  perform public.leave_party();

  insert into public.party_members (party_id, user_id, roles)
  values (v_party, v_me, '[]'::jsonb)
  on conflict (user_id) do update set party_id = excluded.party_id, roles = '[]'::jsonb;

  delete from public.party_invites where id = p_invite;
  update public.parties set updated_at = now() where id = v_party;
  return v_party;
end;
$$;

grant execute on function public.accept_party_invite(uuid) to authenticated;

-- Sai da própria party. Se o líder sai, transfere pra membro mais antigo; se
-- ficar vazia, a party é deletada (cascade limpa convites/mensagens/membros).
create or replace function public.leave_party()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me       uuid := auth.uid();
  v_party    uuid;
  v_leader   uuid;
  v_next     uuid;
begin
  if v_me is null then return; end if;

  select party_id into v_party from public.party_members where user_id = v_me;
  if v_party is null then return; end if;

  delete from public.party_members where party_id = v_party and user_id = v_me;

  select leader_id into v_leader from public.parties where id = v_party;

  -- Quem sobrou?
  select user_id into v_next from public.party_members
  where party_id = v_party order by joined_at asc limit 1;

  if v_next is null then
    -- Vazia → deleta a party (cascade).
    delete from public.parties where id = v_party;
  elsif v_leader = v_me then
    -- Líder saiu → transfere pro mais antigo.
    update public.parties set leader_id = v_next, updated_at = now() where id = v_party;
  else
    update public.parties set updated_at = now() where id = v_party;
  end if;
end;
$$;

grant execute on function public.leave_party() to authenticated;

-- Expulsa um membro (só o líder). Não deixa expulsar a si mesmo (use leave_party).
create or replace function public.kick_party_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
begin
  if v_me is null or p_user is null or p_user = v_me then return; end if;

  select id into v_party from public.parties where leader_id = v_me;
  if v_party is null then return; end if; -- não é líder de nada

  delete from public.party_members where party_id = v_party and user_id = p_user;
  -- Tira o expulso de qualquer fila em grupo desta party.
  update public.match_queue set status = 'cancelled'
    where user_id = p_user and party_id = v_party and status = 'waiting';
  update public.parties set updated_at = now() where id = v_party;
end;
$$;

grant execute on function public.kick_party_member(uuid) to authenticated;

-- Transfere a liderança (só o líder atual, pro um membro da party).
create or replace function public.transfer_party_leader(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
begin
  if v_me is null or p_user is null then return; end if;

  select id into v_party from public.parties where leader_id = v_me;
  if v_party is null then return; end if;

  if not exists (
    select 1 from public.party_members where party_id = v_party and user_id = p_user
  ) then
    return;
  end if;

  update public.parties set leader_id = p_user, updated_at = now() where id = v_party;
end;
$$;

grant execute on function public.transfer_party_leader(uuid) to authenticated;

-- ===========================================================================
-- 6. RPC: snapshot da minha party (membros + identidade + roles + se está na fila)
-- ===========================================================================
create or replace function public.my_party()
returns table (
  party_id    uuid,
  leader_id   uuid,
  game_modes  jsonb,
  member_id   uuid,
  name        text,
  avatar      text,
  level       int,
  roles       jsonb,
  joined_at   timestamptz,
  in_queue    boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id                                              as party_id,
    p.leader_id,
    to_jsonb(p.game_modes)                            as game_modes,
    pm.user_id                                        as member_id,
    coalesce(sl.persona, pr.username, 'Jogador')      as name,
    coalesce(sl.avatar_url, pr.avatar_url)            as avatar,
    coalesce(ul.current_level, 1)                     as level,
    coalesce(pm.roles, '[]'::jsonb)                   as roles,
    pm.joined_at,
    exists (
      select 1 from public.match_queue mq
      where mq.user_id = pm.user_id and mq.party_id = p.id and mq.status = 'waiting'
    )                                                 as in_queue
  from public.parties p
  join public.party_members pm on pm.party_id = p.id
  left join steam_links sl on sl.user_id = pm.user_id
  left join profiles    pr on pr.id = pm.user_id
  left join user_levels ul on ul.user_id = pm.user_id
  where auth.uid() is not null
    and p.id = (select party_id from public.party_members where user_id = auth.uid())
  order by pm.joined_at asc;
$$;

grant execute on function public.my_party() to authenticated;
