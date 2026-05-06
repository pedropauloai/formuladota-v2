-- Migration 021 — User Level System (Phase 8 / Gamification).
-- 30 levels, 6 tiers (Bronze/Silver/Gold/Platinum/Master/Grandmaster).
-- Free users até level 5; subscribers Formula+ progridem além.
-- Shards earned ao subir de level — moeda spendable em store/recursos.

create table if not exists user_levels (
  user_id uuid primary key references auth.users on delete cascade,
  current_level int not null default 1 check (current_level between 1 and 30),
  current_xp int not null default 0,
  total_xp_earned int not null default 0,
  total_shards_earned int not null default 0,
  current_shards int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists level_thresholds (
  level int primary key check (level between 1 and 30),
  xp_required int not null,
  total_xp int not null,
  shards_reward int not null,
  tier text not null check (tier in ('bronze','silver','gold','platinum','master','grandmaster')),
  is_free_tier boolean not null default false
);

insert into level_thresholds (level, xp_required, total_xp, shards_reward, tier, is_free_tier) values
  (1,    50,     50, 0,     'bronze',       true),
  (2,   300,    350, 1300,  'bronze',       true),
  (3,   400,    750, 1300,  'bronze',       true),
  (4,   500,   1250, 1300,  'bronze',       true),
  (5,   600,   1850, 1300,  'bronze',       true),
  (6,   900,   2750, 2400,  'silver',       false),
  (7,  1000,   3750, 2400,  'silver',       false),
  (8,  1100,   4850, 2400,  'silver',       false),
  (9,  1200,   6050, 2400,  'silver',       false),
  (10, 1300,   7350, 2400,  'silver',       false),
  (11, 1400,   8750, 2400,  'silver',       false),
  (12, 1700,  10450, 3200,  'gold',         false),
  (13, 1800,  12250, 3200,  'gold',         false),
  (14, 1900,  14150, 3200,  'gold',         false),
  (15, 2000,  16150, 3200,  'gold',         false),
  (16, 2100,  18250, 3200,  'gold',         false),
  (17, 2200,  20450, 3200,  'gold',         false),
  (18, 2500,  22950, 4000,  'platinum',     false),
  (19, 2600,  25550, 4000,  'platinum',     false),
  (20, 2700,  28250, 4000,  'platinum',     false),
  (21, 2800,  31050, 4000,  'platinum',     false),
  (22, 2900,  33950, 4000,  'platinum',     false),
  (23, 3000,  36950, 4000,  'platinum',     false),
  (24, 3100,  40050, 4000,  'platinum',     false),
  (25, 6800,  46850, 9700,  'master',       false),
  (26, 4000,  50850, 4800,  'master',       false),
  (27, 4200,  55050, 4800,  'master',       false),
  (28, 4400,  59450, 4800,  'master',       false),
  (29, 4600,  64050, 4800,  'master',       false),
  (30, 8000,  72050, 10000, 'grandmaster',  false)
on conflict (level) do update set
  xp_required = excluded.xp_required,
  total_xp = excluded.total_xp,
  shards_reward = excluded.shards_reward,
  tier = excluded.tier,
  is_free_tier = excluded.is_free_tier;

create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  source text not null,
  xp_amount int not null,
  shards_awarded int default 0,
  level_before int,
  level_after int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_xp_events_user on xp_events(user_id, created_at desc);

alter table user_levels enable row level security;
alter table level_thresholds enable row level security;
alter table xp_events enable row level security;

drop policy if exists user_levels_select_all on user_levels;
create policy user_levels_select_all on user_levels for select using (true);

drop policy if exists level_thresholds_select_all on level_thresholds;
create policy level_thresholds_select_all on level_thresholds for select using (true);

drop policy if exists xp_events_select_self on xp_events;
create policy xp_events_select_self on xp_events for select using (auth.uid() = user_id);

create or replace function public.award_xp(
  p_user_id uuid,
  p_amount int,
  p_source text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_level int;
  v_total_xp int;
  v_new_level int;
  v_threshold record;
  v_shards_to_award int := 0;
  v_max_level_for_user int;
  v_has_sub boolean;
  v_xp_at_new_level int;
begin
  insert into user_levels (user_id) values (p_user_id) on conflict do nothing;

  select current_level, total_xp_earned into v_current_level, v_total_xp
  from user_levels where user_id = p_user_id;

  select exists(select 1 from subscriptions where user_id = p_user_id and status = 'authorized')
    or exists(select 1 from profiles where id = p_user_id and is_admin = true)
    into v_has_sub;

  v_max_level_for_user := case when v_has_sub then 30 else 5 end;

  v_total_xp := v_total_xp + p_amount;
  v_new_level := v_current_level;

  for v_threshold in
    select level, total_xp, shards_reward
    from level_thresholds
    where level > v_current_level
      and level <= v_max_level_for_user
      and total_xp <= v_total_xp
    order by level
  loop
    v_new_level := v_threshold.level;
    v_shards_to_award := v_shards_to_award + v_threshold.shards_reward;
  end loop;

  select total_xp - xp_required into v_xp_at_new_level
  from level_thresholds where level = v_new_level;

  update user_levels set
    current_level = v_new_level,
    current_xp = v_total_xp - v_xp_at_new_level,
    total_xp_earned = v_total_xp,
    current_shards = current_shards + v_shards_to_award,
    total_shards_earned = total_shards_earned + v_shards_to_award,
    updated_at = now()
  where user_id = p_user_id;

  insert into xp_events (user_id, source, xp_amount, shards_awarded, level_before, level_after, metadata)
  values (p_user_id, p_source, p_amount, v_shards_to_award, v_current_level, v_new_level, p_metadata);
end;
$$;

grant execute on function public.award_xp(uuid, int, text, jsonb) to service_role, authenticated;

-- Triggers automáticos
create or replace function public.award_xp_on_match_complete()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_player record;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    for v_player in select user_id from lobby_players
      where lobby_id = new.id and team in ('radiant','dire') loop
      perform award_xp(v_player.user_id, 50, 'match_completed', jsonb_build_object('lobby_id', new.id));
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_xp_match on lobbies;
create trigger trg_award_xp_match after update of status on lobbies
  for each row execute function award_xp_on_match_complete();

create or replace function public.award_xp_on_doctrine_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.doctrine_accepted_at is not null
     and (old.doctrine_accepted_at is null or old.doctrine_accepted_at <> new.doctrine_accepted_at) then
    perform award_xp(new.id, 500, 'doctrine_accepted', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_xp_doctrine on profiles;
create trigger trg_award_xp_doctrine after update of doctrine_accepted_at on profiles
  for each row execute function award_xp_on_doctrine_accept();

create or replace function public.award_xp_on_badge_earned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform award_xp(new.user_id, 100, 'badge_earned', jsonb_build_object('badge_id', new.badge_id));
  return new;
end;
$$;

drop trigger if exists trg_award_xp_badge on user_badges;
create trigger trg_award_xp_badge after insert on user_badges
  for each row execute function award_xp_on_badge_earned();

create or replace function public.award_xp_on_tournament_register()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_member record;
begin
  for v_member in select user_id from team_members where team_id = new.team_id loop
    perform award_xp(v_member.user_id, 300, 'tournament_register',
      jsonb_build_object('tournament_id', new.tournament_id, 'team_id', new.team_id));
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_award_xp_tournament_reg on tournament_teams;
create trigger trg_award_xp_tournament_reg after insert on tournament_teams
  for each row execute function award_xp_on_tournament_register();
