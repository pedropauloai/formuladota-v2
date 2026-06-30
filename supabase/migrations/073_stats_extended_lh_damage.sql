-- 073 — média de last hits e dano a heróis no cache de stats externos.
-- Usado pra o hexágono de performance ter 6 eixos comparáveis (Conta geral STRATZ
-- vs partidas FormulaDota): Vitórias/KDA/GPM/XPM/Last hits/Dano.

alter table public.user_stats_extended add column if not exists avg_last_hits numeric;
alter table public.user_stats_extended add column if not exists avg_hero_damage numeric;
