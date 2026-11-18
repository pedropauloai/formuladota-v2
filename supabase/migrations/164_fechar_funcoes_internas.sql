-- 164_fechar_funcoes_internas.sql: fecha as funções SECURITY DEFINER do public que visitante e logado
-- chamavam direto pela API. As internas ficam só com o service_role (e o postgres, dono), as do logado
-- saem do anon, três ganham checagem de auth.uid() e party_members trava UPDATE e INSERT.
-- Prova: scripts/seguranca/funcoes-abertas.sql volta vazio depois desta migration.

begin;

-- Matchmaking interno: só outras funções DEFINER e o cron (postgres) chamam; aberto, confirm_match_proposal criava a sala sem o aceite dos outros.
revoke execute on function
  public.confirm_match_proposal(uuid),
  public.expire_match_proposals(),
  public.queue_liveness_tick(),
  public.recompute_queue_live_stats(),
  public.dodge_penalty_enabled()
from public, anon, authenticated;
grant execute on function
  public.confirm_match_proposal(uuid),
  public.expire_match_proposals(),
  public.queue_liveness_tick(),
  public.recompute_queue_live_stats(),
  public.dodge_penalty_enabled()
to service_role;

-- Manutenção sem chamador no app: reset_dormant_behavior zerava advertências em massa e release_bot soltava qualquer bot (os gatilhos de lobbies já liberam).
revoke execute on function
  public.reset_dormant_behavior(),
  public.release_bot(text)
from public, anon, authenticated;
grant execute on function
  public.reset_dormant_behavior(),
  public.release_bot(text)
to service_role;

-- Função de gatilho não é RPC: o gatilho de profiles dispara sem precisar de EXECUTE de quem grava.
revoke execute on function public.tg_profiles_handle() from public, anon, authenticated;
grant execute on function public.tg_profiles_handle() to service_role;

-- Legado sem chamador no código (preço por PRO, assinatura, elite, permissão avulsa, split de receita): fecha o que ninguém usa e expunha dado de terceiro.
revoke execute on function
  public.is_pro_first_sale(uuid),
  public.can_change_price(uuid),
  public.get_max_price_for_pro(uuid),
  public.get_sponsored_pros(uuid),
  public.has_active_subscription(),
  public.has_subscription_tier(text),
  public.active_subscription_tier(),
  public.can_join_elite(uuid),
  public.consume_match_permission(),
  public.is_coach()
from public, anon, authenticated;
grant execute on function
  public.is_pro_first_sale(uuid),
  public.can_change_price(uuid),
  public.get_max_price_for_pro(uuid),
  public.get_sponsored_pros(uuid),
  public.has_active_subscription(),
  public.has_subscription_tier(text),
  public.active_subscription_tier(),
  public.can_join_elite(uuid),
  public.consume_match_permission(),
  public.is_coach()
to service_role;

-- Usadas só por quem está logado (server actions com a sessão do usuário): saem do visitante e ficam para authenticated.
revoke execute on function
  public.accept_match_proposal(uuid),
  public.decline_match_proposal(uuid),
  public.get_lobby_queue_status(uuid),
  public.is_in_active_match(uuid),
  public.try_form_match(integer),
  public.enter_party_queue(text[]),
  public.leave_party_queue(),
  public.create_party(),
  public.accept_party_invite(uuid),
  public.leave_party(),
  public.kick_party_member(uuid),
  public.transfer_party_leader(uuid),
  public.my_party(),
  public.party_invites_detailed(),
  public.dm_get_or_create_conversation(uuid),
  public.dm_inbox(),
  public.equip_cosmetic(uuid),
  public.unequip_slot(text),
  public.accept_team_invite(uuid),
  public.join_coach_queue(uuid),
  public.leave_coach_queue(uuid),
  public.mark_changelog_seen(),
  public.grant_doctrine_question_xp(),
  public.get_public_profile(uuid),
  public.reserve_bot_for_lobby(uuid),
  public.cancel_pro_waiting_entries(uuid, text),
  public.get_pro_revenue_summary(uuid, timestamp with time zone)
