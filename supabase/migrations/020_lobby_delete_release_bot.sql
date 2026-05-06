-- Migration 020 — Trigger BEFORE DELETE em lobbies pra liberar bot.
-- Complementa trigger 017 (release_bot_on_lobby_end em UPDATE status) cobrindo
-- o caso "líder saiu → DELETE FROM lobbies" implementado em leaveLobby().

create or replace function public.release_bot_before_lobby_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.bot_account_name is not null then
    update bots
    set status = 'idle', current_lobby_id = null, last_heartbeat_at = now()
    where account_name = old.bot_account_name
      and current_lobby_id = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_release_bot_before_lobby_delete on lobbies;
create trigger trg_release_bot_before_lobby_delete
  before delete on lobbies
  for each row execute function release_bot_before_lobby_delete();
