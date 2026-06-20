-- 058 — Vagas por MODO no display da fila (Pedro 2026-06-20).
--
-- No modo 'coached' o PRO OBSERVA de fora, então o time inteiro é de alunos =
-- cabem 5 (não 4). No modo 'play' o PRO é o 5º jogador, então no máximo 4 alunos.
-- A função get_pros_live_status (vitrine + contadores) passa a calcular as vagas
-- conforme coaches.queue_mode:
--   coached -> teto 5 ; play -> teto = fila_max_vagas (CHECK <= 4, migration 023).
--
-- A SELEÇÃO/CRIAÇÃO da PT já respeita o modo no app (startPT + cockpit maxPT).
-- A ENTRADA na fila (join_coach_queue) não tem trava de vaga — segue livre.
-- Assinatura idêntica à 028 → CREATE OR REPLACE (sem DROP).

CREATE OR REPLACE FUNCTION public.get_pros_live_status()
RETURNS TABLE (
  coach_id UUID,
  slug TEXT,
  headline TEXT,
  bio TEXT,
  fila_aberta BOOLEAN,
  fila_aberta_em TIMESTAMPTZ,
  fila_max_vagas INTEGER,
  username TEXT,
  avatar_url TEXT,
  mmr_atual INTEGER,
  vagas_ocupadas INTEGER,
  vagas_restantes INTEGER,
  waiting_count INTEGER,
  vagas_proxima_pt INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.slug, c.headline, c.bio,
    c.fila_aberta, c.fila_aberta_em, c.fila_max_vagas,
    p.username, p.avatar_url, p.mmr_atual,
    COALESCE(q.waiting_count, 0)::int AS vagas_ocupadas,
    GREATEST(0, (CASE WHEN c.queue_mode = 'coached' THEN 5 ELSE c.fila_max_vagas END)
                 - COALESCE(q.waiting_count, 0))::int AS vagas_restantes,
    COALESCE(q.waiting_count, 0)::int AS waiting_count,
    GREATEST(0, (CASE WHEN c.queue_mode = 'coached' THEN 5 ELSE c.fila_max_vagas END)
                 - COALESCE(q.waiting_count, 0))::int AS vagas_proxima_pt
  FROM public.coaches c
  JOIN public.profiles p ON p.id = c.profile_id
  LEFT JOIN (
    SELECT coach_id, COUNT(*)::int AS waiting_count
    FROM public.coach_queue_entries
    WHERE status = 'waiting'
    GROUP BY coach_id
  ) q ON q.coach_id = c.id
  WHERE c.ativo = true
  ORDER BY c.fila_aberta DESC, c.accepted_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_pros_live_status() TO anon, authenticated;
