-- 161_loja_prova_dono.sql: a prova ao vivo da vitrine da loja (medalha, posição no ranking e Tinker
-- do Pedro), renovada pelo cron e lida no servidor. Linha única; o Tinker vem do STRATZ, que conta
-- mais partidas que o OpenDota.

create table if not exists public.store_owner_proof (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  refreshed_at timestamptz not null default now()
);

-- Só o servidor (service role) lê e escreve: a vitrine monta a credencial no servidor.
alter table public.store_owner_proof enable row level security;
