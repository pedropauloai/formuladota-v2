-- 053 — RPC get_honor_score (pacote admin aprovado Pedro 2026-06-12)
--
-- O detalhe de usuário no admin tinha honor_score hardcoded = 0 (TODO
-- esquecido) — o critério de elegibilidade PRO "honor >= 800" nunca passava.
-- Esta função agrega o honor_ledger do usuário (soma de deltas).

create or replace function public.get_honor_score(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.honor_ledger
  where user_id = p_user_id;
$$;

grant execute on function public.get_honor_score(uuid) to authenticated;
