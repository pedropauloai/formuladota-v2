-- 154_matchmaking_mmr_range_flag.sql — faixa de MMR do matchmaking vira feature flag — Pedro 2026-07-10.
--
-- Segue o padrão da 141 (flag + helper *_enabled() + gate no ponto de uso).
--
-- Hoje o matchmaking só pareia dentro de uma janela de MMR adaptativa (abre em ±600 e
-- cresce +200 a cada 30s de espera, teto ±2800, migration 112) e enter_party_queue
-- bloqueia grupo com variação interna de MMR > 2800. No Brasil a liquidez de fila é o
-- gargalo (pouca gente buscando ao mesmo tempo), então essa trava às vezes impede
-- partidas de formar.
--
-- Flag `matchmaking_mmr_range`:
--   ON  (default) = comportamento atual (janela adaptativa + trava de spread de grupo).
--   OFF = "MODO LIQUIDEZ" (Brasil): qualquer 10 jogadores da região formam partida,
--         AINDA balanceada por MMR nos 2 times (soma de MMR) e com as funções escolhidas
--         respeitadas (atribuição estrita) — só SEM o filtro de faixa nem a trava de spread.
--
-- IMPORTANTE (região): este é um flag GLOBAL pensado como "modo liquidez BR". Quando
-- entrar a Europa, onde SOBRA gente na fila, a trava faz sentido e isto NÃO deve ficar
-- global. TODO: Europa → avaliar flag por região.
--
-- Deploy neutro: entra LIGADO (nada muda pro jogador). O Pedro desliga depois no admin.

-- 1) Flag (ligada). label descreve; enabled=true = faixa de MMR ativa (comportamento atual).
insert into public.feature_flags (key, enabled, label)
values ('matchmaking_mmr_range', true, 'Faixa de MMR no matchmaking')
on conflict (key) do nothing;

-- 2) Helper (espelha dodge_penalty_enabled): default true = falha FECHADA no comportamento
--    atual (não afrouxa a fila por acidente se a linha sumir).
create or replace function public.mmr_range_enabled()
returns boolean language sql stable set search_path = public as $$
  select coalesce((select enabled from feature_flags where key = 'matchmaking_mmr_range'), true);
$$;

-- 3) try_form_match — base VERBATIM da migration 149, ÚNICA mudança = a linha do v_window.
--    Todo o resto (balanceamento por soma de MMR nos 2 times + atribuição estrita de
--    funções via _assign_team_roles/backtracking) segue idêntico.
create or replace function public.try_form_match(p_match_size integer default 10)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mode      text;
  v_region    text;
  v_team_size int;
  v_unit      record;
  v_a_count   int := 0;
  v_b_count   int := 0;
  v_a_sum     int := 0;
  v_b_sum     int := 0;
  v_team_a    jsonb := '[]'::jsonb;
  v_team_b    jsonb := '[]'::jsonb;
  v_ids       uuid[] := '{}';
  v_assigned  jsonb := '[]'::jsonb;
  v_ra        jsonb;
  v_rb        jsonb;
  v_enriched  jsonb;
  v_prop      uuid;
  v_all       boolean;
  v_season    int;
  v_roles     text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  m           jsonb;
  v_anchor_mmr  numeric;
  v_anchor_wait numeric;
  v_window      int;
  v_can_a       boolean;
  v_can_b       boolean;
