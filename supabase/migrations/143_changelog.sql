-- 143_changelog.sql — Sistema de novidades/changelog (patch notes) — Pedro 2026-07-05.
--
-- Fonte ÚNICA que alimenta: página /novidades, badge no top-bar (não-lidos por usuário)
-- e o webhook do Discord (🆕丨atualizações). Só entradas published=true aparecem pro
-- público; rascunhos ficam invisíveis até aprovar. Curadoria manual (nada de segurança
-- vaza — ver a seed do retroativo).

create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  published_at timestamptz not null default now(), -- data do post (editável pro retroativo)
  title text not null,
  category text not null default 'novidade', -- novidade | melhoria | correcao | balanceamento
  body_md text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists changelog_pub_idx
  on public.changelog_entries (published, published_at desc);

alter table public.changelog_entries enable row level security;
-- Público lê só os PUBLICADOS; admin lê tudo (rascunhos).
drop policy if exists changelog_read_published on public.changelog_entries;
create policy changelog_read_published on public.changelog_entries
  for select using (published = true);
drop policy if exists changelog_admin_read_all on public.changelog_entries;
create policy changelog_admin_read_all on public.changelog_entries
  for select using (public.is_admin());

-- "Última vez que o usuário viu as novidades" — pro contador de não-lidos no top-bar.
alter table public.profiles add column if not exists changelog_seen_at timestamptz;

-- Marca as novidades como vistas (zera o badge). DEFINER pra atualizar a própria linha
-- sem depender da RLS por coluna de profiles.
create or replace function public.mark_changelog_seen()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.profiles set changelog_seen_at = now() where id = auth.uid();
$function$;
grant execute on function public.mark_changelog_seen() to authenticated;
