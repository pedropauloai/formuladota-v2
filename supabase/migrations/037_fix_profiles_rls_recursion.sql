-- ============================================================================
-- Migration 037 — Fix recursão infinita em RLS de profiles
-- ============================================================================
-- Aplicada via Supabase MCP em 2026-05-26.
--
-- BUG: a policy "users update own profile" tinha um subquery dentro do WITH
-- CHECK que selecionava de `profiles` (a mesma tabela protegida pela policy):
--
--   WITH CHECK (
--     (auth.uid() = id) AND
--     (is_admin = (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()))
--   )
--
-- Quando o user fazia UPDATE em profiles, o WITH CHECK rodava o SELECT, que
-- ativava RLS de profiles novamente, que rodava o WITH CHECK de novo,
-- gerando recursão infinita. PostgreSQL detectava e abortava com:
--
--   ERROR: infinite recursion detected in policy for relation "profiles"
--
-- IMPACTO: todas as Server Actions de edição de perfil (updateStatusMessage,
-- updateFavoriteHeroes, updateHeroPortrait, saveCustomAvatarUrl, clearCustomAvatar,
-- updateLastSeen) retornavam 500 — UX completamente quebrada pra edição.
--
-- FIX: substituir o subquery pela função public.is_admin() que já existe e
-- é SECURITY DEFINER (bypassa RLS internamente). Preserva a regra anti-
-- privilege-escalation (user não pode setar próprio is_admin=true) sem
-- causar recursão.
-- ============================================================================

DROP POLICY IF EXISTS "users update own profile" ON profiles;

CREATE POLICY "users update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT public.is_admin())
  );

COMMENT ON POLICY "users update own profile" ON profiles IS
  'User pode atualizar próprio profile, mas não pode escalar privilégio (is_admin). Usa função is_admin() SECURITY DEFINER pra evitar recursão (fix migration 037).';
