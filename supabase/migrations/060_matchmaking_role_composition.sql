-- 060 — Matchmaking por COMPOSIÇÃO de funções.
-- Reescreve try_form_match(): a 059 pegava os X mais antigos e forçava roles (formava
-- partida desequilibrada). Agora a partida CHEIA (p_match_size = 10) só fecha quando dá
-- pra preencher as 5 funções (safelane, midlane, offlane, support, support_dedicated)
-- com 2 jogadores cada (1 por time), a partir das funções que cada jogador FILOU.
--
-- Algoritmo GULOSO e SEGURO: no pior caso só ESPERA — nunca forma partida inválida.
--   - remaining[role] = 2 pra cada função;
--   - candidatos: waiting TRAVADOS (FOR UPDATE SKIP LOCKED), ordenados por
--     (qtde de funções filadas ASC, joined_at ASC) → mais restritos + mais antigos 1º;
--   - pra cada jogador, acha uma função filada com remaining > 0, atribui (1ª vaga da
--     função → radiant, 2ª → dire) e decrementa; para ao preencher as 10 vagas;
--   - se faltar vaga ao fim → return null (rows continuam 'waiting').
--
-- p_match_size < 10 (teste): degenera — preenche p_match_size/2 vagas por time a partir
-- das preferências (sem exigir composição), mantendo a atomicidade.

create or replace function public.try_form_match(p_match_size int default 10)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby      uuid;
  v_pass       text;
  v_creator    uuid;
  v_rec        record;
  v_role       text;
  v_team       text;
  v_prefs      text[];
  v_roles      text[] := array['safelane','midlane','offlane','support','support_dedicated'];
  -- remaining[role]: vagas restantes por função (2 = cheia → 1 radiant + 1 dire).
  v_rem        jsonb;
  -- Atribuições acumuladas: array de {user_id, team, role}. Só vira lobby se completar.
  v_assigned   jsonb := '[]'::jsonb;
  v_ids        uuid[] := '{}';   -- ids das entries de fila que serão marcadas matched
  v_count      int := 0;
  -- Auxiliares do caminho de teste (p_match_size < 10)
  v_half       int;
  v_idx        int := 0;
  v_taken_r    text[] := '{}';
  v_taken_d    text[] := '{}';
  r            text;
  a            jsonb;
begin
  if p_match_size < 2 then
    return null;
  end if;

  if p_match_size >= 10 then
    -- ===== Caminho ESTRITO: partida cheia exige composição completa =====
    v_rem := jsonb_build_object(
      'safelane', 2, 'midlane', 2, 'offlane', 2, 'support', 2, 'support_dedicated', 2
    );

    -- Mais restritos primeiro (menos funções filadas) e mais antigos — maximiza a
    -- chance de fechar a composição. Trava cada linha conforme percorre (SKIP LOCKED).
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
      order by jsonb_array_length(coalesce(mq.roles, '[]'::jsonb)) asc, mq.joined_at asc
      for update skip locked
    loop
      exit when v_count >= 10;

      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles, '[]'::jsonb)));
      v_role := null;
      -- 1ª função filada por esse jogador que ainda tem vaga.
      foreach r in array v_prefs loop
        if (v_rem ? r) and (v_rem->>r)::int > 0 then
          v_role := r;
          exit;
        end if;
      end loop;

      if v_role is null then
        continue;  -- nenhuma função desse jogador tem vaga agora → segue pro próximo
      end if;

      -- 1ª vaga da função → radiant; 2ª → dire (equilibra 5x5 automaticamente).
      if (v_rem->>v_role)::int = 2 then v_team := 'radiant'; else v_team := 'dire'; end if;
      v_rem := jsonb_set(v_rem, array[v_role], to_jsonb((v_rem->>v_role)::int - 1));
      v_assigned := v_assigned || jsonb_build_object(
        'user_id', v_rec.user_id, 'team', v_team, 'role', v_role
      );
      v_ids := array_append(v_ids, v_rec.id);
      v_count := v_count + 1;
    end loop;

    if v_count < 10 then
      return null;  -- composição incompleta → espera (nada foi gravado)
    end if;

  else
    -- ===== Caminho de TESTE (p_match_size < 10): degenera, sem exigir composição =====
    v_half := ceil(p_match_size::numeric / 2);
    for v_rec in
      select mq.id, mq.user_id, mq.roles
      from match_queue mq
      where mq.status = 'waiting'
      order by mq.joined_at
      limit p_match_size
      for update skip locked
    loop
      v_idx := v_idx + 1;
      v_ids := array_append(v_ids, v_rec.id);
      if v_idx <= v_half then v_team := 'radiant'; else v_team := 'dire'; end if;

      v_prefs := array(select jsonb_array_elements_text(coalesce(v_rec.roles, '[]'::jsonb)));
      v_role := null;
      -- 1ª função preferida ainda livre no time
      foreach r in array v_prefs loop
        if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
        if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
      end loop;
      -- fallback: qualquer função ainda livre no time
      if v_role is null then
        foreach r in array v_roles loop
          if v_team = 'radiant' and not (r = any(v_taken_r)) then v_role := r; exit; end if;
          if v_team = 'dire'    and not (r = any(v_taken_d)) then v_role := r; exit; end if;
        end loop;
      end if;

      if v_team = 'radiant' then v_taken_r := array_append(v_taken_r, v_role);
      else v_taken_d := array_append(v_taken_d, v_role); end if;

      v_assigned := v_assigned || jsonb_build_object(
        'user_id', v_rec.user_id, 'team', v_team, 'role', v_role
      );
      v_count := v_count + 1;
    end loop;

    if v_count < p_match_size then
      return null;  -- ainda não há gente suficiente
    end if;
  end if;

  -- ===== Formação comum: cria lobby, insere players e marca a fila como matched =====
  -- Senha provisória — o admin pode editar na página da partida pra casar com o
  -- lobby Steam (bot/manual). Tier livre, status open (mantém o comportamento da 059).
  v_pass := upper(substr(md5(random()::text), 1, 6));
  v_creator := (v_assigned->0->>'user_id')::uuid;

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

  for a in select jsonb_array_elements(v_assigned)
  loop
    insert into lobby_players (lobby_id, user_id, team, role)
    values (v_lobby, (a->>'user_id')::uuid, a->>'team', a->>'role')
    on conflict (lobby_id, user_id) do nothing;
  end loop;

  update match_queue
    set status = 'matched', matched_at = now(), matched_lobby_id = v_lobby
    where id = any(v_ids);

  return v_lobby;
end;
$$;

grant execute on function public.try_form_match(int) to authenticated;
