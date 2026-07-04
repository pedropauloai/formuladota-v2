-- ============================================================================
-- 118_security_hardening_advisors.sql
-- Hardening de segurança gerado pela AUDITORIA de 2026-07-03 (Fable 5).
--
-- ⚠️  REVISAR ANTES DE APLICAR. Esta sessão de auditoria teve acesso ao Supabase
--     apenas em LEITURA — este SQL NÃO foi executado/testado contra o banco ao
--     vivo. Rode em um branch/preview do Supabase primeiro (supabase db diff /
--     db push num ambiente de teste) e confira que nada quebra.
--
-- O que este migration faz:
--   1. Fecha o buraco onde o papel `anon` (chave pública) podia forjar MMR via
--      RPC apply_match_mmr (a guarda interna é pulada quando auth.uid() é NULL).
--   2. Restringe release_bot / try_form_match (sem guarda) a partir de `anon`.
--   3. Remove as 17 funções de TRIGGER (SECURITY DEFINER) do API RPC exposto
--      (anon/authenticated/public) — elas nunca deveriam ser chamáveis direto.
--   4. Fixa search_path nas 14 funções sinalizadas (function_search_path_mutable).
--   5. Cria a policy de DELETE que faltava em `lobbies` (líder/admin) — hoje o
--      "encerrar lobby" é bloqueado pela RLS (no-op silencioso).
--
-- Itens que NÃO estão aqui (exigem julgamento/teste — ver SECURITY-AUDIT.md):
--   - 3 views SECURITY DEFINER (public_player_identities, bot_pool_status,
--     tournament_matches_expanded)
--   - consolidação das 125 políticas permissivas duplicadas (performance)
--   - DROP dos 54 índices não usados
--   - mover extensão pg_net do schema public
--   - REVOKE amplo de `anon` nas demais funções "authenticated-only"
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) apply_match_mmr — ALTO. A guarda `if auth.uid() is not null and not (...)`
--    é PULADA quando auth.uid() é NULL (papel anon). Com EXECUTE para anon +
--    a anon key sendo pública, qualquer visitante podia aplicar MMR forjado em
--    qualquer partida ainda não pontuada. Fix: tirar anon/public; manter
--    authenticated (coach/admin, com a guarda ativa) e service_role (cron).
-- ----------------------------------------------------------------------------
revoke execute on function
  public.apply_match_mmr(uuid, integer, jsonb, integer, integer, uuid)
  from public, anon;
grant execute on function
  public.apply_match_mmr(uuid, integer, jsonb, integer, integer, uuid)
  to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) release_bot / try_form_match — MÉDIO. Sem guarda interna de caller.
--    Tirar de anon/public (visitante anônimo não deve mexer no pool de bots nem
--    forçar formação de partida). Mantém authenticated + service_role p/ não
--    quebrar os fluxos server-side. RECOMENDAÇÃO (ver relatório): adicionar
--    guarda interna e, se confirmado que só o bot/serviço chama, remover
--    também `authenticated`.
-- ----------------------------------------------------------------------------
revoke execute on function public.release_bot(text) from public, anon;
grant  execute on function public.release_bot(text) to authenticated, service_role;

revoke execute on function public.try_form_match(integer) from public, anon;
grant  execute on function public.try_form_match(integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3) Funções de TRIGGER (SECURITY DEFINER) — remover do API RPC exposto.
--    O Postgres já impede chamar trigger function direto, mas o correto é não
--    deixá-las no schema exposto para anon/authenticated. Triggers seguem
--    funcionando (rodam como owner da tabela, independente de EXECUTE).
--    Loop pega TODAS as secdef que retornam `trigger` (as 17 do advisor).
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and pg_get_function_result(p.oid) = 'trigger'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 4) function_search_path_mutable (14 funções) — fixa search_path para evitar
--    resolução de nomes por schema controlável pelo caller. Loop por nome pega
--    a assinatura exata automaticamente (cobre overloads).
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_updated_at','handle_updated_at','handle_lobbies_updated_at',
        'mmr_to_tier','check_team_size','trg_cascade_cancel_other_filas',
        'seed_fake_user','seed_fake_pro','seed_fake_queue',
        'update_calibration_status','get_honor_tier','friendships_set_updated_at',
        'fd_tier_for_level','fd_tier_rank'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5) lobbies — policy de DELETE que faltava (só existiam insert/select/update).
--    Sem ela, cancelLobby e o ramo "líder sozinho" de leaveLobby são no-op
--    silencioso. Espelha a checagem que o código agora faz (líder ou admin).
-- ----------------------------------------------------------------------------
drop policy if exists "creator or admin deletes lobby" on public.lobbies;
create policy "creator or admin deletes lobby"
  on public.lobbies
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

commit;
