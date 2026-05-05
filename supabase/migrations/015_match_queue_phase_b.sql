-- Migration 015 — Fase B Matchmaking
-- match_queue: fila de jogadores procurando partida
-- parties: grupos de até 5 jogadores que entram juntos
-- party_members: membros de uma party

create type queue_status as enum ('waiting', 'matched', 'cancelled');

create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now()
);

create table if not exists party_members (
  party_id uuid references parties on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (party_id, user_id)
);

create index if not exists idx_party_members_user on party_members(user_id);

create table if not exists match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  party_id uuid references parties on delete cascade,
  region text default 'brasil',
  game_mode text default 'all_pick',
  roles jsonb default '[]'::jsonb,
  status queue_status default 'waiting',
  joined_at timestamptz default now(),
  matched_at timestamptz,
  matched_lobby_id uuid references lobbies on delete set null
);

create unique index if not exists idx_match_queue_unique_waiting
  on match_queue(user_id) where status = 'waiting';

create index if not exists idx_match_queue_status_joined
  on match_queue(status, joined_at) where status = 'waiting';

alter table parties enable row level security;
alter table party_members enable row level security;
alter table match_queue enable row level security;

drop policy if exists parties_select_member on parties;
create policy parties_select_member on parties for select using (
  auth.uid() = leader_id
  or exists (select 1 from party_members where party_id = parties.id and user_id = auth.uid())
);

drop policy if exists parties_insert_self on parties;
create policy parties_insert_self on parties for insert with check (auth.uid() = leader_id);

drop policy if exists parties_delete_leader on parties;
create policy parties_delete_leader on parties for delete using (auth.uid() = leader_id);

drop policy if exists party_members_select_member on party_members;
create policy party_members_select_member on party_members for select using (
  user_id = auth.uid()
  or exists (select 1 from parties p where p.id = party_members.party_id and p.leader_id = auth.uid())
);

drop policy if exists party_members_insert_leader on party_members;
create policy party_members_insert_leader on party_members for insert with check (
  exists (select 1 from parties p where p.id = party_members.party_id and p.leader_id = auth.uid())
);

drop policy if exists party_members_delete_self_or_leader on party_members;
create policy party_members_delete_self_or_leader on party_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from parties p where p.id = party_members.party_id and p.leader_id = auth.uid())
);

drop policy if exists queue_select_self on match_queue;
create policy queue_select_self on match_queue for select using (auth.uid() = user_id);

drop policy if exists queue_insert_self on match_queue;
create policy queue_insert_self on match_queue for insert with check (
  auth.uid() = user_id
  and has_active_subscription()
);

drop policy if exists queue_update_self on match_queue;
create policy queue_update_self on match_queue for update using (auth.uid() = user_id);

drop policy if exists queue_delete_self on match_queue;
create policy queue_delete_self on match_queue for delete using (auth.uid() = user_id);
