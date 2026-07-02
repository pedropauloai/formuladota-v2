-- 095_cron_finalize_matches.sql — finalização AUTOMÁTICA de partidas (Pedro 2026-07-02).
-- pg_cron chama a rota /api/cron/finalize-matches a cada 1 min via pg_net. A rota acha
-- os lobbies 'in_progress' que já terminaram (OpenDota) e finaliza (placar + MMR + fecha
-- o lobby → libera os 10). Latência ~1 min. Ninguém fica preso "em partida" pra sempre.
--
-- Segredo: NÃO fica no git. Vive no Supabase Vault (name='cron_secret'), criado à parte;
-- o job lê de vault.decrypted_secrets. O MESMO valor precisa estar no Vercel como
-- CRON_SECRET (a rota valida o header Authorization: Bearer <CRON_SECRET>).
create extension if not exists pg_net;

-- Remove agendamento anterior (idempotente em re-deploy).
select cron.unschedule('finalize-matches')
where exists (select 1 from cron.job where jobname = 'finalize-matches');

select cron.schedule(
  'finalize-matches',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://formuladota-v2.vercel.app/api/cron/finalize-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
