-- Migration 011 — HONOR ledger + Admin audit + Calibration status
-- Decisao Pedro 2026-05-23: ativar HONOR camada manual MVP + audit trail admin + calibracao
-- Docs de referencia:
--   docs/foundations/HONOR_SYSTEM.md   (8 tiers, algoritmo de pontuacao)
--   docs/foundations/CALIBRATION.md    (3 estagios, ritual de graduacao)
--   .planning/research/phase-6-mmr-seasons-2-axis.md  (integracao com seasons)

-- =============================================
-- 1. Tabela honor_ledger (eventos que movem HONOR)
-- =============================================
-- Ledger imutavel: cada linha e um evento que somou ou subtraiu do HONOR score.
-- O score atual = honor_start + SUM(delta) para o user na season ativa.
-- Nunca deletar linhas desta tabela — e trilha de auditoria permanente.

create table if not exists public.honor_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  season_id   integer references public.seasons(id) on delete set null,  -- seasons.id e INTEGER (serial)
  delta       int not null,           -- positivo (ganho) ou negativo (perda)
  source      text not null check (source in (
    -- Reviews
    'self_review',         -- reflexao pos-partida do proprio jogador
    'peer_review',         -- avaliacao peer (would_play_again + criterios)
    -- Abandonos (classificados por momento)
    'abandon_early',       -- saiu antes de 10 min de jogo
    'abandon_mid',         -- saiu entre 10-30 min
    'abandon_late',        -- saiu apos 30 min
    'no_show',             -- confirmou fila, nao entrou no lobby
    -- Presenca (calculado mensalmente pela season)
    'presence_high',       -- 90%+ de presenca na season
    'presence_mid',        -- 70-89% de presenca na season
    -- Streak
    'streak_positive',     -- 5+ reviews positivos consecutivos
    -- Admin manual
    'admin_bonus',         -- Pedro reconhece conduta notavel fora do sistema
    'admin_strike_light',  -- strike leve (atraso, comunicacao rispida)
    'admin_strike_grave',  -- strike grave (toxicidade, abuso verbal)
    -- Coach (Pedro, pos-partida)
    'coach_note_positive', -- nota positiva de Pedro no PostMatchScreen
    'coach_note_negative'  -- nota negativa de Pedro no PostMatchScreen
  )),
  source_id   uuid,                   -- match_id, review_id, etc. (referencia contextual)
  reason      text,                   -- nota humana legivel (obrigatoria para admin_*)
  admin_user_id uuid references public.profiles(id), -- quem aplicou (se admin manual)
  created_at  timestamptz not null default now()
);

-- Indexes para queries comuns
create index if not exists honor_ledger_user_idx    on public.honor_ledger(user_id);
create index if not exists honor_ledger_season_idx  on public.honor_ledger(season_id);
create index if not exists honor_ledger_created_idx on public.honor_ledger(created_at desc);
create index if not exists honor_ledger_source_idx  on public.honor_ledger(source);

-- RLS
alter table public.honor_ledger enable row level security;

-- User ve proprio ledger (score e eventos — score numerico e visivel apenas para o proprio user)
create policy honor_ledger_user_own on public.honor_ledger
  for select
  using (auth.uid() = user_id);

-- Admin ve e gerencia tudo
create policy honor_ledger_admin_all on public.honor_ledger
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Service role pode inserir (triggers e Edge Functions)
create policy honor_ledger_service_insert on public.honor_ledger
  for insert
  to service_role
  with check (true);

-- =============================================
-- 2. Tabela admin_audit_log (toda acao admin registrada)
-- =============================================
-- Registro imutavel de todas as acoes administrativas.
-- Garante accountability: Pedro nunca faz alteracao sem rastro.
-- Nao deletar linhas — e log permanente para auditoria.

create table if not exists public.admin_audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid not null references public.profiles(id),
  target_user_id  uuid references public.profiles(id),   -- alvo da acao (se aplicavel)
  action          text not null,
  -- Exemplos de action: 'honor_bonus', 'honor_strike_light', 'honor_strike_grave',
  -- 'fichas_adjust', 'membership_change', 'ban_temp', 'ban_perm',
  -- 'coach_note_add', 'season_status_change', 'user_role_change'
  payload_before  jsonb,              -- snapshot do estado antes da acao
  payload_after   jsonb,              -- snapshot do estado depois da acao
  reason          text,               -- justificativa obrigatoria para acoes que afetam users
  created_at      timestamptz not null default now()
);

create index if not exists admin_audit_target_idx  on public.admin_audit_log(target_user_id);
create index if not exists admin_audit_admin_idx   on public.admin_audit_log(admin_user_id);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists admin_audit_action_idx  on public.admin_audit_log(action);

-- RLS — so admin acessa (log interno, nao visivel para usuarios)
alter table public.admin_audit_log enable row level security;

create policy admin_audit_admin_only on public.admin_audit_log
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 3. Tabela admin_notes (notas privadas Pedro sobre user)
-- =============================================
-- Notas privadas que Pedro escreve sobre membros — nao visiveis para o usuario.
-- Util para contexto historico: "este jogador teve problemas na Season 1 mas evoluiu".
-- Diferentes de admin_audit_log: notas sao editoriais, log e factual.

