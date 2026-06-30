-- 072 — Multi-modo na fila (Pedro 2026-06-30).
-- O jogador pode marcar VÁRIOS modos (checkbox). Uma linha por jogador com um
-- ARRAY de modos; ao casar uma partida, a linha sai da fila inteira de uma vez
-- (= removido de todas as filas automaticamente).

alter table public.match_queue
  add column if not exists game_modes text[] not null default array['all_pick']::text[];

-- Backfill: array com o modo único antigo.
update public.match_queue
set game_modes = array[coalesce(game_mode, 'all_pick')]
where status = 'waiting'
  and (game_modes is null or game_modes = array['all_pick']::text[]);

-- get_queue_searchers: devolve o ARRAY de modos por jogador.
drop function if exists public.get_queue_searchers();
create or replace function public.get_queue_searchers()
returns table (
  user_id     uuid,
  name        text,
  avatar      text,
  roles       jsonb,
  level       int,
  honor_score int,
  joined_at   timestamptz,
  game_modes  jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    mq.user_id,
    coalesce(sl.persona, p.username, 'Jogador')                 as name,
    coalesce(sl.avatar_url, p.avatar_url)                       as avatar,
    coalesce(mq.roles, '[]'::jsonb)                             as roles,
    coalesce(ul.current_level, 1)                              as level,
    coalesce((
      select sum(hl.delta)::int from honor_ledger hl where hl.user_id = mq.user_id
    ), 0)                                                       as honor_score,
    mq.joined_at,
    to_jsonb(coalesce(mq.game_modes, array['all_pick']::text[])) as game_modes
  from match_queue mq
  left join steam_links sl on sl.user_id = mq.user_id
  left join profiles    p  on p.id = mq.user_id
  left join user_levels ul on ul.user_id = mq.user_id
  where mq.status = 'waiting'
    and auth.uid() is not null
  order by mq.joined_at asc;
$$;
grant execute on function public.get_queue_searchers() to authenticated;

-- try_form_match: modo-alvo = mais populado (contando o array); forma entre quem
-- TEM esse modo no array. Selecionados saem da fila inteira (1 linha por user).
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec        record;
  v_role       text;
  v_team       text;
  v_prefs      text[];
  v_roles      text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  v_rem        jsonb;
  v_assigned   jsonb := '[]'::jsonb;
  v_enriched   jsonb;
  v_ids        uuid[] := '{}';
  v_count      int := 0;
  v_half       int;
  v_idx        int := 0;
  v_taken_r    text[] := '{}';
  v_taken_d    text[] := '{}';
  r            text;
  v_prop       uuid;
  v_all        boolean;
  v_mode       text;
begin
  if p_match_size < 2 then
    return null;
  end if;

  -- Modo-alvo: o mais "procurado" (cada jogador conta em cada modo que marcou).
  select gm into v_mode
  from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  if p_match_size >= 10 then
    v_rem := jsonb_build_object('safelane',2,'midlane',2,'offlane',2,'support',2,'support_dedicated',2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
        and mq.proposal_id is null
        and mq.last_heartbeat > now() - interval '45 seconds'
        and v_mode = any(mq.game_modes)
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
      if (v_rem->>v_role)::int = 2 then v_team := 'radiant'; else v_team := 'dire'; end if;
      v_rem := jsonb_set(v_rem, array[v_role], to_jsonb((v_rem->>v_role)::int - 1));
      v_assigned := v_assigned || jsonb_build_object('user_id', v_rec.user_id, 'team', v_team, 'role', v_role);
      v_ids := array_append(v_ids, v_rec.id);
      v_count := v_count + 1;
    end loop;
    if v_count < 10 then return null; end if;
  else
    v_half := ceil(p_match_size::numeric / 2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
        and mq.proposal_id is null
        and mq.last_heartbeat > now() - interval '45 seconds'
        and v_mode = any(mq.game_modes)
      order by mq.joined_at
      limit p_match_size
      for update skip locked
    loop
      v_idx := v_idx + 1;
      v_ids := array_append(v_ids, v_rec.id);
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

  select jsonb_agg(
    jsonb_build_object(
      'user_id', a->>'user_id',
      'team',    a->>'team',
      'role',    a->>'role',
      'name',    coalesce(sl.persona, p.username, 'Jogador'),
      'avatar',  coalesce(sl.avatar_url, p.avatar_url),
      'is_test', coalesce(p.is_tester, false),
      'accepted', coalesce(p.is_tester, false)
    )
  ) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles    p  on p.id = (a->>'user_id')::uuid;

  insert into match_proposals (game_mode, tier, password, match_size, assignments, expires_at)
  values (
    v_mode, 'livre', upper(substr(md5(random()::text),1,6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds'
  )
  returning id into v_prop;

  -- A linha selecionada (1 por user, com todos os modos) recebe proposal_id →
  -- o jogador sai de TODAS as filas de uma vez.
  update match_queue set proposal_id = v_prop where id = any(v_ids);

  v_all := not exists (
    select 1 from jsonb_array_elements(v_enriched) e where (e->>'accepted')::boolean is not true
  );
  if v_all then
    return confirm_match_proposal(v_prop);
  end if;
  return null;
end;
$$;
grant execute on function public.try_form_match(int) to authenticated;
