-- 045 — ranked-com-pro exige 1 PERMISSÃO + 1 ficha. Adiciona o gate de permissão à
-- RPC join_coach_queue (a checagem de ficha já existia). Consome 1 permissão ao entrar
-- (doutrinado = ilimitado, não consome). code 'need_permission' dispara o pop-up no client.
-- Aplicado em prod via Supabase MCP em 2026-06-03.
create or replace function public.join_coach_queue(p_coach_id uuid)
returns json language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_balance int;
  v_fila_aberta boolean;
  v_entry_id uuid;
  v_doctrinated boolean;
  v_permissions int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'code', 'unauthenticated', 'error', 'Não autenticado.');
  end if;

  -- GATE DE PERMISSÃO (freemium): doutrinado tem acesso livre; senão precisa de saldo.
  select (doctrine_accepted_at is not null) into v_doctrinated from profiles where id = v_user_id;
  if not coalesce(v_doctrinated, false) then
    select available_match_permissions(v_user_id) into v_permissions;
    if coalesce(v_permissions, 0) < 1 then
      return json_build_object('success', false, 'code', 'need_permission',
        'error', 'Responda 5 perguntas pra liberar 1 partida.');
    end if;
  end if;

  -- 1 query: balance E fila_aberta
  select uf.balance, c.fila_aberta into v_balance, v_fila_aberta
  from user_fichas uf, coaches c
  where uf.user_id = v_user_id and c.id = p_coach_id;

  if v_balance is null or v_balance <= 0 then
    return json_build_object('success', false, 'code', 'no_balance', 'error', 'Você não tem fichas disponíveis.');
  end if;
  if v_fila_aberta is null then
    return json_build_object('success', false, 'code', 'pro_not_found', 'error', 'PRO não encontrado.');
  end if;
  if not v_fila_aberta then
    return json_build_object('success', false, 'code', 'fila_closed', 'error', 'Fila do PRO está fechada.');
  end if;

  begin
    insert into coach_queue_entries (coach_id, user_id, status)
    values (p_coach_id, v_user_id, 'waiting')
    returning id into v_entry_id;
  exception when unique_violation then
    return json_build_object('success', false, 'code', 'duplicate', 'error', 'Você já está na fila desse PRO.');
  end;

  -- Consome 1 permissão (não-doutrinado). A ficha é debitada no fluxo de match existente.
  if not coalesce(v_doctrinated, false) then
    update profiles set match_permissions_consumed = match_permissions_consumed + 1 where id = v_user_id;
  end if;

  return json_build_object('success', true, 'entry_id', v_entry_id);
end;
$function$;
