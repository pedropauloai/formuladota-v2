-- 067 — READY CHECK (proposta de partida com aceite dos 10).
--
-- Antes: try_form_match criava o lobby na hora que 10 fechavam. Agora cria uma
-- PROPOSTA (60s); cada jogador aceita; só quando os 10 aceitam o lobby é criado.
-- Quem recusa/ignora leva cooldown de 5min (decisão Pedro 2026-06-29).
--
-- Bots de teste (profiles.is_tester) entram PRÉ-ACEITOS — assim dá pra testar
-- sozinho (9 bots auto-aceitam, falta só você).

-- 1. Cooldown de fila + vínculo da entry com a proposta.
alter table public.profiles  add column if not exists match_cooldown_until timestamptz;
alter table public.match_queue add column if not exists proposal_id uuid;

-- 2. Propostas. assignments = [{user_id,name,avatar,team,role,accepted,is_test}].
create table if not exists public.match_proposals (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'pending'
              check (status in ('pending','confirmed','cancelled')),
  game_mode   text not null default 'all_pick',
  tier        text not null default 'livre',
  password    text,
  match_size  int  not null default 10,
  assignments jsonb not null,
  lobby_id    uuid references public.lobbies(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

alter table public.match_proposals enable row level security;

-- Membro lê a PRÓPRIA proposta (checagem no jsonb da mesma linha — sem recursão).
-- Writes só via RPC SECURITY DEFINER (sem policy de insert/update/delete).
drop policy if exists "proposal members read" on public.match_proposals;
create policy "proposal members read" on public.match_proposals
  for select using (
    exists (
      select 1 from jsonb_array_elements(assignments) e
      where (e->>'user_id')::uuid = auth.uid()
    )
  );

-- 3. Confirma a proposta: cria o lobby a partir das assignments e marca matched.
create or replace function public.confirm_match_proposal(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop record;
  v_lobby uuid;
  v_creator uuid;
  a jsonb;
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
    insert into lobby_players (lobby_id, user_id, team, role)
    values (v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role')
    on conflict (lobby_id, user_id) do nothing;
  end loop;

  update match_queue
    set status = 'matched', matched_at = now(), matched_lobby_id = v_lobby
    where proposal_id = p_id;

  update match_proposals set status = 'confirmed', lobby_id = v_lobby where id = p_id;
  return v_lobby;
end;
$$;

-- 4. Aceitar: marca accepted=true do próprio user; se todos aceitaram, confirma.
create or replace function public.accept_match_proposal(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prop record;
  v_assign jsonb;
  v_all boolean;
begin
  if v_uid is null then return null; end if;
  select * into v_prop from match_proposals where id = p_id and status = 'pending' for update;
  if not found then return null; end if;

  if not exists (
    select 1 from jsonb_array_elements(v_prop.assignments) e where (e->>'user_id')::uuid = v_uid
  ) then
    return null; -- não é membro
  end if;

  select jsonb_agg(
    case when (e->>'user_id')::uuid = v_uid
      then jsonb_set(e, '{accepted}', 'true'::jsonb)
      else e end
  ) into v_assign
  from jsonb_array_elements(v_prop.assignments) e;

  update match_proposals set assignments = v_assign where id = p_id;

  v_all := not exists (
    select 1 from jsonb_array_elements(v_assign) e where (e->>'accepted')::boolean is not true
  );
  if v_all then
    return confirm_match_proposal(p_id);
  end if;
  return null;
end;
$$;

-- 5. Recusar: cancela a proposta; aceitantes voltam pra fila; o recusante leva cooldown.
create or replace function public.decline_match_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prop record;
  a jsonb;
begin
  if v_uid is null then return; end if;
  select * into v_prop from match_proposals where id = p_id and status = 'pending' for update;
  if not found then return; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_prop.assignments) e where (e->>'user_id')::uuid = v_uid
  ) then
    return;
  end if;

  update match_proposals set status = 'cancelled' where id = p_id;

  for a in select jsonb_array_elements(v_prop.assignments) loop
    if (a->>'user_id')::uuid = v_uid then
      update match_queue set status = 'cancelled' where proposal_id = p_id and user_id = v_uid;
      update profiles set match_cooldown_until = now() + interval '5 minutes' where id = v_uid;
    else
      -- volta pra fila viva (preserva a busca dos que não recusaram)
      update match_queue set proposal_id = null, last_heartbeat = now()
        where proposal_id = p_id and user_id = (a->>'user_id')::uuid;
    end if;
  end loop;

  perform recompute_queue_live_stats();
end;
$$;

-- 6. Expira propostas vencidas: aceitantes re-filam; quem não aceitou leva cooldown.
create or replace function public.expire_match_proposals()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop record;
  a jsonb;
begin
  for v_prop in select * from match_proposals where status = 'pending' and expires_at < now() for update loop
    update match_proposals set status = 'cancelled' where id = v_prop.id;
    for a in select jsonb_array_elements(v_prop.assignments) loop
      if (a->>'accepted')::boolean is true then
        update match_queue set proposal_id = null, last_heartbeat = now()
          where proposal_id = v_prop.id and user_id = (a->>'user_id')::uuid;
      else
        update match_queue set status = 'cancelled'
          where proposal_id = v_prop.id and user_id = (a->>'user_id')::uuid;
        update profiles set match_cooldown_until = now() + interval '5 minutes'
          where id = (a->>'user_id')::uuid;
      end if;
    end loop;
  end loop;
  perform recompute_queue_live_stats();
end;
$$;

-- 7. try_form_match: agora cria a PROPOSTA (não o lobby). Mesma composição da 063,
--    mas exclui entries já em proposta (proposal_id is null) e enriquece com nome/
--    avatar + pré-aceite dos testers. Se todos já aceitos (ex.: tudo bot), confirma.
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
begin
  if p_match_size < 2 then
    return null;
  end if;

  if p_match_size >= 10 then
    v_rem := jsonb_build_object('safelane',2,'midlane',2,'offlane',2,'support',2,'support_dedicated',2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
        and mq.proposal_id is null
        and mq.last_heartbeat > now() - interval '45 seconds'
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

  -- Enriquece com identidade Steam + pré-aceite dos testers.
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
    'all_pick', 'livre', upper(substr(md5(random()::text),1,6)),
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end,
    v_enriched, now() + interval '60 seconds'
  )
  returning id into v_prop;

  update match_queue set proposal_id = v_prop where id = any(v_ids);

  -- Todos já aceitos (ex.: simulação 100% bots) → confirma na hora.
  v_all := not exists (
    select 1 from jsonb_array_elements(v_enriched) e where (e->>'accepted')::boolean is not true
  );
  if v_all then
    return confirm_match_proposal(v_prop);
  end if;
  return null; -- proposta pendente → o overlay de ready check assume
end;
$$;

grant execute on function public.try_form_match(int)            to authenticated;
grant execute on function public.accept_match_proposal(uuid)    to authenticated;
grant execute on function public.decline_match_proposal(uuid)   to authenticated;

-- 8. Publication (realtime do popup) + expiry no tick de liveness existente.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='match_proposals'
  ) then
    alter publication supabase_realtime add table public.match_proposals;
  end if;
end $$;

create or replace function public.queue_liveness_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_match_proposals();
  update match_queue
    set status = 'cancelled'
    where status = 'waiting' and proposal_id is null
      and last_heartbeat < now() - interval '60 seconds';
  perform public.recompute_queue_live_stats();
end;
$$;
