-- 171: a saída de um jogador da sala chega em tempo real para os outros (18/11/2026).
-- A sala escuta lobby_players filtrando por lobby_id, e o Supabase só entrega DELETE filtrado
-- quando a tabela grava a linha inteira na mudança (doc "Postgres Changes", Limitations > Delete
-- events). Sem isso, quem saiu continuava no slot para os outros até recarregar a página.
-- O grupo não precisa: sair e expulsar já atualizam parties.updated_at, que avisa os membros.
alter table public.lobby_players replica identity full;
