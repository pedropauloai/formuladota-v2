-- 043 — Doutrina gamificada: XP real por questão + saldo de permissões de partida.
-- Decisões Pedro 2026-06-03 (ver memory/project_quiz_4_pilares + project_match_permissions).
-- Aplicado em prod via Supabase MCP em 2026-06-03.

-- 1. award_xp: remover a trava de subscription (modelo antigo Formula+ travava free no
--    nível 5). O redesign HONOR descartou o gate por assinatura — todos sobem por XP até
--    30; os gates de topo (Lendário/Místico) são por medalha Valve, aplicados na exibição.
create or replace function public.award_xp(
  p_user_id uuid,
  p_amount int,
  p_source text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_level int;
  v_total_xp int;
  v_new_level int;
  v_threshold record;
  v_shards_to_award int := 0;
  v_xp_at_new_level int;
begin
  insert into user_levels (user_id) values (p_user_id) on conflict do nothing;

  select current_level, total_xp_earned into v_current_level, v_total_xp
  from user_levels where user_id = p_user_id;

  v_total_xp := v_total_xp + p_amount;
  v_new_level := v_current_level;

  -- Sem cap por assinatura: progride livre até 30 (gate de skill é por medalha, na UI).
  for v_threshold in
    select level, total_xp, shards_reward
    from level_thresholds
    where level > v_current_level and level <= 30 and total_xp <= v_total_xp
    order by level
  loop
    v_new_level := v_threshold.level;
    v_shards_to_award := v_shards_to_award + v_threshold.shards_reward;
  end loop;

  select total_xp - xp_required into v_xp_at_new_level
  from level_thresholds where level = v_new_level;

  update user_levels set
    current_level = v_new_level,
    current_xp = v_total_xp - v_xp_at_new_level,
    total_xp_earned = v_total_xp,
    current_shards = current_shards + v_shards_to_award,
    total_shards_earned = total_shards_earned + v_shards_to_award,
    updated_at = now()
  where user_id = p_user_id;

  insert into xp_events (user_id, source, xp_amount, shards_awarded, level_before, level_after, metadata)
  values (p_user_id, p_source, p_amount, v_shards_to_award, v_current_level, v_new_level, p_metadata);
end;
$$;

-- 2. Aposentar o bônus de 500 XP no aceite da doutrina. Agora o XP vem POR QUESTÃO,
--    creditado a cada acerto — não num pulo só no fim.
drop trigger if exists trg_award_xp_doctrine on public.profiles;
drop function if exists public.award_xp_on_doctrine_accept();

-- 3. Crédito de XP por questão correta. SECURITY DEFINER mas usa auth.uid() (o usuário
--    não pode creditar XP pra outro). Idempotência é garantida pela server action, que só
--    chama isto quando registra uma questão NOVA correta. Evento só em level-up (não polui
--    xp_events com 130 linhas). 22 XP/questão garante chegar ao nível 6 ao completar as 130.
create or replace function public.grant_doctrine_question_xp()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_xp int := 22;
  v_current_level int;
  v_total_xp int;
  v_new_level int;
  v_threshold record;
  v_xp_at_new_level int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into user_levels (user_id) values (v_uid) on conflict do nothing;

  select current_level, total_xp_earned into v_current_level, v_total_xp
  from user_levels where user_id = v_uid;

  v_total_xp := v_total_xp + v_xp;
  v_new_level := v_current_level;

  for v_threshold in
    select level, total_xp from level_thresholds
    where level > v_current_level and level <= 30 and total_xp <= v_total_xp
    order by level
  loop
    v_new_level := v_threshold.level;
  end loop;

  select total_xp - xp_required into v_xp_at_new_level
  from level_thresholds where level = v_new_level;

  update user_levels set
    current_level = v_new_level,
    current_xp = v_total_xp - v_xp_at_new_level,
    total_xp_earned = v_total_xp,
    updated_at = now()
  where user_id = v_uid;

  if v_new_level > v_current_level then
    insert into xp_events (user_id, source, xp_amount, level_before, level_after)
    values (v_uid, 'doctrine_question', v_xp, v_current_level, v_new_level);
  end if;

  return jsonb_build_object(
    'level', v_new_level,
    'total_xp', v_total_xp,
    'leveled_up', v_new_level > v_current_level
  );
end;
$$;

grant execute on function public.grant_doctrine_question_xp() to authenticated;

-- 4. Saldo de permissões de partida (5 acertos = 1 permissão, acumulam).
--    Saldo derivado = floor(acertos / 5) - consumidas. acertos = jsonb_array_length(
--    profiles.doctrine_quiz_progress). Só rastreamos as consumidas (evita drift).
alter table public.profiles
  add column if not exists match_permissions_consumed int not null default 0;
