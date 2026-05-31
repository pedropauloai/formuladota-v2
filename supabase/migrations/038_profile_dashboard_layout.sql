-- ============================================================================
-- Migration 038 — dashboard_layout em profiles (Phase 9.1 — drag widgets)
-- ============================================================================
-- Pedro pediu (2026-05-26): em edit mode do /me, todos os widgets (Stats,
-- Heróis, Status, Medalhas) devem ser arrastáveis pra qualquer canto via
-- react-grid-layout (grid 12-col responsivo).
--
-- Cada user persiste seu próprio layout. JSONB nullable — quando NULL, o
-- client renderiza o layout default (definido em src/lib/queries/dashboard-layout.ts).
--
-- Estrutura esperada:
--   {
--     "lg": [{ "i": "medals", "x": 0, "y": 0, "w": 6, "h": 2 }, ...],
--     "md": [...],
--     "sm": [...]
--   }
--
-- Validação Zod no Server Action — não fazemos CHECK no banco (estrutura
-- evolui rápido em V2). RLS já está coberta pela policy genérica de profiles
-- (migration 037) que permite o user atualizar próprias colunas exceto is_admin.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.dashboard_layout IS
  'Layout customizado dos widgets do /me (react-grid-layout). NULL = usa layout default. Estrutura: { lg: [{i,x,y,w,h}], md: [...], sm: [...] }. Validado via Zod no Server Action updateDashboardLayout.';
