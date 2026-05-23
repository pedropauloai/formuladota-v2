-- DROP + CREATE da function get_pros_live_status com clamp em vagas.
-- Aplicado em 2026-05-23 via MCP Supabase.
--
-- Postgres não permite CREATE OR REPLACE quando OUT params mudam — daí DROP.
-- vagas_restantes / vagas_proxima_pt agora usam GREATEST(0, ...) pra não
-- retornar valor negativo quando waiting_count > fila_max_vagas.

DROP FUNCTION IF EXISTS public.get_pros_live_status();

CREATE FUNCTION public.get_pros_live_status()
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
    GREATEST(0, c.fila_max_vagas - COALESCE(q.waiting_count, 0))::int AS vagas_restantes,
    COALESCE(q.waiting_count, 0)::int AS waiting_count,
    GREATEST(0, c.fila_max_vagas - COALESCE(q.waiting_count, 0))::int AS vagas_proxima_pt
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
