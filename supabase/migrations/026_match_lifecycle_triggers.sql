-- MVP fichas: ficha só é cobrada quando PT é confirmada como realizada.
-- Aplicado em 2026-05-21 via MCP Supabase.
--
-- entry.status:   waiting -> in_match -> consumed
--                              ↓
--                          cancelled
--
-- match.status:   agendada -> realizada (trigger consome fichas)
--                          -> cancelada (sem cobrança)

ALTER TABLE coach_queue_entries
  DROP CONSTRAINT IF EXISTS coach_queue_entries_status_check;
ALTER TABLE coach_queue_entries
  ADD CONSTRAINT coach_queue_entries_status_check
  CHECK (status IN ('waiting', 'in_match', 'consumed', 'cancelled'));

CREATE OR REPLACE FUNCTION consume_pt_fichas(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, user_id
    FROM coach_queue_entries
    WHERE match_id = p_match_id AND status = 'in_match'
  LOOP
    INSERT INTO ficha_ledger (user_id, delta, source, source_id, reason)
    VALUES (r.user_id, -1, 'pt_consumed', p_match_id,
            'PT realizada (match ' || substring(p_match_id::text from 1 for 8) || ')');
    UPDATE coach_queue_entries
    SET status = 'consumed', consumed_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trg_match_realizada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'realizada' AND OLD.status = 'agendada' THEN
    PERFORM consume_pt_fichas(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_realizada_consume ON matches;
CREATE TRIGGER trg_match_realizada_consume
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION trg_match_realizada();

CREATE OR REPLACE FUNCTION trg_cascade_cancel_other_filas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'consumed' AND OLD.status = 'in_match' THEN
    UPDATE coach_queue_entries
    SET status = 'cancelled', consumed_at = now()
    WHERE user_id = NEW.user_id
      AND status = 'waiting'
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_other_filas ON coach_queue_entries;
CREATE TRIGGER trg_cascade_other_filas
AFTER UPDATE OF status ON coach_queue_entries
FOR EACH ROW
EXECUTE FUNCTION trg_cascade_cancel_other_filas();

CREATE OR REPLACE FUNCTION cancel_pro_waiting_entries(p_coach_id UUID, p_reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE coach_queue_entries
  SET status = 'cancelled', consumed_at = now()
  WHERE coach_id = p_coach_id AND status = 'waiting';
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_pro_waiting_entries(UUID, TEXT) TO authenticated;
