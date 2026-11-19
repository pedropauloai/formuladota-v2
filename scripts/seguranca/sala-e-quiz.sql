-- Teste da regra de entrar em sala (migration 169) com um jogador real sem nível 6 e sem permissão.
-- Cria uma sala de teste e termina SEMPRE num erro proposital (RESULTADO: ...): nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok".
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/sala-e-quiz.sql
do $$
declare
  u uuid;
  banido uuid;
  lob uuid;
  quiz boolean := public.quiz_enabled();
  r text[] := '{}';
begin
  select p.id into u
  from public.profiles p
  where not coalesce(p.is_admin, false)
    and p.behavior_status = 'ok'
    and not exists (select 1 from public.user_levels ul where ul.user_id = p.id and ul.current_level >= 6)
    and public.available_match_permissions(p.id) = 0
  limit 1;
  select p.id into banido from public.profiles p where p.behavior_status = 'banned' limit 1;
  if u is null then raise exception 'RESULTADO: sem jogador de teste'; end if;

  insert into public.lobbies (name, password, game_mode, status, created_by)
  values ('teste da regra 169', 'teste', 'all_pick', 'open', u)
  returning id into lob;

  set local role authenticated;

  -- A. Quiz desligado: o jogador sem doutrina entra. Quiz ligado: fica barrado.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    insert into public.lobby_players (lobby_id, user_id, team, slot) values (lob, u, 'radiant', 0);
    r := array_append(r, (case when quiz then 'A_sem_doutrina=FALHOU(entrou com quiz ligado)' else 'A_sem_doutrina=ok' end)::text);
  exception when others then
    r := array_append(r, (case when quiz then 'A_sem_doutrina=ok' else 'A_sem_doutrina=FALHOU(' || sqlerrm || ')' end)::text);
  end;

  -- B. Conta banida continua barrada, com quiz ligado ou não.
  if banido is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', banido, 'role', 'authenticated')::text, true);
    begin
      insert into public.lobby_players (lobby_id, user_id, team, slot) values (lob, banido, 'dire', 0);
      r := array_append(r, 'B_banido=FALHOU(entrou)'::text);
    exception when others then
      r := array_append(r, 'B_banido=ok'::text);
    end;
  else
    r := array_append(r, 'B_banido=sem_conta_banida'::text);
  end if;

  raise exception 'RESULTADO: quiz=% %', quiz, array_to_string(r, ' ');
end $$;
