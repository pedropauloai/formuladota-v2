-- 126_backfill_season_mmr_seed.sql — Semeia o MMR de temporada que faltava —
-- Pedro 2026-07-04.
--
-- BUG: a semente de MMR pela medalha Valve (seedMmrFromRankTier) existia mas
-- NUNCA era chamada no vínculo Steam. Resultado: 42 dos 81 usuários com Steam
-- ligado não tinham linha em player_season_mmr, e profiles.mmr_inicial/mmr_atual
-- ficavam NULL. As medalhas FORMULADOTA (card de aceitar partida, mini perfil)
-- derivam do season MMR → medalha errada/placeholder pra esses usuários.
--
-- Este backfill usa public.queue_mmr_for(user) — que JÁ implementa a MESMA
-- semente da migration 112 (medalha Valve de user_stats_extended.career, senão
-- 1000). Resultado idêntico ao seedMmrFromRankTier do TS. 73/81 já têm rankTier
-- em career → semente exata; os demais caem em 1000 (descalibrado, correto pra
-- quem não tem rank público legível). O seed ON-LINK (server action, fetch da
-- OpenDota) cobre os vínculos NOVOS daqui pra frente.

-- =====================================================================
-- 1. Linha de player_season_mmr pra todo Steam-linked sem uma na season ativa
-- =====================================================================
insert into public.player_season_mmr (user_id, season_id, mmr, peak_mmr, calibrated)
select sl.user_id, s.id, public.queue_mmr_for(sl.user_id), public.queue_mmr_for(sl.user_id), false
from public.steam_links sl
cross join public.seasons s
where s.active
  and not exists (
    select 1 from public.player_season_mmr psm
    where psm.user_id = sl.user_id and psm.season_id = s.id
  )
on conflict (user_id, season_id) do nothing;

-- =====================================================================
-- 2. profiles.mmr_inicial / mmr_atual (NULL) ← season MMR recém-semeado.
--    Só preenche o que está NULL (não clobber de MMR já existente). Migration
--    roda como owner → passa pelo trigger de colunas congeladas (m117).
-- =====================================================================
update public.profiles p
   set mmr_inicial = coalesce(p.mmr_inicial, psm.mmr),
       mmr_atual   = coalesce(p.mmr_atual, psm.mmr)
  from public.player_season_mmr psm
  join public.seasons s on s.id = psm.season_id and s.active
 where psm.user_id = p.id
   and (p.mmr_inicial is null or p.mmr_atual is null);
