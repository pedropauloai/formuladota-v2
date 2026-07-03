-- 113 — MMR médio dos times por partida, pra a aba MMR explicar "favorito vs zebra"
-- (Pedro 2026-07-03). O delta Elo já é calculado a partir da média de MMR de cada
-- time (calculateMmrDelta), mas esse valor não era PERSISTIDO — então a aba não tinha
-- como mostrar ao jogador por que a vitória valeu mais/menos. Agora:
--   - match_details (tabela PÚBLICA, feed do placar) ganha radiant_avg_mmr/dire_avg_mmr;
--   - apply_match_mmr recebe as médias e as grava lá (DEFINER, junto da aplicação).
-- Gravamos em match_details (não em matches) porque matches tem RLS restrita
-- (auth.uid()=user_id OR is_admin) e não serve pro público — a aba lê match_details.

alter table public.match_details
  add column if not exists radiant_avg_mmr int,
  add column if not exists dire_avg_mmr int;

-- Recria apply_match_mmr com 2 params opcionais (médias dos times). Defaults NULL
-- mantêm compat com qualquer chamada de 3 args. Corpo idêntico ao da migration 104,
-- + a gravação das médias em match_details no fim.
drop function if exists public.apply_match_mmr(uuid, integer, jsonb);

create or replace function public.apply_match_mmr(
  p_match_id uuid,
  p_season_id integer,
  p_results jsonb,
  p_radiant_avg integer default null,
  p_dire_avg integer default null
)
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

  -- Persiste as médias de MMR de cada time na tabela pública do placar (a aba MMR
  -- lê daqui pra explicar favorito/zebra). match_details já existe (upsert no enrich).
  if p_radiant_avg is not null or p_dire_avg is not null then
    update public.match_details
      set radiant_avg_mmr = p_radiant_avg,
          dire_avg_mmr    = p_dire_avg
      where match_id = p_match_id;
  end if;

  return v_applied;
end;
$function$;

grant execute on function public.apply_match_mmr(uuid, integer, jsonb, integer, integer) to authenticated;
