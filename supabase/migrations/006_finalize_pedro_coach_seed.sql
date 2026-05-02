-- Migration 006 — Finalização do seed Pedro como coach #1
-- Aplicada via MCP em 2026-05-02 após Pedro logar Discord pela primeira vez.
-- Migration 005 deixou ALTER coach_id SET NOT NULL pendente (Pedro ainda não tinha profile).
-- Esta migration finaliza tudo idempotentemente.

-- 1. Promover Pedro a admin (é o owner da plataforma)
update public.profiles
set is_admin = true,
    role = 'admin'
where discord_id = '194587373022085122';

-- 2. Inserir Pedro como coach #1 (idempotente via slug unique)
insert into public.coaches (profile_id, slug, bio, ativo)
select id,
       'pedro-paulo',
       'Pedro Paulo (PPA) — Immortal / Top 0.5% / 7000 MMR. 15+ anos de Dota, 50.000h jogadas, criador da Fórmula do Dota de Corrida.',
       true
from public.profiles
where is_admin = true
limit 1
on conflict (slug) do nothing;

-- 3. Backfill: todos os 4 pacotes apontam pra Pedro
update public.packages
set coach_id = (select id from public.coaches where slug = 'pedro-paulo')
where coach_id is null;

-- 4. Tornar coach_id NOT NULL (constraint final pendente da Migration 005)
alter table public.packages alter column coach_id set not null;
