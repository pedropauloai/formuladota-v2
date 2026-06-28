-- 063 — Liveness da fila por HEARTBEAT (mata entradas "fantasma").
--
-- Problema (visto em produção 2026-06-28): com "find persiste no refresh", uma
-- entrada waiting nunca expirava — quem fechava o app sem clicar no X continuava
-- na fila pra sempre, poluindo o painel e o matchmaking.
--
-- Solução: cada entrada tem last_heartbeat; o cliente pinga a cada ~15s enquanto
-- busca. "ALIVE" = waiting AND last_heartbeat > now()-45s. Tudo que conta/casa a
-- fila usa esse filtro. Um pg_cron a cada 20s recalcula o agregado (o conjunto
-- alive encolhe com o tempo, sem writes) e cancela quem sumiu há > 60s.
--   - Fechar a aba/app > ~45-60s → sai da fila sozinho.
--   - Refresh (~2s) → continua (o heartbeat retoma no mount).
--   - Só o X (leaveQueue) cancela explicitamente.
--
-- Depende da 061 (queue_live_stats + trigger) e 062 (get_queue_searchers).

-- 1. Coluna de heartbeat. Entradas existentes começam "vivas" (default now()).
alter table public.match_queue
  add column if not exists last_heartbeat timestamptz not null default now();

-- 2. Recalcula o agregado contando só os ALIVE. Só ESCREVE (→ dispara realtime)
--    se o agregado mudou — evita push redundante a cada heartbeat.
create or replace function public.recompute_queue_live_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_roles jsonb;
begin
  select count(*) into v_total
  from match_queue
  where status = 'waiting'
    and last_heartbeat > now() - interval '45 seconds';

  select jsonb_build_object(
    'safelane',          count(*) filter (where r.role = 'safelane'),
    'midlane',           count(*) filter (where r.role = 'midlane'),
    'offlane',           count(*) filter (where r.role = 'offlane'),
    'support',           count(*) filter (where r.role = 'support'),
    'support_dedicated', count(*) filter (where r.role = 'support_dedicated')
  ) into v_roles
  from match_queue mq
  cross join lateral jsonb_array_elements_text(coalesce(mq.roles, '[]'::jsonb)) as r(role)
  where mq.status = 'waiting'
    and mq.last_heartbeat > now() - interval '45 seconds';

  v_roles := coalesce(v_roles, '{}'::jsonb);

  update public.queue_live_stats
    set waiting_count = v_total,
        roles = v_roles,
        updated_at = now()
    where id = 'singleton'
      and (waiting_count is distinct from v_total or roles is distinct from v_roles);
end;
$$;

-- 3. Função do trigger (substitui a da 061): agora delega pro recompute alive-aware.
create or replace function public.refresh_queue_live_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_queue_live_stats();
  return null;
end;
$$;

-- 4. Tick periódico (pg_cron): cancela fantasmas + recalcula o agregado.
create or replace function public.queue_liveness_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update match_queue
    set status = 'cancelled'
    where status = 'waiting'
      and last_heartbeat < now() - interval '60 seconds';

  perform public.recompute_queue_live_stats();
end;
$$;

