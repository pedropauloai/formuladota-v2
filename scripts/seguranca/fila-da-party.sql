-- Teste de regressão das regras da fila da party (migration 174). Abre uma live de teste, reserva,
-- paga, chama, joga, pula e encerra, e termina SEMPRE num erro proposital (RESULTADO: ...), então
-- a transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/fila-da-party.sql
do $$
declare
  u uuid;
  prod uuid;
  var uuid;
  live uuid;
  o1 uuid;
  o2 uuid;
  o3 uuid;
  b1 uuid;
  b2 uuid;
  b3 uuid;
  v uuid;
  st text;
  st2 text;
  n int;
  t1 timestamptz;
  t2 timestamptz;
  hold timestamptz := now() + interval '35 minutes';
  r text[] := '{}';
begin
  select id into u from public.profiles where not coalesce(is_admin, false) limit 1;
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
         (prod, var, 'Vaga na party da live', 'Por partida', 2500, 1, u, 'Teste da fila', 'teste.fila@formuladota.com.br', null, 'pix', true);
  select id into o2 from public.store_orders where is_test and id <> o1 and buyer_name = 'Teste da fila' order by created_at, id limit 1;
  select id into o3 from public.store_orders where is_test and id not in (o1, o2) and buyer_name = 'Teste da fila' order by created_at, id limit 1;

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
  perform public.party_fila_encerrar_live(live);
  select queue_state into st from public.store_bookings where id = b3;
  select status into st2 from public.store_live_sessions where id = live;
  r := array_append(r, (case when v = b3 and st = 'aguardando' and st2 = 'encerrada'
    then 'L_encerrar_devolve_a_party=ok' else 'L_encerrar_devolve_a_party=FALHOU(' || coalesce(st, 'null') || ',' || coalesce(st2, 'null') || ')' end)::text);

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
  select queue_state into st from public.store_bookings where id = b2;
  r := array_append(r, (case when st = 'removido' then 'N_cancelado_sai_da_fila=ok' else 'N_cancelado_sai_da_fila=FALHOU(' || coalesce(st, 'null') || ')' end)::text);

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
