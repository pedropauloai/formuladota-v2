-- 080_cosmetics_foundation.sql
-- Fundação de cosméticos (Compendium — Fase 0). Decisão Pedro 2026-07-01.
-- Ver docs/foundations/COMPENDIUM.md §7-§8.
--
-- 3 camadas (padrão Valorant/Steam/Heroic Labs):
--   catálogo (cosmetics) → posse (user_cosmetics) → equipado (user_equipped).
--
-- Fase 0 = cosméticos de MÉRITO (derivados do tier/nível). O DIREITO de mérito é
-- validado no server action (TS), fonte única da curva de nível/tier (src/lib/levels.ts).
-- A trava por posse materializada só é exigida pra itens 'locked' (pagos/concedidos) —
-- será endurecida na Fase 3 (planos), via grant confiável (webhook de pagamento).
-- Nada é pago na Fase 0, então não há paywall a burlar.

-- === 1. Catálogo (cosmetics) — fonte de verdade de todo item que existe =============
create table if not exists public.cosmetics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                 -- id estável (ex: 'ring_tier_mistico')
  slot        text not null,                        -- ring|frame|smoke|badge|profile_theme|name_effect|notification_sound|chat_reaction
  name        text not null,
  description text,
  rarity      text not null default 'comum',        -- comum|raro|epico|lendario|imortal
  source      text not null default 'merito',       -- merito|temporada|passe|plano|comunidade|voto
  -- requirement: como se desbloqueia. {kind:'free'} | {kind:'merito', tier:'mistico'} |
  --   {kind:'merito', minLevel:6} | {kind:'locked'} (pago/concedido — exige posse).
  requirement jsonb not null default '{"kind":"free"}'::jsonb,
  -- asset_ref: config que o front usa pra renderizar. ring: {kind:'tier', tier:'as'} |
  --   {kind:'none'}; smoke: {mid:'#00C466', hot:'#e0b64e'}; frame: {kind:'solid', color:'brand'}.
  asset_ref   jsonb not null default '{}'::jsonb,
  season_id   uuid,                                 -- null = perene; sazonal na fase do passe
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint cosmetics_slot_check check (slot in ('ring','frame','smoke','badge','profile_theme','name_effect','notification_sound','chat_reaction')),
  constraint cosmetics_rarity_check check (rarity in ('comum','raro','epico','lendario','imortal')),
  constraint cosmetics_source_check check (source in ('merito','temporada','passe','plano','comunidade','voto'))
);

create index if not exists cosmetics_slot_idx on public.cosmetics(slot) where active;

alter table public.cosmetics enable row level security;

-- Catálogo é PÚBLICO (todos veem o que existe — como a coleção/loja do Dota).
drop policy if exists "cosmetics public read" on public.cosmetics;
create policy "cosmetics public read" on public.cosmetics
  for select using (true);
-- Escrita só via service role (seed/admin) — sem policy de insert/update pra authenticated.

-- === 2. Posse (user_cosmetics) — o que cada user REALMENTE tem (materializado) =======
create table if not exists public.user_cosmetics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id  uuid not null references public.cosmetics(id) on delete cascade,
  acquired_at  timestamptz not null default now(),
  acquired_via text not null default 'merito',      -- merito|passe|plano|comunidade|voto|admin
  constraint user_cosmetic_unique unique (user_id, cosmetic_id)
);

alter table public.user_cosmetics enable row level security;

-- User lê a própria posse.
drop policy if exists "user_cosmetics own read" on public.user_cosmetics;
create policy "user_cosmetics own read" on public.user_cosmetics
  for select using (user_id = auth.uid());
-- Insert só via função SECURITY DEFINER (grant_cosmetic) — sem policy de insert direto.

