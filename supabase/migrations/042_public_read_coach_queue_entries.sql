-- 042 — Fix: fila de /ranked-com-pro invisível para usuários comuns.
--
-- BUG (relatado 2026-06-03): um jogador comum via a fila VAZIA em /ranked-com-pro
-- enquanto o admin (Pedro) via as entries de teste. Estado "não sincronizado".
--
-- Causa: coach_queue_entries só tinha policies de SELECT para (a) admin (vê tudo),
-- (b) o dono da entry (auth.uid() = user_id), (c) o coach daquela fila. Nenhuma
-- policy permitia um jogador comum ver as entries dos OUTROS jogadores — mas a fila
-- é informação social/pública por design (a board mostra quem está esperando, e o
-- cálculo de posição LRU depende de enxergar as entries consumed de todos).
--
-- Fix: SELECT público de toda entry. Não há dado sensível (user_id, coach_id,
-- timestamps, status) — é exatamente a "fila ao vivo" que a interface exibe.
-- Aplicado em prod via Supabase MCP em 2026-06-03.
drop policy if exists "fila visivel para todos" on public.coach_queue_entries;
create policy "fila visivel para todos"
  on public.coach_queue_entries
  for select
  using (true);
