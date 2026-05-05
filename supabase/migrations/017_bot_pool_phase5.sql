-- Migration 017 — Bot pool architecture.
-- V1: single bot 'main' (já preparado pra N bots em V2 quando demanda crescer).
-- bots: cada conta Steam dedicada vira uma row.
-- reserve_bot_for_lobby: pega 1 bot disponível atomicamente (FOR UPDATE SKIP LOCKED).
-- release_bot_on_lobby_end: libera bot quando lobby termina/cancela.

create table if not exists bots (
  account_name text primary key,
  display_name text not null default '',
  status text not null default 'idle' check (status in ('idle', 'busy', 'offline', 'maintenance')),
  current_lobby_id uuid references lobbies on delete set null,
  api_url text,
  last_heartbeat_at timestamptz,
  created_at timestamptz default now(),
  notes text
);

create index if not exists idx_bots_status on bots(status);

insert into bots (account_name, display_name, status)
values ('main', 'FORMULADOTA Bot Principal', 'idle')
on conflict (account_name) do nothing;

alter table lobbies
  add column if not exists bot_account_name text
  references bots(account_name) on delete set null;

create or replace function public.reserve_bot_for_lobby(p_lobby_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot_account text;
begin
  with picked as (
    select account_name
    from bots
    where status = 'idle'
    order by last_heartbeat_at nulls first, account_name
    limit 1
    for update skip locked
  )
  update bots b
  set status = 'busy',
      current_lobby_id = p_lobby_id,
      last_heartbeat_at = now()
  from picked
  where b.account_name = picked.account_name
  returning b.account_name into v_bot_account;

  if v_bot_account is null then
    return null;
  end if;

  update lobbies set bot_account_name = v_bot_account where id = p_lobby_id;
  return v_bot_account;
end;
$$;

grant execute on function public.reserve_bot_for_lobby(uuid) to authenticated, service_role;

create or replace function public.release_bot(p_account_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update bots
  set status = 'idle', current_lobby_id = null, last_heartbeat_at = now()
  where account_name = p_account_name;
end;
$$;

grant execute on function public.release_bot(text) to service_role;

create or replace function public.release_bot_on_lobby_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('completed', 'cancelled')
     and old.status not in ('completed', 'cancelled')
     and new.bot_account_name is not null then
    update bots
    set status = 'idle', current_lobby_id = null, last_heartbeat_at = now()
    where account_name = new.bot_account_name
      and current_lobby_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_release_bot_on_lobby_end on lobbies;
create trigger trg_release_bot_on_lobby_end
  after update of status on lobbies
  for each row execute function release_bot_on_lobby_end();

create or replace view bot_pool_status as
select
  count(*) filter (where status = 'idle') as bots_idle,
  count(*) filter (where status = 'busy') as bots_busy,
  count(*) filter (where status = 'offline') as bots_offline,
  count(*) filter (where status = 'maintenance') as bots_maintenance,
  count(*) as bots_total
from bots;

grant select on bot_pool_status to authenticated, anon;

alter table bots enable row level security;
drop policy if exists bots_select_all on bots;
create policy bots_select_all on bots for select using (true);
