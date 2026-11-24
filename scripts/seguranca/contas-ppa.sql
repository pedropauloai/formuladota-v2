-- Teste de regressão do cadastro das contas do Dota do PPA (migration 197): o servidor lê, e nem o
-- visitante nem a pessoa logada leem ou gravam. Termina SEMPRE num erro proposital (RESULTADO: ...),
-- então a transação inteira volta e nada fica gravado.
-- PASSA quando todos os itens do RESULTADO dizem "=ok"; cada "=FALHOU" é uma regressão.
-- Rodar: node <scratchpad>/sql.mjs nyvbfdsxjpiwgdroptdi file scripts/seguranca/contas-ppa.sql
do $$
declare
  u uuid;
  n int;
  r text[] := '{}';
begin
  select id into u from public.profiles p where not coalesce(p.is_admin, false) order by id limit 1;
  if u is null then raise exception 'RESULTADO: sem jogador de teste'; end if;

  -- Controle: o servidor enxerga as contas cadastradas.
  select count(*) into n from public.ppa_dota_accounts;
  r := array_append(r, 'servidor lê as contas=' || case when n >= 1 then 'ok' else 'FALHOU' end);

  -- Visitante.
  set local role anon;
  begin
    select count(*) into n from public.ppa_dota_accounts;
    r := array_append(r, 'visitante não lê=' || case when n = 0 then 'ok' else 'FALHOU' end);
  exception when others then
    r := array_append(r, 'visitante não lê=ok');
  end;
  begin
    insert into public.ppa_dota_accounts (account_id, label) values (424242, 'invasão');
    r := array_append(r, 'visitante não grava=FALHOU');
  exception when others then
    r := array_append(r, 'visitante não grava=ok');
  end;
  reset role;

  -- Pessoa logada que não é admin.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin
    select count(*) into n from public.ppa_dota_accounts;
    r := array_append(r, 'logado não lê=' || case when n = 0 then 'ok' else 'FALHOU' end);
  exception when others then
    r := array_append(r, 'logado não lê=ok');
  end;
  begin
    insert into public.ppa_dota_accounts (account_id, label) values (434343, 'invasão');
    r := array_append(r, 'logado não grava=FALHOU');
  exception when others then
    r := array_append(r, 'logado não grava=ok');
  end;
  begin
    delete from public.ppa_dota_accounts where account_id = 1667196039;
    get diagnostics n = row_count;
    r := array_append(r, 'logado não apaga=' || case when n = 0 then 'ok' else 'FALHOU' end);
  exception when others then
    r := array_append(r, 'logado não apaga=ok');
  end;
  reset role;

  raise exception 'RESULTADO: %', array_to_string(r, ' ');
end $$;
