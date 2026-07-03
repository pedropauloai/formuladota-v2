-- 112 — Matchmaking por SKILL (Pedro 2026-07-03). Antes a fila IGNORAVA o MMR:
-- pareava por ordem de chegada + composição de roles, sem olhar habilidade. Um 1000
-- podia cair com um 6000. Isso deslegitima o ranking (o MMR sobe/desce por sorteio
-- de time, não por skill). Esta migration fecha o buraco:
--
--   1. queue_mmr — cada entry da fila carrega o MMR de PAREAMENTO (MMR da temporada;
--      senão semeado da medalha Valve; senão 1000). Preenchido por TRIGGER, então
--      vale pra fila solo (enterQueue) E de grupo (enter_party_queue) sem tocar nos
--      dois callers.
--   2. try_form_match — janela ADAPTATIVA a partir da unidade que espera há mais
--      tempo (âncora): começa ±600 de MMR e cresce +200 a cada 30s de espera, com
--      teto de ±2800 (o limite do Dota). Só pareia quem está dentro da janela, e
--      distribui os 2 times MINIMIZANDO a diferença de MMR (balanceamento), mantendo
--      party junta e roles cobertas. "Justiça primeiro, alarga com a espera."
--   3. enter_party_queue — bloqueia grupo com variação INTERNA de MMR > 2800 (senão
--      um jogador forte "carrega" um fraco e fura o skill matching). Erro explícito.

-- ===========================================================================
-- 0. queue_mmr + resolução do MMR de pareamento + trigger de preenchimento
-- ===========================================================================
alter table public.match_queue
  add column if not exists queue_mmr int;

-- MMR de PAREAMENTO de um jogador (determinístico):
--   1) MMR da temporada ativa (player_season_mmr);
--   2) senão, semeia da medalha Valve (career.rankTier) na MESMA escala do TS
--      seedMmrFromRankTier: min da banda + meio-estrela;
--   3) senão, 1000 (base).
create or replace function public.queue_mmr_for(p_user uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select psm.mmr
       from player_season_mmr psm
       join seasons s on s.id = psm.season_id
      where psm.user_id = p_user and s.active),
    (select case
              when medal >= 8 then 5620
              when medal = 7  then 4620 + least(5, greatest(1, stars) - 1) * 200 + 100
              when medal between 1 and 6
                              then (medal - 1) * 770 + least(5, greatest(1, stars) - 1) * 154 + 77
              else null
            end
       from (
         select floor((use.career->>'rankTier')::numeric / 10)::int as medal,
                (use.career->>'rankTier')::int % 10                 as stars
         from user_stats_extended use
         where use.user_id = p_user
           and (use.career->>'rankTier') is not null
       ) q),
    1000
  );
$$;

grant execute on function public.queue_mmr_for(uuid) to authenticated;

-- Preenche queue_mmr no INSERT quando veio nulo. Solo (enterQueue) e grupo
-- (enter_party_queue) passam pelo mesmo INSERT → um trigger cobre os dois.
create or replace function public.set_queue_mmr()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_mmr is null then
    new.queue_mmr := public.queue_mmr_for(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_queue_mmr on public.match_queue;
create trigger trg_set_queue_mmr
  before insert on public.match_queue
  for each row execute function public.set_queue_mmr();

-- Backfill das entries waiting já existentes (pra não ficarem nulas neste ciclo).
update public.match_queue
   set queue_mmr = public.queue_mmr_for(user_id)
 where queue_mmr is null and status = 'waiting';

-- ===========================================================================
-- 1. try_form_match — agora respeita SKILL (janela adaptativa + balanceamento)
--    Mantém: party = unidade indivisível, roles por time, backward-compat solo.
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
  v_a_sum     int := 0;   -- soma de MMR do time A (balanceamento)
  v_b_sum     int := 0;
  v_team_a    jsonb := '[]'::jsonb;  -- [{entry_id, user_id, roles}]
  v_team_b    jsonb := '[]'::jsonb;
  v_ids       uuid[] := '{}';
  v_assigned  jsonb := '[]'::jsonb;
  v_enriched  jsonb;
  v_prop      uuid;
  v_all       boolean;
  v_roles     text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  m           jsonb;
  v_anchor_mmr  numeric;
  v_anchor_wait numeric;   -- segundos que a âncora já espera
  v_window      int;       -- tolerância de MMR permitida NESTE tick
  v_can_a       boolean;
  v_can_b       boolean;
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

  -- ÂNCORA = a unidade que espera há mais tempo (no modo alvo). A janela cresce com
  -- a espera DELA: ±600 base, +200 a cada 30s, teto ±2800 (limite do Dota). Assim
  -- tentamos o match mais justo possível e só relaxamos quando ninguém aparece.
  select avg(mq.queue_mmr), extract(epoch from now() - min(mq.joined_at))
    into v_anchor_mmr, v_anchor_wait
  from match_queue mq
  where mq.status = 'waiting'
    and mq.proposal_id is null
    and mq.last_heartbeat > now() - interval '45 seconds'
    and v_mode = any(mq.game_modes)
  group by coalesce(mq.party_id::text, mq.id::text)
  order by min(mq.joined_at) asc
  limit 1;
  if v_anchor_mmr is null then return null; end if;
  v_window := least(2800, 600 + floor(coalesce(v_anchor_wait, 0) / 30)::int * 200);

  -- Unidades ELEGÍVEIS: dentro da janela da âncora. Grupos maiores primeiro; dentro
  -- do mesmo tamanho, maior MMR primeiro (melhora o particionamento guloso).
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
    group by coalesce(mq.party_id::text, mq.id::text)
    having abs(avg(mq.queue_mmr) - v_anchor_mmr) <= v_window
    order by usize desc, umavg desc, joined asc
  loop
    exit when v_a_count = v_team_size and v_b_count = v_team_size;
    -- Grupo maior que um time inteiro nunca encaixa (não deveria existir: party<=5).
    if v_unit.usize > v_team_size then
      continue;
    end if;

    v_can_a := v_a_count + v_unit.usize <= v_team_size;
    v_can_b := v_b_count + v_unit.usize <= v_team_size;

    -- Balanceamento: se cabe nos dois times, vai pro de MENOR soma de MMR (iguala
    -- as médias). Empate → time A.
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
-- 2. enter_party_queue — bloqueia grupo com variação interna de MMR > 2800
--    (retorna { ok:false, error:'mmr_spread', spread } pra UX explícita).
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
  v_spread  int;
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

  -- GATE anti-smurf: variação interna de MMR do grupo não pode passar de 2800 (senão
  -- um jogador forte "carrega" um fraco e fura o skill matching). Mesmo limite do Dota.
  select (max(public.queue_mmr_for(pm.user_id)) - min(public.queue_mmr_for(pm.user_id)))::int
    into v_spread
  from public.party_members pm
  where pm.party_id = v_party;
  if coalesce(v_spread, 0) > 2800 then
    return jsonb_build_object('ok', false, 'error', 'mmr_spread', 'spread', v_spread);
  end if;

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

  -- Tenta fechar partida agora (grupo no mesmo time pela try_form_match skill-aware).
  v_lobby := public.try_form_match(10);

  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$$;

grant execute on function public.enter_party_queue(text[]) to authenticated;
