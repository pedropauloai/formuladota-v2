-- MVP fichas: 1 match = 1 PT que pode ter múltiplos alunos.
-- Cada aluno linka via coach_queue_entries.match_id (já existe).
-- user_id/purchase_id no match viram nullable (modelo antigo era 1-1).
-- Aplicado em 2026-05-21 via MCP Supabase.

ALTER TABLE matches ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN purchase_id DROP NOT NULL;

COMMENT ON COLUMN matches.user_id IS 'Aluno principal (legacy 1-1) ou NULL em PT multi-aluno (consultar coach_queue_entries.match_id)';
COMMENT ON COLUMN matches.purchase_id IS 'Purchase do aluno principal (legacy) ou NULL — fichas individuais ficam em coach_queue_entries';
