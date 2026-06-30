-- Migration 069: match_details — dados de NÍVEL-PARTIDA do OpenDota.
-- Esses campos (teamfights, objetivos, draft, chat) vivem no objeto da partida
-- inteira, não em match_players. Guardamos numa tabela PÚBLICA separada (matches
-- tem RLS restrita + notas_pedro privado, então não dá pra abrir leitura lá).
-- Alimenta as abas Teamfights / Objetivos / Draft do placar pós-jogo.

create table if not exists public.match_details (
  match_id uuid primary key references public.matches(id) on delete cascade,
  dota_match_id text,
  teamfights jsonb,
  objectives jsonb,
  picks_bans jsonb,
  chat jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.match_details enable row level security;

-- Leitura pública (coerente com match_players); escrita só admin.
drop policy if exists "match_details public read" on public.match_details;
create policy "match_details public read"
  on public.match_details for select using (true);

drop policy if exists "match_details admin write" on public.match_details;
create policy "match_details admin write"
  on public.match_details for all using (is_admin()) with check (is_admin());
