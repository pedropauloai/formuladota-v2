-- Teste de regressão das regras do Battlepass (migration 190). Usa dois jogadores reais, grava
-- assinaturas e pagamentos de teste e termina SEMPRE num erro proposital (RESULTADO: ...), então a
-- transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/battlepass.sql
do $$
declare
  u uuid;
  u2 uuid;
  s1 uuid;
  s2 uuid;
  p1 uuid;
  p2 uuid;
  p3 uuid;
  st text;
  n int;
  ok boolean;
  total int;
  t1 timestamptz;
  t2 timestamptz;
  r text[] := '{}';
begin
  select id into u from public.profiles where not coalesce(is_admin, false) order by id limit 1;
  select id into u2 from public.profiles where not coalesce(is_admin, false) and id <> u order by id limit 1;
  if u is null or u2 is null then raise exception 'RESULTADO: sem jogadores de teste'; end if;
  -- Estado limpo: nenhuma assinatura de teste dos dois no caminho do índice de uma ativa por pessoa.
  delete from public.subscriptions where user_id in (u, u2) and is_test;
  update public.subscriptions set status = 'cancelled' where user_id in (u, u2) and status in ('pending', 'authorized', 'paused');

  -- A. Logado não cria assinatura para si (a brecha da política antiga de INSERT).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    insert into public.subscriptions (user_id, status, tier, provider, next_payment_date, is_test)
    values (u, 'authorized', 'battlepass', 'pix', now() + interval '30 days', true);
    r := array_append(r, 'A_logado_cria_assinatura=FALHOU(gravou)'::text);
  exception when others then
    r := array_append(r, 'A_logado_cria_assinatura=ok'::text);
  end;
  reset role;

  -- Assinatura de teste de u, criada pelo servidor.
  insert into public.subscriptions (user_id, status, tier, provider, is_test)
  values (u, 'pending', 'battlepass', 'pix', true) returning id into s1;

  -- B. Logado não estica a própria assinatura nem apaga.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    update public.subscriptions set status = 'authorized', next_payment_date = now() + interval '1 year' where id = s1;
    get diagnostics n = row_count;
    r := array_append(r, ('B_logado_estica_assinatura=FALHOU(' || n || ' linha)')::text);
  exception when others then
    r := array_append(r, 'B_logado_estica_assinatura=ok'::text);
  end;
  begin
    delete from public.subscriptions where id = s1;
    get diagnostics n = row_count;
    if n = 0 then
      r := array_append(r, 'B_logado_apaga_assinatura=ok'::text);
    else
      r := array_append(r, ('B_logado_apaga_assinatura=FALHOU(' || n || ' linha)')::text);
    end if;
  exception when others then
    r := array_append(r, 'B_logado_apaga_assinatura=ok'::text);
  end;
  -- Controle: o dono lê a própria assinatura.
  select count(*) into n from public.subscriptions where id = s1;
  r := array_append(r, ('B_dono_le_assinatura=' || case when n = 1 then 'ok' else 'FALHOU(' || n || ')' end)::text);
  reset role;

  -- C. Funções do Battlepass fechadas a visitante e logado.
  select not (
    has_function_privilege('anon', 'public.battlepass_pix_confirmar(uuid, text, integer, jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.battlepass_pix_confirmar(uuid, text, integer, jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.battlepass_cartao_cobranca(uuid, text, text, integer, timestamptz, timestamptz, jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.battlepass_pedir_reembolso(uuid, boolean)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.battlepass_ativo(uuid, boolean)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.battlepass_membros(uuid[], boolean)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.party_ultima_vez(uuid[], boolean)', 'EXECUTE')
    or has_function_privilege('anon', 'public.party_ultima_vez(uuid[], boolean)', 'EXECUTE')
  ) into ok;
  r := array_append(r, ('C_funcoes_fechadas=' || case when ok then 'ok' else 'FALHOU' end)::text);

  -- D. Pix confirmado ativa por 30 dias; a segunda confirmação do mesmo pagamento não soma.
  insert into public.subscription_payments (subscription_id, user_id, method, amount_cents, is_test)
  values (s1, u, 'pix', 12000, true) returning id into p1;
  st := public.battlepass_pix_confirmar(p1, 'teste-mp-1', 12000, '{}'::jsonb);
  select next_payment_date into t1 from public.subscriptions where id = s1;
  r := array_append(r, ('D_pix_ativa=' || case when st = 'pago' and t1 between now() + interval '29 days' and now() + interval '31 days'
    and public.battlepass_ativo(u, true) then 'ok' else 'FALHOU(' || st || ')' end)::text);
  st := public.battlepass_pix_confirmar(p1, 'teste-mp-1', 12000, '{}'::jsonb);
  select next_payment_date into t2 from public.subscriptions where id = s1;
  r := array_append(r, ('D_pix_repetido_nao_soma=' || case when st = 'nada' and t2 = t1 then 'ok' else 'FALHOU(' || st || ')' end)::text);

  -- E. Segundo Pix soma 30 dias a partir do fim do primeiro.
  insert into public.subscription_payments (subscription_id, user_id, method, amount_cents, is_test)
  values (s1, u, 'pix', 12000, true) returning id into p2;
  st := public.battlepass_pix_confirmar(p2, 'teste-mp-2', 12000, '{}'::jsonb);
  select next_payment_date into t2 from public.subscriptions where id = s1;
  r := array_append(r, ('E_segundo_pix_soma=' || case when st = 'pago' and t2 = t1 + interval '30 days' then 'ok' else 'FALHOU(' || st || ')' end)::text);

  -- F. O selo: battlepass_membros acha u e não acha u2; ninguém do ambiente de produção vira membro.
  select count(*) into n from public.battlepass_membros(array[u, u2], true) m where m = u;
  select count(*) + n into n from public.battlepass_membros(array[u, u2], true) m where m = u2;
  r := array_append(r, ('F_selo_so_do_assinante=' || case when n = 1 and not public.battlepass_ativo(u, false) then 'ok' else 'FALHOU(' || n || ')' end)::text);

  -- G. O dono lê os próprios pagamentos; o outro jogador não lê.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  select count(*) into n from public.subscription_payments where subscription_id = s1;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select n * 10 + count(*) into n from public.subscription_payments where subscription_id = s1;
  r := array_append(r, ('G_pagamentos_so_do_dono=' || case when n = 20 then 'ok' else 'FALHOU(' || n || ')' end)::text);
  begin
    update public.subscription_payments set status = 'pago' where subscription_id = s1;
    get diagnostics n = row_count;
    r := array_append(r, ('G_logado_grava_pagamento=' || case when n = 0 then 'ok' else 'FALHOU(' || n || ' linha)' end)::text);
  exception when others then
    r := array_append(r, 'G_logado_grava_pagamento=ok'::text);
  end;
  reset role;

  -- H. Garantia de 7 dias: devolve tudo o que foi pago no prazo, encerra o acesso, vale uma vez.
  total := public.battlepass_pedir_reembolso(u, true);
  r := array_append(r, ('H_reembolso_devolve_tudo=' || case when total = 24000 and not public.battlepass_ativo(u, true) then 'ok'
    else 'FALHOU(' || coalesce(total::text, 'null') || ')' end)::text);
  select count(*) into n from public.subscription_payments where subscription_id = s1 and status = 'reembolso_pedido';
  r := array_append(r, ('H_pagamentos_marcados=' || case when n = 2 then 'ok' else 'FALHOU(' || n || ')' end)::text);
  total := public.battlepass_pedir_reembolso(u, true);
  r := array_append(r, ('H_garantia_uma_vez=' || case when total is null then 'ok' else 'FALHOU(' || total || ')' end)::text);

  -- I. Cartão: a cobrança grava uma vez só pelo ID e estica o período; depois de 7 dias não há garantia.
  insert into public.subscriptions (user_id, status, tier, provider, mp_preapproval_id, is_test)
  values (u2, 'pending', 'battlepass', 'mp', 'teste-preapproval-bp', true) returning id into s2;
  ok := public.battlepass_cartao_cobranca(s2, 'teste-auth-1', 'teste-mp-3', 12000, now() - interval '8 days', now() + interval '22 days', '{}'::jsonb);
  select status, next_payment_date into st, t1 from public.subscriptions where id = s2;
  r := array_append(r, ('I_cobranca_ativa=' || case when ok and st = 'authorized' and t1 > now() + interval '21 days' then 'ok' else 'FALHOU(' || st || ')' end)::text);
  ok := public.battlepass_cartao_cobranca(s2, 'teste-auth-1', 'teste-mp-3', 12000, now() - interval '8 days', now() + interval '22 days', '{}'::jsonb);
  select count(*) into n from public.subscription_payments where subscription_id = s2;
  r := array_append(r, ('I_cobranca_repetida=' || case when not ok and n = 1 then 'ok' else 'FALHOU(' || n || ')' end)::text);
  total := public.battlepass_pedir_reembolso(u2, true);
  r := array_append(r, ('I_sem_garantia_depois_de_7_dias=' || case when total is null and public.battlepass_ativo(u2, true) then 'ok'
    else 'FALHOU(' || coalesce(total::text, 'null') || ')' end)::text);

  -- J. Lobby elite aceita o Battlepass (com Imortal e Místico) e recusa sem ele.
  update public.profiles set mmr_atual = 6500 where id = u2;
  insert into public.user_levels (user_id, current_level) values (u2, 30)
    on conflict (user_id) do update set current_level = 30;
  ok := public.can_join_elite(u2);
  update public.subscriptions set next_payment_date = now() - interval '1 day' where id = s2;
  r := array_append(r, ('J_elite_com_battlepass=' || case when ok and not public.can_join_elite(u2) then 'ok' else 'FALHOU' end)::text);

  -- M. Cartão cancelado ainda valendo (10 dias) e um Pix pago: o Pix soma depois do fim do cartão (193).
  update public.subscriptions set status = 'cancelled', next_payment_date = now() + interval '10 days' where id = s2;
  insert into public.subscriptions (user_id, status, tier, provider, is_test)
  values (u2, 'pending', 'battlepass', 'pix', true) returning id into s1;
  insert into public.subscription_payments (subscription_id, user_id, method, amount_cents, is_test)
  values (s1, u2, 'pix', 12000, true) returning id into p3;
  st := public.battlepass_pix_confirmar(p3, 'teste-mp-4', 12000, '{}'::jsonb);
  select period_start into t1 from public.subscription_payments where id = p3;
  r := array_append(r, ('M_pix_soma_depois_do_cartao=' || case when st = 'pago' and t1 between now() + interval '9 days' and now() + interval '11 days'
    then 'ok' else 'FALHOU(' || coalesce(st, 'null') || ' ' || coalesce(t1::text, 'null') || ')' end)::text);

  -- K. Revezamento: a última vez conta jogou e "não apareceu"; a mesma partida não grava duas vezes.
  insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, is_test)
  values (u, 'jogou', 1, now() - interval '2 days', true);
  insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, is_test)
  values (u, 'nao_apareceu', null, now() - interval '1 hour', true);
  begin
    insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, is_test)
    values (u, 'jogou', 1, now(), true);
    r := array_append(r, 'K_partida_unica=FALHOU(gravou)'::text);
  exception when unique_violation then
    r := array_append(r, 'K_partida_unica=ok'::text);
  end;
  select ultima into t1 from public.party_ultima_vez(array[u, u2], true) where user_id = u;
  select count(*) into n from public.party_ultima_vez(array[u, u2], true) where user_id = u2;
  r := array_append(r, ('K_ultima_vez=' || case when t1 > now() - interval '2 hours' and n = 0 then 'ok' else 'FALHOU' end)::text);

  -- L. Logado não grava participação (a vez na fila não se forja pelo navegador).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    insert into public.party_participacoes (user_id, kind, dota_match_id, played_at, is_test)
    values (u, 'jogou', 2, now() - interval '30 days', true);
    r := array_append(r, 'L_logado_grava_participacao=FALHOU(gravou)'::text);
  exception when others then
    r := array_append(r, 'L_logado_grava_participacao=ok'::text);
  end;
  reset role;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end;
$$;
