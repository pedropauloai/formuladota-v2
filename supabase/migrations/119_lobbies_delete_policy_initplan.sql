-- ============================================================================
-- 119_lobbies_delete_policy_initplan.sql
-- Fix do advisor auth_rls_initplan na policy criada pela 118: auth.uid() e
-- is_admin() chamados direto são reavaliados por LINHA. Envolver em (select …)
-- faz o Postgres avaliar uma única vez por statement (initPlan).
-- Aplicada em produção em 2026-07-03 via MCP.
-- ============================================================================

begin;

drop policy if exists "creator or admin deletes lobby" on public.lobbies;
create policy "creator or admin deletes lobby"
  on public.lobbies
  for delete
  to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()));

commit;
