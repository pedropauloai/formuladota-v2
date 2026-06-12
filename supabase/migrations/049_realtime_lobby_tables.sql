-- 049 — Realtime na sala de lobby (aprovado Pedro 2026-06-11)
--
-- Adiciona lobby_players e lobbies à publication do Supabase Realtime:
-- todos na sala recebem push (~100-300ms) quando alguém entra/troca de
-- slot/sai ou quando as configurações/status da sala mudam — sem polling.
-- RLS continua valendo nos eventos (select é público nas duas tabelas).

alter publication supabase_realtime add table public.lobby_players;
alter publication supabase_realtime add table public.lobbies;
