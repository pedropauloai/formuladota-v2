-- Migration 032 — Pricing descentralizado com guardrails HONOR
-- Decisão Pedro 2026-05-23: cada PRO edita próprio preço dentro de guardrails escalonados por tier HONOR
--
-- Floor universal R$ 10 (anti-dumping), ceiling escalonado por tier:
--   Tiers 1-5 (até Honrado):     R$ 25
--   Tier 6 (Mestre):             R$ 35
--   Tier 7 (Lendário):           R$ 45
--   Tier 8 (Imortal da Fórmula): R$ 50
--   Pedro Founder (admin):        R$ 100
--
-- Cooldown: 1 mudança a cada 30 dias (anti pricing wars)
-- Histórico: imutável append-only em package_price_history

-- =============================================
-- 1. Adicionar metadados de pricing em packages
-- =============================================
-- packages já tem preco_brl. Adicionamos last_price_change_at pra controle de cooldown.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS last_price_change_at timestamptz DEFAULT now();

-- =============================================
-- 2. Tabela package_price_history (imutável, append-only)
-- =============================================
-- Auditoria transparente: alunos e Pedro podem ver toda evolução de preços.
-- INSERT via Server Actions com service role; ninguém deleta ou atualiza.

CREATE TABLE IF NOT EXISTS public.package_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  changed_by_user_id uuid NOT NULL REFERENCES public.profiles(id),

  price_before decimal(10,2) NOT NULL,
  price_after  decimal(10,2) NOT NULL,

  reason text,                         -- justificativa do PRO (obrigatória via Server Action)
  honor_tier_at_change text,           -- tier HONOR no momento da mudança (audit imutável)

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_price_history_pkg_idx
  ON public.package_price_history(package_id);

CREATE INDEX IF NOT EXISTS package_price_history_user_idx
  ON public.package_price_history(changed_by_user_id);

CREATE INDEX IF NOT EXISTS package_price_history_created_idx
  ON public.package_price_history(created_at DESC);

ALTER TABLE public.package_price_history ENABLE ROW LEVEL SECURITY;

-- Leitura pública — transparência sagrada (alunos vêem histórico de preço)
CREATE POLICY package_price_history_public_read
  ON public.package_price_history
  FOR SELECT USING (true);

-- Apenas admin pode inserir manualmente (Server Actions usam service role que bypassa RLS)
CREATE POLICY package_price_history_admin_insert
  ON public.package_price_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Histórico é imutável — sem UPDATE nem DELETE via RLS (service role não usa policies)
-- Nenhuma policy de UPDATE/DELETE = bloqueio total via RLS para usuários normais

-- =============================================
-- 3. Função: get_max_price_for_pro
-- Retorna o ceiling de preço permitido ao PRO baseado no tier HONOR
-- =============================================
CREATE OR REPLACE FUNCTION public.get_max_price_for_pro(p_user_id uuid)
RETURNS decimal(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_honor_score int;
BEGIN
  -- Admin (Pedro Founder) tem exception: ceiling R$ 100
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_is_admin IS TRUE THEN
    RETURN 100.00;
  END IF;

  -- Pega score HONOR atual via função existente (migration 011)
  v_honor_score := COALESCE(public.get_honor_score(p_user_id), 1000);

  -- Ceiling escalonado por tier HONOR:
  --   Imortal da Fórmula (>= 2100): R$ 50
  --   Lendário (>= 1900):            R$ 45
  --   Mestre (>= 1700):              R$ 35
  --   Honrado (>= 1500):             R$ 25
  --   Tiers abaixo de Honrado:       R$ 25 (baseline PRO)
  IF v_honor_score >= 2100 THEN
    RETURN 50.00;
  ELSIF v_honor_score >= 1900 THEN
    RETURN 45.00;
  ELSIF v_honor_score >= 1700 THEN
    RETURN 35.00;
  ELSE
    RETURN 25.00;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_max_price_for_pro(uuid) TO authenticated;

-- =============================================
-- 4. Função: can_change_price
-- Verifica cooldown de 30 dias antes de permitir nova mudança de preço
-- =============================================
CREATE OR REPLACE FUNCTION public.can_change_price(p_package_id uuid)
RETURNS TABLE (
  can_change boolean,
  next_change_allowed_at timestamptz,
  days_remaining int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_change timestamptz;
  v_cooldown_end timestamptz;
BEGIN
  SELECT last_price_change_at INTO v_last_change
  FROM public.packages
  WHERE id = p_package_id;

  -- Package nunca teve mudança de preço: pode mudar agora
  IF v_last_change IS NULL THEN
    RETURN QUERY SELECT true, now(), 0;
    RETURN;
  END IF;

  v_cooldown_end := v_last_change + INTERVAL '30 days';

  RETURN QUERY SELECT
    (v_cooldown_end <= now())                                        AS can_change,
    v_cooldown_end                                                   AS next_change_allowed_at,
    GREATEST(0, EXTRACT(day FROM v_cooldown_end - now())::int)      AS days_remaining;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_change_price(uuid) TO authenticated;

-- =============================================
-- 5. Verificações pós-migration
-- =============================================
-- Rodar após aplicar:
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'packages'
--   AND column_name = 'last_price_change_at';
-- -- Esperado: 1 linha
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'package_price_history';
-- -- Esperado: 1 linha
--
-- SELECT proname FROM pg_proc
--   WHERE proname IN ('get_max_price_for_pro', 'can_change_price');
-- -- Esperado: 2 linhas
