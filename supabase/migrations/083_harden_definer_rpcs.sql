-- 083_harden_definer_rpcs.sql — Endurecimento de RPCs SECURITY DEFINER (auditoria 2026-07-01).
-- Fecha escaladas de privilégio: funções DEFINER executáveis por authenticated/anon
-- que NÃO validavam quem chama (mesma classe do bug já corrigido em grant_cosmetic/081).
--
-- Estratégia:
--   • award_xp / ensure_player_season_mmr / consume_pt_fichas: NÃO têm caller client
--     (só triggers internos e service role) → REVOGAR execute de anon/authenticated.
--   • reserve_bot_for_lobby / cancel_pro_waiting_entries: TÊM caller authenticated
--     legítimo (criar-lobby / togglePROFila) → manter execute, mas VALIDAR o caller
--     (dono do lobby/coach ou admin) dentro da função.

-- === REVOGAÇÕES (só service role + triggers usam) ================================

-- award_xp: qualquer logado podia se auto-conceder XP/nível ilimitado (CRÍTICO).
revoke execute on function public.award_xp(uuid, integer, text, jsonb) from anon, authenticated, public;

-- ensure_player_season_mmr: sem caller client (só types); cria linha de MMR de terceiro.
revoke execute on function public.ensure_player_season_mmr(uuid) from anon, authenticated, public;

-- consume_pt_fichas: só o trigger trg_match_realizada chama (roda como definer).
revoke execute on function public.consume_pt_fichas(uuid) from anon, authenticated, public;

-- === VALIDAÇÃO INTERNA (mantêm execute a authenticated) ==========================

-- cancel_pro_waiting_entries: só o PRO dono da fila (ou admin) pode cancelar.
create or replace function public.cancel_pro_waiting_entries(p_coach_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cancelled_count integer;
begin
  if not (
    public.is_admin()
    or exists (select 1 from public.coaches c where c.id = p_coach_id and c.profile_id = auth.uid())
  ) then
    raise exception 'sem permissão pra cancelar a fila deste PRO';
  end if;

  update coach_queue_entries
  set status = 'cancelled', consumed_at = now()
  where coach_id = p_coach_id and status = 'waiting';
  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$function$;

-- reserve_bot_for_lobby: só o criador do lobby (ou admin) pode reservar bot pra ele
-- (evita DoS do pool: marcar todos os bots como busy em lobbies arbitrários).
create or replace function public.reserve_bot_for_lobby(p_lobby_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bot_account text;
begin
  if not (
    public.is_admin()
    or exists (select 1 from public.lobbies l where l.id = p_lobby_id and l.created_by = auth.uid())
  ) then
    raise exception 'sem permissão pra reservar bot neste lobby';
  end if;

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
$function$;
