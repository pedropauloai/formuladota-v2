-- 050 — Campos reais da OpenDota (validados com partida real do Pedro,
-- fixture .planning/research/opendota-sample-match-8829648086.json — 2026-06-11)
--
-- match_players: dados por jogador que a API entrega prontos e valem ouro:
--   rank_tier     → medalha Valve real (80 = Imortal) — anti-smurf/gate elite
--   benchmarks    → percentis prontos (GPM/XPM/kills...) pro "acima da média"
--   leaver_status → abandono (relevante pra conduta/honra)
--   personaname   → snapshot do nick na partida
--   aghanims_*    → detalhe de build pro match detail
--
-- matches: metadados da partida pro card de resultado e validação:
--   radiant_score/dire_score → placar
--   game_mode/lobby_type     → validação anti-Turbo (ranked = lobby_type 7)
--   patch/first_blood_time   → contexto

alter table public.match_players
  add column if not exists rank_tier integer,
  add column if not exists leaver_status integer,
  add column if not exists personaname text,
  add column if not exists aghanims_scepter boolean,
  add column if not exists aghanims_shard boolean,
  add column if not exists benchmarks jsonb;

alter table public.matches
  add column if not exists radiant_score integer,
  add column if not exists dire_score integer,
  add column if not exists game_mode integer,
  add column if not exists lobby_type integer,
  add column if not exists patch integer,
  add column if not exists first_blood_time integer;
