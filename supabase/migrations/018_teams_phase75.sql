-- Migration 018 — Teams (Phase 7.5).
-- teams: registro de times competitivos. Slug único pra URL pública.
-- team_members: roster (max 7: 5 titulares + 2 reservas).
-- team_invites: lifecycle accept/decline com expires_at.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null check (length(name) between 3 and 60),
  tag text not null check (tag ~ '^[A-Z0-9]{2,5}$'),
  captain_id uuid references auth.users on delete cascade not null,
  logo_url text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_teams_captain on teams(captain_id);

create table if not exists team_members (
  team_id uuid references teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'player' check (role in ('captain', 'player', 'sub')),
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on team_members(user_id);

create or replace function public.check_team_size()
returns trigger language plpgsql as $$
begin
  if (select count(*) from team_members where team_id = new.team_id) >= 7 then
    raise exception 'Time já tem 7 membros (máx 5 titulares + 2 reservas)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_team_size on team_members;
create trigger trg_check_team_size before insert on team_members
  for each row execute function check_team_size();

create or replace function public.add_captain_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into team_members (team_id, user_id, role)
  values (new.id, new.captain_id, 'captain') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_add_captain_as_member on teams;
create trigger trg_add_captain_as_member after insert on teams
  for each row execute function add_captain_as_member();

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams on delete cascade not null,
  invited_user_id uuid references auth.users on delete cascade not null,
  invited_by uuid references auth.users on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  message text,
  created_at timestamptz default now(),
  responded_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  unique(team_id, invited_user_id, status) deferrable initially deferred
);

create index if not exists idx_team_invites_user on team_invites(invited_user_id, status);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;

drop policy if exists teams_select_all on teams;
create policy teams_select_all on teams for select using (true);
drop policy if exists teams_insert_self on teams;
create policy teams_insert_self on teams for insert with check (auth.uid() = captain_id);
drop policy if exists teams_update_captain on teams;
create policy teams_update_captain on teams for update using (auth.uid() = captain_id);
drop policy if exists teams_delete_captain on teams;
create policy teams_delete_captain on teams for delete using (auth.uid() = captain_id);

drop policy if exists team_members_select_all on team_members;
create policy team_members_select_all on team_members for select using (true);
drop policy if exists team_members_insert_captain on team_members;
create policy team_members_insert_captain on team_members for insert with check (
  exists (select 1 from teams t where t.id = team_members.team_id and t.captain_id = auth.uid())
);
drop policy if exists team_members_delete_self_or_captain on team_members;
create policy team_members_delete_self_or_captain on team_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from teams t where t.id = team_members.team_id and t.captain_id = auth.uid())
);

drop policy if exists team_invites_select_relevant on team_invites;
create policy team_invites_select_relevant on team_invites for select using (
  invited_user_id = auth.uid()
  or invited_by = auth.uid()
  or exists (select 1 from teams t where t.id = team_invites.team_id and t.captain_id = auth.uid())
);
drop policy if exists team_invites_insert_captain on team_invites;
create policy team_invites_insert_captain on team_invites for insert with check (
  exists (select 1 from teams t where t.id = team_invites.team_id and t.captain_id = auth.uid())
  and invited_by = auth.uid()
);
drop policy if exists team_invites_update_invited on team_invites;
create policy team_invites_update_invited on team_invites for update using (
  invited_user_id = auth.uid()
  or exists (select 1 from teams t where t.id = team_invites.team_id and t.captain_id = auth.uid())
);

create or replace function public.accept_team_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_invite team_invites%rowtype;
begin
  select * into v_invite from team_invites where id = p_invite_id;
  if v_invite.id is null then raise exception 'Convite não encontrado'; end if;
  if v_invite.invited_user_id <> auth.uid() then raise exception 'Convite não é seu'; end if;
  if v_invite.status <> 'pending' then raise exception 'Convite já foi respondido'; end if;
  if v_invite.expires_at < now() then
    update team_invites set status = 'expired' where id = p_invite_id;
    raise exception 'Convite expirado';
  end if;

  insert into team_members (team_id, user_id, role)
  values (v_invite.team_id, v_invite.invited_user_id, 'player') on conflict do nothing;

  update team_invites set status = 'accepted', responded_at = now() where id = p_invite_id;
end;
$$;

grant execute on function public.accept_team_invite(uuid) to authenticated;
