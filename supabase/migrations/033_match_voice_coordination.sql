-- Migration 033: Adiciona colunas de coordenação de voice channel Discord em matches.
-- Aplicado em 2026-05-24 — Wave 7 (Bot Discord V1).
--
-- dota_match_id já existe desde migrations anteriores (legacy campo da tabela lobbies era separado).
-- Aqui adicionamos as colunas de voice Discord e flag de verificação OpenDota.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS voice_channel_id_discord text,
  ADD COLUMN IF NOT EXISTS voice_channel_name text,
  ADD COLUMN IF NOT EXISTS dota_match_id_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_channel_archived_at timestamptz;

-- Index para buscar matches ativos por coach mais rápido
-- (usado em getActiveMatchSession + cleanup do bot)
CREATE INDEX IF NOT EXISTS idx_matches_coach_status
  ON matches (coach_id, status);

COMMENT ON COLUMN matches.voice_channel_id_discord IS
  'Discord channel ID da sala de voz temporária criada pelo bot para esta sessão.';

COMMENT ON COLUMN matches.voice_channel_name IS
  'Nome custom da sala de voz definido pelo PRO ao iniciar a sessão (ex: "Sessão Sábado 19h").';

COMMENT ON COLUMN matches.dota_match_id_verified IS
  'True se o dota_match_id foi validado via OpenDota API (4/5 participantes confirmados + recência < 4h). False = aceito mas não verificado (OpenDota 404 no momento).';

COMMENT ON COLUMN matches.voice_channel_archived_at IS
  'Timestamp em que o bot apagou a sala de voz temp (para auditoria).';
