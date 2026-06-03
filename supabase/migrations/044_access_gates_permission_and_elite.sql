-- 044 — Constituição de acesso: permissão (freemium) + lobby elite (3 requisitos).
-- Decisões Pedro 2026-06-03 (ver memory/project_match_permissions).
-- Aplicado em prod via Supabase MCP em 2026-06-03.

-- 1. Tier de lobby: livre (freemium, gate por permissão) vs elite (3 requisitos).
alter table public.lobbies
  add column if not exists tier text not null default 'livre'
  check (tier in ('livre','elite'));

-- 2. Saldo de permissões disponível (5 acertos = 1, acumulam; - consumidas).
create or replace function public.available_match_permissions(p_uid uuid)
returns int language sql security definer set search_path = public stable as $$
  select greatest(0,
    (floor(coalesce(jsonb_array_length(doctrine_quiz_progress), 0) / 5.0)::int)
    - coalesce(match_permissions_consumed, 0)
  )
  from public.profiles where id = p_uid;
$$;

-- 3. Acesso ao ELITE = os 3 requisitos juntos: assinante + Imortal (Valve, mmr>=6000)
--    + Místico (nível 30 da Fórmula). Sem exceção.
create or replace function public.can_join_elite(p_uid uuid)
returns boolean language plpgsql security definer set search_path = public stable as $$
declare
  v_sub boolean;
  v_mmr int;
  v_level int;
begin
  select exists(
    select 1 from subscriptions where user_id = p_uid and status = 'authorized'
  ) into v_sub;
  select mmr_atual into v_mmr from profiles where id = p_uid;
  select current_level into v_level from user_levels where user_id = p_uid;
  return coalesce(v_sub, false)
     and coalesce(v_mmr, 0) >= 6000      -- Imortal Valve
     and coalesce(v_level, 1) >= 30;     -- Místico (nível 30)
end;
$$;

-- 4. Consome 1 permissão (chamado pela action APÓS o join). Doutrinado = ilimitado
--    (não consome). Idempotência de re-entrada é tratada na server action.
create or replace function public.consume_match_permission()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_doctrinated boolean;
begin
  if v_uid is null then return; end if;
  select (doctrine_accepted_at is not null) into v_doctrinated
    from profiles where id = v_uid;
  if coalesce(v_doctrinated, false) then return; end if;
  update profiles
    set match_permissions_consumed = match_permissions_consumed + 1
    where id = v_uid;
end;
$$;

grant execute on function public.available_match_permissions(uuid) to authenticated, anon;
grant execute on function public.can_join_elite(uuid) to authenticated;
grant execute on function public.consume_match_permission() to authenticated;

-- 5. Reescrever os gates de INSERT: troca has_active_subscription (modelo mensalidade
--    legado) pelo gate de permissão no freemium, e can_join_elite no elite.

-- 5a. Sistema de busca: freemium por permissão (ou doutrinado).
drop policy if exists "queue_insert_self" on public.match_queue;
create policy "queue_insert_self" on public.match_queue
  for insert with check (
    auth.uid() = user_id
    and (
      has_accepted_doctrine(auth.uid())
      or available_match_permissions(auth.uid()) >= 1
    )
  );

-- 5b. Criar lobby: livre = permissão/doutrina; elite = os 3 requisitos.
drop policy if exists "active subscribers create lobby" on public.lobbies;
create policy "create lobby by tier" on public.lobbies
  for insert with check (
    auth.uid() = created_by
    and is_user_active(auth.uid())
    and (
      (tier = 'livre' and (
        has_accepted_doctrine(auth.uid())
        or available_match_permissions(auth.uid()) >= 1
      ))
      or (tier = 'elite' and can_join_elite(auth.uid()))
    )
  );

-- 5c. Entrar em lobby: depende do tier do lobby alvo.
drop policy if exists "active subscribers join lobby" on public.lobby_players;
create policy "join lobby by tier" on public.lobby_players
  for insert with check (
    auth.uid() = user_id
    and is_user_active(auth.uid())
    and exists (
      select 1 from lobbies l where l.id = lobby_id and (
        (l.tier = 'livre' and (
          has_accepted_doctrine(auth.uid())
          or available_match_permissions(auth.uid()) >= 1
        ))
        or (l.tier = 'elite' and can_join_elite(auth.uid()))
      )
    )
  );
