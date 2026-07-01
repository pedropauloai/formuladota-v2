-- 086_credit_ficha_purchase_atomic.sql — Crédito de compra de fichas ATÔMICO (auditoria A1).
-- Antes o webhook fazia 2 writes soltos: UPDATE purchase→'pago' e depois INSERT em
-- ficha_ledger. Se o INSERT falhava, o cliente pagava, a purchase constava 'pago' e o
-- saldo NUNCA era creditado — e o retry do MP não consertava (purchase já não é 'pendente').
-- Esta RPC faz os dois na MESMA transação (plpgsql): se o ledger falha, rollback do
-- UPDATE → purchase segue 'pendente' → o retry do webhook credita corretamente.
-- Idempotente: UPDATE condicional em status='pendente' (webhook duplicado = no-op).

create or replace function public.credit_ficha_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_p record;
begin
  update purchases set status = 'pago'
   where id = p_purchase_id
     and status = 'pendente'
     and payment_provider = 'mercadopago'
   returning id, user_id, partidas_compradas, sessoes_compradas, package_id
   into v_p;

  -- Duplicado / desconhecido / já pago → idempotente (null = "nada a creditar agora").
  if not found then
    return null;
  end if;

  -- Credita fichas (trigger apply_ficha_ledger atualiza user_fichas.balance).
  if v_p.partidas_compradas > 0 then
    insert into ficha_ledger (user_id, delta, source, source_id)
    values (v_p.user_id, v_p.partidas_compradas, 'purchase', v_p.id);
  end if;

  return jsonb_build_object(
    'id', v_p.id,
    'user_id', v_p.user_id,
    'partidas_compradas', v_p.partidas_compradas,
    'sessoes_compradas', v_p.sessoes_compradas,
    'package_id', v_p.package_id
  );
end;
$function$;

-- Só o webhook (service role) credita — nunca o cliente.
revoke execute on function public.credit_ficha_purchase(uuid) from anon, authenticated, public;
