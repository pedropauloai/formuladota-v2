-- 170: visitas da loja contadas no banco, por origem (18/11/2026). O painel trazia linha por linha
-- e a API entrega no máximo 1000 por consulta: com mais visitas no período, a conta parava em 1000.
-- Roda com a permissão de quem chama, então a regra de site_visits (só admin lê) continua valendo.
create or replace function public.site_visits_by_origin(p_from timestamptz)
returns table(utm_source text, referrer_host text, visits bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.utm_source, v.referrer_host, count(*)
  from public.site_visits v
  where not v.is_test and v.created_at >= p_from
  group by v.utm_source, v.referrer_host;
$$;

revoke all on function public.site_visits_by_origin(timestamptz) from public, anon;
grant execute on function public.site_visits_by_origin(timestamptz) to authenticated;
