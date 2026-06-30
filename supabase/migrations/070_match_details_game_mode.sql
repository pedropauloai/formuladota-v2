-- Migration 070: tipo de partida (game_mode/lobby_type) na match_details pública.
-- O tipo só existe em matches.game_mode/lobby_type (códigos numéricos OpenDota),
-- mas matches tem RLS restrita. Espelhamos aqui (leitura pública) pra o histórico
-- mostrar o tipo de partida de QUALQUER jogador (próprio e público).

alter table public.match_details add column if not exists game_mode integer;
alter table public.match_details add column if not exists lobby_type integer;
