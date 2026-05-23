-- ============================================================================
-- Seed de dados fake pra teste visual da plataforma FORMULADOTA.
-- ============================================================================
--
-- Funções idempotentes pra criar PROs e usuários fake, com filas e
-- "PTs hoje" simulados pra testar o algoritmo LRU + UI do QueueBoard.
--
-- Todos os emails fake terminam em @simulado.local — permite cleanup
-- fácil sem afetar dados reais.
--
-- COMO USAR
-- 1. Rodar a SEÇÃO 1 (functions) — cria/recria as funções utilitárias
-- 2. Rodar SEÇÃO 2 (cleanup) — remove tudo de simulação prévia
-- 3. Rodar SEÇÃO 3 (data) — cria PROs e filas como você quer
--
-- Pra ADICIONAR novos PROs basta editar/adicionar chamadas em SEÇÃO 3.
-- Pra LIMPAR tudo é só rodar SEÇÃO 2.
-- ============================================================================


-- =====================
-- SEÇÃO 1 — FUNCTIONS
-- =====================

-- Cria um fake user em auth.users + profiles. Retorna o profile_id.
-- Se já existir (mesmo email), retorna o id existente.
CREATE OR REPLACE FUNCTION public.seed_fake_user(
  p_username TEXT,
  p_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_email TEXT := COALESCE(p_email, p_username || '@simulado.local');
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, role, aud
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt('fake_pwd', gen_salt('bf')),
    now(), now(), now(),
    'authenticated', 'authenticated'
  );

  INSERT INTO profiles (id, username, email, behavior_status, role)
  VALUES (v_user_id, p_username, v_email, 'ok', 'player')
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;

  RETURN v_user_id;
END;
$$;

