-- 157_cron_finalize_matches_cloudflare.sql: o app saiu da Vercel para a Cloudflare, no
-- domínio formuladota.com.br. O pg_cron passa a chamar a rota no domínio novo; o segredo
-- continua no Vault (name='cron_secret') e no Worker como CRON_SECRET.
select cron.unschedule('finalize-matches')
where exists (select 1 from cron.job where jobname = 'finalize-matches');

select cron.schedule(
  'finalize-matches',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://www.formuladota.com.br/api/cron/finalize-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
