-- 123_admin_analytics_views.sql — Views de analytics do admin — Pedro 2026-07-04 (FASE 5).
--
-- Substitui o modelo "total do mês corrente" (bug: números resetavam todo dia 1º)
-- por SÉRIES temporais: o dashboard consulta por range arbitrário (este mês,
-- mês passado, 30/90 dias, custom) e filtra por região.
--
-- SEGURANÇA: são dados de negócio — REVOKE de anon/authenticated no fim; só o
-- service_role (páginas /admin, que já validam is_admin server-side) lê.
--
-- ⚠️ PREÇOS HARDCODED nas views de receita/MRR (subscriptions não guarda valor;
-- o preço vive em src/lib/subscriptions/tiers.ts). Se Pedro mudar preço, esta
-- migration precisa de sucessora atualizando os CASE. Plus: 27,90 BRL / 4,99
-- USD / 6,99 EUR · Premium: 97,90 BRL / 17,99 USD / 19,99 EUR.

-- =====================================================================
-- 1. Signups por dia e região
-- =====================================================================
create or replace view public.admin_signups_daily as
select
  date_trunc('day', p.created_at)::date as day,
  p.region,
  count(*)::int as signups
from public.profiles p
group by 1, 2;

-- =====================================================================
-- 2. Usuários ativos por dia e região (proxy: xp_events — todo ganho de
--    XP registra evento; é o sinal de atividade mais fiel que temos)
-- =====================================================================
create or replace view public.admin_active_users_daily as
select
  date_trunc('day', e.created_at)::date as day,
  p.region,
  count(distinct e.user_id)::int as active_users
from public.xp_events e
join public.profiles p on p.id = e.user_id
group by 1, 2;

-- =====================================================================
-- 3. Partidas por dia e região (região herdada do lobby; partida sem
--    lobby — legado/manual — cai em 'BR')
-- =====================================================================
create or replace view public.admin_matches_daily as
select
  date_trunc('day', m.created_at)::date as day,
  coalesce(l.region, 'BR') as region,
  count(*) filter (where m.status = 'realizada')::int as matches_done,
  count(*)::int as matches_total
from public.matches m
left join public.lobbies l on l.id = m.lobby_id
group by 1, 2;

-- =====================================================================
-- 4. Receita por mês, tipo, provedor, região e MOEDA (sem conversão de
--    câmbio — BRL/USD/EUR são linhas separadas, o front soma por moeda).
--    - fichas: receita REALIZADA (purchases pagas)
--    - assinaturas: ESTIMATIVA mensal = assinaturas vigentes no mês × preço
--      do tier (subscriptions não registra cobrança a cobrança)
-- =====================================================================
create or replace view public.admin_revenue_monthly as
with months as (
  select generate_series(
    date_trunc('month', coalesce(
      least(
        (select min(created_at) from public.purchases),
        (select min(started_at) from public.subscriptions)
      ),
      now()
    )),
    date_trunc('month', now()),
    interval '1 month'
  ) as month
),
fichas as (
  select
    date_trunc('month', pu.created_at) as month,
    'fichas'::text as kind,
    coalesce(pu.payment_provider, 'mp') as provider,
    pr.region,
    'BRL'::text as currency,
    sum(pu.preco_pago)::numeric(12,2) as amount
  from public.purchases pu
  join public.profiles pr on pr.id = pu.user_id
  where pu.status = 'pago'
  group by 1, 3, pr.region
),
subs as (
  select
    m.month,
    'assinaturas'::text as kind,
    s.provider,
    pr.region,
    case pr.region when 'BR' then 'BRL' when 'EU' then 'EUR' else 'USD' end as currency,
    sum(
      case pr.region
        when 'BR' then case s.tier when 'premium' then 97.90 else 27.90 end
        when 'EU' then case s.tier when 'premium' then 19.99 else 6.99 end
        else case s.tier when 'premium' then 17.99 else 4.99 end
      end
    )::numeric(12,2) as amount
  from months m
  join public.subscriptions s
    on s.started_at is not null
   and s.started_at < m.month + interval '1 month'
   and (s.cancelled_at is null or s.cancelled_at >= m.month)
   and s.status <> 'pending'
  join public.profiles pr on pr.id = s.user_id
  group by m.month, s.provider, pr.region, currency
)
select * from fichas
union all
select * from subs;

-- =====================================================================
-- 5. Snapshot de assinantes ATIVOS por tier/região/provedor + MRR.
--    Ativo = mesma regra do active_subscription_tier() (cancel híbrido).
-- =====================================================================
create or replace view public.admin_subs_by_tier_region as
select
  pr.region,
  s.tier,
  s.provider,
  case pr.region when 'BR' then 'BRL' when 'EU' then 'EUR' else 'USD' end as currency,
  count(*)::int as subscribers,
  sum(
    case pr.region
      when 'BR' then case s.tier when 'premium' then 97.90 else 27.90 end
      when 'EU' then case s.tier when 'premium' then 19.99 else 6.99 end
      else case s.tier when 'premium' then 17.99 else 4.99 end
    end
  )::numeric(12,2) as mrr
from public.subscriptions s
join public.profiles pr on pr.id = s.user_id
where s.status = 'authorized'
   or (s.status = 'cancelled' and s.next_payment_date > now())
group by pr.region, s.tier, s.provider;

-- =====================================================================
-- Segurança: dados de negócio — só service_role lê (o /admin usa service
-- client e valida is_admin no server). Sem isso, o default privilege do
-- Supabase exporia as views via PostgREST a qualquer logado.
-- =====================================================================
revoke all on public.admin_signups_daily        from anon, authenticated;
revoke all on public.admin_active_users_daily   from anon, authenticated;
revoke all on public.admin_matches_daily        from anon, authenticated;
revoke all on public.admin_revenue_monthly      from anon, authenticated;
revoke all on public.admin_subs_by_tier_region  from anon, authenticated;
