-- ============================================================================
-- Migration 036 — Storage Profile Avatars (Phase 9 — Perfil Dota 2 + Social)
-- ============================================================================
-- Bucket profile-avatars: upload de avatar customizado pelo user.
--   - Path convention: {auth.uid()}/{timestamp}.{ext}
--   - Public read (avatar aparece em qualquer lista pública)
--   - User só pode INSERT/DELETE em seu próprio folder (auth.uid() == folder)
--
-- Validação adicional (tamanho max 5MB, MIME) acontece no Client Component
-- (plan 09-08) ANTES do upload. Bucket também impõe MIME + size limit
-- como defesa em profundidade.
--
-- Per decisão D-40 (CONTEXT 09 — Pedro aprovou em discuss-phase).
-- ============================================================================

-- Criar bucket (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,  -- public read (URL pública pra mostrar em lista de amigos)
  5242880,  -- 5MB hard limit (5 * 1024 * 1024 bytes)
  ARRAY['image/png', 'image/jpeg', 'image/webp']  -- MIME whitelist
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage Policies (D-40)
-- ============================================================================

-- INSERT: user só pode upload em seu próprio folder
-- storage.foldername(name) retorna array de path segments
-- Path "{uuid}/file.png" → foldername[1] == uuid
DROP POLICY IF EXISTS "User uploads own avatar" ON storage.objects;
CREATE POLICY "User uploads own avatar" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: user pode sobrescrever seu próprio avatar (upsert=true no client)
DROP POLICY IF EXISTS "User updates own avatar" ON storage.objects;
CREATE POLICY "User updates own avatar" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT: leitura pública (avatar é dado público)
DROP POLICY IF EXISTS "Public read profile avatars" ON storage.objects;
CREATE POLICY "Public read profile avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-avatars');

-- DELETE: user só pode deletar seu próprio avatar
DROP POLICY IF EXISTS "User deletes own avatar" ON storage.objects;
CREATE POLICY "User deletes own avatar" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMENT ON POLICY "User uploads own avatar"      ON storage.objects IS 'Phase 9 — user só faz upload em folder com seu próprio UUID.';
COMMENT ON POLICY "Public read profile avatars"  ON storage.objects IS 'Phase 9 — avatares são públicos (lista de amigos).';
