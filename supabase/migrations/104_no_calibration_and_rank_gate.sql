-- 104_no_calibration_and_rank_gate.sql — fim da fase de calibração + gate de rank.
-- Pedro 2026-07-02: a gente NÃO descobre o nível (calibração), a gente IMPORTA (medalha
-- Valve). Então o jogador entra JÁ calibrado no valor da medalha (star-level, semente em
-- src/lib/mmr.ts). E quem não tem medalha legível (perfil Dota privado/descalibrado →
-- rankTier nulo) NÃO entra na fila (backbone anti-smurf).

-- 1) apply_match_mmr: calibrated = TRUE sempre (sem fase de calibração).
create or replace function public.apply_match_mmr(p_match_id uuid, p_season_id integer, p_results jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_already timestamptz;
  v_row jsonb;
  v_won boolean;
  v_delta int;
  v_uid uuid;
  v_applied integer := 0;
begin
  if auth.uid() is not null and not (
    public.is_admin()
    or exists (
      select 1 from public.matches m
      join public.coaches c on c.id = m.coach_id
      where m.id = p_match_id and c.profile_id = auth.uid()
    )
  ) then
    raise exception 'sem permissão pra aplicar MMR nesta partida';
  end if;

  select mmr_applied_at into v_already
  from public.matches where id = p_match_id for update;
  if v_already is not null then
    return 0;
  end if;

  for v_row in select * from jsonb_array_elements(p_results)
  loop
    v_uid := (v_row->>'user_id')::uuid;
    v_won := (v_row->>'won')::boolean;
    v_delta := coalesce((v_row->>'delta')::int, 0);

    insert into public.player_season_mmr
      (user_id, season_id, mmr, vitorias, derrotas, partidas_total, placements_played, calibrated, peak_mmr, last_match_at)
    values (
      v_uid, p_season_id, (v_row->>'new_mmr')::integer,
      case when v_won then 1 else 0 end,
      case when v_won then 0 else 1 end,
      1, 1, true, (v_row->>'new_mmr')::integer, now()
    )
    on conflict (user_id, season_id) do update set
      mmr               = excluded.mmr,
      vitorias          = player_season_mmr.vitorias + (case when v_won then 1 else 0 end),
      derrotas          = player_season_mmr.derrotas + (case when v_won then 0 else 1 end),
      partidas_total    = player_season_mmr.partidas_total + 1,
      placements_played = player_season_mmr.placements_played + 1,
      calibrated        = true,
      peak_mmr          = greatest(coalesce(player_season_mmr.peak_mmr, 0), excluded.mmr),
      last_match_at     = now();

    update public.match_players
      set mmr_change = v_delta
      where match_id = p_match_id and user_id = v_uid;

    v_applied := v_applied + 1;
  end loop;

  update public.matches set mmr_applied_at = now() where id = p_match_id;
  return v_applied;
end;
$function$;

grant execute on function public.apply_match_mmr(uuid, integer, jsonb) to authenticated;

-- Marca todos os já registrados como calibrados (entraram no valor da medalha).
update public.player_season_mmr set calibrated = true where not calibrated;

-- 2) enter_party_queue: bloqueia se QUALQUER membro tem rank Valve nulo
--    (perfil Dota privado ou descalibrado → não dá pra semear/verificar).
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
  v_norank  record;
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

  -- Rank Valve legível? (perfil público + calibrado no Dota). Nulo = bloqueia.
  select coalesce(pr.username, sl.persona, 'Um membro') as nome
    into v_norank
  from public.party_members pm
  join public.profiles pr on pr.id = pm.user_id
  left join steam_links sl on sl.user_id = pm.user_id
  left join public.user_stats_extended ext on ext.user_id = pm.user_id
  where pm.party_id = v_party
    and nullif(ext.career->>'rankTier', '') is null
  limit 1;
  if v_norank.nome is not null then
    return jsonb_build_object('ok', false, 'error', 'no_rank', 'who', v_norank.nome);
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
