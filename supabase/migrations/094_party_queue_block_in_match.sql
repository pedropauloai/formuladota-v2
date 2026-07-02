-- 094_party_queue_block_in_match.sql — trava a busca em grupo se QUALQUER membro
-- já estiver em partida ativa (mesma fonte is_in_active_match, migration 093).
-- Espelha o bloco de cooldown que já existia. Retorna error='in_match' + who=<nome>.
create or replace function public.enter_party_queue(p_game_modes text[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me      uuid := auth.uid();
  v_party   uuid;
  v_region  text;
  v_modes   text[];
  v_default jsonb := '["safelane","midlane","offlane","support","support_dedicated"]'::jsonb;
  v_cool    record;
  v_inmatch record;
  v_member  record;
  v_lobby   uuid;
  v_roles   jsonb;
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'error', 'unauth');
  end if;

  select p.id, p.region into v_party, v_region
  from public.parties p
  join public.party_members pm on pm.party_id = p.id
  where pm.user_id = v_me;
  if v_party is null then
    return jsonb_build_object('ok', false, 'error', 'no_party');
  end if;

  v_modes := case when array_length(p_game_modes, 1) is null
                  then array['all_pick']::text[] else p_game_modes end;

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

  -- Algum membro já está em partida ativa? Bloqueia (não racha ninguém pra nova fila).
  select coalesce(sl.persona, pr.username, 'Um membro') as nome
    into v_inmatch
  from public.party_members pm
  join public.profiles pr on pr.id = pm.user_id
  left join steam_links sl on sl.user_id = pm.user_id
  where pm.party_id = v_party
    and public.is_in_active_match(pm.user_id)
  limit 1;
  if v_inmatch.nome is not null then
    return jsonb_build_object('ok', false, 'error', 'in_match', 'who', v_inmatch.nome);
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
       coalesce(v_region, 'brasil'), 'waiting', now());
  end loop;

  update public.parties set game_modes = v_modes, updated_at = now() where id = v_party;

  v_lobby := public.try_form_match(10);
  return jsonb_build_object('ok', true, 'lobby_id', v_lobby);
end;
$function$;