begin
  if p_match_size < 2 then return null; end if;
  perform pg_advisory_xact_lock(hashtext('try_form_match'));
  v_team_size := (p_match_size / 2)::int;
  select id into v_season from seasons where active limit 1;

  select mq.region, gm into v_region, v_mode
  from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting' and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by mq.region, gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  select avg(mq.queue_mmr), extract(epoch from now() - min(mq.joined_at))
    into v_anchor_mmr, v_anchor_wait
  from match_queue mq
  where mq.status = 'waiting' and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
    and v_mode = any(mq.game_modes) and mq.region = v_region
  group by coalesce(mq.party_id::text, mq.id::text)
  order by min(mq.joined_at) asc
  limit 1;
  if v_anchor_mmr is null then return null; end if;
  -- Faixa de MMR sob feature flag: ON = janela adaptativa (comportamento atual);
  -- OFF = modo liquidez (janela gigante → o HAVING abs(...) <= v_window nunca barra).
  v_window := case
    when public.mmr_range_enabled()
      then least(2800, 600 + floor(coalesce(v_anchor_wait, 0) / 30)::int * 200)
    else 1000000000  -- flag off = sem trava; o HAVING abs(...) <= v_window nunca barra
  end;

  for v_unit in
    select count(*)::int as usize, avg(mq.queue_mmr) as umavg, sum(mq.queue_mmr)::int as umsum,
      jsonb_agg(jsonb_build_object('entry_id', mq.id, 'user_id', mq.user_id,
                'roles', coalesce(mq.roles, '[]'::jsonb)) order by mq.joined_at) as members,
      min(mq.joined_at) as joined
    from match_queue mq
    where mq.status = 'waiting' and mq.proposal_id is null
      and mq.last_heartbeat > now() - interval '45 seconds'
      and v_mode = any(mq.game_modes) and mq.region = v_region
    group by coalesce(mq.party_id::text, mq.id::text)
    having abs(avg(mq.queue_mmr) - v_anchor_mmr) <= v_window
    order by usize desc, umavg desc, joined asc
  loop
    exit when v_a_count = v_team_size and v_b_count = v_team_size;
    if v_unit.usize > v_team_size then continue; end if;
    v_can_a := v_a_count + v_unit.usize <= v_team_size;
    v_can_b := v_b_count + v_unit.usize <= v_team_size;
    if v_can_a and v_can_b then
      if v_a_sum <= v_b_sum then v_can_b := false; else v_can_a := false; end if;
    end if;
    if v_can_a then
      v_team_a := v_team_a || v_unit.members; v_a_count := v_a_count + v_unit.usize; v_a_sum := v_a_sum + v_unit.umsum;
    elsif v_can_b then
      v_team_b := v_team_b || v_unit.members; v_b_count := v_b_count + v_unit.usize; v_b_sum := v_b_sum + v_unit.umsum;
    end if;
  end loop;

  if v_a_count < v_team_size or v_b_count < v_team_size then return null; end if;

  -- ESCOLHA É LEI: atribuição estrita. Se um time não cobre as 5 funções com as
  -- escolhas, a partida NÃO forma (proposal_id não setado → entries voltam à fila).
  v_ra := public._assign_team_roles(v_team_a, 'radiant', v_roles);
  v_rb := public._assign_team_roles(v_team_b, 'dire',    v_roles);
  if v_ra is null or v_rb is null then return null; end if;
  v_assigned := v_ra || v_rb;

  for m in select value from jsonb_array_elements(v_assigned) loop
    v_ids := array_append(v_ids, (m->>'entry_id')::uuid);
  end loop;

  select jsonb_agg(jsonb_build_object(
      'user_id', a->>'user_id', 'team', a->>'team', 'role', a->>'role',
      'name', coalesce(sl.persona, p.username, 'Jogador'),
      'avatar', coalesce(sl.avatar_url, p.avatar_url),
      'is_test', coalesce(p.is_tester, false), 'accepted', coalesce(p.is_tester, false),
      'rank_tier', nullif(ext.career->>'rankTier', '')::int,
      'leaderboard_rank', nullif(ext.career->>'leaderboardRank', '')::int,
      'level', coalesce(ul.current_level, 1), 'season_mmr', psm.mmr,
      'total_xp', coalesce(ul.total_xp_earned, 0)))
    into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles p on p.id = (a->>'user_id')::uuid
  left join user_stats_extended ext on ext.user_id = (a->>'user_id')::uuid
  left join user_levels ul on ul.user_id = (a->>'user_id')::uuid
  left join player_season_mmr psm on psm.user_id = (a->>'user_id')::uuid and psm.season_id = v_season;

  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at, region)
  values (v_mode, 'livre', upper(substr(md5(random()::text), 1, 6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds', v_region)
  returning id into v_prop;

  update match_queue set proposal_id = v_prop where id = any(v_ids);

  v_all := not exists (select 1 from jsonb_array_elements(v_enriched) e
                       where (e->>'accepted')::boolean is not true);
  if v_all then return confirm_match_proposal(v_prop); end if;
  return null;
end;
$function$;

-- 4) enter_party_queue — base VERBATIM da migration 130, ÚNICA mudança = o bloco de spread
--    passa a checar o helper (flag OFF = sem trava de spread de grupo).
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
  -- Trava de spread de grupo sob feature flag: OFF = modo liquidez (não barra o grupo).
  if public.mmr_range_enabled() and coalesce(v_spread, 0) > 2800 then
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