-- === 3. Equipado (user_equipped) — 1 item por slot ==================================
create table if not exists public.user_equipped (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  slot        text not null,
  cosmetic_id uuid not null references public.cosmetics(id) on delete cascade,
  equipped_at timestamptz not null default now(),
  primary key (user_id, slot),
  constraint user_equipped_slot_check check (slot in ('ring','frame','smoke','badge','profile_theme','name_effect','notification_sound','chat_reaction'))
);

alter table public.user_equipped enable row level security;

-- Equipado é PÚBLICO (perfil público precisa renderizar o que o outro equipou).
drop policy if exists "user_equipped public read" on public.user_equipped;
create policy "user_equipped public read" on public.user_equipped
  for select using (true);
-- Desequipar (delete) próprio permitido. Equipar (insert/update) vai pela função.
drop policy if exists "user_equipped own delete" on public.user_equipped;
create policy "user_equipped own delete" on public.user_equipped
  for delete using (user_id = auth.uid());

-- === 4. Funções ====================================================================

-- Equipa um cosmético pro user atual. Valida existência/atividade + trava de DIREITO:
-- itens 'locked' exigem posse materializada; demais (free/merito/temporada) liberam aqui
-- (o direito de mérito é validado no server action, no TS — src/lib/levels.ts).
create or replace function public.equip_cosmetic(p_cosmetic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me   uuid := auth.uid();
  v_slot text;
  v_kind text;
  v_owns boolean;
begin
  if v_me is null then raise exception 'não autenticado'; end if;

  select slot, requirement->>'kind' into v_slot, v_kind
  from public.cosmetics where id = p_cosmetic_id and active;
  if v_slot is null then raise exception 'cosmético inexistente'; end if;

  if v_kind = 'locked' then
    select exists(select 1 from public.user_cosmetics
                  where user_id = v_me and cosmetic_id = p_cosmetic_id) into v_owns;
    if not v_owns then raise exception 'cosmético não possuído'; end if;
  end if;

  insert into public.user_equipped (user_id, slot, cosmetic_id)
  values (v_me, v_slot, p_cosmetic_id)
  on conflict (user_id, slot) do update
    set cosmetic_id = excluded.cosmetic_id, equipped_at = now();
end;
$$;

grant execute on function public.equip_cosmetic(uuid) to authenticated;

-- Desequipa o slot (front volta ao default por tier).
create or replace function public.unequip_slot(p_slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  delete from public.user_equipped where user_id = auth.uid() and slot = p_slot;
end;
$$;

grant execute on function public.unequip_slot(text) to authenticated;

-- Concede posse (processos confiáveis: passe/plano/voto/comunidade/admin). Idempotente.
-- ATENÇÃO: o EXECUTE default do Postgres expõe funções a PUBLIC — a migration 081
-- REVOGA execute de public/anon/authenticated. Só service role concede posse.
create or replace function public.grant_cosmetic(p_user_id uuid, p_cosmetic_id uuid, p_via text default 'admin')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_cosmetics (user_id, cosmetic_id, acquired_via)
  values (p_user_id, p_cosmetic_id, coalesce(p_via, 'admin'))
  on conflict (user_id, cosmetic_id) do nothing;
end;
$$;

-- === 5. Seed do catálogo (Fase 0 — mérito) =========================================
-- Rings por tier: reproduzem o glow atual por tier (asset_ref kind='tier'); desbloqueio
-- por mérito (atingir o tier). Raridade escala com o tier. 'ring_classic' = sem glow.
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('ring_classic',       'ring', 'Anel Clássico', 'Sem brilho — o anel limpo de sempre.',           'comum',    'merito', '{"kind":"free"}',                     '{"kind":"none"}',                    0),
  ('ring_tier_novato',   'ring', 'Aura Ferro',    'Brilho sutil de Novato.',                        'comum',    'merito', '{"kind":"merito","tier":"novato"}',   '{"kind":"tier","tier":"novato"}',    1),
  ('ring_tier_aprendiz', 'ring', 'Aura Bronze',   'Aura de Aprendiz — a energia começa a fluir.',   'comum',    'merito', '{"kind":"merito","tier":"aprendiz"}', '{"kind":"tier","tier":"aprendiz"}',  2),
  ('ring_tier_piloto',   'ring', 'Aura Prata',    'Aura de Piloto.',                                'raro',     'merito', '{"kind":"merito","tier":"piloto"}',   '{"kind":"tier","tier":"piloto"}',    3),
  ('ring_tier_as',       'ring', 'Aura Ouro',     'Aura de Ás — halos de energia girando.',         'epico',    'merito', '{"kind":"merito","tier":"as"}',       '{"kind":"tier","tier":"as"}',        4),
  ('ring_tier_lendario', 'ring', 'Aura Lendária', 'Aura Lendária — ouro incandescente.',            'lendario', 'merito', '{"kind":"merito","tier":"lendario"}', '{"kind":"tier","tier":"lendario"}',  5),
  ('ring_tier_mistico',  'ring', 'Aura Mística',  'Aura Mística — o vermelho da Fórmula.',          'imortal',  'merito', '{"kind":"merito","tier":"mistico"}',  '{"kind":"tier","tier":"mistico"}',   6)
on conflict (slug) do nothing;

-- Fumaças (card de busca / partida encontrada): temas de cor. Padrão = verde/dourado atual.
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('smoke_default', 'smoke', 'Energia da Fila',  'Fumaça verde/dourada padrão do matchmaking.',    'comum',   'merito', '{"kind":"free"}',                     '{"mid":"#00C466","hot":"#e0b64e"}', 0),
  ('smoke_ember',   'smoke', 'Brasa da Fórmula', 'Fumaça em brasa — vermelho brand + dourado.',    'raro',    'merito', '{"kind":"merito","tier":"piloto"}',   '{"mid":"#C42121","hot":"#e0b64e"}', 1),
  ('smoke_mystic',  'smoke', 'Névoa Mística',    'Névoa mística — vermelho profundo e ouro.',      'imortal', 'merito', '{"kind":"merito","tier":"mistico"}',  '{"mid":"#ac1d0e","hot":"#f0c862"}', 2)
on conflict (slug) do nothing;

-- Molduras (frame) — borda decorativa ao redor do avatar (quadrado, padrão Steam/Dota).
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('frame_none',   'frame', 'Sem Moldura',     'Avatar sem moldura.',                              'comum',   'merito', '{"kind":"free"}',                     '{"kind":"none"}',                     0),
  ('frame_brand',  'frame', 'Moldura Fórmula', 'Moldura com o vermelho da Fórmula.',               'raro',    'merito', '{"kind":"merito","tier":"aprendiz"}', '{"kind":"solid","color":"brand"}',    1),
  ('frame_gold',   'frame', 'Moldura Dourada', 'Moldura dourada — para os que subiram.',           'epico',   'merito', '{"kind":"merito","tier":"as"}',       '{"kind":"solid","color":"gold"}',     2),
  ('frame_mystic', 'frame', 'Moldura Mística', 'Moldura mística animada.',                         'imortal', 'merito', '{"kind":"merito","tier":"mistico"}',  '{"kind":"animated","color":"brand"}', 3)
on conflict (slug) do nothing;

-- Badges (selo de conquista exibido no perfil).
insert into public.cosmetics (slug, slot, name, description, rarity, source, requirement, asset_ref, sort_order) values
  ('badge_doutrinado', 'badge', 'Doutrinado', 'Concluiu a doutrina — nível 6+.',                   'raro',    'merito', '{"kind":"merito","minLevel":6}',      '{"icon":"GraduationCap","color":"bronze"}', 1),
  ('badge_mistico',    'badge', 'Místico',    'Alcançou o topo da Fórmula.',                       'imortal', 'merito', '{"kind":"merito","tier":"mistico"}',  '{"icon":"Sparkles","color":"brand"}',       2)
on conflict (slug) do nothing;
