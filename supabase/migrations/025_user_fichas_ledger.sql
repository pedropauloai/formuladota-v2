-- Sistema de fichas com ledger pattern.
-- user_fichas = saldo materializado (1 row por user, balance >= 0)
-- ficha_ledger = histórico imutável de movimentos
-- Trigger AFTER INSERT em ledger atualiza balance automaticamente.
-- Aplicado em 2026-05-21 via MCP Supabase.

DO $$ BEGIN
  CREATE TYPE ficha_source AS ENUM (
    'purchase',
    'admin_grant',
    'admin_debit',
    'pt_consumed',
    'refund'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_fichas (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_fichas IS 'Saldo de fichas materializado por user (sempre derivável do ledger)';

CREATE TABLE IF NOT EXISTS ficha_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta != 0),
  source ficha_source NOT NULL,
  source_id UUID,
  reason TEXT,
  admin_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ficha_ledger_user_idx
  ON ficha_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ficha_ledger_admin_idx
  ON ficha_ledger (admin_user_id, created_at DESC)
  WHERE admin_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ficha_ledger_source_idx
  ON ficha_ledger (source, created_at DESC);

COMMENT ON TABLE ficha_ledger IS 'Histórico imutável de movimentos de ficha. Trigger atualiza user_fichas.';

CREATE OR REPLACE FUNCTION apply_ficha_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_fichas (user_id, balance, updated_at)
  VALUES (NEW.user_id, NEW.delta, now())
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_fichas.balance + NEW.delta,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ficha_ledger ON ficha_ledger;
CREATE TRIGGER trg_apply_ficha_ledger
AFTER INSERT ON ficha_ledger
FOR EACH ROW
EXECUTE FUNCTION apply_ficha_ledger();

ALTER TABLE user_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own balance"
  ON user_fichas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin sees all balance"
  ON user_fichas FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "user sees own ledger"
  ON ficha_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin manages ledger"
  ON ficha_ledger FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

ALTER TABLE coach_queue_entries
  ALTER COLUMN purchase_id DROP NOT NULL;

COMMENT ON COLUMN coach_queue_entries.purchase_id IS
  'Purchase origem da ficha (legacy/opcional). Em ledger pattern, consumo cria ledger entry pt_consumed.';
