-- ============================================================================
-- 120_rls_consolidate_permissive_policies.sql
-- Consolida as políticas RLS PERMISSIVAS duplicadas (advisor
-- multiple_permissive_policies — 120 warnings ≈ 24 combos em 21 tabelas).
--
-- Problema: políticas de admin `FOR ALL` convivem com políticas públicas/do
-- dono na MESMA ação — o Postgres executa TODAS as permissivas e faz OR, então
-- cada SELECT público pagava 2-4 políticas por linha.
--
-- Padrão aplicado:
--   1. Política de admin `FOR ALL` vira 3 políticas de ESCRITA
--      (INSERT/UPDATE/DELETE) — sai do caminho do SELECT.
--   2. Onde o SELECT do dono NÃO cobria admin (ficha_ledger, honor_ledger,
--      pro_audit_log, pro_promotions), o SELECT ganha `or is_admin()`.
--   3. SELECTs redundantes são fundidos num só (profiles, user_fichas,
--      revenue_splits, coach_queue_entries).
--   4. Tudo com `(select …)` — avaliação 1x por query (initPlan), não por linha.
--
-- Capacidades preservadas: admin mantém exatamente o que tinha (leitura total
-- onde já tinha + escrita total); usuários/coaches mantêm as próprias ações;
-- leituras públicas continuam públicas (inclusive pra anon).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Template A — tabelas onde o SELECT existente JÁ cobre admin (ou é público):
-- só trocamos o admin ALL por escrita.
-- ----------------------------------------------------------------------------

-- availability_windows (SELECT: "(ativo = true) OR is_admin()" — cobre admin)
drop policy if exists "admin manages windows" on public.availability_windows;
create policy "admin insere windows" on public.availability_windows
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza windows" on public.availability_windows
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta windows" on public.availability_windows
  for delete to authenticated using ((select public.is_admin()));

-- behavior_status_log (SELECT: own OR is_admin — cobre admin)
drop policy if exists "admin manages behavior log" on public.behavior_status_log;
create policy "admin insere behavior log" on public.behavior_status_log
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza behavior log" on public.behavior_status_log
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta behavior log" on public.behavior_status_log
  for delete to authenticated using ((select public.is_admin()));

-- coaches (SELECT: "(ativo = true) OR is_admin()" — cobre admin)
drop policy if exists "admin manages coaches" on public.coaches;
create policy "admin insere coaches" on public.coaches
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza coaches" on public.coaches
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta coaches" on public.coaches
  for delete to authenticated using ((select public.is_admin()));

-- doctrine_versions (SELECT público `true`)
drop policy if exists "admin manages doctrine versions" on public.doctrine_versions;
create policy "admin insere doctrine versions" on public.doctrine_versions
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza doctrine versions" on public.doctrine_versions
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta doctrine versions" on public.doctrine_versions
  for delete to authenticated using ((select public.is_admin()));

-- match_details (SELECT público `true` — placar pós-jogo)
drop policy if exists "match_details admin write" on public.match_details;
create policy "admin insere match_details" on public.match_details
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza match_details" on public.match_details
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta match_details" on public.match_details
  for delete to authenticated using ((select public.is_admin()));

-- match_players (SELECT público `true` — placar pós-jogo, tabela quente)
drop policy if exists "admin write match_players" on public.match_players;
create policy "admin insere match_players" on public.match_players
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza match_players" on public.match_players
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta match_players" on public.match_players
  for delete to authenticated using ((select public.is_admin()));

-- packages (SELECT: "(ativo = true) OR is_admin()" — cobre admin)
drop policy if exists "admin manages packages" on public.packages;
create policy "admin insere packages" on public.packages
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza packages" on public.packages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta packages" on public.packages
  for delete to authenticated using ((select public.is_admin()));

-- seasons (SELECT público `true`)
drop policy if exists "admin manages seasons" on public.seasons;
create policy "admin insere seasons" on public.seasons
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza seasons" on public.seasons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta seasons" on public.seasons
  for delete to authenticated using ((select public.is_admin()));

-- tournament_matches (SELECT público `true`)
drop policy if exists "tournament_matches_admin_write" on public.tournament_matches;
create policy "admin insere tournament_matches" on public.tournament_matches
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza tournament_matches" on public.tournament_matches
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta tournament_matches" on public.tournament_matches
  for delete to authenticated using ((select public.is_admin()));

-- tournaments (SELECT público `true`)
drop policy if exists "tournaments_admin_write" on public.tournaments;
create policy "admin insere tournaments" on public.tournaments
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza tournaments" on public.tournaments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta tournaments" on public.tournaments
  for delete to authenticated using ((select public.is_admin()));

-- user_warnings (SELECT: own OR is_admin — cobre admin)
drop policy if exists "admin manages warnings" on public.user_warnings;
create policy "admin insere warnings" on public.user_warnings
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza warnings" on public.user_warnings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta warnings" on public.user_warnings
  for delete to authenticated using ((select public.is_admin()));

-- ----------------------------------------------------------------------------
-- Template B — o SELECT do dono NÃO cobria admin: SELECT ganha `or is_admin()`
-- e o admin ALL vira escrita.
-- ----------------------------------------------------------------------------

-- ficha_ledger
drop policy if exists "admin manages ledger" on public.ficha_ledger;
drop policy if exists "user sees own ledger" on public.ficha_ledger;
create policy "user ve o proprio ledger; admin ve todos" on public.ficha_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "admin insere ledger" on public.ficha_ledger
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza ledger" on public.ficha_ledger
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta ledger" on public.ficha_ledger
  for delete to authenticated using ((select public.is_admin()));

