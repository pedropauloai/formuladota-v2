-- 078 — Redesenho fiel ao cliente Dota 2 (Pedro 2026-06-30):
--   1. lobby_messages: canal de chat da SALA (o chat tem abas Grupo + Sala + DMs).
--   2. enter_party_queue: QUALQUER membro inicia a busca do grupo (antes só o líder)
--      — "quando alguém do grupo coloca pra buscar, todos buscam".
--   3. party_invites_detailed: o popup central de convite mostra quem chamou E os
--      membros que já estão no grupo (RLS bloqueia a party pra quem não é membro,
--      então o preview vem por RPC SECURITY DEFINER).

-- ===========================================================================
-- 1. Chat da SALA (lobby_messages)
-- ===========================================================================
create table if not exists public.lobby_messages (
  id         uuid primary key default gen_random_uuid(),
  lobby_id   uuid not null references public.lobbies(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lobby_messages_lobby_idx
  on public.lobby_messages (lobby_id, created_at);

alter table public.lobby_messages enable row level security;

-- Só quem está na sala (lobby_players) lê/escreve no canal dela.
drop policy if exists "lobby msg members read" on public.lobby_messages;
create policy "lobby msg members read" on public.lobby_messages
  for select using (
    exists (
      select 1 from public.lobby_players lp
      where lp.lobby_id = lobby_messages.lobby_id and lp.user_id = auth.uid()
    )
  );

drop policy if exists "lobby msg members insert" on public.lobby_messages;
create policy "lobby msg members insert" on public.lobby_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.lobby_players lp
      where lp.lobby_id = lobby_messages.lobby_id and lp.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.lobby_messages;

-- ===========================================================================
-- 2. enter_party_queue — qualquer MEMBRO inicia (não só o líder)
-- ===========================================================================
create or replace function public.enter_party_queue(p_game_modes text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_party   uuid;
  v_region  text;
  v_modes   text[];
  v_default jsonb := '["safelane","midlane","offlane","support","support_dedicated"]'::jsonb;
  v_cool    record;
  v_member  record;
  v_lobby   uuid;
  v_roles   jsonb;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'unauth');
  end if;

  -- Party da qual EU sou membro (qualquer membro pode iniciar a busca do grupo).
  select p.id, p.region into v_party, v_region
  from public.parties p
  join public.party_members pm on pm.party_id = p.id
  where pm.user_id = v_me;
  if v_party is null then
    return jsonb_build_object('ok', false, 'error', 'no_party');
  end if;

  v_modes := case when array_length(p_game_modes, 1) is null
                  then array['all_pick']::text[] else p_game_modes end;

  select coalesce(sl.persona, pr.username, 'Um membro') as nome
    into v_cool
  from public.party_members pm
  join public.profiles pr on pr.id = pm.user_id
  left join steam_links sl on sl.user_id = pm.user_id
  where pm.party_id = v_party
    and pr.match_cooldown_until is not null
    and pr.match_cooldown_until > now()
  limit 1;
  if v_cool.nome is not null then
    return jsonb_build_object('ok', false, 'error', 'cooldown', 'who', v_cool.nome);
  end if;

  update public.match_queue mq
    set status = 'cancelled'
  where mq.status = 'waiting'
    and mq.user_id in (select user_id from public.party_members where party_id = v_party);

  for v_member in
    select user_id, roles from public.party_members where party_id = v_party
  loop
    v_roles := case when jsonb_array_length(coalesce(v_member.roles, '[]'::jsonb)) > 0
                    then v_member.roles else v_default end;
    insert into public.match_queue
      (user_id, party_id, roles, game_mode, game_modes, region, status, last_heartbeat)
    values
      (v_member.user_id, v_party, v_roles, v_modes[1], v_modes,
       coalesce(v_region, 'brasil'), 'waiting', now());
  end loop;

  update public.parties set game_modes = v_modes, updated_at = now() where id = v_party;

  v_lobby := public.try_form_match(10);
  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$$;
grant execute on function public.enter_party_queue(text[]) to authenticated;

-- ===========================================================================
-- 3. party_invites_detailed — convites recebidos com preview do grupo
-- ===========================================================================
create or replace function public.party_invites_detailed()
returns table (
  invite_id      uuid,
  party_id       uuid,
  inviter_id     uuid,
  inviter_name   text,
  inviter_avatar text,
  members        jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    pi.id,
    pi.party_id,
    pi.inviter_id,
    coalesce(isl.persona, ipr.username, 'Jogador')  as inviter_name,
    coalesce(isl.avatar_url, ipr.avatar_url)         as inviter_avatar,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', pm.user_id,
               'name',    coalesce(msl.persona, mpr.username, 'Jogador'),
               'avatar',  coalesce(msl.avatar_url, mpr.avatar_url)
             ) order by pm.joined_at)
      from public.party_members pm
      left join steam_links msl on msl.user_id = pm.user_id
      left join profiles    mpr on mpr.id = pm.user_id
      where pm.party_id = pi.party_id
    ), '[]'::jsonb)                                  as members
  from public.party_invites pi
  left join steam_links isl on isl.user_id = pi.inviter_id
  left join profiles    ipr on ipr.id = pi.inviter_id
  where pi.invitee_id = auth.uid()
    and auth.uid() is not null
  order by pi.created_at desc;
$$;
grant execute on function public.party_invites_detailed() to authenticated;
