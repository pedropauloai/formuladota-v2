-- 159_site_visits_is_test.sql: visita de teste separada da real (06/11/2026). O teste de ponta a
-- ponta roda no localhost contra o banco de produção e gravava visita com utm_source=instagram,
-- que o painel contaria como Instagram no checkpoint de 27/11.
alter table public.site_visits add column if not exists is_test boolean not null default false;

-- Visita sem país veio do localhost: em produção a Cloudflare sempre manda o cabeçalho do país.
update public.site_visits set is_test = true where country is null and is_test = false;
