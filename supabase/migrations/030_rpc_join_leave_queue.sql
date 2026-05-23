-- RPC functions consolidadas pra reduzir round-trips ao server.
-- Aplicado em 2026-05-23 via MCP Supabase.
--
-- join_coach_queue: balance + fila_aberta + insert atomicamente
-- leave_coach_queue: ownership check + update atomicamente
-- Retornam JSON {success, entry_id?, error?, code?} pra UI tratar erros.

CREATE OR REPLACE FUNCTION public.join_coach_queue(p_coach_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance INT;
  v_fila_aberta BOOLEAN;
  v_entry_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'unauthenticated', 'error', 'Não autenticado.');
  END IF;

  SELECT uf.balance, c.fila_aberta INTO v_balance, v_fila_aberta
  FROM user_fichas uf, coaches c
  WHERE uf.user_id = v_user_id AND c.id = p_coach_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RETURN json_build_object('success', false, 'code', 'no_balance', 'error', 'Você não tem fichas disponíveis.');
  END IF;
  IF v_fila_aberta IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'pro_not_found', 'error', 'PRO não encontrado.');
  END IF;
  IF NOT v_fila_aberta THEN
    RETURN json_build_object('success', false, 'code', 'fila_closed', 'error', 'Fila do PRO está fechada.');
  END IF;

  BEGIN
    INSERT INTO coach_queue_entries (coach_id, user_id, status)
    VALUES (p_coach_id, v_user_id, 'waiting')
    RETURNING id INTO v_entry_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'code', 'duplicate', 'error', 'Você já está na fila desse PRO.');
  END;

  RETURN json_build_object('success', true, 'entry_id', v_entry_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_coach_queue(p_entry_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_owner_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'unauthenticated', 'error', 'Não autenticado.');
  END IF;

  SELECT user_id, status INTO v_owner_id, v_status
  FROM coach_queue_entries WHERE id = p_entry_id;

  IF v_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'not_found', 'error', 'Entry não encontrada.');
  END IF;
  IF v_owner_id != v_user_id THEN
    RETURN json_build_object('success', false, 'code', 'forbidden', 'error', 'Você não pode sair dessa fila.');
  END IF;
  IF v_status != 'waiting' THEN
    RETURN json_build_object('success', false, 'code', 'not_waiting', 'error', 'Entry não está aguardando.');
  END IF;

  UPDATE coach_queue_entries SET status = 'cancelled' WHERE id = p_entry_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_coach_queue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_coach_queue(UUID) TO authenticated;
