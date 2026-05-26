-- ============================================================================
-- Migration 035 — Friendships (Phase 9 — Perfil Dota 2 + Social)
-- ============================================================================
-- Sistema mutual de amizades estilo Dota 2/Discord:
--   - User A envia pedido (status=pending)
--   - User B aceita (status=accepted) ou rejeita (DELETE — decisão Pedro)
--   - Qualquer participante pode remover (DELETE) ou bloquear (status=blocked)
--
-- Constraints anti-burlamento:
--   - no_self_friendship: requester != addressee
--   - unique_pair: previne duplicata bidirecional (pitfall 6 RESEARCH —
--     LEAST/GREATEST via UNIQUE INDEX funcional)
--
-- RLS (D-30): user só vê/manipula friendships onde participa.
-- Indexes (D-33): queries "minhas amizades aceitas" e "pedidos pendentes" rápidas.
--
-- Per decisões D-27 a D-33 (CONTEXT 09 — Pedro aprovou em discuss-phase).
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Impede self-friendship
  CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id)
);

-- Previne duplicatas bidirecionais (pitfall 6):
-- UNIQUE INDEX funcional com LEAST/GREATEST garante que (A,B) e (B,A) colidam.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair
  ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

-- Indexes pra queries de pedidos pendentes e amizades aceitas (D-33)
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
  ON friendships (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
  ON friendships (addressee_id, status);

-- Trigger pra updated_at automático (padrão consistente com outras tables)
CREATE OR REPLACE FUNCTION friendships_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS friendships_updated_at_trigger ON friendships;
CREATE TRIGGER friendships_updated_at_trigger
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION friendships_set_updated_at();

-- ============================================================================
-- RLS Policies (D-30)
-- ============================================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: user vê friendships onde é requester OU addressee
DROP POLICY IF EXISTS "User sees own friendships" ON friendships;
CREATE POLICY "User sees own friendships" ON friendships
  FOR SELECT
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- INSERT: user só pode INSERT como requester (não pode forjar pedido de outro user)
DROP POLICY IF EXISTS "User sends friend request" ON friendships;
CREATE POLICY "User sends friend request" ON friendships
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
  );

-- UPDATE: qualquer participante (requester ou addressee) pode atualizar status
-- (ex: addressee aceita pending → accepted; requester cancela)
DROP POLICY IF EXISTS "Participants update friendship" ON friendships;
CREATE POLICY "Participants update friendship" ON friendships
  FOR UPDATE
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  )
  WITH CHECK (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- DELETE: qualquer participante pode remover a amizade
-- (decisão Pedro: rejected = DELETE imediato)
DROP POLICY IF EXISTS "Participants delete friendship" ON friendships;
CREATE POLICY "Participants delete friendship" ON friendships
  FOR DELETE
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- ============================================================================
-- Comments documentando schema (visível no Supabase Studio)
-- ============================================================================

COMMENT ON TABLE  friendships                IS 'Amizades mutuais estilo Dota 2/Discord. RLS por participação. Pitfall 6: unique_pair previne duplicata bidirecional via LEAST/GREATEST.';
COMMENT ON COLUMN friendships.requester_id   IS 'Quem enviou o pedido inicial.';
COMMENT ON COLUMN friendships.addressee_id   IS 'Quem recebeu o pedido. Pode aceitar (UPDATE status=accepted) ou rejeitar (DELETE).';
COMMENT ON COLUMN friendships.status         IS 'pending|accepted|rejected|blocked. rejected é estado transitório — Server Action deleta imediatamente (decisão Pedro).';
