-- Contas do Dota em que o PPA joga: as dele e as emprestadas (como a do August's). O site acha o PPA
-- numa partida registrada pela conta da lista que aparecer nela, as dele antes das emprestadas.
-- Só o servidor lê e grava (service role); o painel da fila confere o admin antes de mexer.

create table if not exists public.ppa_dota_accounts (
  account_id bigint primary key check (account_id > 0 and account_id < 4294967295),
  label text not null default '' check (char_length(label) <= 60),
  kind text not null default 'propria' check (kind in ('propria', 'emprestada')),
  created_at timestamptz not null default now()
);

alter table public.ppa_dota_accounts enable row level security;
revoke all on table public.ppa_dota_accounts from anon, authenticated;

comment on table public.ppa_dota_accounts is
  'Contas do Dota em que o PPA joga (próprias e emprestadas), cadastradas no painel da fila.';

-- As três contas dele que o código já conhecia e a do August's, que ele usa às vezes.
insert into public.ppa_dota_accounts (account_id, label, kind) values
  (1123609219, 'n tenho inimigos', 'propria'),
  (201687094, '<blank>', 'propria'),
  (1667196039, 'n tenho inimigos', 'propria'),
  (1865993258, 'August''s', 'emprestada')
on conflict (account_id) do nothing;