-- 5. get_queue_searchers: só ALIVE (substitui a da 062).
create or replace function public.get_queue_searchers()
returns table (
  user_id     uuid,
  name        text,
  avatar      text,
  roles       jsonb,
  level       int,
  honor_score int,
  joined_at   timestamptz
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
    mq.joined_at
  from match_queue mq
  left join steam_links sl on sl.user_id = mq.user_id
  left join profiles    p  on p.id = mq.user_id
  left join user_levels ul on ul.user_id = mq.user_id
  where mq.status = 'waiting'
    and mq.last_heartbeat > now() - interval '45 seconds'   -- só ALIVE
    and auth.uid() is not null
  order by mq.joined_at asc;
$$;

grant execute on function public.get_queue_searchers() to authenticated;

-- 6. try_form_match: nunca casar fantasma — filtro ALIVE nos dois caminhos.
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby      uuid;
  v_pass       text;
  v_creator    uuid;
  v_rec        record;
  v_role       text;
  v_team       text;
  v_prefs      text[];
  v_roles      text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  v_rem        jsonb;
  v_assigned   jsonb := '[]'::jsonb;
  v_ids        uuid[] := '{}';
  v_count      int := 0;
  v_half       int;
  v_idx        int := 0;
  v_taken_r    text[] := '{}';
  v_taken_d    text[] := '{}';
  r            text;
  a            jsonb;
begin
  if p_match_size < 2 then
    return null;
  end if;

  if p_match_size >= 10 then
    v_rem := jsonb_build_object(
      'safelane', 2, 'midlane', 2, 'offlane', 2, 'support', 2, 'support_dedicated', 2
    );

    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
        and mq.last_heartbeat > now() - interval '45 seconds'
      order by jsonb_array_length(coalesce(mq.roles, '[]'::jsonb)) asc, mq.joined_at asc
      for update skip locked
    loop
      exit when v_count >= 10;

      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles, '[]'::jsonb)));
      v_role := null;
      foreach r in array v_prefs loop
        if (v_rem ? r) and (v_rem->>r)::int > 0 then
          v_role := r;
          exit;
        end if;
      end loop;

      if v_role is null then
        continue;
      end if;

      if (v_rem->>v_role)::int = 2 then v_team := 'radiant'; else v_team := 'dire'; end if;
      v_rem := jsonb_set(v_rem, array[v_role], to_jsonb((v_rem->>v_role)::int - 1));
      v_assigned := v_assigned || jsonb_build_object(
        'user_id', v_rec.user_id, 'team', v_team, 'role', v_role
      );
      v_ids := array_append(v_ids, v_rec.id);
      v_count := v_count + 1;
    end loop;

    if v_count < 10 then
      return null;
    end if;

  else
    v_half := ceil(p_match_size::numeric / 2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
        and mq.last_heartbeat > now() - interval '45 seconds'
      order by mq.joined_at
      limit p_match_size
      for update skip locked
    loop
      v_idx := v_idx + 1;
      v_ids := array_append(v_ids, v_rec.id);
      if v_idx <= v_half then v_team := 'radiant'; else v_team := 'dire'; end if;

      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles, '[]'::jsonb)));
      v_role := null;
      foreach r in array v_prefs loop
        if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
        if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
      end loop;
      if v_role is null then
        foreach r in array v_roles loop
          if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
          if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
        end loop;
      end if;

      if v_team = 'radiant' then v_taken_r := array_append(v_taken_r, v_role);
      else v_taken_d := array_append(v_taken_d, v_role); end if;

      v_assigned := v_assigned || jsonb_build_object(
        'user_id', v_rec.user_id, 'team', v_team, 'role', v_role
      );
      v_count := v_count + 1;
    end loop;

    if v_count < p_match_size then
      return null;
    end if;
  end if;

  v_pass := upper(substr(md5(random()::text), 1, 6));
  v_creator := (v_assigned->0->>'user_id')::uuid;

  insert into lobbies (name, password, game_mode, status, tier, created_by, max_players)
  values (
    'FORMULADOTA ' || upper(substr(md5(random()::text), 1, 4)),
    v_pass, 'all_pick', 'open', 'livre', v_creator,
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end
  )
  returning id into v_lobby;

  for a in select jsonb_array_elements(v_assigned)
  loop
    insert into lobby_players (lobby_id, user_id, team, role)
    values (v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role')
    on conflict (lobby_id, user_id) do nothing;
  end loop;

  update match_queue
    set status = 'matched', matched_at = now(), matched_lobby_id = v_lobby
    where id = any(v_ids);

  return v_lobby;
end;
$$;

grant execute on function public.try_form_match(int) to authenticated;

-- 7. pg_cron a cada 20s. (O Claude no chat habilita a extensão se preciso.)
--    Sub-minuto exige pg_cron >= 1.5 (suportado no Supabase).
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'queue-liveness') then
    perform cron.unschedule('queue-liveness');
  end if;
  perform cron.schedule('queue-liveness', '20 seconds', 'select public.queue_liveness_tick();');
end $$;
