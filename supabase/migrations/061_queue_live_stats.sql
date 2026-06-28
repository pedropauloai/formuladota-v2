-- 061 — Estatísticas AO VIVO da fila (push via Supabase Realtime).
--
-- Problema: match_queue tem RLS self (cada user só vê a própria linha), então o
-- cliente NÃO consegue contar a fila inteira nem a demanda por função via realtime.
-- Solução: uma tabela PÚBLICA de agregados (1 linha 'singleton') recalculada por
-- trigger em match_queue. Ela está na publication supabase_realtime → todos os
-- clientes recebem push (~100-300ms) quando a fila muda. Substitui o polling.

-- 1. Tabela de agregados (uma linha fixa).
create table if not exists public.queue_live_stats (
  id            text primary key default 'singleton',
  waiting_count int not null default 0,
  roles         jsonb not null default '{}'::jsonb,  -- {safelane:N, midlane:N, ...}
  updated_at    timestamptz not null default now()
);

alter table public.queue_live_stats enable row level security;

-- Leitura pública (só agregados, nada sensível). Sem policies de write → só o
-- trigger SECURITY DEFINER escreve.
drop policy if exists "queue_live_stats public read" on public.queue_live_stats;
create policy "queue_live_stats public read" on public.queue_live_stats
  for select using (true);

insert into public.queue_live_stats (id) values ('singleton')
  on conflict (id) do nothing;

-- 2. Recalcula os agregados e atualiza a linha singleton.
create or replace function public.refresh_queue_live_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_roles jsonb;
begin
  select count(*) into v_total
  from match_queue
  where status = 'waiting';

  -- Conta quantos waiting filaram cada função (explode o array roles).
  select jsonb_build_object(
    'safelane',          count(*) filter (where r.role = 'safelane'),
    'midlane',           count(*) filter (where r.role = 'midlane'),
    'offlane',           count(*) filter (where r.role = 'offlane'),
    'support',           count(*) filter (where r.role = 'support'),
    'support_dedicated', count(*) filter (where r.role = 'support_dedicated')
  ) into v_roles
  from match_queue mq
  cross join lateral jsonb_array_elements_text(coalesce(mq.roles, '[]'::jsonb)) as r(role)
  where mq.status = 'waiting';

  update public.queue_live_stats
    set waiting_count = v_total,
        roles = coalesce(v_roles, '{}'::jsonb),
        updated_at = now()
    where id = 'singleton';

  return null;
end;
$$;

-- 3. Trigger: qualquer mudança na fila recalcula (FOR EACH STATEMENT — 1x por
--    statement, mesmo quando enterQueue cancela+insere em lote).
drop trigger if exists trg_refresh_queue_live_stats on public.match_queue;
create trigger trg_refresh_queue_live_stats
  after insert or update or delete on public.match_queue
  for each statement execute function public.refresh_queue_live_stats();

-- Popula os valores iniciais (sem esperar a 1ª mudança na fila).
update public.queue_live_stats s
set waiting_count = (select count(*) from match_queue where status = 'waiting'),
    roles = coalesce((
      select jsonb_build_object(
        'safelane',          count(*) filter (where r.role = 'safelane'),
        'midlane',           count(*) filter (where r.role = 'midlane'),
        'offlane',           count(*) filter (where r.role = 'offlane'),
        'support',           count(*) filter (where r.role = 'support'),
        'support_dedicated', count(*) filter (where r.role = 'support_dedicated')
      )
      from match_queue mq
      cross join lateral jsonb_array_elements_text(coalesce(mq.roles, '[]'::jsonb)) as r(role)
      where mq.status = 'waiting'
    ), '{}'::jsonb),
    updated_at = now()
where s.id = 'singleton';

-- 4. Publication (idempotente). queue_live_stats: push dos agregados públicos.
--    match_queue: necessário pro hook de STATUS do próprio user (RLS self → cada
--    cliente só recebe push da própria entry). Padrão das migrations 027/049.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'queue_live_stats'
  ) then
    alter publication supabase_realtime add table public.queue_live_stats;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'match_queue'
  ) then
    alter publication supabase_realtime add table public.match_queue;
  end if;
end $$;