create table if not exists public.admin_notes (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid not null references public.profiles(id),
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  note            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists admin_notes_target_idx on public.admin_notes(target_user_id);
create index if not exists admin_notes_admin_idx  on public.admin_notes(admin_user_id);

-- Trigger para manter updated_at automatico
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- Aplica apenas se o trigger nao existe ainda (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'admin_notes_updated_at_trigger'
      and tgrelid = 'public.admin_notes'::regclass
  ) then
    create trigger admin_notes_updated_at_trigger
      before update on public.admin_notes
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.admin_notes enable row level security;

-- So admin acessa notas (usuario nunca ve suas proprias notas administrativas)
create policy admin_notes_admin_only on public.admin_notes
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 4. Calibracao: adicionar colunas em profiles
-- =============================================
-- Tres estagios definidos em docs/foundations/CALIBRATION.md:
--   'visitante'  — aceitou doutrina, 0-4 partidas (tier: "Nao calibrado")
--   'calibrando' — 5-9 partidas (tier: sempre "Aprendiz" na UI)
--   'ranqueado'  — 10+ partidas (tier: calculado dinamicamente pelo score)

alter table public.profiles
  add column if not exists calibration_status text default 'visitante'
    check (calibration_status in ('visitante', 'calibrando', 'ranqueado'));

alter table public.profiles
  add column if not exists calibration_partidas_completas int default 0;

-- Index para filtros de leaderboard (apenas ranqueados aparecem em rankings publicos)
create index if not exists profiles_calibration_status_idx
  on public.profiles(calibration_status);

-- =============================================
-- 5. Trigger de calibracao (automacao dos estagios)
-- =============================================
-- Reage a inserts em ficha_ledger com source='pt_consumed' (partida consumida/confirmada).
-- Incrementa o contador e faz a transicao de estagio automaticamente.
--
-- Importante: ficha_ledger.source = 'pt_consumed' indica que uma ficha (slot de partida)
-- foi consumida — ou seja, o usuario efetivamente participou de uma partida confirmada.

create or replace function public.update_calibration_status()
returns trigger
language plpgsql
security definer
as $$
declare
  new_count      int;
  current_status text;
begin
  -- Apenas consumo de partida confirmada (delta negativo = saiu do saldo)
  if NEW.source = 'pt_consumed' and NEW.delta < 0 then
    -- Incrementa contador e le estado atual em uma unica operacao
    update public.profiles
    set calibration_partidas_completas = calibration_partidas_completas + 1
    where id = NEW.user_id
    returning calibration_partidas_completas, calibration_status
      into new_count, current_status;

    -- Visitante (0-4) → Calibrando quando atinge 5 partidas
    if current_status = 'visitante' and new_count >= 5 then
      update public.profiles
      set calibration_status = 'calibrando'
      where id = NEW.user_id;
      -- Nota: frontend detecta a mudanca de status e dispara a cerimonia
      -- (LoadingScreen takeover + reveal do tier Aprendiz + sound stinger)
    end if;

    -- Calibrando (5-9) → Ranqueado quando atinge 10 partidas
    if current_status = 'calibrando' and new_count >= 10 then
      update public.profiles
      set calibration_status = 'ranqueado'
      where id = NEW.user_id;
      -- Nota: frontend exibe notification toast com tier real calculado
      -- O tier real e calculado pela funcao get_honor_tier() com base no score acumulado
    end if;
  end if;

  return NEW;
end;
$$;

-- Garante idempotencia: remove trigger se existir antes de recriar
drop trigger if exists ficha_ledger_calibration_trigger on public.ficha_ledger;

create trigger ficha_ledger_calibration_trigger
  after insert on public.ficha_ledger
  for each row
  execute function public.update_calibration_status();

-- =============================================
-- 6. Helper: calcular HONOR score atual do user na season ativa
-- =============================================
-- Retorna o score atual baseado no ledger (1000 + sum(delta)).
-- Nota: seasons.id e INTEGER (serial). A coluna honor_start nao existe ainda na
-- tabela seasons (sera adicionada na Phase 6 junto com a spec completa de seasons).
-- Ate la, usamos 1000 como constante (valor padrao definido em HONOR_SYSTEM.md).

create or replace function public.get_honor_score(p_user_id uuid)
returns int
language sql
security definer
stable  -- mesmos inputs = mesmo output durante a transacao (otimizacao do planner)
as $$
  select coalesce(
    (
      select 1000 + coalesce(sum(hl.delta), 0)
      from public.seasons s
      left join public.honor_ledger hl
        on hl.season_id = s.id
        and hl.user_id = p_user_id
      where s.active = true
      group by s.id
      limit 1
    ),
    1000  -- fallback se nao ha season ativa
  )::int;
$$;

-- =============================================
-- 7. Helper: calcular tier HONOR baseado no score
-- =============================================
-- Mapeia o score numerico para o nome do tier.
-- Compativel com o componente HonorRankMedal (prop 'rank').
-- Referencia: docs/foundations/HONOR_SYSTEM.md — tabela de tiers.

create or replace function public.get_honor_tier(p_score int)
returns text
language sql
immutable  -- puro — sem side effects, sem acesso a tabelas
as $$
  select case
    when p_score >= 2100 then 'imortal-da-formula'
    when p_score >= 1900 then 'lendario'
    when p_score >= 1700 then 'mestre'
    when p_score >= 1500 then 'honrado'
    when p_score >= 1300 then 'respeitado'
    when p_score >= 1100 then 'confiavel'
    when p_score >= 800  then 'disciplinado'
    else                      'aprendiz'
  end;
$$;

-- =============================================
-- 8. Verificacoes pos-migration (comentario de referencia)
-- =============================================
-- Rodar apos aplicar para confirmar sucesso:
--
-- select table_name from information_schema.tables
--   where table_schema = 'public'
--   and table_name in ('honor_ledger', 'admin_audit_log', 'admin_notes');
-- -- Esperado: 3 linhas
--
-- select column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name in ('calibration_status', 'calibration_partidas_completas');
-- -- Esperado: 2 linhas
--
-- select proname from pg_proc p
--   join pg_namespace n on p.pronamespace = n.oid
--   where n.nspname = 'public'
--   and proname in ('update_calibration_status', 'get_honor_score', 'get_honor_tier');
-- -- Esperado: 3 linhas
