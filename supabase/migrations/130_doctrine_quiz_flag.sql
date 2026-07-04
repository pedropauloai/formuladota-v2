-- 130_doctrine_quiz_flag.sql — Quiz de doutrina atrás de feature flag — Pedro 2026-07-04.
--
-- Pedro quer DESATIVAR o quiz por enquanto e transformá-lo em feature flag. Com a
-- flag `doctrine_quiz` OFF (default): o matchmaking fica ABERTO (sem gate de
-- doutrina/permissão) e a rota /doutrina some. Com ON: volta o comportamento da
-- migration 124 (buscar exige doutrina OU permissão; consumo na formação).
--
-- O gate vive em RLS (fila solo) + funções SECURITY DEFINER (fila grupo/consumo),
-- então cada um passa a consultar quiz_enabled().

-- Flag (default false = quiz desligado agora).
insert into public.feature_flags (key, enabled, label)
values ('doctrine_quiz', false, 'Quiz de doutrina (gate de matchmaking)')
on conflict (key) do nothing;

-- Helper: quiz ligado? (default false quando a linha não existe).
create or replace function public.quiz_enabled()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select enabled from feature_flags where key = 'doctrine_quiz'), false);
$$;
grant execute on function public.quiz_enabled() to authenticated, anon;

-- =====================================================================
-- 1. Fila SOLO: gate só quando o quiz está ligado.
-- =====================================================================
drop policy if exists "queue_insert_self" on public.match_queue;
create policy "queue_insert_self" on public.match_queue
  for insert with check (
    auth.uid() = user_id
    and (
      not public.quiz_enabled()   -- quiz OFF → fila aberta
      or public.has_accepted_doctrine(auth.uid())
      or public.available_match_permissions(auth.uid()) >= 1
      or coalesce((select p.is_tester from public.profiles p where p.id = auth.uid()), false)
    )
  );

-- =====================================================================
-- 2. Fila em GRUPO: gate de doutrina só quando o quiz está ligado.
--    (base = migration 125, com o bloco de gate condicionado a quiz_enabled.)
-- =====================================================================
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
  v_regions int;
  v_modes   text[];
  v_default jsonb := '["safelane","midlane","offlane","support","support_dedicated"]'::jsonb;
  v_cool    record;
  v_gate    record;
  v_member  record;
  v_lobby   uuid;
  v_roles   jsonb;
  v_spread  int;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'unauth');
  end if;

  select id into v_party from public.parties where leader_id = v_me;
  if v_party is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;

  -- GATE DE DOUTRINA/PERMISSÃO — só com o quiz LIGADO.
  if public.quiz_enabled() then
    select pm.user_id, coalesce(sl.persona, pr.username, 'Um membro') as nome
      into v_gate
    from public.party_members pm
    join public.profiles pr on pr.id = pm.user_id
    left join steam_links sl on sl.user_id = pm.user_id
    where pm.party_id = v_party
      and not public.has_accepted_doctrine(pm.user_id)
      and public.available_match_permissions(pm.user_id) < 1
      and not coalesce(pr.is_tester, false)
    limit 1;
    if v_gate.user_id is not null then
      return jsonb_build_object('ok', false, 'error', 'need_permission',
                                'who', v_gate.nome, 'who_id', v_gate.user_id);
    end if;
  end if;

  select count(distinct p.region), min(p.region)
    into v_regions, v_region
  from public.party_members pm
  join public.profiles p on p.id = pm.user_id
  where pm.party_id = v_party;
  if v_regions > 1 then
    return jsonb_build_object('ok', false, 'error', 'region_mismatch');
  end if;

  v_modes := case when array_length(p_game_modes, 1) is null
                  then array['all_pick']::text[] else p_game_modes end;

  select (max(public.queue_mmr_for(pm.user_id)) - min(public.queue_mmr_for(pm.user_id)))::int
    into v_spread
  from public.party_members pm
  where pm.party_id = v_party;
  if coalesce(v_spread, 0) > 2800 then
    return jsonb_build_object('ok', false, 'error', 'mmr_spread', 'spread', v_spread);
  end if;

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
       coalesce(v_region, 'BR'), 'waiting', now());
  end loop;

  update public.parties
     set game_modes = v_modes, region = coalesce(v_region, 'BR'), updated_at = now()
   where id = v_party;

  v_lobby := public.try_form_match(10);

  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$$;
grant execute on function public.enter_party_queue(text[]) to authenticated;

-- =====================================================================
-- 3. confirm_match_proposal: consumo de permissão só com o quiz LIGADO.
--    (base = migration 127 — assignments com dados de medalha — + guard.)
-- =====================================================================
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
  insert into lobbies (name, password, game_mode, status, tier, created_by, max_players, region)
  values ('FORMULADOTA ' || upper(substr(md5(random()::text), 1, 4)),
    v_prop.password, v_prop.game_mode, 'open', v_prop.tier, v_creator,
    case when v_prop.match_size in (2,4,6,10) then v_prop.match_size else 10 end,
    coalesce(v_prop.region, 'BR'))
  returning id into v_lobby;
  for a in select jsonb_array_elements(v_prop.assignments) loop
    insert into lobby_players (lobby_id, user_id, team, role, slot)
    values (v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role',
      coalesce(array_position(v_roles, a->>'role') - 1, 0))
    on conflict (lobby_id, user_id) do nothing;
  end loop;
  update match_queue set status='matched', matched_at=now(), matched_lobby_id=v_lobby
    where proposal_id = p_id and status = 'waiting';

  -- Consome permissão só com o quiz LIGADO (senão não há gate a cobrar).
  if public.quiz_enabled() then
    update public.profiles p
       set match_permissions_consumed = match_permissions_consumed + 1
     where p.id in (
         select (elem->>'user_id')::uuid
         from jsonb_array_elements(v_prop.assignments) elem
       )
       and not public.has_accepted_doctrine(p.id)
       and not coalesce(p.is_tester, false);
  end if;

  update match_proposals set status='confirmed', lobby_id=v_lobby where id = p_id;
  return v_lobby;
end; $function$;
