-- 102_feature_flags.sql — interruptores de funcionalidade (feature flags).
-- Liga/desliga features pelo admin, sem deploy. Leitura PÚBLICA (flags não são
-- segredo); escrita só via service role (server action do admin). Primeira flag:
-- ranked_com_pro DESLIGADA (esconde "Subir MMR / Ranked com PRO" dos usuários;
-- admin continua enxergando — a checagem "|| isAdmin" vive na aplicação).
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  label text,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "everyone reads feature flags" on public.feature_flags;
create policy "everyone reads feature flags" on public.feature_flags
  for select using (true);

insert into public.feature_flags (key, enabled, label)
values ('ranked_com_pro', false, 'Subir MMR / Ranked com PRO')
on conflict (key) do nothing;
