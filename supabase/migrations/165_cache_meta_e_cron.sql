-- 165: cache do meta de heróis, estado das tarefas do cron e o cron do site separado do de partidas.
-- Revisão técnica de 18/11/2026.

-- O cache de dados do Next não guarda nada na Cloudflare: a /meta batia na Stratz a cada visita.
-- O cron renova esta tabela e a página só lê. Sem política: só o service role lê e escreve.
create table if not exists public.dota_meta_cache (
  key text primary key,
  data jsonb not null,
  refreshed_at timestamptz not null default now(),
  last_error text,
  last_attempt_at timestamptz
);
alter table public.dota_meta_cache enable row level security;

-- Estado de cada tarefa do cron: permite avisar no Discord quando uma tarefa passa a falhar
-- (e quando volta), em vez de responder ok com o erro escondido no log.
create table if not exists public.cron_task_status (
  task text primary key,
  failing_since timestamptz,
  last_error text,
  alerted boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.cron_task_status enable row level security;

-- O pg_net desiste em 5 s por padrão, e as tarefas esperam até 10 s pela OpenDota: 30 s de folga.
-- cron.schedule com um nome que já existe atualiza o job.
select cron.schedule(
  'finalize-matches',
  '* * * * *',
  $cmd$
  select net.http_post(
    url := 'https://www.formuladota.com.br/api/cron/finalize-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cmd$
);

-- Loja (conciliação com o Mercado Pago e credencial), meta e espelho das novidades num job
-- próprio: desligar o de partidas enquanto os bots estão parados não desliga a loja.
select cron.schedule(
  'site-jobs',
  '* * * * *',
  $cmd$
  select net.http_post(
    url := 'https://www.formuladota.com.br/api/cron/site',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cmd$
);
