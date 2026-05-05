-- Migration 016 — Phase 7 triggers de award automático de badges.
-- Avalia critérios em INSERT/UPDATE de player_season_mmr e profiles.doctrine_accepted_at.
-- ON CONFLICT DO NOTHING pra idempotência (badge não duplica).

create or replace function public.award_badges_from_mmr_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := new.user_id;
begin
  if new.partidas_total >= 1 then
    insert into user_badges (user_id, badge_id) values (uid, 'first_match')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.partidas_total >= 10 then
    insert into user_badges (user_id, badge_id) values (uid, 'matches_10')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.partidas_total >= 50 then
    insert into user_badges (user_id, badge_id) values (uid, 'matches_50')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.partidas_total >= 100 then
    insert into user_badges (user_id, badge_id) values (uid, 'matches_100')
    on conflict (user_id, badge_id) do nothing;
  end if;

  if new.vitorias >= 1 then
    insert into user_badges (user_id, badge_id) values (uid, 'first_win')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.vitorias >= 25 then
    insert into user_badges (user_id, badge_id) values (uid, 'wins_25')
    on conflict (user_id, badge_id) do nothing;
  end if;

  if new.mmr >= 3000 then
    insert into user_badges (user_id, badge_id) values (uid, 'mmr_3000')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.mmr >= 5000 then
    insert into user_badges (user_id, badge_id) values (uid, 'mmr_5000')
    on conflict (user_id, badge_id) do nothing;
  end if;
  if new.mmr >= 7000 then
    insert into user_badges (user_id, badge_id) values (uid, 'mmr_7000')
    on conflict (user_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_badges_mmr on player_season_mmr;
create trigger trg_award_badges_mmr
  after insert or update of mmr, vitorias, partidas_total on player_season_mmr
  for each row execute function award_badges_from_mmr_change();

create or replace function public.award_doctrine_badge_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.doctrine_accepted_at is not null
     and (old.doctrine_accepted_at is null or old.doctrine_accepted_at <> new.doctrine_accepted_at) then
    insert into user_badges (user_id, badge_id) values (new.id, 'doctrine_accepted')
    on conflict (user_id, badge_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_doctrine_badge on profiles;
create trigger trg_award_doctrine_badge
  after update of doctrine_accepted_at on profiles
  for each row execute function award_doctrine_badge_on_accept();

-- Backfill retroativo: re-aplica critérios em rows existentes
do $$
declare
  rec record;
begin
  for rec in select id from profiles where doctrine_accepted_at is not null loop
    insert into user_badges (user_id, badge_id) values (rec.id, 'doctrine_accepted')
    on conflict (user_id, badge_id) do nothing;
  end loop;

  for rec in select user_id, mmr, vitorias, partidas_total from player_season_mmr loop
    if rec.partidas_total >= 1 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'first_match') on conflict do nothing;
    end if;
    if rec.partidas_total >= 10 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'matches_10') on conflict do nothing;
    end if;
    if rec.partidas_total >= 50 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'matches_50') on conflict do nothing;
    end if;
    if rec.partidas_total >= 100 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'matches_100') on conflict do nothing;
    end if;
    if rec.vitorias >= 1 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'first_win') on conflict do nothing;
    end if;
    if rec.vitorias >= 25 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'wins_25') on conflict do nothing;
    end if;
    if rec.mmr >= 3000 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'mmr_3000') on conflict do nothing;
    end if;
    if rec.mmr >= 5000 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'mmr_5000') on conflict do nothing;
    end if;
    if rec.mmr >= 7000 then
      insert into user_badges (user_id, badge_id) values (rec.user_id, 'mmr_7000') on conflict do nothing;
    end if;
  end loop;
end$$;
