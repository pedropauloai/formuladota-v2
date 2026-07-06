-- 151_ring_effects_cosmetics.sql — 6 efeitos de anel (slot ring) pro Compendium.
-- O anel de XP virou um SHADER WebGL: brilho + calda + fagulhas na ponta do progresso,
-- na COR do efeito equipado. asset_ref {kind:'effect', effect} já é lido por asRingAsset
-- (src/lib/cosmetics.ts) + XpAvatarRing (EFFECT_COLOR). Nada de código muda — só o seed.
-- Gating por MÉRITO (tier), coerente com a raridade. Pedro 2026-07-06.
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('ring_fx_pulse',    'ring', 'Pulso Esmeralda',    'Faísca verde-esmeralda na ponta do progresso — a energia da fila.', 'raro',     'merito', '{"kind":"merito","tier":"piloto"}',   '{"kind":"effect","effect":"pulse"}',    10),
  ('ring_fx_ember',    'ring', 'Brasa Dourada',      'Faísca dourada crepitando na ponta do seu progresso.',              'epico',    'merito', '{"kind":"merito","tier":"as"}',       '{"kind":"effect","effect":"ember"}',    11),
  ('ring_fx_electric', 'ring', 'Arco Ciano',         'Energia azul-ciano correndo pela barra de XP.',                     'lendario', 'merito', '{"kind":"merito","tier":"lendario"}', '{"kind":"effect","effect":"electric"}', 12),
  ('ring_fx_aurora',   'ring', 'Aurora',             'Luz dourado-clara, um brilho de aurora na ponta do progresso.',     'lendario', 'merito', '{"kind":"merito","tier":"lendario"}', '{"kind":"effect","effect":"aurora"}',   13),
  ('ring_fx_inferno',  'ring', 'Inferno da Fórmula', 'Faísca vermelha intensa — o fogo da marca no seu anel.',            'lendario', 'merito', '{"kind":"merito","tier":"lendario"}', '{"kind":"effect","effect":"inferno"}',  14),
  ('ring_fx_arcane',   'ring', 'Arcano',             'Energia arcana roxa fluindo pela barra de XP.',                     'lendario', 'merito', '{"kind":"merito","tier":"mistico"}',  '{"kind":"effect","effect":"arcane"}',   15)
on conflict (slug) do nothing;
