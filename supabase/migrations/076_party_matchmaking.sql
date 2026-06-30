-- 076 — Matchmaking em GRUPO (decisão Pedro 2026-06-30: grupo junto, MESMO time,
-- como no Dota). Dois pedaços:
--   1. enter_party_queue: o líder coloca a party inteira na fila de uma vez
--      (1 linha em match_queue por membro, com o party_id compartilhado).
--   2. try_form_match REESCRITO: trata cada party como uma UNIDADE indivisível e
--      encaixa as unidades em 2 times de 5 (bin-packing guloso, grupos grandes
--      primeiro). Solo continua idêntico (cada solo = unidade de tamanho 1).
--
-- Backward-compatible: 10 solos → 5 em cada time, exatamente como antes (só que
-- a distribuição de roles agora é POR TIME, o que é igual ou melhor).

-- ===========================================================================
-- 1. Helper: distribui as 5 roles dentro de UM time
--    (pref do jogador primeiro; quem tem menos prefs escolhe antes; preenche o resto)
-- ===========================================================================
create or replace function public._assign_team_roles(
  p_members jsonb,   -- [{entry_id, user_id, roles}]
  p_team    text,    -- 'radiant' | 'dire'
  p_roles   text[]   -- ordem canônica das 5 funções
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_taken text[] := '{}';
  v_out   jsonb  := '[]'::jsonb;
  m       jsonb;
  v_prefs text[];
  v_role  text;
  r       text;
begin
  -- Mais restritos (menos prefs) escolhem primeiro.
  for m in
    select value from jsonb_array_elements(p_members)
    order by jsonb_array_length(coalesce(value->'roles', '[]'::jsonb)) asc
  loop
    v_prefs := array(select jsonb_array_elements_text(coalesce(m->'roles', '[]'::jsonb)));
    v_role := null;
    foreach r in array v_prefs loop
      if not (r = any(v_taken)) then v_role := r; exit; end if;
    end loop;
    if v_role is null then
      foreach r in array p_roles loop
        if not (r = any(v_taken)) then v_role := r; exit; end if;
      end loop;
    end if;
    v_taken := array_append(v_taken, v_role);
    v_out := v_out || jsonb_build_object(
      'user_id', m->>'user_id', 'entry_id', m->>'entry_id',
      'team', p_team, 'role', v_role
    );
  end loop;
  return v_out;
end;
$$;

-- ===========================================================================
-- 2. try_form_match REESCRITO — party-aware (grupo nunca dividido entre times)
-- ===========================================================================
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode      text;
  v_team_size int;
  v_unit      record;
  v_a_count   int := 0;
  v_b_count   int := 0;
  v_team_a    jsonb := '[]'::jsonb;  -- [{entry_id, user_id, roles}]
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
  v_team_size := (p_match_size / 2)::int;

  -- Modo-alvo: o mais procurado (cada entry conta em cada modo do array).
  select gm into v_mode
  from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  -- Unidades de fila: party = 1 unidade (todos os membros vivos do mesmo party_id);
  -- solo = unidade de tamanho 1. Grupos grandes primeiro (encaixam melhor).
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
    -- Grupo maior que um time inteiro nunca encaixa (não deveria existir: party<=5).
    if v_unit.usize > v_team_size then
      continue;
    end if;
    -- Bin-packing guloso: tenta o time A, senão o time B.
    if v_a_count + v_unit.usize <= v_team_size then
      v_team_a := v_team_a || v_unit.members;
      v_a_count := v_a_count + v_unit.usize;
    elsif v_b_count + v_unit.usize <= v_team_size then
      v_team_b := v_team_b || v_unit.members;
      v_b_count := v_b_count + v_unit.usize;
    end if;
  end loop;

  -- Só forma quando os DOIS times estão completos.
  if v_a_count < v_team_size or v_b_count < v_team_size then
    return null;
  end if;

  -- Distribui roles dentro de cada time.
  v_assigned := public._assign_team_roles(v_team_a, 'radiant', v_roles)
             || public._assign_team_roles(v_team_b, 'dire',    v_roles);

  -- Coleta os entry_ids selecionados (pra marcar proposal_id depois).
  for m in select value from jsonb_array_elements(v_assigned) loop
    v_ids := array_append(v_ids, (m->>'entry_id')::uuid);
  end loop;

  -- Enriquece com identidade Steam + pré-aceite dos testers.
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

  -- Todos já pré-aceitos (ex.: simulação de bots) → confirma na hora.
  v_all := not exists (
    select 1 from jsonb_array_elements(v_enriched) e where (e->>'accepted')::boolean is not true
  );
  if v_all then
    return confirm_match_proposal(v_prop);
  end if;
  return null; -- proposta pendente → o ready check assume
end;
$$;

grant execute on function public.try_form_match(int) to authenticated;

-- ===========================================================================
-- 3. enter_party_queue — o LÍDER põe a party inteira na fila
--    Retorna jsonb { ok, error, who, lobby_id } pra dar UX de erro no client.
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

  -- Só o LÍDER inicia a busca da party.
  select id, region into v_party, v_region from public.parties where leader_id = v_me;
  if v_party is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;

  v_modes := case when array_length(p_game_modes, 1) is null
                  then array['all_pick']::text[] else p_game_modes end;

  -- Algum membro em cooldown de fila? Bloqueia a party inteira (nomeia o membro).
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

  -- Re-fila idempotente: cancela entries waiting anteriores dos membros.
  update public.match_queue mq
    set status = 'cancelled'
  where mq.status = 'waiting'
    and mq.user_id in (select user_id from public.party_members where party_id = v_party);

  -- 1 entry por membro, com party_id compartilhado + roles do membro (default = todas).
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

  -- Tenta fechar partida agora (grupo no mesmo time pela nova try_form_match).
  v_lobby := public.try_form_match(10);

  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$$;

grant execute on function public.enter_party_queue(text[]) to authenticated;

-- ===========================================================================
-- 4. leave_party_queue — tira a party inteira da fila (qualquer membro pode)
-- ===========================================================================
create or replace function public.leave_party_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_party uuid;
begin
  if v_me is null then return; end if;
  select party_id into v_party from public.party_members where user_id = v_me;
  if v_party is null then return; end if;

  update public.match_queue
    set status = 'cancelled'
  where party_id = v_party and status = 'waiting';
end;
$$;

grant execute on function public.leave_party_queue() to authenticated;
