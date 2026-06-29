-- 068 — Balanceamento por medalha + slots fixos + dados de medalha no ready check.
--
-- (1) try_form_match: equilibra radiant/dire pela MEDALHA Valve real (career.rankTier)
--     em vez de só alternar por ordem de função. Para cada par da mesma função, o mais
--     forte vai pro time com menor total acumulado (greedy de balanceamento).
-- (2) Enriquece a proposta com rank_tier/leaderboard_rank/level → o popup mostra as
--     medalhas (skill+honra) e o nível corretos de cada jogador.
-- (3) confirm_match_proposal preenche lobby_players.slot (role→slot 0..4) — é o que o
--     bot lê pra colocar cada jogador no campo certo do lobby (migration 048).

-- ---- confirm: agora grava o SLOT (posição) a partir da função ----
create or replace function public.confirm_match_proposal(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_prop record; v_lobby uuid; v_creator uuid; a jsonb;
  v_roles text[] := array['safelane','midlane','offlane','support','support_dedicated'];
begin
  select * into v_prop from match_proposals where id = p_id and status = 'pending' for update;
  if not found then return null; end if;
  v_creator := ((v_prop.assignments->0)->>'user_id')::uuid;
  insert into lobbies (name, password, game_mode, status, tier, created_by, max_players)
  values (
    'FORMULADOTA ' || upper(substr(md5(random()::text), 1, 4)),
    v_prop.password, v_prop.game_mode, 'open', v_prop.tier, v_creator,
    case when v_prop.match_size in (2,4,6,10) then v_prop.match_size else 10 end
  )
  returning id into v_lobby;
  for a in select jsonb_array_elements(v_prop.assignments) loop
    insert into lobby_players (lobby_id, user_id, team, role, slot)
    values (
      v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role',
      -- slot = índice da função (0..4) → posição fixa que o bot lê
      coalesce(array_position(v_roles, a->>'role') - 1, 0)
    )
    on conflict (lobby_id, user_id) do nothing;
  end loop;
  update match_queue set status='matched', matched_at=now(), matched_lobby_id=v_lobby where proposal_id = p_id;
  update match_proposals set status='confirmed', lobby_id=v_lobby where id = p_id;
  return v_lobby;
end; $$;

-- ---- try_form_match: balanceamento por medalha + enriquecimento com medalhas ----
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_rec record; v_role text; v_team text; v_prefs text[];
  v_roles text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  v_rem jsonb; v_assigned jsonb := '[]'::jsonb; v_scored jsonb; v_teamed jsonb := '[]'::jsonb;
  v_enriched jsonb; v_ids uuid[] := '{}'; v_count int := 0; v_half int; v_idx int := 0;
  v_taken_r text[] := '{}'; v_taken_d text[] := '{}'; r text; v_prop uuid; v_all boolean;
  v_pair jsonb[]; v_rad int := 0; v_dir int := 0; v_rolename text;
begin
  if p_match_size < 2 then return null; end if;

  if p_match_size >= 10 then
    -- Fase 1: seleção gulosa por composição (função, SEM time ainda).
    v_rem := jsonb_build_object('safelane',2,'midlane',2,'offlane',2,'support',2,'support_dedicated',2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles from match_queue mq
      where mq.status='waiting' and mq.proposal_id is null and mq.last_heartbeat > now() - interval '45 seconds'
      order by jsonb_array_length(coalesce(mq.roles,'[]'::jsonb)) asc, mq.joined_at asc
      for update skip locked
    loop
      exit when v_count >= 10;
      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles,'[]'::jsonb)));
      v_role := null;
      foreach r in array v_prefs loop
        if (v_rem ? r) and (v_rem->>r)::int > 0 then v_role := r; exit; end if;
      end loop;
      if v_role is null then continue; end if;
      v_rem := jsonb_set(v_rem, array[v_role], to_jsonb((v_rem->>v_role)::int - 1));
      v_assigned := v_assigned || jsonb_build_object('user_id', v_rec.user_id, 'role', v_role);
      v_ids := array_append(v_ids, v_rec.id);
      v_count := v_count + 1;
    end loop;
    if v_count < 10 then return null; end if;

    -- Fase 2: anexa o score de skill (rank Valve real; null → 0 ~ baseline baixo).
    select jsonb_agg(a || jsonb_build_object('score', coalesce((use.career->>'rankTier')::int, 0)))
      into v_scored
    from jsonb_array_elements(v_assigned) a
    left join user_stats_extended use on use.user_id = (a->>'user_id')::uuid;

    -- Fase 3: BALANCEIA por função — o mais forte do par vai pro time com menor total.
    foreach v_rolename in array v_roles loop
      select array_agg(e order by (e->>'score')::int desc)
        into v_pair from jsonb_array_elements(v_scored) e where e->>'role' = v_rolename;
      if v_pair is null then continue; end if;
      if v_rad <= v_dir then
        v_teamed := v_teamed || (v_pair[1] || jsonb_build_object('team','radiant'));
        v_teamed := v_teamed || (v_pair[2] || jsonb_build_object('team','dire'));
        v_rad := v_rad + (v_pair[1]->>'score')::int;
        v_dir := v_dir + (v_pair[2]->>'score')::int;
      else
        v_teamed := v_teamed || (v_pair[1] || jsonb_build_object('team','dire'));
        v_teamed := v_teamed || (v_pair[2] || jsonb_build_object('team','radiant'));
        v_dir := v_dir + (v_pair[1]->>'score')::int;
        v_rad := v_rad + (v_pair[2]->>'score')::int;
      end if;
    end loop;
    v_assigned := v_teamed;
  else
    -- Caminho de teste (<10): sem balanceamento (degenera).
    v_half := ceil(p_match_size::numeric / 2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles from match_queue mq
      where mq.status='waiting' and mq.proposal_id is null and mq.last_heartbeat > now() - interval '45 seconds'
      order by mq.joined_at limit p_match_size for update skip locked
    loop
      v_idx := v_idx + 1; v_ids := array_append(v_ids, v_rec.id);
      if v_idx <= v_half then v_team := 'radiant'; else v_team := 'dire'; end if;
      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles,'[]'::jsonb)));
      v_role := null;
      foreach r in array v_prefs loop
        if v_team='radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
        if v_team='dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
      end loop;
      if v_role is null then
        foreach r in array v_roles loop
          if v_team='radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
          if v_team='dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
        end loop;
      end if;
      if v_team='radiant' then v_taken_r := array_append(v_taken_r, v_role);
      else v_taken_d := array_append(v_taken_d, v_role); end if;
      v_assigned := v_assigned || jsonb_build_object('user_id', v_rec.user_id, 'team', v_team, 'role', v_role);
      v_count := v_count + 1;
    end loop;
    if v_count < p_match_size then return null; end if;
  end if;

  -- Enriquece com identidade + medalhas (skill+honra) + nível + pré-aceite de tester.
  select jsonb_agg(jsonb_build_object(
      'user_id', a->>'user_id', 'team', a->>'team', 'role', a->>'role',
      'name', coalesce(sl.persona, p.username, 'Jogador'),
      'avatar', coalesce(sl.avatar_url, p.avatar_url),
      'is_test', coalesce(p.is_tester, false),
      'accepted', coalesce(p.is_tester, false),
      'rank_tier', (use.career->>'rankTier')::int,
      'leaderboard_rank', (use.career->>'leaderboardRank')::int,
      'level', coalesce(ul.current_level, 1)
  )) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles p on p.id = (a->>'user_id')::uuid
  left join user_levels ul on ul.user_id = (a->>'user_id')::uuid
  left join user_stats_extended use on use.user_id = (a->>'user_id')::uuid;

  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at)
  values ('all_pick','livre', upper(substr(md5(random()::text),1,6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds')
  returning id into v_prop;

  update match_queue set proposal_id = v_prop where id = any(v_ids);

  v_all := not exists (select 1 from jsonb_array_elements(v_enriched) e where (e->>'accepted')::boolean is not true);
  if v_all then return confirm_match_proposal(v_prop); end if;
  return null;
end; $$;

grant execute on function public.try_form_match(int) to authenticated;
