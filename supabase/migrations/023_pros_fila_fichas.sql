-- MVP fichas + PROs + Live Strip + match_players (OpenDota enrichment ready)
-- Aplicado em 2026-05-21 via MCP Supabase. Mantido aqui pra versionamento.

-- ========================================
-- 1. Estender COACHES com toggle de fila
-- ========================================
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS fila_aberta BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS fila_aberta_em TIMESTAMPTZ;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS fila_max_vagas INTEGER NOT NULL DEFAULT 4
  CHECK (fila_max_vagas > 0 AND fila_max_vagas <= 4);
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC NOT NULL DEFAULT 30
  CHECK (comissao_pct >= 0 AND comissao_pct <= 100);

COMMENT ON COLUMN coaches.fila_aberta IS 'PRO online — true = aceitando alunos na fila agora';
COMMENT ON COLUMN coaches.fila_aberta_em IS 'Timestamp de quando o PRO abriu a fila';
COMMENT ON COLUMN coaches.fila_max_vagas IS 'Máximo de alunos por PT (4 = grupo completo de 5 com o PRO)';
COMMENT ON COLUMN coaches.headline IS 'Frase de apresentação pro card do PRO';
COMMENT ON COLUMN coaches.comissao_pct IS 'Percentual da ficha que o PRO recebe';

-- ========================================
-- 2. Permitir packages sem coach (ficha genérica vale pra qualquer PRO)
-- ========================================
ALTER TABLE packages ALTER COLUMN coach_id DROP NOT NULL;

-- ========================================
-- 3. Nova: fila do PRO (coach_queue_entries)
-- ========================================
CREATE TABLE IF NOT EXISTS coach_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES purchases(id),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','consumed','cancelled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  match_id UUID REFERENCES matches(id)
);

CREATE INDEX IF NOT EXISTS coach_queue_waiting_idx
  ON coach_queue_entries (coach_id, joined_at) WHERE status = 'waiting';

CREATE UNIQUE INDEX IF NOT EXISTS coach_queue_user_one_per_coach_idx
  ON coach_queue_entries (coach_id, user_id) WHERE status = 'waiting';

COMMENT ON TABLE coach_queue_entries IS 'Fila de alunos esperando entrar em PT com um PRO';

-- ========================================
-- 4. Estender MATCHES com dataset OpenDota + link ao coach
-- ========================================
ALTER TABLE matches ADD COLUMN IF NOT EXISTS radiant_win BOOLEAN;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_dataset TEXT
  CHECK (match_dataset IN ('opendota','stratz','manual'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id);

-- ========================================
-- 5. Nova: match_players (10 linhas por PT via OpenDota)
-- ========================================
CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  steam_account_id BIGINT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  is_pro BOOLEAN NOT NULL DEFAULT false,
  team TEXT NOT NULL CHECK (team IN ('radiant','dire')),
  player_slot INTEGER NOT NULL CHECK (player_slot >= 0 AND player_slot < 10),
  is_winner BOOLEAN,
  hero_id INTEGER,
  hero_name TEXT,
  kills INTEGER, deaths INTEGER, assists INTEGER,
  gold_per_min INTEGER, xp_per_min INTEGER,
  last_hits INTEGER, denies INTEGER,
  net_worth BIGINT, level INTEGER,
  hero_damage BIGINT, hero_healing BIGINT, tower_damage BIGINT,
  items JSONB,
  raw_opendota JSONB,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_slot)
);

CREATE INDEX IF NOT EXISTS match_players_match_idx ON match_players (match_id);
CREATE INDEX IF NOT EXISTS match_players_user_idx ON match_players (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_players_steam_idx ON match_players (steam_account_id);

COMMENT ON TABLE match_players IS '10 jogadores por PT enriquecidos via OpenDota API';

-- ========================================
-- 6. RLS - coach_queue_entries
-- ========================================
ALTER TABLE coach_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own queue entries"
  ON coach_queue_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user can join queue"
  ON coach_queue_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user can update own queue"
  ON coach_queue_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach sees own queue"
  ON coach_queue_entries FOR SELECT
  USING (
    coach_id IN (SELECT id FROM coaches WHERE profile_id = auth.uid())
  );

CREATE POLICY "coach can manage own queue"
  ON coach_queue_entries FOR UPDATE
  USING (
    coach_id IN (SELECT id FROM coaches WHERE profile_id = auth.uid())
  );

CREATE POLICY "admin all queue"
  ON coach_queue_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 7. RLS - match_players (público pra leitura, admin escreve)
-- ========================================
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read match_players"
  ON match_players FOR SELECT
  USING (true);

CREATE POLICY "admin write match_players"
  ON match_players FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ========================================
-- 8. SECURITY DEFINER function: live status público (anon + authenticated)
-- ========================================
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
  vagas_restantes INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.slug, c.headline, c.bio,
    c.fila_aberta, c.fila_aberta_em, c.fila_max_vagas,
    p.username, p.avatar_url, p.mmr_atual,
    COALESCE(q.vagas_ocupadas, 0)::int AS vagas_ocupadas,
    (c.fila_max_vagas - COALESCE(q.vagas_ocupadas, 0))::int AS vagas_restantes
  FROM public.coaches c
  JOIN public.profiles p ON p.id = c.profile_id
  LEFT JOIN (
    SELECT coach_id, COUNT(*)::int AS vagas_ocupadas
    FROM public.coach_queue_entries
    WHERE status = 'waiting'
    GROUP BY coach_id
  ) q ON q.coach_id = c.id
  WHERE c.ativo = true
  ORDER BY c.fila_aberta DESC, c.accepted_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_pros_live_status() TO anon, authenticated;

-- ========================================
-- 9. Seed package "Ficha avulsa R$15" (coach_id NULL = vale pra qualquer PRO)
-- ========================================
INSERT INTO packages (nome, descricao, tipo, qtd_partidas, qtd_sessoes, preco_brl, ativo, display_order, coach_id)
SELECT 'Ficha avulsa', '1 vaga em 1 PT ranked oficial com um PRO da Fórmula do Dota de Corrida', 'avulso', 1, 0, 15.00, true, 0, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM packages WHERE nome = 'Ficha avulsa' AND tipo = 'avulso'
);
