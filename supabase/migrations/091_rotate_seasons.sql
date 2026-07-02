-- 091_rotate_seasons.sql — Ciclo de temporada (Fase 6). Ver docs/foundations/RANKING_SYSTEM.md.
-- rotate_seasons() fecha a season NÃO-beta vencida (grava season_achievements =
-- imortalização permanente) e ativa a season que já começou (ex.: beta → S1 em 01/ago).
-- Idempotente (só age quando há algo vencido/pra ativar). Agendada via pg_cron (diária).
-- O soft reset -30% é aplicado na 1ª partida da season nova (applySeasonDecay em
-- src/lib/queries/apply-match-mmr.ts — carry-over da season anterior como semente).
create or replace function public.rotate_seasons()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_now timestamptz := now();
  v_cur record;
  v_next_id int;
  v_closed int := 0;
  v_activated int := 0;
begin
  -- 1) Fecha seasons NÃO-beta ativas cujo tempo acabou: grava conquistas (só calibrados).
  for v_cur in
    select id from public.seasons
    where active and not beta and ended_at is not null and ended_at <= v_now
  loop
    insert into public.season_achievements
      (user_id, season_id, final_medal, final_stars, final_mmr, leaderboard_rank, title)
    select x.user_id, x.season_id, x.medal, 0, x.mmr,
           case when x.rnk <= 100 then x.rnk else null end,
           case
             when x.mmr >= 6000 then 'Imortal' || (case when x.rnk <= 100 then ' · Top ' || x.rnk else '' end)
             when x.mmr >= 5000 then 'Divino'
             when x.mmr >= 4000 then 'Ancião'
             when x.mmr >= 3000 then 'Lenda'
             when x.mmr >= 2000 then 'Arconte'
             when x.mmr >= 1500 then 'Cruzado'
             when x.mmr >= 770  then 'Guardião'
             else 'Arauto'
           end
    from (
      select user_id, season_id, mmr,
        (case
           when mmr >= 6000 then 'immortal' when mmr >= 5000 then 'divine'
           when mmr >= 4000 then 'ancient'  when mmr >= 3000 then 'legend'
           when mmr >= 2000 then 'archon'   when mmr >= 1500 then 'crusader'
           when mmr >= 770  then 'guardian' else 'herald'
         end) as medal,
        row_number() over (order by mmr desc) as rnk
      from public.player_season_mmr
      where season_id = v_cur.id and calibrated
    ) x
    on conflict (user_id, season_id) do nothing;

    update public.seasons set active = false where id = v_cur.id;
    v_closed := v_closed + 1;
  end loop;

  -- 2) Ativa a season NÃO-beta que já começou e ainda não terminou.
  select id into v_next_id from public.seasons
   where not beta and not active and started_at <= v_now and (ended_at is null or ended_at > v_now)
   order by season_number asc
   limit 1;

  if v_next_id is not null then
    update public.seasons set active = false where active;  -- desativa beta/vencida
    update public.seasons set active = true where id = v_next_id;
    v_activated := v_next_id;
  end if;

  return jsonb_build_object('closed', v_closed, 'activated', v_activated, 'at', v_now);
end;
$function$;

revoke execute on function public.rotate_seasons() from anon, authenticated, public;

-- Agenda diária (00:05). Idempotente.
select cron.schedule('rotate-seasons', '5 0 * * *', $$select public.rotate_seasons();$$);