-- honor_ledger (mantém honor_ledger_service_insert — service_role, sem overlap)
drop policy if exists "honor_ledger_admin_all" on public.honor_ledger;
drop policy if exists "honor_ledger_user_own" on public.honor_ledger;
create policy "user ve o proprio honor; admin ve todos" on public.honor_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "admin insere honor" on public.honor_ledger
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza honor" on public.honor_ledger
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta honor" on public.honor_ledger
  for delete to authenticated using ((select public.is_admin()));

-- pro_audit_log
drop policy if exists "pro_audit_admin_all" on public.pro_audit_log;
drop policy if exists "pro_audit_pro_visible" on public.pro_audit_log;
create policy "alvo ve o proprio audit; admin ve todos" on public.pro_audit_log
  for select to authenticated
  using ((select auth.uid()) = target_user_id or (select public.is_admin()));
create policy "admin insere pro_audit" on public.pro_audit_log
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza pro_audit" on public.pro_audit_log
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta pro_audit" on public.pro_audit_log
  for delete to authenticated using ((select public.is_admin()));

-- pro_promotions
drop policy if exists "pro_promotions_admin_all" on public.pro_promotions;
drop policy if exists "pro_promotions_user_own" on public.pro_promotions;
create policy "user ve a propria promocao; admin ve todas" on public.pro_promotions
  for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "admin insere pro_promotions" on public.pro_promotions
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza pro_promotions" on public.pro_promotions
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta pro_promotions" on public.pro_promotions
  for delete to authenticated using ((select public.is_admin()));

-- revenue_splits (3 SELECTs → 1; admin ALL → escrita)
drop policy if exists "revenue_splits_admin_all" on public.revenue_splits;
drop policy if exists "revenue_splits_pro_own" on public.revenue_splits;
drop policy if exists "revenue_splits_sponsor_own" on public.revenue_splits;
create policy "pro, sponsor ou admin leem splits" on public.revenue_splits
  for select to authenticated
  using (
    (select auth.uid()) = pro_user_id
    or (select auth.uid()) = sponsor_user_id
    or (select public.is_admin())
  );
create policy "admin insere splits" on public.revenue_splits
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin atualiza splits" on public.revenue_splits
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin deleta splits" on public.revenue_splits
  for delete to authenticated using ((select public.is_admin()));

-- ----------------------------------------------------------------------------
-- Casos especiais
-- ----------------------------------------------------------------------------

-- coach_queue_entries — a fila é PÚBLICA ("fila visivel para todos", qual true),
-- então os SELECTs de coach/dono/admin eram redundantes. UPDATE/INSERT fundidos
-- numa política cada (user OU coach da fila OU admin). DELETE segue admin-only
-- (saída de fila é via UPDATE de status/RPC — sem delete client no código).
drop policy if exists "admin all queue" on public.coach_queue_entries;
drop policy if exists "coach sees own queue" on public.coach_queue_entries;
drop policy if exists "user sees own queue entries" on public.coach_queue_entries;
drop policy if exists "user can join queue" on public.coach_queue_entries;
drop policy if exists "coach can manage own queue" on public.coach_queue_entries;
drop policy if exists "user can update own queue" on public.coach_queue_entries;
create policy "user entra na fila; admin tambem" on public.coach_queue_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "user, coach da fila ou admin atualizam" on public.coach_queue_entries
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    or coach_id in (select id from public.coaches where profile_id = (select auth.uid()))
    or (select public.is_admin())
  )
  with check (
    (select auth.uid()) = user_id
    or coach_id in (select id from public.coaches where profile_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "admin deleta entries" on public.coach_queue_entries
  for delete to authenticated using ((select public.is_admin()));

-- matches — 2 políticas de UPDATE (admin + user cancela) fundidas numa só.
drop policy if exists "admin updates matches" on public.matches;
drop policy if exists "users cancel own matches +24h" on public.matches;
create policy "admin atualiza; user cancela propria +24h" on public.matches
  for update to authenticated
  using (
    (select public.is_admin())
    or (
      (select auth.uid()) = user_id
      and status = 'agendada'
      and data_agendada > (now() + interval '24 hours')
    )
  )
  with check ((select public.is_admin()) or status = 'cancelada');

-- profiles — tabela mais lida do app. 2 SELECTs → 1; 2 UPDATEs → 1.
-- O WITH CHECK preserva a trava anti-escalada da migration 117
-- (não-admin não muda a própria coluna is_admin).
drop policy if exists "everyone reads active coach profiles" on public.profiles;
drop policy if exists "users see own profile or admin sees all" on public.profiles;
create policy "own, admin ou coach ativo" on public.profiles
  for select
  using (
    (select auth.uid()) = id
    or (select public.is_admin())
    or id in (select profile_id from public.coaches where ativo = true)
  );
drop policy if exists "admin updates any profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
create policy "user atualiza o proprio; admin qualquer um" on public.profiles
  for update to authenticated
  using ((select public.is_admin()) or (select auth.uid()) = id)
  with check (
    (select public.is_admin())
    or ((select auth.uid()) = id and is_admin = (select public.is_admin()))
  );

-- steam_links — "users manage own" era FOR ALL e duplicava o SELECT público.
drop policy if exists "users manage own steam_link" on public.steam_links;
create policy "user insere o proprio steam_link" on public.steam_links
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user atualiza o proprio steam_link" on public.steam_links
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user deleta o proprio steam_link" on public.steam_links
  for delete to authenticated using ((select auth.uid()) = user_id);

-- user_fichas — 2 SELECTs → 1.
drop policy if exists "admin sees all balance" on public.user_fichas;
drop policy if exists "user sees own balance" on public.user_fichas;
create policy "user ve o proprio saldo; admin ve todos" on public.user_fichas
  for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

commit;
