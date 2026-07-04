-- 121_game_regions.sql — Região de JOGO (BR / LATAM / EU) — Pedro 2026-07-04.
--
-- 3 regiões, filas que NUNCA se misturam (BR NÃO é LATAM — servidores Dota
-- separados, rivalidade BR×Peru). Região de jogo é INDEPENDENTE do idioma da
-- UI (um peruano pode usar a UI em inglês e jogar na fila LATAM).
--
-- A coluna `region` já existia em match_queue/parties (015/075) mas era
-- COSMÉTICA ('brasil' fixo, matchmaking ignorava). Esta migration:
--   1. profiles.region — FONTE DA VERDADE (escolha única no onboarding;
--      mudança só via admin — coluna congelada pro self-write, padrão m117).
--   2. Normaliza 'brasil'→'BR' em match_queue/parties + defaults.
--   3. region em lobbies + match_proposals (propagação fila→proposta→sala,
--      pro bot-steam criar a sala no servidor certo da Valve).
--   4. Trigger set_queue_region: entry da fila SEMPRE herda profiles.region
--      (cliente não consegue forjar região via insert direto).
--   5. try_form_match particionado por região (só agrega jogadores da MESMA).
--   6. enter_party_queue: bloqueia party com membros de regiões diferentes.
--   7. confirm_match_proposal: propaga região pro lobby.
--   8. player_season_mmr.region — leaderboard por região (snapshot com trigger).

-- =====================================================================
-- 1. profiles.region — fonte da verdade + escolha única
-- =====================================================================
alter table public.profiles
  add column if not exists region text not null default 'BR'
    constraint profiles_region_check check (region in ('BR','LATAM','EU')),
  add column if not exists region_chosen boolean not null default false;

comment on column public.profiles.region is
  'Região de JOGO (BR/LATAM/EU). Independente do idioma da UI. Escolha única no onboarding; depois só admin muda.';
comment on column public.profiles.region_chosen is
  'true depois da escolha do onboarding — trava novas trocas pelo próprio usuário.';

-- Congela region/region_chosen contra escrita crua do usuário (padrão m117:
-- DEFINER e service_role passam; PostgREST com JWT de user é barrado).
-- ⚠️ Recria a função INTEIRA da m117 + as 2 colunas novas na lista.
create or replace function public.enforce_profiles_frozen_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if NEW.is_admin                       is distinct from OLD.is_admin
    or NEW.role                           is distinct from OLD.role
    or NEW.is_tester                      is distinct from OLD.is_tester
    or NEW.mmr_inicial                    is distinct from OLD.mmr_inicial
    or NEW.mmr_atual                      is distinct from OLD.mmr_atual
    or NEW.doctrine_accepted_at           is distinct from OLD.doctrine_accepted_at
    or NEW.doctrine_version               is distinct from OLD.doctrine_version
    or NEW.doctrine_quiz_progress         is distinct from OLD.doctrine_quiz_progress
    or NEW.behavior_status                is distinct from OLD.behavior_status
    or NEW.suspended_until                is distinct from OLD.suspended_until
    or NEW.banned_at                      is distinct from OLD.banned_at
    or NEW.banned_reason                  is distinct from OLD.banned_reason
    or NEW.trial_ends_at                  is distinct from OLD.trial_ends_at
    or NEW.calibration_status             is distinct from OLD.calibration_status
    or NEW.calibration_partidas_completas is distinct from OLD.calibration_partidas_completas
    or NEW.match_permissions_consumed     is distinct from OLD.match_permissions_consumed
    or NEW.match_cooldown_until           is distinct from OLD.match_cooldown_until
    or NEW.discord_id                     is distinct from OLD.discord_id
    or NEW.email                          is distinct from OLD.email
    or NEW.steam_id                       is distinct from OLD.steam_id
    or NEW.region                         is distinct from OLD.region
    or NEW.region_chosen                  is distinct from OLD.region_chosen
    then
      raise exception 'Alteração de coluna protegida do perfil não permitida via escrita direta.';
    end if;
  end if;
  return NEW;
end;
$$;

-- =====================================================================
-- 2. Normaliza match_queue/parties ('brasil' → 'BR') + defaults + checks
-- =====================================================================
update public.match_queue set region = 'BR' where region is distinct from 'BR' and region not in ('LATAM','EU');
alter table public.match_queue alter column region set default 'BR';
alter table public.match_queue drop constraint if exists match_queue_region_check;
alter table public.match_queue add constraint match_queue_region_check check (region in ('BR','LATAM','EU'));

