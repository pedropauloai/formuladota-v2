-- 088_rls_initplan_optimize.sql — Otimiza RLS (advisor auth_rls_initplan, 95 policies).
-- Envolve auth.uid()/auth.role()/auth.jwt() em (select ...) para o Postgres avaliar a
-- função UMA vez por query (initplan) em vez de UMA vez por LINHA. Semântica idêntica —
-- é a recomendação oficial do Supabase (https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
--
-- Feito de forma segura: materializa um snapshot das policies afetadas numa temp table
-- (pra não iterar sobre pg_policies enquanto o altero) e recria cada uma via DROP+CREATE
-- reconstruído fielmente (permissive/cmd/roles/using/with_check). Transacional: se
-- qualquer policy falhar, rollback total — sem estado parcial. Verificado após aplicar:
-- 0 policies com auth.*() "puro", 95 na forma otimizada; advisor auth_rls_initplan zerado.
do $$
declare
  r record;
  v_using text;
  v_check text;
  v_ddl text;
begin
  create temp table _pol_snap on commit drop as
    select schemaname, tablename, policyname, permissive, cmd,
           array_to_string(roles, ', ') as roles_csv, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.(uid|role|jwt)\(\)' or with_check ~ 'auth\.(uid|role|jwt)\(\)');

  for r in select * from _pol_snap loop
    v_using := replace(replace(replace(coalesce(r.qual,''),
      'auth.uid()','(select auth.uid())'),
      'auth.role()','(select auth.role())'),
      'auth.jwt()','(select auth.jwt())');
    v_check := replace(replace(replace(coalesce(r.with_check,''),
      'auth.uid()','(select auth.uid())'),
      'auth.role()','(select auth.role())'),
      'auth.jwt()','(select auth.jwt())');

    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    v_ddl := format('create policy %I on %I.%I as %s for %s to %s',
      r.policyname, r.schemaname, r.tablename,
      case when r.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      r.cmd, r.roles_csv);
    if r.qual is not null then v_ddl := v_ddl || ' using (' || v_using || ')'; end if;
    if r.with_check is not null then v_ddl := v_ddl || ' with check (' || v_check || ')'; end if;
    execute v_ddl;
  end loop;
end $$;