-- Promove um fake user a PRO (cria row em coaches). Retorna coach_id.
-- Se já for coach, atualiza fila_aberta + headline + fila_max_vagas.
CREATE OR REPLACE FUNCTION public.seed_fake_pro(
  p_username TEXT,
  p_slug TEXT,
  p_headline TEXT,
  p_mmr INTEGER,
  p_fila_aberta BOOLEAN DEFAULT true,
  p_fila_max_vagas INTEGER DEFAULT 4
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile_id UUID;
  v_coach_id UUID;
BEGIN
  v_profile_id := public.seed_fake_user(p_username);

  UPDATE profiles SET mmr_atual = p_mmr WHERE id = v_profile_id;

  SELECT id INTO v_coach_id FROM coaches WHERE profile_id = v_profile_id;

  IF v_coach_id IS NULL THEN
    INSERT INTO coaches (profile_id, slug, headline, ativo, fila_aberta, fila_aberta_em, fila_max_vagas)
    VALUES (v_profile_id, p_slug, p_headline, true, p_fila_aberta,
            CASE WHEN p_fila_aberta THEN now() ELSE NULL END, p_fila_max_vagas)
    RETURNING id INTO v_coach_id;
  ELSE
    UPDATE coaches SET
      slug = p_slug,
      headline = p_headline,
      fila_aberta = p_fila_aberta,
      fila_aberta_em = CASE WHEN p_fila_aberta THEN COALESCE(fila_aberta_em, now()) ELSE NULL END,
      fila_max_vagas = p_fila_max_vagas
    WHERE id = v_coach_id;
  END IF;

  RETURN v_coach_id;
END;
$$;

-- Cria N entries waiting pra um coach, com joined_at distribuído + pts_today
-- variando aleatório controlado.
-- Retorna número de entries criadas.
CREATE OR REPLACE FUNCTION public.seed_fake_queue(
  p_coach_id UUID,
  p_n_entries INTEGER,
  p_username_prefix TEXT DEFAULT 'fake'
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  i INTEGER;
  j INTEGER;
  fake_user_id UUID;
  pts_today_count INTEGER;
  joined_offset_min INTEGER;
  created INTEGER := 0;
BEGIN
  FOR i IN 1..p_n_entries LOOP
    fake_user_id := public.seed_fake_user(p_username_prefix || '_' || i);

    -- pts_today com distribuição realista: a maioria 0, alguns 1, raros 2
    pts_today_count := CASE
      WHEN (i % 5) = 0 THEN 2
      WHEN (i % 3) = 0 THEN 1
      ELSE 0
    END;

    -- joined_at distribuído entre 2 e 30 minutos atrás (fluxo natural)
    joined_offset_min := (p_n_entries - i + 1) * 2;

    -- Insere PTs consumed prévias pra simular pts_today
    FOR j IN 1..pts_today_count LOOP
      INSERT INTO coach_queue_entries (coach_id, user_id, status, joined_at, consumed_at)
      VALUES (
        p_coach_id,
        fake_user_id,
        'consumed',
        now() - interval '5 hours',
        now() - (j * interval '2 hours')
      );
    END LOOP;

    -- Insere entry waiting (skip se já estiver waiting nesse coach)
    INSERT INTO coach_queue_entries (coach_id, user_id, status, joined_at)
    VALUES (
      p_coach_id,
      fake_user_id,
      'waiting',
      now() - (joined_offset_min || ' minutes')::interval
    )
    ON CONFLICT DO NOTHING;

    created := created + 1;
  END LOOP;

  RETURN created;
END;
$$;


-- =====================
-- SEÇÃO 2 — CLEANUP
-- =====================
-- Remove tudo de simulação (users com @simulado.local).

DO $$
DECLARE
  v_fake_user_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_fake_user_ids FROM profiles WHERE email LIKE '%@simulado.local';

  IF v_fake_user_ids IS NOT NULL THEN
    -- Apaga entries das filas
    DELETE FROM coach_queue_entries WHERE user_id = ANY(v_fake_user_ids);
    -- Apaga coaches fake
    DELETE FROM coaches WHERE profile_id = ANY(v_fake_user_ids);
    -- Apaga profiles (auth.users cascade)
    DELETE FROM profiles WHERE id = ANY(v_fake_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_fake_user_ids);
  END IF;
END $$;


-- =====================
-- SEÇÃO 3 — DATA
-- =====================
-- Edite aqui pra criar quantos PROs + filas quiser.
-- Cada PRO precisa de slug ÚNICO (ex: pedro-paulo, carlos-pro, ana-mid).

-- PRO 1: Pedro Paulo (REAL — não vamos recriar, só atualizar headline e abrir fila)
-- O coach 8683ad53-... pertence ao profile real do Pedro. Apenas garantir fila aberta:
UPDATE coaches
SET fila_aberta = true,
    fila_aberta_em = COALESCE(fila_aberta_em, now())
WHERE slug = 'pedro-paulo';

-- Fila do Pedro: 10 alunos fake
SELECT public.seed_fake_queue(
  (SELECT id FROM coaches WHERE slug = 'pedro-paulo'),
  10,
  'aluno_pedro'
) AS fila_pedro;


-- PRO 2: Carlos PRO (FAKE — coach novo)
SELECT public.seed_fake_pro(
  'carlos_pro',
  'carlos-pro',
  'Especialista em mid lane · Divine 5 · 6.200 MMR',
  6200,
  true,
  4
) AS coach_carlos_id;

SELECT public.seed_fake_queue(
  (SELECT id FROM coaches WHERE slug = 'carlos-pro'),
  6,
  'aluno_carlos'
) AS fila_carlos;


-- PRO 3: Lucas PRO (FAKE — coach novo)
SELECT public.seed_fake_pro(
  'lucas_pro',
  'lucas-pro',
  'Suporte ofensivo · Ancient 4 · 5.800 MMR · mãe de jungle',
  5800,
  true,
  4
) AS coach_lucas_id;

SELECT public.seed_fake_queue(
  (SELECT id FROM coaches WHERE slug = 'lucas-pro'),
  3,
  'aluno_lucas'
) AS fila_lucas;


-- =====================
-- SEÇÃO 4 — VALIDAÇÃO
-- =====================
SELECT
  c.slug,
  p.username AS pro,
  p.mmr_atual,
  c.fila_aberta,
  (SELECT COUNT(*) FROM coach_queue_entries WHERE coach_id = c.id AND status = 'waiting') AS na_fila
FROM coaches c
JOIN profiles p ON p.id = c.profile_id
WHERE c.ativo = true
ORDER BY c.fila_aberta DESC, na_fila DESC;
