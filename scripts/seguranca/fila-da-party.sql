-- Teste de regressão das regras da fila da party (migrations 174 a 176). Abre uma live de teste,
-- reserva, paga, chama, joga, pula, sai, tira e encerra, e termina SEMPRE num erro proposital
-- (RESULTADO: ...), então a transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/fila-da-party.sql
do $$
declare
  u uuid;
  u2 uuid;
  prod uuid;
  var uuid;
  live uuid;
  o1 uuid;
  o2 uuid;
  o3 uuid;
  o4 uuid;
  o5 uuid;
  o6 uuid;
  b1 uuid;
  b2 uuid;
  b3 uuid;
  b4 uuid;
  b5 uuid;
  b6 uuid;
  v2 uuid;
  v uuid;
  st text;
  st2 text;
  n int;
  t1 timestamptz;
  t2 timestamptz;
  hold timestamptz := now() + interval '35 minutes';
  r text[] := '{}';
begin
  select id into u from public.profiles where not coalesce(is_admin, false) order by id limit 1;
  select id into u2 from public.profiles where not coalesce(is_admin, false) and id <> u order by id limit 1;
  select p.id, pv.id into prod, var
  from public.store_products p
  join public.store_product_variants pv on pv.product_id = p.id
  where p.slug = 'vaga-na-party'
  limit 1;
  if u is null or prod is null then raise exception 'RESULTADO: sem usuário ou produto de teste'; end if;

  -- A. Pedido da fila sem WhatsApp: o Pedro convida pela Steam.
  begin
    insert into public.store_orders (product_id, variant_id, product_title, variant_label, amount_cents, quantity, user_id,
      buyer_name, buyer_email, buyer_whatsapp, payment_method, is_test)
    values (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true)
    returning id into o1;
    r := array_append(r, 'A_pedido_sem_whatsapp=ok'::text);
  exception when others then
    r := array_append(r, ('A_pedido_sem_whatsapp=FALHOU(' || sqlerrm || ')')::text);
    raise exception 'RESULTADO: %', array_to_string(r, ' ');
  end;
  insert into public.store_orders (product_id, variant_id, product_title, variant_label, amount_cents, quantity, user_id,
    buyer_name, buyer_email, buyer_whatsapp, payment_method, is_test)
  values (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true),
         (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true),
         (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true),
         (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true),
         (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true);
  select id into o2 from public.store_orders where is_test and id <> o1 and buyer_name = 'Teste da fila' order by created_at, id limit 1;
  select id into o3 from public.store_orders where is_test and id not in (o1, o2) and buyer_name = 'Teste da fila' order by created_at, id limit 1;
  select id into o4 from public.store_orders where is_test and id not in (o1, o2, o3) and buyer_name = 'Teste da fila' order by created_at, id limit 1;
  select id into o5 from public.store_orders where is_test and id not in (o1, o2, o3, o4) and buyer_name = 'Teste da fila' order by created_at, id limit 1;
  select id into o6 from public.store_orders where is_test and id not in (o1, o2, o3, o4, o5) and buyer_name = 'Teste da fila' order by created_at, id limit 1;

  -- Estado limpo: nenhuma live de teste no ar nem marcada por perto.
  begin
    update public.store_live_sessions set status = 'encerrada' where is_test and status = 'ao_vivo';
    update public.store_live_sessions set status = 'cancelada' where is_test and status = 'marcada';
  exception when others then
    r := array_append(r, ('estado_limpo=FALHOU(' || sqlerrm || ')')::text);
    raise exception 'RESULTADO: %', array_to_string(r, ' ');
  end;

  -- B. Abrir a live de teste: sem live marcada por perto, nasce uma agora (fila de 2, party de 1).
  begin
    live := public.party_fila_abrir_live(true, 2, 1, null);
    select status into st from public.store_live_sessions where id = live;
    r := array_append(r, (case when st = 'ao_vivo' then 'B_abrir_live=ok' else 'B_abrir_live=FALHOU(' || coalesce(st, 'null') || ')' end)::text);
  exception when others then
    r := array_append(r, ('B_abrir_live=FALHOU(' || sqlerrm || ')')::text);
    raise exception 'RESULTADO: %', array_to_string(r, ' ');
  end;

  -- C. Reserva na live que já está no ar (a reserva antiga recusa live começada).
  b1 := public.store_reservar_fila(o1, prod, 1, hold, true);
  r := array_append(r, (case when b1 is not null then 'C_reserva_na_live_no_ar=ok' else 'C_reserva_na_live_no_ar=FALHOU(null)' end)::text);

  -- D. Lotação: com 1 de 2 ocupada, mais 2 partidas não cabem; 1 cabe.
  v := public.store_reservar_fila(o2, prod, 2, hold, true);
  r := array_append(r, (case when v is null then 'D_lotacao=ok' else 'D_lotacao=FALHOU(reservou)' end)::text);
  b2 := public.store_reservar_fila(o2, prod, 1, hold, true);

  -- E. Reserva ainda não paga fica fora da fila.
  select queue_state into st from public.store_bookings where id = b2;
  r := array_append(r, (case when st is null then 'E_sem_pagamento_fora_da_fila=ok' else 'E_sem_pagamento_fora_da_fila=FALHOU(' || st || ')' end)::text);

  -- F. Pagamento confirmado entra na fila, na ordem do pagamento.
  update public.store_bookings set status = 'confirmado', hold_until = null where id = b1;
  update public.store_bookings set status = 'confirmado', hold_until = null where id = b2;
  select queue_state, queued_at into st, t1 from public.store_bookings where id = b1;
  select queue_state, queued_at into st2, t2 from public.store_bookings where id = b2;
  r := array_append(r, (case when st = 'aguardando' and st2 = 'aguardando' and t1 < t2
    then 'F_pago_entra_na_fila=ok' else 'F_pago_entra_na_fila=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);

  -- G. Chamar o próximo leva o primeiro pago para a party.
  v := public.party_fila_chamar(live, null);
  select queue_state into st from public.store_bookings where id = b1;
  r := array_append(r, (case when v = b1 and st = 'na_party' then 'G_chamar_o_proximo=ok' else 'G_chamar_o_proximo=FALHOU(' || coalesce(st, 'null') || ')' end)::text);

  -- H. Party cheia (1 lugar por partida no teste): ninguém mais entra.
  v := public.party_fila_chamar(live, null);
  r := array_append(r, (case when v is null then 'H_party_cheia=ok' else 'H_party_cheia=FALHOU(chamou)' end)::text);

  -- I. Jogou a única partida comprada: concluído, e a reserva fecha.
  st := public.party_fila_jogou(b1);
  select status into st2 from public.store_bookings where id = b1;
  r := array_append(r, (case when st = 'concluido' and st2 = 'concluido' then 'I_jogou=ok' else 'I_jogou=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);

  -- J. A partida jogada devolve a vaga à venda (a lotação conta a fila).
  b3 := public.store_reservar_fila(o3, prod, 1, hold, true);
  r := array_append(r, (case when b3 is not null then 'J_vaga_volta_a_venda=ok' else 'J_vaga_volta_a_venda=FALHOU(null)' end)::text);
  update public.store_bookings set status = 'confirmado', hold_until = null where id = b3;

  -- K. Não apareceu: volta para o fim da fila, atrás de quem pagou depois.
  v := public.party_fila_chamar(live, null);
  perform public.party_fila_ausente(b2);
  select queue_state, queued_at, no_shows into st, t2, n from public.store_bookings where id = b2;
  select queued_at into t1 from public.store_bookings where id = b3;
  r := array_append(r, (case when v = b2 and st = 'aguardando' and n = 1 and t2 > t1
    then 'K_nao_apareceu_vai_pro_fim=ok' else 'K_nao_apareceu_vai_pro_fim=FALHOU(' || coalesce(st, 'null') || ')' end)::text);

  -- L. Encerrar a live devolve quem estava na party para a fila.
  v := public.party_fila_chamar(live, null);
  -- Q1. Quem está na party não "sai da fila" pelo site: ou joga ou o Pedro marca que não apareceu.
  begin
    r := array_append(r, (case when not public.party_fila_sair(b3, u) then 'Q1_na_party_nao_sai=ok' else 'Q1_na_party_nao_sai=FALHOU(saiu)' end)::text);
  exception when others then
    r := array_append(r, ('Q1_na_party_nao_sai=FALHOU(' || sqlerrm || ')')::text);
  end;
  perform public.party_fila_encerrar_live(live);
  select queue_state into st from public.store_bookings where id = b3;
  select status into st2 from public.store_live_sessions where id = live;
  r := array_append(r, (case when v = b3 and st = 'aguardando' and st2 = 'encerrada'
    then 'L_encerrar_devolve_a_party=ok' else 'L_encerrar_devolve_a_party=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);

  -- Q2. Outra pessoa não tira a vaga de ninguém da fila.
  begin
    r := array_append(r, (case when not public.party_fila_sair(b3, u2) then 'Q2_outro_nao_tira=ok' else 'Q2_outro_nao_tira=FALHOU(saiu)' end)::text);
  exception when others then
    r := array_append(r, ('Q2_outro_nao_tira=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- Q3. A dona da vaga sai enquanto espera: sai da fila com o motivo "saiu" e a vaga volta à venda.
  begin
    perform public.party_fila_sair(b3, u);
    select queue_state, queue_exit into st, st2 from public.store_bookings where id = b3;
    r := array_append(r, (case when st = 'removido' and st2 = 'saiu' then 'Q3_sair_da_fila=ok' else 'Q3_sair_da_fila=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);
  exception when others then
    r := array_append(r, ('Q3_sair_da_fila=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- R. O Pedro tira da fila: motivo "tirado".
  begin
    update public.store_live_sessions set status = 'ao_vivo', party_seats = 3 where id = live;
    b4 := public.store_reservar_fila(o4, prod, 1, null, true);
    perform public.party_fila_remover(b4);
    select queue_state, queue_exit into st, st2 from public.store_bookings where id = b4;
    r := array_append(r, (case when st = 'removido' and st2 = 'tirado' then 'R_tirado_pelo_pedro=ok' else 'R_tirado_pelo_pedro=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);
    update public.store_live_sessions set status = 'encerrada' where id = live;
  exception when others then
    r := array_append(r, ('R_tirado_pelo_pedro=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- M. Uma live no ar por vez.
  begin
    insert into public.store_live_sessions (starts_at, ends_at, status, is_test) values (now(), now() + interval '1 hour', 'ao_vivo', true);
    insert into public.store_live_sessions (starts_at, ends_at, status, is_test) values (now(), now() + interval '1 hour', 'ao_vivo', true);
    r := array_append(r, 'M_uma_live_no_ar=FALHOU(gravou duas)'::text);
  exception when unique_violation then
    r := array_append(r, 'M_uma_live_no_ar=ok'::text);
  end;

  -- N. Pedido cancelado sai da fila.
  update public.store_bookings set status = 'cancelado' where id = b2;
  select queue_state, queue_exit into st, st2 from public.store_bookings where id = b2;
  r := array_append(r, (case when st = 'removido' and st2 = 'cancelado' then 'N_cancelado_sai_da_fila=ok' else 'N_cancelado_sai_da_fila=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);

  -- S. Uma vaga por pessoa na party: com duas compras na fila, a segunda espera a primeira terminar.
  begin
    update public.store_live_sessions set status = 'ao_vivo', party_seats = 10, seats_per_match = 2 where id = live;
    b5 := public.store_reservar_fila(o5, prod, 1, null, true);
    b6 := public.store_reservar_fila(o6, prod, 1, null, true);
    v := public.party_fila_chamar(live, null);
    v2 := public.party_fila_chamar(live, null);
    r := array_append(r, (case when v = b5 and v2 is null then 'S_uma_vaga_por_pessoa_na_party=ok' else 'S_uma_vaga_por_pessoa_na_party=FALHOU(' || coalesce(v::text, 'null') || ',' || coalesce(v2::text, 'null') || ')' end)::text);
  exception when others then
    r := array_append(r, ('S_uma_vaga_por_pessoa_na_party=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- T. "Partida terminou" conta uma vez só: o segundo toque com o mesmo número não desconta de novo.
  begin
    n := public.party_fila_partida_terminou(live, 0);
    perform public.party_fila_partida_terminou(live, 0);
    select matches_played, queue_state into n, st from public.store_bookings where id = b5;
    r := array_append(r, (case when n = 1 and st = 'concluido' and (select match_count from public.store_live_sessions where id = live) = 1
      then 'T_partida_terminou_uma_vez=ok' else 'T_partida_terminou_uma_vez=FALHOU(' || n || ',' || coalesce(st, 'null') || ')' end)::text);
    v := public.party_fila_chamar(live, null);
    r := array_append(r, (case when v = b6 then 'T2_segunda_compra_entra_depois=ok' else 'T2_segunda_compra_entra_depois=FALHOU' end)::text);
    update public.store_live_sessions set status = 'encerrada' where id = live;
  exception when others then
    r := array_append(r, ('T_partida_terminou_uma_vez=FALHOU(' || sqlerrm || ')')::text);
  end;

  -- O. Logado comum não opera a fila, não reserva direto e não lê as reservas.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    perform public.party_fila_chamar(live, null);
    r := array_append(r, 'O_logado_chama=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_chama=ok'::text);
  end;
  begin
    perform public.store_reservar_fila(o3, prod, 1, hold, true);
    r := array_append(r, 'O_logado_reserva=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_reserva=ok'::text);
  end;
  begin
    perform public.party_fila_sair(b3, u);
    r := array_append(r, 'O_logado_sai_direto=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_sai_direto=ok'::text);
  end;
  begin
    select count(*) into n from public.store_bookings;
    r := array_append(r, (case when n = 0 then 'O_logado_le_reservas=ok' else 'O_logado_le_reservas=FALHOU(' || n || ')' end)::text);
  exception when insufficient_privilege then
    r := array_append(r, 'O_logado_le_reservas=ok'::text);
  end;

  -- P. Visitante também não.
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    perform public.party_fila_abrir_live(false, 8, 4, null);
    r := array_append(r, 'P_visitante_abre_live=FALHOU(executou)'::text);
  exception when insufficient_privilege then
    r := array_append(r, 'P_visitante_abre_live=ok'::text);
  end;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end $$;
