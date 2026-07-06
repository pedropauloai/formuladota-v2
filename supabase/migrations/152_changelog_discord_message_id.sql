-- Espelho /novidades ↔ Discord: rastrear a MENSAGEM postada (Pedro 2026-07-06).
-- Sem o message_id não dava pra editar/apagar um post no Discord quando a novidade muda
-- no site (foi preciso caçar a mensagem pelo título à mão). Agora o sync grava o id ao
-- postar, e passa a EDITAR (novidade alterada) e APAGAR (novidade retirada) automaticamente.

ALTER TABLE changelog_entries
  ADD COLUMN IF NOT EXISTS discord_message_id text,
  -- updated_at + trigger → detecta edição pós-post (updated_at > discord_posted_at).
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_changelog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_changelog_updated_at ON changelog_entries;
CREATE TRIGGER trg_changelog_updated_at
  BEFORE UPDATE ON changelog_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_changelog_updated_at();
