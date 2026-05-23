-- Tabela de 3 heróis assinatura por user.
-- Aplicado em 2026-05-23 via MCP Supabase.

CREATE TABLE IF NOT EXISTS user_signature_heroes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 3),
  hero_id INTEGER NOT NULL,
  hero_name TEXT NOT NULL,
  hero_display TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE INDEX IF NOT EXISTS user_signature_heroes_hero_idx
  ON user_signature_heroes (hero_id);

ALTER TABLE user_signature_heroes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read signature heroes"
  ON user_signature_heroes FOR SELECT USING (true);

CREATE POLICY "user manages own signature heroes"
  ON user_signature_heroes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own signature heroes"
  ON user_signature_heroes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user deletes own signature heroes"
  ON user_signature_heroes FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE user_signature_heroes;

COMMENT ON TABLE user_signature_heroes IS '3 heróis assinatura por user — aparecem em hover do avatar + filtro de busca de PROs';
