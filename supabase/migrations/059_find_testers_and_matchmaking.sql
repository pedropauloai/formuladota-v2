-- 059 — Find público por role: bypass de tester + motor de matchmaking (auto ao juntar X).
-- Decisão Pedro 2026-06-27: testar o find com jogadores reais HOJE. Web-only (lobby Steam à parte).
--   - profiles.is_tester: libera convidados na fila sem doutrina/assinatura. REVERSÍVEL (set false).
--   - lobby_players.role: guarda a role atribuída na formação da partida (find por role).
--   - try_form_match(): SECURITY DEFINER. Quando há >= X 'waiting', cria lobby 'open',
--     distribui 2 times por role (greedy pela preferência) e marca a fila como matched.
--     Chamado pela server action enterQueue logo após o INSERT na fila.

-- 1. Flag de tester (liberação temporária pros convidados do teste de hoje)
alter table public.profiles
  add column if not exists is_tester boolean not null default false;

-- 2. Role atribuída em lobby_players (nullable; só o motor de find preenche)
alter table public.lobby_players
  add column if not exists role text
  check (role is null or role in ('safelane','midlane','offlane','support','support_dedicated'));

-- 3. Gate da fila: ABERTO durante a janela de teste (Pedro 2026-06-27) — qualquer logado
--    entra na fila. is_tester fica pronto pra uso futuro (gate por convidado).
--    PARA REVERTER ao gate normal, rode o bloco comentado abaixo.
drop policy if exists "queue_insert_self" on public.match_queue;
create policy "queue_insert_self" on public.match_queue
  for insert with check ( auth.uid() = user_id );

-- REVERTER (gate normal: doutrina OU permissão OU tester):
-- drop policy if exists "queue_insert_self" on public.match_queue;
-- create policy "queue_insert_self" on public.match_queue
--   for insert with check (
--     auth.uid() = user_id and (
--       has_accepted_doctrine(auth.uid())
--       or available_match_permissions(auth.uid()) >= 1
--       or exists (select 1 from public.profiles where id = auth.uid() and is_tester = true)
--     )
--   );

-- 4. Motor de matchmaking: forma 1 partida quando a fila atinge p_match_size.
create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count int;
  v_lobby uuid;
  v_pass text;
  v_creator uuid;
  v_half int;
  v_i int := 0;
  v_rec record;
  v_team text;
  v_role text;
  v_prefs text[];
  v_taken_r text[] := '{}';
  v_taken_d text[] := '{}';
  v_all text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  r text;
begin
  if p_match_size < 2 then
    return null;
  end if;

  -- Pega os N mais antigos 'waiting', TRAVANDO as linhas (evita corrida / dupla formação).
  select array_agg(id order by joined_at) into v_ids
  from (
    select id, joined_at
    from match_queue
    where status = 'waiting'
    order by joined_at
    limit p_match_size
    for update skip locked
  ) s;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count < p_match_size then
    return null; -- ainda não há gente suficiente
  end if;

  -- Cria o lobby (tier livre, status open). Senha provisória — o admin pode editar
  -- na página da partida pra casar com a senha do lobby Steam (bot/manual).
  v_pass := upper(substr(md5(random()::text), 1, 6));
  select user_id into v_creator from match_queue where id = v_ids[1];

  insert into lobbies (name, password, game_mode, status, tier, created_by, max_players)
  values (
    'FORMULADOTA ' || upper(substr(md5(random()::text), 1, 4)),
    v_pass,
    'all_pick',
    'open',
    'livre',
    v_creator,
    case when p_match_size in (2,4,6,10) then p_match_size else 10 end
  )
  returning id into v_lobby;

  v_half := ceil(p_match_size::numeric / 2);

  -- Distribui os jogadores em 2 times, atribuindo role por preferência (greedy).
  for v_rec in
    select mq.user_id, mq.roles
    from match_queue mq
    where mq.id = any(v_ids)
    order by mq.joined_at
  loop
    v_i := v_i + 1;
    if v_i <= v_half then v_team := 'radiant'; else v_team := 'dire'; end if;

    v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles, '[]'::jsonb)));
    v_role := null;

    -- 1ª role preferida ainda livre no time
    foreach r in array v_prefs loop
      if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
      if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
    end loop;

    -- fallback: qualquer role ainda livre no time
    if v_role is null then
      foreach r in array v_all loop
        if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
        if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
      end loop;
    end if;

    if v_team = 'radiant' then v_taken_r := array_append(v_taken_r, v_role);
    else v_taken_d := array_append(v_taken_d, v_role); end if;

    insert into lobby_players (lobby_id, user_id, team, role)
    values (v_lobby, v_rec.user_id, v_team, v_role)
    on conflict (lobby_id, user_id) do nothing;
  end loop;

  -- Marca a fila como matched (o front redireciona pra /partida/[lobby]).
  update match_queue
    set status = 'matched', matched_at = now(), matched_lobby_id = v_lobby
    where id = any(v_ids);

  return v_lobby;
end;
$$;

grant execute on function public.try_form_match(int) to authenticated;
