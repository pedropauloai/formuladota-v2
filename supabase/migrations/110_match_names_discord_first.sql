-- 110: padroniza o nome no popup de aceite (try_form_match) pra Discord-first
-- (era Steam-first), alinhando com getIdentityMap/hover/feed (anti-anonimato).
-- Só muda a ordem do coalesce em 'name' (p.username antes de sl.persona).

create or replace function public.try_form_match(p_match_size integer default 10)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_mode text; v_team_size int; v_unit record;
  v_a_count int := 0; v_b_count int := 0;
  v_team_a jsonb := '[]'::jsonb; v_team_b jsonb := '[]'::jsonb;
  v_ids uuid[] := '{}'; v_assigned jsonb := '[]'::jsonb; v_enriched jsonb;
  v_prop uuid; v_all boolean;
  v_roles text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  m jsonb;
begin
  if p_match_size < 2 then return null; end if;
  perform pg_advisory_xact_lock(hashtext('try_form_match'));
  v_team_size := (p_match_size / 2)::int;
  select gm into v_mode from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting' and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by gm order by count(*) desc, min(mq.joined_at) asc limit 1;
  if v_mode is null then return null; end if;
  for v_unit in
    select count(*)::int as usize,
      jsonb_agg(jsonb_build_object('entry_id', mq.id, 'user_id', mq.user_id,
        'roles', coalesce(mq.roles, '[]'::jsonb)) order by mq.joined_at) as members,
      min(mq.joined_at) as joined
    from match_queue mq
    where mq.status = 'waiting' and mq.proposal_id is null
      and mq.last_heartbeat > now() - interval '45 seconds' and v_mode = any(mq.game_modes)
    group by coalesce(mq.party_id::text, mq.id::text)
    order by usize desc, joined asc
  loop
    exit when v_a_count = v_team_size and v_b_count = v_team_size;
    if v_unit.usize > v_team_size then continue; end if;
    if v_a_count + v_unit.usize <= v_team_size then
      v_team_a := v_team_a || v_unit.members; v_a_count := v_a_count + v_unit.usize;
    elsif v_b_count + v_unit.usize <= v_team_size then
      v_team_b := v_team_b || v_unit.members; v_b_count := v_b_count + v_unit.usize;
    end if;
  end loop;
  if v_a_count < v_team_size or v_b_count < v_team_size then return null; end if;
  v_assigned := public._assign_team_roles(v_team_a, 'radiant', v_roles)
             || public._assign_team_roles(v_team_b, 'dire', v_roles);
  for m in select value from jsonb_array_elements(v_assigned) loop
    v_ids := array_append(v_ids, (m->>'entry_id')::uuid);
  end loop;
  select jsonb_agg(jsonb_build_object(
      'user_id', a->>'user_id', 'team', a->>'team', 'role', a->>'role',
      'name', coalesce(p.username, sl.persona, 'Jogador'),
      'avatar', coalesce(sl.avatar_url, p.avatar_url),
      'is_test', coalesce(p.is_tester, false),
      'accepted', coalesce(p.is_tester, false),
      'rank_tier', nullif(ext.career->>'rankTier', '')::int,
      'leaderboard_rank', nullif(ext.career->>'leaderboardRank', '')::int,
      'level', coalesce(ul.current_level, 1))) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles p on p.id = (a->>'user_id')::uuid
  left join user_stats_extended ext on ext.user_id = (a->>'user_id')::uuid
  left join user_levels ul on ul.user_id = (a->>'user_id')::uuid;
  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at)
  values (v_mode, 'livre', upper(substr(md5(random()::text), 1, 6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds')
  returning id into v_prop;
  update match_queue set proposal_id = v_prop where id = any(v_ids);
  v_all := not exists (select 1 from jsonb_array_elements(v_enriched) e
                       where (e->>'accepted')::boolean is not true);
  if v_all then return confirm_match_proposal(v_prop); end if;
  return null;
end;
$function$;
