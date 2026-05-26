-- ============================================================================
-- Migration 034 — Profile Extended (Phase 9 — Perfil Dota 2 + Social)
-- ============================================================================
-- Adiciona 5 colunas a profiles pra suportar identidade visual Dota 2 client:
--   - status_message      : mensagem curta editável (max 60 chars)
--   - hero_portrait_slug  : slug do hero exibido como background do /me
--   - favorite_heroes     : até 3 heróis favoritos (JSONB array de slugs)
--   - avatar_custom_url   : avatar customizado upload (sobrescreve Discord/Steam)
--   - last_seen_at        : última vez que o user esteve online (fallback presence)
--
-- Todas as colunas nullable — rows existentes ficam com NULL sem impacto.
-- CHECK constraints garantem validação no nível DB (defesa em profundidade
-- além do Zod nas Server Actions).
--
-- RLS: políticas existentes de profiles seguem cobrindo as novas colunas
-- (auth.uid() = id pra UPDATE/SELECT do próprio profile).
--
-- Per decisão D-38 (CONTEXT 09 — Pedro aprovou em discuss-phase).
-- ============================================================================

-- Mensagem curta de status — placeholder pra voz pessoal do user no /me
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status_message TEXT;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_status_message_length;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_message_length
  CHECK (status_message IS NULL OR char_length(status_message) <= 60);

-- Slug do hero usado como portrait gigante de background do /me
-- Sem FK pra heroes table (catálogo é JSON estático em src/data — D-23).
-- Validação de slug válido acontece em app (isValidHeroSlug em heroes.ts).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hero_portrait_slug TEXT;

-- Até 3 heróis favoritos exibidos no /me — JSONB array de slugs.
-- Ex: '["antimage", "invoker", "pudge"]'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS favorite_heroes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_favorite_heroes_max;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_favorite_heroes_max
  CHECK (jsonb_array_length(favorite_heroes) <= 3);

-- Avatar customizado (sobrescreve Discord/Steam). URL pública do bucket
-- profile-avatars (migration 036).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_custom_url TEXT;

-- Último heartbeat de presença — atualizado a cada 60s pelo Client Component
-- quando user está com aba aberta. Usado pra fallback "visto há 2h" quando
-- user está offline (D-37).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Index pra queries de "amigos vistos recentemente" (futuro)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON profiles (last_seen_at DESC NULLS LAST);

-- ============================================================================
-- Comments documentando schema (visível no Supabase Studio)
-- ============================================================================

COMMENT ON COLUMN profiles.status_message     IS 'Phase 9 — mensagem curta do user no /me (max 60 chars). D-18.';
COMMENT ON COLUMN profiles.hero_portrait_slug IS 'Phase 9 — slug do hero como background do /me. Validado em app (heroes.json). D-20.';
COMMENT ON COLUMN profiles.favorite_heroes    IS 'Phase 9 — JSONB array de até 3 slugs de heróis favoritos. D-19.';
COMMENT ON COLUMN profiles.avatar_custom_url  IS 'Phase 9 — URL do avatar custom (override Discord/Steam). Bucket profile-avatars. D-21.';
COMMENT ON COLUMN profiles.last_seen_at       IS 'Phase 9 — último heartbeat de presence. Fallback "visto há Xh" quando offline. D-37.';
