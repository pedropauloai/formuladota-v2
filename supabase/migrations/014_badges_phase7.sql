-- Migration 014 — Phase 7 Badges + Stats Expandido
-- badges: catálogo público de conquistas
-- user_badges: conquistas por user (perfil público)
-- user_stats_extended: stats agregados externos (Stratz/OpenDota cache)

create table if not exists badges (
  id text primary key,
  name text not null,
  description text not null,
  icon_lucide text not null default 'Trophy',
  tier int not null default 1 check (tier between 1 and 4),
  criteria_json jsonb not null,
  created_at timestamptz default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  badge_id text references badges on delete cascade not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_user_badges_user on user_badges(user_id);

create table if not exists user_stats_extended (
  user_id uuid primary key references auth.users on delete cascade,
  hero_winrates jsonb default '{}'::jsonb,
  avg_kda numeric(5,2) default 0,
  avg_gpm numeric(6,1) default 0,
  avg_xpm numeric(6,1) default 0,
  total_matches int default 0,
  total_wins int default 0,
  source text default 'stratz' check (source in ('stratz','opendota','manual')),
  last_synced_at timestamptz,
  updated_at timestamptz default now()
);

-- RLS
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table user_stats_extended enable row level security;

drop policy if exists badges_select_all on badges;
create policy badges_select_all on badges for select using (true);

drop policy if exists user_badges_select_all on user_badges;
create policy user_badges_select_all on user_badges for select using (true);

drop policy if exists user_badges_self_insert on user_badges;
create policy user_badges_self_insert on user_badges
  for insert with check (auth.uid() = user_id);

drop policy if exists stats_ext_select_all on user_stats_extended;
create policy stats_ext_select_all on user_stats_extended for select using (true);

drop policy if exists stats_ext_self_upsert on user_stats_extended;
create policy stats_ext_self_upsert on user_stats_extended
  for all using (auth.uid() = user_id);

-- Seed: 12 badges iniciais
insert into badges (id, name, description, icon_lucide, tier, criteria_json) values
  ('first_match', 'Estreante', 'Jogou sua primeira partida FORMULADOTA', 'Trophy', 1, '{"type":"matches","value":1}'::jsonb),
  ('matches_10', 'Veterano', 'Jogou 10 partidas FORMULADOTA', 'Medal', 2, '{"type":"matches","value":10}'::jsonb),
  ('matches_50', 'Habituado', 'Jogou 50 partidas FORMULADOTA', 'Award', 3, '{"type":"matches","value":50}'::jsonb),
  ('matches_100', 'Pilar', 'Jogou 100 partidas FORMULADOTA', 'Crown', 4, '{"type":"matches","value":100}'::jsonb),
  ('first_win', 'Primeira Vitória', 'Venceu sua primeira partida', 'Star', 1, '{"type":"wins","value":1}'::jsonb),
  ('wins_25', 'Vencedor', 'Venceu 25 partidas', 'Sparkles', 2, '{"type":"wins","value":25}'::jsonb),
  ('streak_3', 'Maré Boa', 'Venceu 3 partidas seguidas', 'Flame', 2, '{"type":"win_streak","value":3}'::jsonb),
  ('streak_5', 'Em Brasa', 'Venceu 5 partidas seguidas', 'Zap', 3, '{"type":"win_streak","value":5}'::jsonb),
  ('mmr_3000', 'Disciplinado', 'Atingiu 3000 MMR', 'Shield', 2, '{"type":"mmr","value":3000}'::jsonb),
  ('mmr_5000', 'Soldado', 'Atingiu 5000 MMR', 'Sword', 3, '{"type":"mmr","value":5000}'::jsonb),
  ('mmr_7000', 'Imortal', 'Atingiu 7000 MMR', 'Gem', 4, '{"type":"mmr","value":7000}'::jsonb),
  ('doctrine_accepted', 'Iniciado na Doutrina', 'Aceitou a Doutrina FORMULADOTA', 'BookOpen', 1, '{"type":"doctrine","value":1}'::jsonb)
on conflict (id) do nothing;
