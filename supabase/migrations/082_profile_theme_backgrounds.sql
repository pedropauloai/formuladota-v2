-- 082_profile_theme_backgrounds.sql — Biblioteca de FUNDOS de perfil (slot profile_theme).
-- v1 (Pedro 2026-07-01): "os dois na mesma leva" —
--   • 4 temas premium por CSS (gradientes de marca; leves, sempre confiáveis);
--   • 10 wallpapers reais de Dota 2 auto-hospedados em /public/dota/backgrounds/.
-- Gating MISTO (decisão do Pedro): grátis + mérito (nível/tier) + plano (locked).
--   asset_ref: {kind:'css', background:'<valor css>'} | {kind:'image', image:'/path.jpg'}
--   requirement: {kind:'free'} | {kind:'merito', tier:'<tier>'} | {kind:'locked'} (plano).
-- O fundo equipado vira o centerHero do /me e do perfil público. Sem nada equipado
-- (default) → fundo premium limpo. Ver src/lib/queries/cosmetics.ts (profileThemeCss).

-- === Temas premium por CSS (gradientes de marca) ==================================
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('theme_css_neutral', 'profile_theme', 'Névoa Neutra',
   'Fundo premium neutro da marca — sóbrio e elegante.', 'comum', 'merito',
   '{"kind":"free"}'::jsonb,
   '{"kind":"css","background":"radial-gradient(80% 60% at 50% 0%, rgba(196,33,33,0.18), transparent 65%), linear-gradient(180deg, #101013, #0a0a0c)"}'::jsonb, 10),

  ('theme_css_radiant', 'profile_theme', 'Alvorada Radiant',
   'O verde e o dourado da facção Iluminada.', 'comum', 'merito',
   '{"kind":"free"}'::jsonb,
   '{"kind":"css","background":"radial-gradient(90% 70% at 50% 100%, rgba(0,196,102,0.30), transparent 68%), radial-gradient(60% 50% at 20% 10%, rgba(224,182,78,0.14), transparent 70%), linear-gradient(180deg, #0b120e, #070a08)"}'::jsonb, 11),

  ('theme_css_dire', 'profile_theme', 'Crepúsculo Dire',
   'O carmesim da facção Temida.', 'raro', 'merito',
   '{"kind":"merito","tier":"aprendiz"}'::jsonb,
   '{"kind":"css","background":"radial-gradient(90% 70% at 50% 0%, rgba(196,33,33,0.40), transparent 66%), radial-gradient(60% 60% at 80% 100%, rgba(120,20,20,0.32), transparent 70%), linear-gradient(180deg, #180a0b, #0a0708)"}'::jsonb, 12),

  ('theme_css_immortal', 'profile_theme', 'Éter Imortal',
   'Aura mística — púrpura e ouro. Para os Lendários.', 'epico', 'merito',
   '{"kind":"merito","tier":"lendario"}'::jsonb,
   '{"kind":"css","background":"radial-gradient(70% 60% at 25% 15%, rgba(168,85,247,0.32), transparent 66%), radial-gradient(60% 60% at 85% 95%, rgba(224,182,78,0.18), transparent 68%), linear-gradient(180deg, #120b1a, #08070c)"}'::jsonb, 13)
on conflict (slug) do nothing;

-- === Wallpapers reais de Dota 2 (auto-hospedados) =================================
-- 2 grátis · 6 por mérito (piloto→místico) · 2 exclusivos de plano (locked/imortal).
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('bg_dota_01', 'profile_theme', 'Campo de Batalha', 'Cena de Dota 2.', 'comum', 'merito',
   '{"kind":"free"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-01.jpg"}'::jsonb, 20),
  ('bg_dota_02', 'profile_theme', 'Linha de Frente', 'Cena de Dota 2.', 'comum', 'merito',
   '{"kind":"free"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-02.jpg"}'::jsonb, 21),
  ('bg_dota_03', 'profile_theme', 'Emboscada', 'Cena de Dota 2.', 'raro', 'merito',
   '{"kind":"merito","tier":"piloto"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-03.jpg"}'::jsonb, 22),
  ('bg_dota_04', 'profile_theme', 'Confronto', 'Cena de Dota 2.', 'raro', 'merito',
   '{"kind":"merito","tier":"piloto"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-04.jpg"}'::jsonb, 23),
  ('bg_dota_05', 'profile_theme', 'Investida', 'Cena de Dota 2.', 'epico', 'merito',
   '{"kind":"merito","tier":"as"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-05.jpg"}'::jsonb, 24),
  ('bg_dota_06', 'profile_theme', 'Domínio', 'Cena de Dota 2.', 'epico', 'merito',
   '{"kind":"merito","tier":"as"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-06.jpg"}'::jsonb, 25),
  ('bg_dota_07', 'profile_theme', 'Lenda', 'Cena de Dota 2.', 'lendario', 'merito',
   '{"kind":"merito","tier":"lendario"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-07.jpg"}'::jsonb, 26),
  ('bg_dota_08', 'profile_theme', 'Ascensão Mística', 'Cena de Dota 2.', 'lendario', 'merito',
   '{"kind":"merito","tier":"mistico"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-08.jpg"}'::jsonb, 27),
  ('bg_dota_09', 'profile_theme', 'Relíquia Aegis', 'Exclusivo de plano.', 'imortal', 'plano',
   '{"kind":"locked"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-09.jpg"}'::jsonb, 28),
  ('bg_dota_10', 'profile_theme', 'Panteão Godlike', 'Exclusivo de plano.', 'imortal', 'plano',
   '{"kind":"locked"}'::jsonb, '{"kind":"image","image":"/dota/backgrounds/bg-10.jpg"}'::jsonb, 29)
on conflict (slug) do nothing;
