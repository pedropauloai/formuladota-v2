-- Teste de regressão das regras do banco da sala de voz (migration 196). Monta três salas públicas de
-- teste e confere o que visitante, logado de fora, membro e expulso leem e escrevem, a marcação de 18
-- anos e as funções do batimento fechadas ao navegador. Termina SEMPRE num erro proposital
-- (RESULTADO: ...), então a transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/sala-voz.sql
-- Antes de a 196 estar em produção: acrescentar --antes supabase/migrations/196_sala_voz.sql (o
-- executor termina em ROLLBACK, então a migration testada volta junto).
do $$
declare
  u1 uuid;
  u2 uuid;
  u3 uuid;
  u4 uuid;
  r1 uuid;
  r2 uuid;
  r3 uuid;
  rep_u2 uuid;
  rep_u1 uuid;
  r4 uuid;
  antes bigint;
  big bigint;
  n int;
  j jsonb;
  ok boolean;
  r text[] := '{}';
begin
  -- Quatro perfis comuns de produção, sem a marcação de idade (o teste faz a do u2).
  select id into u1 from public.profiles p
   where not coalesce(p.is_admin, false)
     and not exists (select 1 from public.user_age_confirmations c where c.user_id = p.id)
   order by id limit 1;
  select id into u2 from public.profiles p
   where not coalesce(p.is_admin, false) and p.id <> u1
     and not exists (select 1 from public.user_age_confirmations c where c.user_id = p.id)
   order by id limit 1;
  select id into u3 from public.profiles p where not coalesce(p.is_admin, false) and p.id not in (u1, u2) order by id limit 1;
  select id into u4 from public.profiles p where not coalesce(p.is_admin, false) and p.id not in (u1, u2, u3) order by id limit 1;
  if u4 is null then raise exception 'RESULTADO: faltam perfis de teste'; end if;

  -- Montagem (como dono das tabelas): três salas públicas de teste e o que cada uma tem.
  insert into public.voice_rooms (kind, title, owner_id, max_members, closes_at, is_test)
  values ('palco', 'Sala de teste 1', u1, 30, now() + interval '2 hours', true) returning id into r1;
  insert into public.voice_rooms (kind, title, owner_id, max_members, closes_at, is_test)
  values ('palco', 'Sala de teste 2', u1, 30, now() + interval '2 hours', true) returning id into r2;
  insert into public.voice_rooms (kind, title, owner_id, max_members, closes_at, is_test)
  values ('palco', 'Sala de teste 3', u1, 30, now() + interval '2 hours', true) returning id into r3;
  insert into public.voice_room_members (room_id, user_id, role, joined_via) values
    (r1, u1, 'dono', 'dono'), (r1, u2, 'ouvinte', 'palco'), (r2, u1, 'dono', 'dono'), (r3, u1, 'dono', 'dono');
  insert into public.voice_room_members (room_id, user_id, role, status, joined_via, removed_by, removed_at)
  values (r3, u4, 'ouvinte', 'expulso', 'palco', u1, now());
  insert into public.voice_bans (owner_id, user_id, created_by) values (u1, u4, u1);
  insert into public.voice_room_sessions (id, room_id, user_id, ip, user_agent)
  values ('00000000000000000000000000e2e001', r1, u1, '203.0.113.7', 'teste'),
         ('00000000000000000000000000e2e002', r1, u2, '203.0.113.8', 'teste');
  insert into public.voice_room_tracks (session_id, track_name, mid, kind, tipo)
  values ('00000000000000000000000000e2e001', 'faixa-teste-voz', '0', 'audio', 'voz');
  insert into public.voice_room_subscriptions (session_id, mid, publisher_session_id, track_name, kind, rate_kbps, is_test)
  values ('00000000000000000000000000e2e002', '0', '00000000000000000000000000e2e001', 'faixa-teste-voz', 'audio', 64, true);
  insert into public.voice_room_stats (room_id, user_id, session_id, rtt_ms) values (r1, u2, '00000000000000000000000000e2e002', 40);
  insert into public.voice_room_messages (room_id, user_id, body) values (r1, u2, 'oi do teste');
  insert into public.voice_room_reports (room_id, reporter_id, reported_id, reason, is_test) values (r1, u2, u1, 'spam', true) returning id into rep_u2;
  insert into public.voice_room_reports (room_id, reporter_id, reported_id, reason, is_test) values (r1, u1, u2, 'spam', true) returning id into rep_u1;

  -- Controle positivo: as funções do servidor enxergam a sala, o membro, o banido e a mensagem.
  j := public.voice_room_tick(r1, u2, false, false);
  r := array_append(r, (case when j->'room'->>'id' = r1::text and j->'member'->>'role' = 'ouvinte'
      and jsonb_array_length(j->'my_subscriptions') = 1 and jsonb_typeof(j->'blocked') = 'array'
    then 'A0_batimento_ve_o_que_o_servidor_precisa=ok' else 'A0_batimento_ve_o_que_o_servidor_precisa=FALHOU' end)::text);
  j := public.voice_room_snapshot(r1, 0);
  r := array_append(r, (case when jsonb_array_length(j->'chat') = 1 and jsonb_array_length(j->'tracks') = 1
      and exists (select 1 from jsonb_array_elements(j->'members') e where e->>'u' = u2::text and (e->>'on')::boolean)
    then 'A0b_estado_comum_ve_membro_faixa_e_chat=ok' else 'A0b_estado_comum_ve_membro_faixa_e_chat=FALHOU' end)::text);
  j := public.voice_room_snapshot(r1, (select max(id) from public.voice_room_messages where room_id = r1));
  r := array_append(r, (case when jsonb_array_length(j->'chat') = 0
    then 'A0c_estado_comum_manda_so_o_chat_novo=ok' else 'A0c_estado_comum_manda_so_o_chat_novo=FALHOU' end)::text);
  j := public.voice_room_identities(r1, array[u1, u2, u3]);
  r := array_append(r, (case when j ? u1::text and j ? u2::text and not j ? u3::text
    then 'A0d_nomes_so_de_quem_e_da_sala=ok' else 'A0d_nomes_so_de_quem_e_da_sala=FALHOU' end)::text);
  j := public.voice_room_access(r3, u4);
  r := array_append(r, (case when (j->>'banned_by_owner')::boolean and j->'member'->>'status' = 'expulso'
    then 'A1_contexto_ve_o_banido=ok' else 'A1_contexto_ve_o_banido=FALHOU' end)::text);

  -- Consumo somado no banco, a conta da spec (duração x taxa): uma faixa fechada de 630 s a 64 kbps
  -- (5.040.000 bytes) e uma aberta desde 200 s atrás, de quem bateu há 100 s (conta até 70 s atrás:
  -- 130 s a 128 kbps, 2.080.000 bytes).
  antes := public.voice_usage_bytes(now() - interval '30 days', true);
  insert into public.voice_room_sessions (id, room_id, user_id) values ('00000000000000000000000000e2e003', r1, u1);
  update public.voice_room_members set last_seen_at = now() - interval '100 seconds' where room_id = r1 and user_id = u1;
  insert into public.voice_room_subscriptions (session_id, mid, publisher_session_id, track_name, kind, rate_kbps, started_at, ended_at, is_test)
  values ('00000000000000000000000000e2e003', '5', '00000000000000000000000000e2e002', 'c1', 'audio', 64, now() - interval '700 seconds', now() - interval '70 seconds', true),
         ('00000000000000000000000000e2e003', '6', '00000000000000000000000000e2e002', 'c2', 'audio', 128, now() - interval '200 seconds', null, true);
  big := public.voice_usage_bytes(now() - interval '30 days', true) - antes;
  r := array_append(r, (case when big = 7120000 then 'A2_consumo_estimado_bate_com_a_conta=ok'
    else 'A2_consumo_estimado_bate_com_a_conta=FALHOU(' || big || ')' end)::text);
  insert into public.voice_rooms (kind, title, owner_id, max_members, closes_at, is_test)
  values ('palco', 'Sala de producao do teste', u1, 30, now() + interval '2 hours', false) returning id into r4;
  antes := public.voice_usage_measured(now() - interval '1 hour');
  insert into public.voice_room_stats (room_id, user_id, bytes_received) values (r4, u1, 1000), (r1, u1, 5000);
  big := public.voice_usage_measured(now() - interval '1 hour') - antes;
  r := array_append(r, (case when big = 1000 then 'A3_consumo_medido_sem_sala_de_teste=ok'
    else 'A3_consumo_medido_sem_sala_de_teste=FALHOU(' || big || ')' end)::text);

  -- A partir daqui, um jogador logado: u2, ouvinte da sala 1.
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
  select count(*) into n from public.voice_room_messages;
  r := array_append(r, (case when n = 0 then 'K2_chat_so_pelo_servidor=ok' else 'K2_chat_so_pelo_servidor=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_bans;
  r := array_append(r, (case when n = 0 then 'K3_banidos_so_pelo_servidor=ok' else 'K3_banidos_so_pelo_servidor=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_reports where id = rep_u2;
  r := array_append(r, (case when n = 1 then 'L_le_a_propria_denuncia=ok' else 'L_le_a_propria_denuncia=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.voice_room_reports where id = rep_u1;
  r := array_append(r, (case when n = 0 then 'M_nao_le_denuncia_alheia=ok' else 'M_nao_le_denuncia_alheia=FALHOU(' || n || ')' end)::text);

  -- Escrita pela API: nenhuma tabela aceita.
  begin
    insert into public.voice_rooms (kind, title, owner_id, max_members, closes_at, is_test) values ('palco', 'Sala forjada', u2, 30, now() + interval '1 hour', true);
    r := array_append(r, 'N_logado_nao_cria_sala=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'N_logado_nao_cria_sala=ok'::text);
  when others then
    r := array_append(r, ('N_logado_nao_cria_sala=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    insert into public.voice_room_members (room_id, user_id, role, joined_via) values (r2, u2, 'ouvinte', 'palco');
    r := array_append(r, 'O_logado_nao_se_poe_na_sala=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_nao_se_poe_na_sala=ok'::text);
  when others then
    r := array_append(r, ('O_logado_nao_se_poe_na_sala=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    update public.voice_room_members set role = 'falante' where room_id = r1 and user_id = u2;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'P_ouvinte_nao_se_poe_no_palco=ok' else 'P_ouvinte_nao_se_poe_no_palco=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'P_ouvinte_nao_se_poe_no_palco=ok'::text);
  when others then
    r := array_append(r, ('P_ouvinte_nao_se_poe_no_palco=FALHOU(' || sqlerrm || ')')::text);
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
    insert into public.voice_room_messages (room_id, user_id, body) values (r1, u1, 'mensagem forjada em nome do dono');
    r := array_append(r, 'R_logado_nao_escreve_no_chat_direto=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'R_logado_nao_escreve_no_chat_direto=ok'::text);
  when others then
    r := array_append(r, ('R_logado_nao_escreve_no_chat_direto=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    delete from public.voice_bans where user_id = u4;
    get diagnostics n = row_count;
    r := array_append(r, (case when n = 0 then 'R2_logado_nao_desbane=ok' else 'R2_logado_nao_desbane=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'R2_logado_nao_desbane=ok'::text);
  when others then
    r := array_append(r, ('R2_logado_nao_desbane=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    update public.voice_settings set cap_gb_30d = 100000;
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
    insert into public.user_age_confirmations (user_id, terms_version) values (u3, 'sala-1');
    r := array_append(r, 'U_logado_nao_marca_idade_de_outro=FALHOU(inseriu)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'U_logado_nao_marca_idade_de_outro=ok'::text);
  when others then
    r := array_append(r, ('U_logado_nao_marca_idade_de_outro=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_tick(r2, u1, false, false);
    r := array_append(r, 'AG_logado_nao_chama_o_batimento_do_servidor=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AG_logado_nao_chama_o_batimento_do_servidor=ok'::text);
  when others then
    r := array_append(r, ('AG_logado_nao_chama_o_batimento_do_servidor=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_access(r2, u1);
    r := array_append(r, 'AH_logado_nao_chama_o_contexto_do_servidor=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AH_logado_nao_chama_o_contexto_do_servidor=ok'::text);
  when others then
    r := array_append(r, ('AH_logado_nao_chama_o_contexto_do_servidor=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_snapshot(r2, 0);
    r := array_append(r, 'AI_logado_nao_le_o_estado_de_outra_sala=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AI_logado_nao_le_o_estado_de_outra_sala=ok'::text);
  when others then
    r := array_append(r, ('AI_logado_nao_le_o_estado_de_outra_sala=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_identities(r2, array[u1]);
    r := array_append(r, 'AJ_logado_nao_chama_os_nomes_do_servidor=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AJ_logado_nao_chama_os_nomes_do_servidor=ok'::text);
  when others then
    r := array_append(r, ('AJ_logado_nao_chama_os_nomes_do_servidor=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_usage_bytes(now() - interval '30 days', false);
    r := array_append(r, 'AK_logado_nao_le_o_consumo=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AK_logado_nao_le_o_consumo=ok'::text);
  when others then
    r := array_append(r, ('AK_logado_nao_le_o_consumo=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- Marcação de 18 anos: só a da própria pessoa, uma vez, e repetir não dá erro.
  begin
    perform public.confirm_adult('sala-1');
    r := array_append(r, 'V_marca_a_propria_idade=ok'::text);
  exception when others then
    r := array_append(r, ('V_marca_a_propria_idade=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.confirm_adult('sala-1');
    r := array_append(r, 'W_repetir_a_marcacao=ok'::text);
  exception when others then
    r := array_append(r, ('W_repetir_a_marcacao=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.confirm_adult('versão inválida!');
    r := array_append(r, 'X_versao_do_texto_invalida=FALHOU(gravou)'::text);
  exception when invalid_parameter_value then
    r := array_append(r, 'X_versao_do_texto_invalida=ok'::text);
  when others then
    r := array_append(r, ('X_versao_do_texto_invalida=FALHOU(' || sqlerrm || ')')::text);
  end;
  select count(*) into n from public.user_age_confirmations where user_id = u2;
  r := array_append(r, (case when n = 1 then 'Y_le_a_propria_marcacao=ok' else 'Y_le_a_propria_marcacao=FALHOU(' || n || ')' end)::text);
  select count(*) into n from public.user_age_confirmations where user_id <> u2;
  r := array_append(r, (case when n = 0 then 'Y2_nao_le_marcacao_alheia=ok' else 'Y2_nao_le_marcacao_alheia=FALHOU(' || n || ')' end)::text);

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
    perform public.confirm_adult('sala-1');
    r := array_append(r, 'AF_sem_usuario_nao_marca=FALHOU(gravou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AF_sem_usuario_nao_marca=ok'::text);
  when others then
    r := array_append(r, ('AF_sem_usuario_nao_marca=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- Visitante: não lê nada e não chama as funções.
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    select count(*) into n from public.voice_rooms;
    r := array_append(r, (case when n = 0 then 'AD_visitante_nao_le_salas=ok' else 'AD_visitante_nao_le_salas=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AD_visitante_nao_le_salas=ok'::text);
  end;
  begin
    select count(*) into n from public.user_age_confirmations;
    r := array_append(r, (case when n = 0 then 'AD2_visitante_nao_le_marcacoes=ok' else 'AD2_visitante_nao_le_marcacoes=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AD2_visitante_nao_le_marcacoes=ok'::text);
  end;
  begin
    perform public.confirm_adult('sala-1');
    r := array_append(r, 'AE_visitante_nao_marca=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AE_visitante_nao_marca=ok'::text);
  when others then
    r := array_append(r, ('AE_visitante_nao_marca=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_tick(r1, u2, false, false);
    r := array_append(r, 'AE2_visitante_nao_chama_o_batimento=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AE2_visitante_nao_chama_o_batimento=ok'::text);
  when others then
    r := array_append(r, ('AE2_visitante_nao_chama_o_batimento=FALHOU(' || sqlerrm || ')')::text);
  end;
  begin
    perform public.voice_room_snapshot(r1, 0);
    r := array_append(r, 'AE3_visitante_nao_le_o_estado=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'AE3_visitante_nao_le_o_estado=ok'::text);
  when others then
    r := array_append(r, ('AE3_visitante_nao_le_o_estado=FALHOU(' || sqlerrm || ')')::text);
  end;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end $$;
