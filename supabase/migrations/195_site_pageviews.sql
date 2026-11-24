-- 195_site_pageviews.sql: as páginas por onde cada sessão passou, para medir o funil da home
-- (quantas sessões que entram pela home chegam à fila da party). O site_visits guarda só a página
-- de entrada, uma linha por sessão; esta tabela guarda a primeira vez que a sessão passou por cada
-- caminho. Sem IP e sem usuário: o id aleatório da aba, o caminho e a hora. Aprovação do PPA em
-- 23/11/2026 ("Pode criar os dois"). Quem grava é o servidor (service role, em /api/visita); quem lê
-- é o admin, como no site_visits.

create table if not exists public.site_pageviews (
  session_id text not null check (char_length(session_id) between 8 and 64),
  path text not null check (char_length(path) between 1 and 300),
  -- Fora do domínio de produção (localhost, teste de ponta a ponta) a página não conta no funil.
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (session_id, path)
);

create index if not exists site_pageviews_created_idx on public.site_pageviews (created_at desc);

alter table public.site_pageviews enable row level security;

-- Visitante e logado não leem nem gravam pelo cliente; só o admin lê.
revoke all on table public.site_pageviews from anon, authenticated;
grant select on table public.site_pageviews to authenticated;

drop policy if exists site_pageviews_read on public.site_pageviews;
create policy site_pageviews_read on public.site_pageviews
  for select using ((select public.is_admin()));

comment on table public.site_pageviews is
  'Primeira passagem de cada sessão (id aleatório da aba) por cada caminho do site. Funil da home: docs/funil-da-home.md.';
