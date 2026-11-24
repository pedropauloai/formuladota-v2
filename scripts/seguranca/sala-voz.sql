-- Teste de regressão das regras do banco da sala de voz (migration 195). Monta três salas de teste,
-- confere o que visitante, logado de fora, membro e membro expulso leem e escrevem, e a data de
-- nascimento que não muda. Termina SEMPRE num erro proposital (RESULTADO: ...), então a transação
-- inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/sala-voz.sql
-- Antes de a 195 estar em produção: acrescentar --antes supabase/migrations/195_sala_voz.sql (o
-- executor termina em ROLLBACK, então a migration testada volta junto).
do $$
declare
  u1 uuid;
  u2 uuid;
  u3 uuid;
  u4 uuid;
  live uuid;
  r1 uuid;
  r2 uuid;
  r3 uuid;
  rep_u2 uuid;
  rep_u1 uuid;
  n int;
  d date;
  ok boolean;
  r text[] := '{}';
begin
  -- Quatro perfis comuns de produção, sem data de nascimento declarada (o teste declara a do u2).
  select id into u1 from public.profiles p
   where not coalesce(p.is_admin, false)
     and not exists (select 1 from public.user_birthdates b where b.user_id = p.id)
   order by id limit 1;
  select id into u2 from public.profiles p
   where not coalesce(p.is_admin, false) and p.id <> u1
     and not exists (select 1 from public.user_birthdates b where b.user_id = p.id)
   order by id limit 1;
  select id into u3 from public.profiles p
   where not coalesce(p.is_admin, false) and p.id not in (u1, u2)
   order by id limit 1;
  select id into u4 from public.profiles p
   where not coalesce(p.is_admin, false) and p.id not in (u1, u2, u3)
   order by id limit 1;
  if u4 is null then raise exception 'RESULTADO: faltam perfis de teste'; end if;

  -- Montagem (como dono das tabelas): uma live de teste cancelada, três salas e o que cada uma tem.
  insert into public.store_live_sessions (starts_at, ends_at, status, notes, is_test)
  values (now(), now() + interval '1 hour', 'cancelada', 'teste da sala de voz', true)
  returning id into live;
  insert into public.voice_rooms (kind, title, owner_id, live_session_id, max_members, closes_at, is_test)
  values ('party', 'Sala de teste 1', u1, live, 6, now() + interval '2 hours', true) returning id into r1;
  insert into public.voice_rooms (kind, title, owner_id, live_session_id, max_members, closes_at, is_test)
  values ('party', 'Sala de teste 2', u1, live, 6, now() + interval '2 hours', true) returning id into r2;
  insert into public.voice_rooms (kind, title, owner_id, live_session_id, max_members, closes_at, is_test)
  values ('party', 'Sala de teste 3', u1, live, 6, now() + interval '2 hours', true) returning id into r3;
  insert into public.voice_room_members (room_id, user_id, role, joined_via) values
    (r1, u1, 'dono', 'dono'), (r1, u2, 'membro', 'party'),
    (r2, u1, 'dono', 'dono'),
    (r3, u1, 'dono', 'dono');
  insert into public.voice_room_members (room_id, user_id, role, status, joined_via, removed_by, removed_at)
  values (r3, u4, 'membro', 'expulso', 'party', u1, now());
  insert into public.voice_room_sessions (id, room_id, user_id, ip, user_agent)
  values ('00000000000000000000000000e2e001', r1, u1, '203.0.113.7', 'teste'),
         ('00000000000000000000000000e2e002', r1, u2, '203.0.113.8', 'teste');
  insert into public.voice_room_tracks (session_id, track_name, mid, kind, tipo)
  values ('00000000000000000000000000e2e001', 'faixa-teste-voz', '0', 'audio', 'voz');
  insert into public.voice_room_subscriptions (session_id, mid, publisher_session_id, track_name, kind, rate_kbps, is_test)
  values ('00000000000000000000000000e2e002', '0', '00000000000000000000000000e2e001', 'faixa-teste-voz', 'audio', 64, true);
  insert into public.voice_room_stats (room_id, user_id, session_id, rtt_ms)
  values (r1, u2, '00000000000000000000000000e2e002', 40);
  insert into public.voice_room_reports (room_id, reporter_id, reported_id, reason, is_test)
  values (r1, u2, u1, 'spam', true) returning id into rep_u2;
  insert into public.voice_room_reports (room_id, reporter_id, reported_id, reason, is_test)
  values (r1, u1, u2, 'spam', true) returning id into rep_u1;

  -- A partir daqui, um jogador logado: u2, membro da sala 1.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);

  select count(*) into n from public.voice_rooms where id = r1;
  r := array_append(r, (case when n = 1 then 'A_membro_le_a_sala=ok' else 'A_membro_le_a_sala=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_members where room_id = r1;
  r := array_append(r, (case when n = 2 then 'B_membro_le_a_lista=ok' else 'B_membro_le_a_lista=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_rooms where id in (r2, r3);
  r := array_append(r, (case when n = 0 then 'C_membro_nao_le_outra_sala=ok' else 'C_membro_nao_le_outra_sala=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_members where room_id in (r2, r3);
  r := array_append(r, (case when n = 0 then 'D_membro_nao_le_outra_lista=ok' else 'D_membro_nao_le_outra_lista=FALHOU(' || n || ')' end)::text);

  select count(*) into n from public.voice_room_sessions;
  r := array_append(r, (case when n = 0 then 'G_membro_nao_le_sessoes_com_ip=ok' else 'G_membro_nao_le_sessoes_com_ip=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_tracks;
  r := array_append(r, (case when n = 0 then 'H_membro_nao_le_faixas=ok' else 'H_membro_nao_le_faixas=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_subscriptions;
  r := array_append(r, (case when n = 0 then 'I_membro_nao_le_assinaturas=ok' else 'I_membro_nao_le_assinaturas=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_stats;
  r := array_append(r, (case when n = 0 then 'J_membro_nao_le_metricas=ok' else 'J_membro_nao_le_metricas=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_settings;
  r := array_append(r, (case when n = 0 then 'K_membro_nao_le_configuracao=ok' else 'K_membro_nao_le_configuracao=FALHOU(' || n || ')' end)::text);

  select count(*) into n from public.voice_room_reports where id = rep_u2;
  r := array_append(r, (case when n = 1 then 'L_le_a_propria_denuncia=ok' else 'L_le_a_propria_denuncia=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_reports where id = rep_u1;
  r := array_append(r, (case when n = 0 then 'M_nao_le_denuncia_alheia=ok' else 'M_nao_le_denuncia_alheia=FALHOU(' || n || ')' end)::text);

  -- Escrita pela API: nenhuma tabela aceita.
  begin
    insert into public.voice_rooms (kind, title, owner_id, live_session_id, max_members, closes_at, is_test)
    values ('party', 'Sala forjada', u2, live, 6, now() + interval '1 hour', true);
    r := array_append(r, 'N_logado_nao_cria_sala=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'N_logado_nao_cria_sala=ok'::text);
  when others then
    r := array_append(r, ('N_logado_nao_cria_sala=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    insert into public.voice_room_members (room_id, user_id, role, joined_via) values (r2, u2, 'membro', 'party');
    r := array_append(r, 'O_logado_nao_se_poe_na_sala=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_nao_se_poe_na_sala=ok'::text);
  when others then
    r := array_append(r, ('O_logado_nao_se_poe_na_sala=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    update public.voice_room_members set role = 'dono' where room_id = r1 and user_id = u2;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'P_logado_nao_vira_dono=ok' else 'P_logado_nao_vira_dono=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'P_logado_nao_vira_dono=ok'::text);
  when others then
    r := array_append(r, ('P_logado_nao_vira_dono=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    delete from public.voice_room_reports where id = rep_u2;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'Q_logado_nao_apaga_denuncia=ok' else 'Q_logado_nao_apaga_denuncia=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'Q_logado_nao_apaga_denuncia=ok'::text);
  when others then
    r := array_append(r, ('Q_logado_nao_apaga_denuncia=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    insert into public.voice_room_reports (room_id, reporter_id, reported_id, reason) values (r1, u1, u2, 'spam');
    r := array_append(r, 'R_logado_nao_denuncia_em_nome_de_outro=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'R_logado_nao_denuncia_em_nome_de_outro=ok'::text);
  when others then
    r := array_append(r, ('R_logado_nao_denuncia_em_nome_de_outro=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    update public.voice_settings set cap_gb_30d = 1000;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'S_logado_nao_muda_o_teto=ok' else 'S_logado_nao_muda_o_teto=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'S_logado_nao_muda_o_teto=ok'::text);
  when others then
    r := array_append(r, ('S_logado_nao_muda_o_teto=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    insert into public.voice_room_subscriptions (session_id, mid, publisher_session_id, track_name, kind, rate_kbps)
    values ('00000000000000000000000000e2e002', '9', '00000000000000000000000000e2e001', 'x', 'audio', 1);
    r := array_append(r, 'T_logado_nao_mexe_no_custo=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'T_logado_nao_mexe_no_custo=ok'::text);
  when others then
    r := array_append(r, ('T_logado_nao_mexe_no_custo=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    insert into public.user_birthdates (user_id, birth_date) values (u2, date '1990-05-10');
    r := array_append(r, 'U_logado_nao_grava_data_direto=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'U_logado_nao_grava_data_direto=ok'::text);
  when others then
    r := array_append(r, ('U_logado_nao_grava_data_direto=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- Data de nascimento: grava uma vez pela função, repete a mesma sem erro e recusa troca.
  begin
    perform public.declare_birth_date(date '1990-05-10');
    r := array_append(r, 'V_declara_a_data=ok'::text);
  exception when others then
    r := array_append(r, ('V_declara_a_data=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.declare_birth_date(date '1990-05-10');
    r := array_append(r, 'W_mesma_data_de_novo=ok'::text);
  exception when others then
    r := array_append(r, ('W_mesma_data_de_novo=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.declare_birth_date(date '1985-01-01');
    r := array_append(r, 'X_data_nao_muda=FALHOU(trocou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'X_data_nao_muda=ok'::text);
  when others then
    r := array_append(r, ('X_data_nao_muda=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    update public.user_birthdates set birth_date = date '1985-01-01' where user_id = u2;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'X2_data_nao_muda_pela_tabela=ok' else 'X2_data_nao_muda_pela_tabela=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'X2_data_nao_muda_pela_tabela=ok'::text);
  when others then
    r := array_append(r, ('X2_data_nao_muda_pela_tabela=FALHOU(' || sqlerrm || ')')::text);
  end;
  select birth_date into d from public.user_birthdates where user_id = u2;
  r := array_append(r, (case when d = date '1990-05-10' then 'Y_le_a_propria_data=ok' else 'Y_le_a_propria_data=FALHOU(' || coalesce(d::text, 'null') || ')' end)::text);
  select count(*) into n from public.user_birthdates where user_id <> u2;
  r := array_append(r, (case when n = 0 then 'Y2_nao_le_data_alheia=ok' else 'Y2_nao_le_data_alheia=FALHOU(' || n || ')' end)::text);

  -- u1 tenta datas absurdas (antes de 1900 e de quem ainda não tem 5 anos).
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  begin
    perform public.declare_birth_date(date '1800-01-01');
    r := array_append(r, 'Z_data_absurda_antiga=FALHOU(gravou)'::text);
  exception when invalid_parameter_value or check_violation then
    r := array_append(r, 'Z_data_absurda_antiga=ok'::text);
  when others then
    r := array_append(r, ('Z_data_absurda_antiga=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.declare_birth_date(current_date - 30);
    r := array_append(r, 'Z2_data_absurda_recente=FALHOU(gravou)'::text);
  exception when invalid_parameter_value then
    r := array_append(r, 'Z2_data_absurda_recente=ok'::text);
  when others then
    r := array_append(r, ('Z2_data_absurda_recente=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- u3, logado e fora de todas as salas.
  perform set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  select count(*) into n from public.voice_rooms where id in (r1, r2, r3);
  r := array_append(r, (case when n = 0 then 'E_fora_nao_le_a_sala=ok' else 'E_fora_nao_le_a_sala=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_members where room_id in (r1, r2, r3);
  r := array_append(r, (case when n = 0 then 'F_fora_nao_le_a_lista=ok' else 'F_fora_nao_le_a_lista=FALHOU(' || n || ')' end)::text);
  ok := public.is_voice_room_member(r1);
  r := array_append(r, (case when not ok then 'AB_fora_nao_e_membro=ok' else 'AB_fora_nao_e_membro=FALHOU' end)::text);

  -- u4, expulso da sala 3: deixa de ler a sala e a lista.
  perform set_config('request.jwt.claims', json_build_object('sub', u4, 'role', 'authenticated')::text, true);
  select count(*) into n from public.voice_rooms where id = r3;
  r := array_append(r, (case when n = 0 then 'AA_expulso_nao_le_a_sala=ok' else 'AA_expulso_nao_le_a_sala=FALHOU(' || n || ')' end)::text);
  ok := public.is_voice_room_member(r3);
  r := array_append(r, (case when not ok then 'AA2_expulso_nao_e_membro=ok' else 'AA2_expulso_nao_e_membro=FALHOU' end)::text);

  -- Logado sem usuário no token (sessão quebrada): a função recusa.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
  begin
    perform public.declare_birth_date(date '1990-05-10');
    r := array_append(r, 'AF_sem_usuario_nao_declara=FALHOU(gravou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AF_sem_usuario_nao_declara=ok'::text);
  when others then
    r := array_append(r, ('AF_sem_usuario_nao_declara=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- Visitante: não lê nada e não chama a função.
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    select count(*) into n from public.voice_rooms;
    r := array_append(r, (case when n = 0 then 'AD_visitante_nao_le_salas=ok' else 'AD_visitante_nao_le_salas=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AD_visitante_nao_le_salas=ok'::text);
  when others then
    r := array_append(r, ('AD_visitante_nao_le_salas=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    select count(*) into n from public.user_birthdates;
    r := array_append(r, (case when n = 0 then 'AD2_visitante_nao_le_datas=ok' else 'AD2_visitante_nao_le_datas=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AD2_visitante_nao_le_datas=ok'::text);
  when others then
    r := array_append(r, ('AD2_visitante_nao_le_datas=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.declare_birth_date(date '1990-05-10');
    r := array_append(r, 'AE_visitante_nao_declara=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AE_visitante_nao_declara=ok'::text);
  when others then
    r := array_append(r, ('AE_visitante_nao_declara=FALHOU(' || sqlerrm || ')')::text);
  end;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end $$;
