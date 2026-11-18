-- 166: chave da fila competitiva. Sem o bot da Steam no ar, a partida formada nunca vira sala no
-- Dota e o jogador espera sem fim (sem consulta do bot ao banco desde 06/11/2026). Nasce desligada;
-- quando o bot voltar, o admin religa no painel de flags.
insert into public.feature_flags (key, enabled, label)
values ('fila_competitiva', false, 'Fila competitiva (precisa do bot da Steam no ar)')
on conflict (key) do nothing;
