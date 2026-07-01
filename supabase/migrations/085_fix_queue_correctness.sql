-- 085_fix_queue_correctness.sql — Correções de corretude da fila/matchmaking (auditoria).
--
-- Bug da "busca presa" (o X não cancelava e a busca ressuscitava com contador
-- acumulado): a cadeia era leave_party_queue só cancelar entries com party_id +
-- accept_party_invite não cancelar a fila solo do aceitante → entry solo órfã que
-- o client ressuscitava e re-alimentava o heartbeat (imune ao cron anti-fantasma).
-- Além disso: try_form_match perdeu o lock (double-match) e confirm_match_proposal
-- ressuscitava entry cancelada (redirect pra partida da qual o user saiu).

-- === 1. leave_party_queue: cancela minha entry (solo OU party) + a party toda ====
create or replace function public.leave_party_queue()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
begin
  if v_me is null then return; end if;
  select party_id into v_party from public.party_members where user_id = v_me;
  -- Cancela SEMPRE a minha entry (mesmo solo/party_id null) e, se estou em party,
  -- todas as entries daquela party (unidade indivisível). Fecha a entry órfã que
  -- causava a "busca presa".
  update public.match_queue
    set status = 'cancelled'
  where status = 'waiting'
    and (user_id = v_me or (v_party is not null and party_id = v_party));
end;
$function$;

-- === 2. accept_party_invite: cancela a busca solo do aceitante na origem ==========
create or replace function public.accept_party_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
  v_count int;
begin
  if v_me is null then return null; end if;
  select party_id into v_party from public.party_invites
  where id = p_invite and invitee_id = v_me;
  if v_party is null then return null; end if;
  if not exists (select 1 from public.parties where id = v_party) then
    delete from public.party_invites where id = p_invite;
    return null;
  end if;
  select count(*) into v_count from public.party_members where party_id = v_party;
  if v_count >= 5 then
    delete from public.party_invites where id = p_invite;
    return null;
  end if;
  -- Entrar num grupo durante uma busca SOLO deixaria a entry solo órfã (o X do
  -- grupo só cancela entries da party). Cancela a busca solo aqui, na origem.
  update public.match_queue set status = 'cancelled'
  where user_id = v_me and status = 'waiting' and party_id is null;
  perform public.leave_party();
  insert into public.party_members (party_id, user_id, roles)
  values (v_party, v_me, '[]'::jsonb)
  on conflict (user_id) do update set party_id = excluded.party_id, roles = '[]'::jsonb;
  delete from public.party_invites where id = p_invite;
  update public.parties set updated_at = now() where id = v_party;
  return v_party;
end;
$function$;

