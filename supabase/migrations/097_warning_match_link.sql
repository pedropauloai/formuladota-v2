-- 097_warning_match_link.sql — associa um warning (ex.: banimento) à PARTIDA onde
-- ocorreu. Liga duas coisas: (1) o Mural linka o ID da partida (histórico) e
-- (2) o placar mostra publicamente quem foi banido NAQUELA partida.
alter table public.user_warnings
  add column if not exists dota_match_id text;

create index if not exists idx_user_warnings_dota_match_id
  on public.user_warnings (dota_match_id)
  where dota_match_id is not null;

-- Backfill do 1º banimento (frostyxdd, partida 8876919975 — jogou de Axe e kitou).
update public.user_warnings
  set dota_match_id = '8876919975'
where user_id = '3705620c-032c-4cd3-b162-4eb3a83fa5a3'
  and severity = 'banimento'
  and dota_match_id is null;
