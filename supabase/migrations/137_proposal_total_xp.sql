-- 137_proposal_total_xp.sql — Anel de XP no overlay de aceite — Pedro 2026-07-04.
--
-- O overlay de ready-check lia 'level' do jsonb assignments da proposta, mas não o
-- XP → o anel ficava vazio. try_form_match JÁ junta user_levels (pro 'level'); só
-- acrescentamos 'total_xp' ao jsonb_build_object de cada membro (logo após
-- 'season_mmr'). MUDANÇA ADITIVA — o resto da função (locks, bin-packing 2x5, janela
-- de MMR, confirmação) é reproduzido VERBATIM do prod, sem alterar nenhuma lógica.
-- Validado por diff contra a definição anterior: única diferença = a linha total_xp.

CREATE OR REPLACE FUNCTION public.try_form_match(p_match_size integer DEFAULT 10)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by mq.region, gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  select avg(mq.queue_mmr), extract(epoch from now() - min(mq.joined_at))
    into v_anchor_mmr, v_anchor_wait
  from match_queue mq
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
    and v_mode = any(mq.game_modes)
    and mq.region = v_region
  group by coalesce(mq.party_id::text, mq.id::text)
  order by min(mq.joined_at) asc
  limit 1;
  if v_anchor_mmr is null then return null; end if;
  v_window := least(2800, 600 + floor(coalesce(v_anchor_wait, 0) / 30)::int * 200);

  for v_unit in
    select
      count(*)::int          as usize,
      avg(mq.queue_mmr)      as umavg,
      sum(mq.queue_mmr)::int as umsum,
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
      and mq.region = v_region
    group by coalesce(mq.party_id::text, mq.id::text)
    having abs(avg(mq.queue_mmr) - v_anchor_mmr) <= v_window
    order by usize desc, umavg desc, joined asc
  loop
    exit when v_a_count = v_team_size and v_b_count = v_team_size;
    if v_unit.usize > v_team_size then
      continue;
    end if;

    v_can_a := v_a_count + v_unit.usize <= v_team_size;
    v_can_b := v_b_count + v_unit.usize <= v_team_size;

    if v_can_a and v_can_b then
      if v_a_sum <= v_b_sum then v_can_b := false; else v_can_a := false; end if;
    end if;

    if v_can_a then
      v_team_a  := v_team_a || v_unit.members;
      v_a_count := v_a_count + v_unit.usize;
      v_a_sum   := v_a_sum + v_unit.umsum;
    elsif v_can_b then
      v_team_b  := v_team_b || v_unit.members;
      v_b_count := v_b_count + v_unit.usize;
      v_b_sum   := v_b_sum + v_unit.umsum;
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
      'accepted', coalesce(p.is_tester, false),
      'rank_tier',        nullif(ext.career->>'rankTier', '')::int,
      'leaderboard_rank', nullif(ext.career->>'leaderboardRank', '')::int,
      'level',            coalesce(ul.current_level, 1),
      'season_mmr',       psm.mmr,
      'total_xp',         coalesce(ul.total_xp_earned, 0)
    )
  ) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles    p  on p.id = (a->>'user_id')::uuid
  left join user_stats_extended ext on ext.user_id = (a->>'user_id')::uuid
  left join user_levels ul on ul.user_id = (a->>'user_id')::uuid
  left join player_season_mmr psm
    on psm.user_id = (a->>'user_id')::uuid and psm.season_id = v_season;

  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at, region)
  values (
    v_mode, 'livre', upper(substr(md5(random()::text), 1, 6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds', v_region
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
