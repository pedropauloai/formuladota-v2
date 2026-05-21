-- Habilita Supabase Realtime nas tabelas que o UI escuta.
-- Aplicado em 2026-05-21 via MCP Supabase.

ALTER PUBLICATION supabase_realtime ADD TABLE coach_queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE coaches;
