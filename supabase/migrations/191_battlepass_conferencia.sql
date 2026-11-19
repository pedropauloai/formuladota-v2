-- 191_battlepass_conferencia.sql: hora da última conferência da assinatura com o Mercado Pago
-- (19/11/2026). O cron do site confere cada cartão do Battlepass no máximo a cada 10 minutos, para
-- a assinatura ativar e renovar mesmo sem o webhook. Spec: docs/battlepass/spec.md.

alter table public.subscriptions add column if not exists checked_at timestamptz;

create index if not exists subscriptions_battlepass_conferir_idx
  on public.subscriptions (is_test, checked_at)
  where tier = 'battlepass' and provider = 'mp' and status in ('pending', 'authorized', 'paused');