-- === 3. confirm_match_proposal: não ressuscitar entry cancelada ===================
create or replace function public.confirm_match_proposal(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_prop record; v_lobby uuid; v_creator uuid; a jsonb;
  v_roles text[] := array['safelane','midlane','offlane','support','support_dedicated'];
begin
  select * into v_prop from match_proposals where id = p_id and status = 'pending' for update;
  if not found then return null; end if;
  v_creator := ((v_prop.assignments->0)->>'user_id')::uuid;
  insert into lobbies (name, password, game_mode, status, tier, created_by, max_players)
  values ('FORMULADOTA ' || upper(substr(md5(random()::text), 1, 4)),
    v_prop.password, v_prop.game_mode, 'open', v_prop.tier, v_creator,
    case when v_prop.match_size in (2,4,6,10) then v_prop.match_size else 10 end)
  returning id into v_lobby;
  for a in select jsonb_array_elements(v_prop.assignments) loop
    insert into lobby_players (lobby_id, user_id, team, role, slot)
    values (v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role',
      coalesce(array_position(v_roles, a->>'role') - 1, 0))
    on conflict (lobby_id, user_id) do nothing;
  end loop;
  -- só marca 'matched' quem AINDA está 'waiting' (quem cancelou no meio não é
  -- ressuscitado nem redirecionado pra uma partida da qual saiu).
  update match_queue set status='matched', matched_at=now(), matched_lobby_id=v_lobby
    where proposal_id = p_id and status = 'waiting';
  update match_proposals set status='confirmed', lobby_id=v_lobby where id = p_id;
  return v_lobby;
end; $function$;

-- === 4. try_form_match: serializa a formação (lock) — evita double-match ==========
create or replace function public.try_form_match(p_match_size integer DEFAULT 10)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mode      text;
  v_team_size int;
  v_unit      record;
  v_a_count   int := 0;
  v_b_count   int := 0;
  v_team_a    jsonb := '[]'::jsonb;
  v_team_b    jsonb := '[]'::jsonb;
  v_ids       uuid[] := '{}';
  v_assigned  jsonb := '[]'::jsonb;
  v_enriched  jsonb;
  v_prop      uuid;
  v_all       boolean;
  v_roles     text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  m           jsonb;
begin
  if p_match_size < 2 then return null; end if;
  -- Serializa a formação de partida: sem isto, dois enterQueue simultâneos criavam
  -- 2 propostas com os mesmos 10 jogadores (double-match). Lock por transação.
  perform pg_advisory_xact_lock(hashtext('try_form_match'));
  v_team_size := (p_match_size / 2)::int;

  select gm into v_mode
  from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  for v_unit in
    select
      count(*)::int as usize,
      jsonb_agg(
        jsonb_build_object('entry_id', mq.id, 'user_id', mq.user_id,
                           'roles', coalesce(mq.roles, '[]'::jsonb))
        order by mq.joined_at
      ) as members,
      min(mq.joined_at) as joined
    from match_queue mq
    where mq.status = 'waiting'
      and mq.proposal_id is null
      and mq.last_heartbeat > now() - interval '45 seconds'
      and v_mode = any(mq.game_modes)
    group by coalesce(mq.party_id::text, mq.id::text)
    order by usize desc, joined asc
  loop
    exit when v_a_count = v_team_size and v_b_count = v_team_size;
    if v_unit.usize > v_team_size then
      continue;
    end if;
    if v_a_count + v_unit.usize <= v_team_size then
      v_team_a := v_team_a || v_unit.members;
      v_a_count := v_a_count + v_unit.usize;
    elsif v_b_count + v_unit.usize <= v_team_size then
      v_team_b := v_team_b || v_unit.members;
      v_b_count := v_b_count + v_unit.usize;
    end if;
  end loop;

  if v_a_count < v_team_size or v_b_count < v_team_size then
    return null;
  end if;

  v_assigned := public._assign_team_roles(v_team_a, 'radiant', v_roles)
             || public._assign_team_roles(v_team_b, 'dire',    v_roles);

  for m in select value from jsonb_array_elements(v_assigned) loop
    v_ids := array_append(v_ids, (m->>'entry_id')::uuid);
  end loop;

  select jsonb_agg(
    jsonb_build_object(
      'user_id',  a->>'user_id',
      'team',     a->>'team',
      'role',     a->>'role',
      'name',     coalesce(sl.persona, p.username, 'Jogador'),
      'avatar',   coalesce(sl.avatar_url, p.avatar_url),
      'is_test',  coalesce(p.is_tester, false),
      'accepted', coalesce(p.is_tester, false)
    )
  ) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles    p  on p.id = (a->>'user_id')::uuid;

  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at)
  values (
    v_mode, 'livre', upper(substr(md5(random()::text), 1, 6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds'
  )
  returning id into v_prop;

  update match_queue set proposal_id = v_prop where id = any(v_ids);

  v_all := not exists (
    select 1 from jsonb_array_elements(v_enriched) e where (e->>'accepted')::boolean is not true
  );
  if v_all then
    return confirm_match_proposal(v_prop);
  end if;
  return null;
end;
$function$;
