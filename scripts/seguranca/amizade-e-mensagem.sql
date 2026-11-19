-- Teste de regressão das regras de amizade e de mensagem direta (migration 168).
-- Usa dois jogadores reais que não são amigos e termina SEMPRE num erro proposital (RESULTADO: ...),
-- então a transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/amizade-e-mensagem.sql
do $$
declare
  x uuid;
  y uuid;
  fid uuid;
  conv uuid;
  n int;
  r text[] := '{}';
  ok boolean;
begin
  select a.id, b.id into x, y
  from public.profiles a
  join public.profiles b on b.id > a.id
  where not coalesce(a.is_admin, false) and not coalesce(b.is_admin, false)
    and not exists (
      select 1 from public.friendships f
      where least(f.requester_id, f.addressee_id) = least(a.id, b.id)
        and greatest(f.requester_id, f.addressee_id) = greatest(a.id, b.id))
  limit 1;
  if x is null then raise exception 'RESULTADO: sem par de teste'; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);

  -- A. Criar a amizade já aceita (sem o outro concordar) tem de falhar.
  begin
    insert into public.friendships (requester_id, addressee_id, status) values (x, y, 'accepted') returning id into fid;
    r := array_append(r, ('A_insere_aceita=FALHOU(gravou)')::text);
    delete from public.friendships where id = fid;
  exception when others then
    r := array_append(r, ('A_insere_aceita=ok')::text);
  end;

  -- B. Aceitar o próprio pedido tem de falhar.
  insert into public.friendships (requester_id, addressee_id, status) values (x, y, 'pending') returning id into fid;
  begin
    update public.friendships set status = 'accepted' where id = fid;
    get diagnostics n = row_count;
    r := array_append(r, (('B_auto_aceite=FALHOU(' || n || ' linha)'))::text);
    update public.friendships set status = 'pending' where id = fid;
  exception when others then
    r := array_append(r, ('B_auto_aceite=ok')::text);
  end;

  -- C. Controle: quem recebeu o pedido aceita.
  perform set_config('request.jwt.claims', json_build_object('sub', y, 'role', 'authenticated')::text, true);
  begin
    update public.friendships set status = 'accepted' where id = fid;
    get diagnostics n = row_count;
    r := array_append(r, ((case when n = 1 then 'C_aceite_legitimo=ok' else 'C_aceite_legitimo=FALHOU(0 linha)' end))::text);
  exception when others then
    r := array_append(r, (('C_aceite_legitimo=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- J. "Visto há" do amigo aparece para o outro.
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.my_friends_presence() p where p.user_id = y;
    r := array_append(r, ((case when n = 1 then 'J_presenca=ok' else 'J_presenca=FALHOU(' || n || ')' end))::text);
  exception when others then
    r := array_append(r, (('J_presenca=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- D. Controle: amigos trocam mensagem direta.
  conv := public.dm_get_or_create_conversation(y);
  begin
    insert into public.dm_messages (conversation_id, sender_id, body) values (conv, x, 'teste');
    r := array_append(r, ('D_dm_entre_amigos=ok')::text);
  exception when others then
    r := array_append(r, (('D_dm_entre_amigos=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- E. Y bloqueia X: o bloqueio fica no nome de Y.
  perform set_config('request.jwt.claims', json_build_object('sub', y, 'role', 'authenticated')::text, true);
  update public.friendships set status = 'blocked' where id = fid;
  begin
    select (blocked_by = y) into ok from public.friendships where id = fid;
    r := array_append(r, ((case when ok then 'E_bloqueio_com_dono=ok' else 'E_bloqueio_com_dono=FALHOU' end))::text);
  exception when others then
    r := array_append(r, (('E_bloqueio_com_dono=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- F. Quem foi bloqueado não se desbloqueia.
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  begin
    update public.friendships set status = 'accepted' where id = fid;
    get diagnostics n = row_count;
    r := array_append(r, (('F_desbloqueio_pelo_bloqueado=FALHOU(' || n || ' linha)'))::text);
    perform set_config('request.jwt.claims', json_build_object('sub', y, 'role', 'authenticated')::text, true);
    update public.friendships set status = 'blocked' where id = fid;
    perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  exception when others then
    r := array_append(r, ('F_desbloqueio_pelo_bloqueado=ok')::text);
  end;

  -- G. Quem foi bloqueado não apaga o bloqueio.
  begin
    delete from public.friendships where id = fid;
    get diagnostics n = row_count;
    r := array_append(r, ((case when n = 0 then 'G_apagar_bloqueio=ok' else 'G_apagar_bloqueio=FALHOU(apagou)' end))::text);
    if n > 0 then
      insert into public.friendships (id, requester_id, addressee_id, status) values (fid, x, y, 'blocked');
    end if;
  exception when others then
    r := array_append(r, (('G_apagar_bloqueio=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- H. Mensagem direta depois do bloqueio não passa.
  begin
    insert into public.dm_messages (conversation_id, sender_id, body) values (conv, x, 'teste 2');
    r := array_append(r, ('H_dm_apos_bloqueio=FALHOU(gravou)')::text);
  exception when others then
    r := array_append(r, ('H_dm_apos_bloqueio=ok')::text);
  end;

  -- I. A conversa com bloqueio sai da lista de conversas.
  begin
    select count(*) into n from public.dm_inbox() i where i.conversation_id = conv;
    r := array_append(r, ((case when n = 0 then 'I_inbox_sem_bloqueado=ok' else 'I_inbox_sem_bloqueado=FALHOU(aparece)' end))::text);
  exception when others then
    r := array_append(r, (('I_inbox_sem_bloqueado=FALHOU(' || sqlerrm || ')'))::text);
  end;

  -- K. Amizade desfeita (quem bloqueou apaga a linha): a conversa também some e não reabre.
  perform set_config('request.jwt.claims', json_build_object('sub', y, 'role', 'authenticated')::text, true);
  delete from public.friendships where id = fid;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.dm_inbox() i where i.conversation_id = conv;
    r := array_append(r, (case when n = 0 and public.dm_get_or_create_conversation(y) is null
      then 'K_sem_amizade=ok' else 'K_sem_amizade=FALHOU' end)::text);
  exception when others then
    r := array_append(r, ('K_sem_amizade=FALHOU(' || sqlerrm || ')')::text);
  end;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end $$;
