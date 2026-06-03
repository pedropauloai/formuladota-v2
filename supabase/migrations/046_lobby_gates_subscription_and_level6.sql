-- 046 — Regras de acesso ao serviço de lobbies (Pedro 2026-06-03):
--   CRIAR sala  = assinatura ativa (sem bypass de admin — peterppa testa como user comum).
--   ENTRAR sala = nível 6 (doutrinado) OU saldo de permissão (5 acertos = 1).
-- Substitui o gate por tier/doutrina da migration 044. Aplicado em prod via MCP em 2026-06-03.

-- CRIAR: exige assinatura ativa. SEM is_admin() de propósito (validar o fluxo real).
drop policy if exists "create lobby by tier" on public.lobbies;
create policy "create lobby requires subscription" on public.lobbies
  for insert with check (
    auth.uid() = created_by
    and is_user_active(auth.uid())
    and exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and status in ('authorized', 'cancelled')
        and next_payment_date is not null
        and next_payment_date > now()
    )
  );

-- ENTRAR: nível 6 OU permissão. SEM bypass de admin.
drop policy if exists "join lobby by tier" on public.lobby_players;
create policy "join lobby level6 or permission" on public.lobby_players
  for insert with check (
    auth.uid() = user_id
    and is_user_active(auth.uid())
    and (
      exists (
        select 1 from public.user_levels
        where user_id = auth.uid() and current_level >= 6
      )
      or public.available_match_permissions(auth.uid()) >= 1
    )
  );
