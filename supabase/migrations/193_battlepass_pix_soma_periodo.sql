-- 193_battlepass_pix_soma_periodo.sql: o Pix de 30 dias soma a partir do fim de qualquer período do
-- Battlepass que ainda vale (19/11/2026). Antes, quem cancelava a renovação do cartão e pagava um Pix
-- antes do fim perdia os dias que sobravam do cartão. Spec: docs/battlepass/spec.md.

create or replace function public.battlepass_pix_confirmar(
  p_payment_id uuid, p_mp_payment_id text, p_paid_cents integer, p_gateway jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.subscription_payments%rowtype;
  v_sub public.subscriptions%rowtype;
  v_other timestamptz;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_pay from public.subscription_payments
   where id = p_payment_id and method = 'pix' for update;
  if not found or v_pay.status not in ('pendente', 'expirado', 'cancelado') then
    return 'nada';
  end if;
  select * into v_sub from public.subscriptions where id = v_pay.subscription_id for update;
  -- O fim mais distante entre os períodos do Battlepass da pessoa que ainda valem (cartão cancelado incluído).
  select max(s.next_payment_date) into v_other
    from public.subscriptions s
   where s.user_id = v_sub.user_id and s.tier = 'battlepass' and s.is_test = v_sub.is_test
     and s.status in ('authorized', 'cancelled') and s.next_payment_date > now();
  v_start := greatest(now(), coalesce(v_sub.next_payment_date, now()), coalesce(v_other, now()));
  v_end := v_start + interval '30 days';
  begin
    update public.subscriptions
       set status = 'authorized', started_at = coalesce(started_at, now()), next_payment_date = v_end,
           cancelled_at = null, updated_at = now()
     where id = v_sub.id;
  exception when unique_violation then
    update public.subscription_payments
       set status = 'em_revisao', paid_at = now(), paid_amount_cents = p_paid_cents,
           mp_payment_id = p_mp_payment_id, gateway_payload = p_gateway, updated_at = now()
     where id = v_pay.id;
    return 'revisar';
  end;
  update public.subscription_payments
     set status = 'pago', paid_at = now(), paid_amount_cents = p_paid_cents, mp_payment_id = p_mp_payment_id,
         period_start = v_start, period_end = v_end, gateway_payload = p_gateway, updated_at = now()
   where id = v_pay.id;
  return 'pago';
end;
$$;

revoke all on function public.battlepass_pix_confirmar(uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.battlepass_pix_confirmar(uuid, text, integer, jsonb) to service_role;
