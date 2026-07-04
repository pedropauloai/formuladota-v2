-- 124_regate_doctrine_matchmaking.sql — Religa a DOUTRINA no matchmaking — Pedro 2026-07-04.
--
-- CONTEXTO: a migration 059 abriu a RLS da fila ("janela de teste", 2026-06-27)
-- e nunca reverteu — desde então NENHUM usuário passa pela doutrina pra buscar
-- partida. E a fila em GRUPO (enter_party_queue, SECURITY DEFINER) nunca teve
-- gate nenhum, porque DEFINER não passa pela RLS.
--
-- DECISÃO PEDRO (04/07): matchmaking gratuito = carro-chefe/topo de funil →
-- o gate de doutrina/permissões vale AQUI, agnóstico ao modo de jogo. Buscar
-- partida exige: doutrinado OU ≥1 permissão (5 acertos do quiz = 1 permissão).
-- Lobbies (046) já estavam corretos: criar = assinante; entrar = nível 6 OU
-- permissão — intocados.
--
-- O pop-up de 5 perguntas (PermissionQuizModal) já está pronto no front e
-- dispara quando o INSERT devolve 42501 — esta migration devolve o 42501.

-- =====================================================================
-- 1. Fila SOLO: reverte a abertura da 059 (gate da 044 + passe de tester)
-- =====================================================================
drop policy if exists "queue_insert_self" on public.match_queue;
create policy "queue_insert_self" on public.match_queue
  for insert with check (
    auth.uid() = user_id
    and (
      public.has_accepted_doctrine(auth.uid())
      or public.available_match_permissions(auth.uid()) >= 1
      or coalesce((select p.is_tester from public.profiles p where p.id = auth.uid()), false)
    )
  );

-- =====================================================================
-- 2. Fila em GRUPO: gate + consumo DENTRO da função (DEFINER bypassa RLS).
--    Base = versão da migration 121 (região) + adições:
--      a) TODOS os membros precisam de doutrina OU permissão (tester passa);
--         senão retorna { ok:false, error:'need_permission', who, who_id }.
--      b) Entrada NOVA consome 1 permissão de cada membro não-doutrinado
--         (mesmo contrato do solo: re-fila não cobra de novo).
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
  v_gate    record;
  v_member  record;
  v_lobby   uuid;
  v_roles   jsonb;
  v_spread  int;
  v_requeue boolean;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'unauth');
  end if;

  select id into v_party from public.parties where leader_id = v_me;
  if v_party is null then
    return jsonb_build_object('ok', false, 'error', 'not_leader');
  end if;

  -- GATE DE DOUTRINA/PERMISSÃO (Pedro 04/07): a fila é o topo de funil da
  -- cultura — todo membro precisa estar doutrinado OU ter ≥1 permissão.
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

  -- Entrada NOVA vs re-fila: calcular ANTES de cancelar as entries antigas
  -- (re-fila/troca de modo não cobra permissão de novo — contrato do solo).
  v_requeue := exists (
    select 1 from public.match_queue mq
    where mq.status = 'waiting'
      and mq.user_id in (select user_id from public.party_members where party_id = v_party)
  );

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

  -- Consome 1 permissão de cada membro não-doutrinado (tester não paga).
  -- Espelha consume_match_permission (044), que é por-caller e não serve aqui.
  if not v_requeue then
    update public.profiles p
       set match_permissions_consumed = match_permissions_consumed + 1
     where p.id in (select user_id from public.party_members where party_id = v_party)
       and not public.has_accepted_doctrine(p.id)
       and not coalesce(p.is_tester, false);
  end if;

  update public.parties
     set game_modes = v_modes, region = coalesce(v_region, 'BR'), updated_at = now()
   where id = v_party;

  v_lobby := public.try_form_match(10);

  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$$;

grant execute on function public.enter_party_queue(text[]) to authenticated;
