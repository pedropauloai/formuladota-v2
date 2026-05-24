-- Migration 031 — PRO promotions + Revenue tracking + PRO audit
-- Decisão Pedro 2026-05-23: sistema de multiplicação de PROs (Pilar 13 PHILOSOPHY)
-- Imortais da Fórmula podem ser promovidos a PROs pelo Pedro.
-- Revenue model: PRO 85%, sponsor 10% ONE-TIME na 1ª venda, plataforma 5%.
-- Trigger PG automatiza split em cada ficha_ledger com source='purchase'.

-- =============================================
-- 1. Tabela pro_promotions (histórico de promoções)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pro_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsor_user_id uuid NOT NULL REFERENCES public.profiles(id),  -- quem promoveu (Pedro inicialmente)
  promoted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked', 'retired')),
  promotion_notes text,                          -- justificativa Pedro/conselho
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pro_promotions_user_idx ON public.pro_promotions(user_id);
CREATE INDEX IF NOT EXISTS pro_promotions_sponsor_idx ON public.pro_promotions(sponsor_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS pro_promotions_active_unique
  ON public.pro_promotions(user_id)
  WHERE status = 'active';

ALTER TABLE public.pro_promotions ENABLE ROW LEVEL SECURITY;

-- Admin vê e gerencia tudo
CREATE POLICY pro_promotions_admin_all ON public.pro_promotions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- User vê própria promoção
CREATE POLICY pro_promotions_user_own ON public.pro_promotions
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- 2. Tabela revenue_splits (split automático por ficha)
-- =============================================
CREATE TABLE IF NOT EXISTS public.revenue_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_ledger_id uuid NOT NULL REFERENCES public.ficha_ledger(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id),
  pro_user_id uuid NOT NULL REFERENCES public.profiles(id),       -- PRO que vendeu (ou Pedro)
  sponsor_user_id uuid REFERENCES public.profiles(id),             -- sponsor do PRO (null se Pedro)

  total_brl decimal(10,2) NOT NULL,                                -- valor total da ficha

  pro_share_brl decimal(10,2) NOT NULL,                           -- 85% normal / 95% Pedro ou sem sponsor
  sponsor_share_brl decimal(10,2) NOT NULL DEFAULT 0,             -- 10% ONE-TIME na 1ª venda
  platform_share_brl decimal(10,2) NOT NULL,                      -- 5% universal

  is_first_sale boolean NOT NULL DEFAULT false,                   -- true só na 1ª ficha do PRO

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenue_splits_pro_idx ON public.revenue_splits(pro_user_id);
CREATE INDEX IF NOT EXISTS revenue_splits_sponsor_idx ON public.revenue_splits(sponsor_user_id);
CREATE INDEX IF NOT EXISTS revenue_splits_created_idx ON public.revenue_splits(created_at DESC);

ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY revenue_splits_admin_all ON public.revenue_splits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- PRO vê próprios splits
CREATE POLICY revenue_splits_pro_own ON public.revenue_splits
  FOR SELECT USING (auth.uid() = pro_user_id);

-- Sponsor vê splits onde recebeu comissão
CREATE POLICY revenue_splits_sponsor_own ON public.revenue_splits
  FOR SELECT USING (auth.uid() = sponsor_user_id);

-- =============================================
-- 3. Tabela pro_audit_log (toda ação relacionada a PRO)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pro_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES public.profiles(id),     -- quem fez (Pedro/Conselho/PRO)
  target_user_id uuid REFERENCES public.profiles(id),             -- alvo (PRO promovido/revogado)
  action text NOT NULL CHECK (action IN (
    'promote_to_pro',
    'revoke_pro',
    'pause_pro',
    'resume_pro',
    'retire_pro',
    'mentor_note'
  )),
  payload jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pro_audit_target_idx ON public.pro_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS pro_audit_actor_idx ON public.pro_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS pro_audit_created_idx ON public.pro_audit_log(created_at DESC);

ALTER TABLE public.pro_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY pro_audit_admin_all ON public.pro_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- PRO promovido vê próprio histórico
CREATE POLICY pro_audit_pro_visible ON public.pro_audit_log
  FOR SELECT USING (auth.uid() = target_user_id);

-- =============================================
-- 4. Helper: verifica se é primeira venda do PRO
-- =============================================
CREATE OR REPLACE FUNCTION public.is_pro_first_sale(p_pro_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.revenue_splits
    WHERE pro_user_id = p_pro_user_id
  );
$$;

-- =============================================
-- 5. Trigger: calcular revenue split em cada ficha purchase
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_revenue_split()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pro_user uuid;
  v_sponsor_user uuid;
  v_ficha_price decimal(10,2);
  v_is_founder boolean;
  v_is_first boolean;
  v_pro_amount decimal(10,2);
  v_sponsor_amount decimal(10,2);
  v_platform_amount decimal(10,2);
BEGIN
  -- Só processa se source='purchase' (ignora pt_consumed, admin_grant, etc.)
  IF NEW.source != 'purchase' THEN
    RETURN NEW;
  END IF;

  -- Pega preço da ficha via purchase → package
  SELECT p.preco_brl INTO v_ficha_price
  FROM public.purchases pur
  JOIN public.packages p ON p.id = pur.package_id
  WHERE pur.id = NEW.source_id;

  IF v_ficha_price IS NULL THEN
    -- Não é purchase de package conhecido — ignora sem erro
    RETURN NEW;
  END IF;

  -- Identifica PRO da venda via package.coach_id → coaches.profile_id
  -- Se package sem coach (ficha genérica), usa coach da queue entry mais recente do user
  SELECT c.profile_id INTO v_pro_user
  FROM public.purchases pur
  JOIN public.packages p ON p.id = pur.package_id
  JOIN public.coaches c ON c.id = p.coach_id
  WHERE pur.id = NEW.source_id;

  IF v_pro_user IS NULL THEN
    -- Package sem coach ligado — sem split (ficha genérica não vinculada)
    RETURN NEW;
  END IF;

  -- Verifica se PRO tem sponsor ativo (pro_promotions)
  SELECT pp.sponsor_user_id INTO v_sponsor_user
  FROM public.pro_promotions pp
  WHERE pp.user_id = v_pro_user AND pp.status = 'active'
  LIMIT 1;

  -- Pedro é founder — não tem sponsor (ou o sponsor é ele mesmo)
  v_is_founder := (v_sponsor_user IS NULL OR v_sponsor_user = v_pro_user);

  -- Verifica se é primeira venda do PRO
  v_is_first := public.is_pro_first_sale(v_pro_user);

  -- Calcula split
  IF v_is_founder THEN
    -- Pedro/founder: 95% próprio, 5% plataforma, 0% sponsor
    v_pro_amount     := round(v_ficha_price * 0.95, 2);
    v_sponsor_amount := 0;
    v_platform_amount := round(v_ficha_price * 0.05, 2);
  ELSIF v_is_first THEN
    -- PRO normal, 1ª venda: PRO 85%, sponsor 10% ONE-TIME, plataforma 5%
    v_pro_amount      := round(v_ficha_price * 0.85, 2);
    v_sponsor_amount  := round(v_ficha_price * 0.10, 2);
    v_platform_amount := round(v_ficha_price * 0.05, 2);
  ELSE
    -- PRO normal, vendas subsequentes: PRO 95%, plataforma 5%, sem sponsor
    v_pro_amount      := round(v_ficha_price * 0.95, 2);
    v_sponsor_amount  := 0;
    v_platform_amount := round(v_ficha_price * 0.05, 2);
  END IF;

  -- Insere revenue_split
  INSERT INTO public.revenue_splits (
    ficha_ledger_id, purchase_id, pro_user_id, sponsor_user_id,
    total_brl, pro_share_brl, sponsor_share_brl, platform_share_brl,
    is_first_sale
  ) VALUES (
    NEW.id, NEW.source_id, v_pro_user, v_sponsor_user,
    v_ficha_price, v_pro_amount, v_sponsor_amount, v_platform_amount,
    v_is_first
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ficha_ledger_revenue_split ON public.ficha_ledger;
CREATE TRIGGER ficha_ledger_revenue_split
  AFTER INSERT ON public.ficha_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_revenue_split();

-- =============================================
-- 6. RPC: get PRO revenue summary
-- =============================================
CREATE OR REPLACE FUNCTION public.get_pro_revenue_summary(
  p_pro_user_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_revenue decimal(10,2),
  pro_earnings  decimal(10,2),
  sponsor_given decimal(10,2),
  total_sales   int,
  is_first_sale_done boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(total_brl), 0)::decimal(10,2)         AS total_revenue,
    COALESCE(SUM(pro_share_brl), 0)::decimal(10,2)     AS pro_earnings,
    COALESCE(SUM(sponsor_share_brl), 0)::decimal(10,2) AS sponsor_given,
    COUNT(*)::int                                        AS total_sales,
    EXISTS (
      SELECT 1 FROM public.revenue_splits
      WHERE pro_user_id = p_pro_user_id
    )                                                    AS is_first_sale_done
  FROM public.revenue_splits
  WHERE pro_user_id = p_pro_user_id
    AND (p_since IS NULL OR created_at >= p_since);
$$;

GRANT EXECUTE ON FUNCTION public.get_pro_revenue_summary(uuid, timestamptz) TO authenticated;

-- =============================================
-- 7. RPC: lista PROs sponsoreados por um usuário (árvore de mentoria)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_sponsored_pros(p_sponsor_user_id uuid)
RETURNS TABLE (
  user_id     uuid,
  promoted_at timestamptz,
  status      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, promoted_at, status
  FROM public.pro_promotions
  WHERE sponsor_user_id = p_sponsor_user_id
  ORDER BY promoted_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsored_pros(uuid) TO authenticated;