update public.parties set region = 'BR' where region is distinct from 'BR' and region not in ('LATAM','EU');
alter table public.parties alter column region set default 'BR';
alter table public.parties drop constraint if exists parties_region_check;
alter table public.parties add constraint parties_region_check check (region in ('BR','LATAM','EU'));

-- =====================================================================
-- 3. region em lobbies + match_proposals (bot-steam lê lobbies.region)
-- =====================================================================
alter table public.lobbies
  add column if not exists region text not null default 'BR'
    constraint lobbies_region_check check (region in ('BR','LATAM','EU'));
alter table public.match_proposals
  add column if not exists region text not null default 'BR'
    constraint match_proposals_region_check check (region in ('BR','LATAM','EU'));

-- =====================================================================
-- 4. Entry da fila SEMPRE herda a região do PERFIL (anti-spoof)
-- =====================================================================
create or replace function public.set_queue_region()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.region := coalesce(
    (select p.region from profiles p where p.id = new.user_id), 'BR');
  return new;
end;
$$;

drop trigger if exists trg_set_queue_region on public.match_queue;
create trigger trg_set_queue_region
  before insert on public.match_queue
  for each row execute function public.set_queue_region();

-- =====================================================================
-- 5. try_form_match — particionado por REGIÃO (base = m112 skill-aware).
--    Reintroduz o advisory lock da m085 (a m112 o perdeu ao recriar a função:
--    sem ele, dois enterQueue simultâneos podem formar 2 propostas com os
--    mesmos jogadores).
-- =====================================================================
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

  -- Alvo = par (REGIÃO, modo) mais procurado. Filas de regiões diferentes
  -- NUNCA se agregam — cada tick forma no máximo 1 partida da dupla vencedora.
  select mq.region, gm into v_region, v_mode
  from match_queue mq, unnest(mq.game_modes) gm
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
  group by mq.region, gm
  order by count(*) desc, min(mq.joined_at) asc
  limit 1;
  if v_mode is null then return null; end if;

  -- ÂNCORA (mesma região): unidade esperando há mais tempo; janela ±600 base,
  -- +200 a cada 30s, teto ±2800.
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

  -- Unidades elegíveis: MESMA região + dentro da janela da âncora.
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
      'accepted', coalesce(p.is_tester, false)
    )
  ) into v_enriched
  from jsonb_array_elements(v_assigned) a
  left join steam_links sl on sl.user_id = (a->>'user_id')::uuid
  left join profiles    p  on p.id = (a->>'user_id')::uuid;

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
$$;

grant execute on function public.try_form_match(int) to authenticated;

-- =====================================================================
-- 6. enter_party_queue — região vem do PERFIL do líder; party com regiões
--    misturadas é bloqueada (senão o trigger deixaria membros em filas
--    diferentes e a party nunca fecharia partida).
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

  -- Regiões dos membros: todas iguais ou não fila (filas nunca se misturam).
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
-- 7. confirm_match_proposal — propaga a região pro lobby (bot lê daqui)
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
  update match_proposals set status='confirmed', lobby_id=v_lobby where id = p_id;
  return v_lobby;
end; $function$;

-- =====================================================================
-- 8. player_season_mmr.region — leaderboard por região.
--    Snapshot preenchido por trigger no INSERT; quando o admin mudar a
--    região de um user (updateUserRegionAdmin), a action sincroniza aqui.
-- =====================================================================
alter table public.player_season_mmr
  add column if not exists region text not null default 'BR'
    constraint player_season_mmr_region_check check (region in ('BR','LATAM','EU'));

update public.player_season_mmr psm
   set region = p.region
  from public.profiles p
 where p.id = psm.user_id
   and psm.region is distinct from p.region;

create or replace function public.set_season_mmr_region()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.region := coalesce(
    (select p.region from profiles p where p.id = new.user_id), 'BR');
  return new;
end;
$$;

drop trigger if exists trg_set_season_mmr_region on public.player_season_mmr;
create trigger trg_set_season_mmr_region
  before insert on public.player_season_mmr
  for each row execute function public.set_season_mmr_region();

-- Índice pro leaderboard regional (ordena por mmr dentro de season+região).
create index if not exists idx_player_season_mmr_region
  on public.player_season_mmr (season_id, region, mmr desc);