from public, anon;
grant execute on function
  public.accept_match_proposal(uuid),
  public.decline_match_proposal(uuid),
  public.get_lobby_queue_status(uuid),
  public.is_in_active_match(uuid),
  public.try_form_match(integer),
  public.enter_party_queue(text[]),
  public.leave_party_queue(),
  public.create_party(),
  public.accept_party_invite(uuid),
  public.leave_party(),
  public.kick_party_member(uuid),
  public.transfer_party_leader(uuid),
  public.my_party(),
  public.party_invites_detailed(),
  public.dm_get_or_create_conversation(uuid),
  public.dm_inbox(),
  public.equip_cosmetic(uuid),
  public.unequip_slot(text),
  public.accept_team_invite(uuid),
  public.join_coach_queue(uuid),
  public.leave_coach_queue(uuid),
  public.mark_changelog_seen(),
  public.grant_doctrine_question_xp(),
  public.get_public_profile(uuid),
  public.reserve_bot_for_lobby(uuid),
  public.cancel_pro_waiting_entries(uuid, text),
  public.get_pro_revenue_summary(uuid, timestamp with time zone)
to authenticated, service_role;

-- Helpers de políticas de INSERT e DELETE: visitante nunca grava nessas tabelas, e o logado precisa de EXECUTE para a política rodar.
revoke execute on function
  public.available_match_permissions(uuid),
  public.has_accepted_doctrine(uuid),
  public.is_user_active(uuid),
  public.quiz_enabled(),
  public.is_party_leader(uuid)
from public, anon;
grant execute on function
  public.available_match_permissions(uuid),
  public.has_accepted_doctrine(uuid),
  public.is_user_active(uuid),
  public.quiz_enabled(),
  public.is_party_leader(uuid)
to authenticated, service_role;

-- Seguem abertas a visitante só as leituras públicas e os helpers de RLS de leitura (lista aprovada e motivos em scripts/seguranca/funcoes-abertas.sql).
-- get_queue_searchers e get_public_mini_profile ficam abertas: o contador da fila e o cartão do jogador aparecem para visitante, e o dado é público (anti-anonimato).

-- try_form_match: só quem está buscando partida (ou admin e servidor) dispara a formação; antes qualquer logado puxava a fila dos outros.
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
  if auth.uid() is not null
     and not public.is_admin()
     and not exists (
       select 1 from match_queue where user_id = auth.uid() and status = 'waiting'
     ) then
    return null;
  end if;
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

-- is_in_active_match: responde só sobre o próprio usuário (ou admin e servidor); o logado sondava se qualquer jogador estava em partida.
create or replace function public.is_in_active_match(p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select (auth.uid() is null or p_user = auth.uid() or public.is_admin())
    and exists (
      select 1
      from match_queue mq
      join lobbies l on l.id = mq.matched_lobby_id
      where mq.user_id = p_user
        and mq.status = 'matched'
        and l.status in ('open', 'in_progress')
    );
$function$;

-- available_match_permissions: o saldo só sai para o próprio jogador, o grupo dele (gate do líder em enter_party_queue), admin e servidor.
create or replace function public.available_match_permissions(p_uid uuid)
 returns integer
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0,
    (floor(coalesce(jsonb_array_length(doctrine_quiz_progress), 0) / 5.0)::int)
    - coalesce(match_permissions_consumed, 0)
  )
  from public.profiles
  where id = p_uid
    and (
      auth.uid() is null
      or p_uid = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.party_members eu
        join public.party_members outro on outro.party_id = eu.party_id
        where eu.user_id = auth.uid() and outro.user_id = p_uid
      )
    );
$function$;

-- party_members: UPDATE só na coluna roles; com a tabela inteira liberada, o membro trocava o próprio party_id e entrava em qualquer grupo sem convite.
revoke update on table public.party_members from anon, authenticated;
grant update (roles) on table public.party_members to authenticated;

-- party_members: INSERT só por create_party e accept_party_invite (DEFINER, donas da tabela); a política do líder deixava pôr qualquer user_id no grupo.
drop policy if exists party_members_insert_leader on public.party_members;
revoke insert on table public.party_members from anon, authenticated;

commit;
