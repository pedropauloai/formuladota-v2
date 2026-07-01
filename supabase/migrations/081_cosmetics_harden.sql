-- 081_cosmetics_harden.sql — Endurecimento de segurança da fundação de cosméticos.
-- Correções da revisão adversarial (2026-07-01):
--   C1: grant_cosmetic estava exposta a authenticated/anon pelo EXECUTE default do
--       Postgres (CREATE FUNCTION concede a PUBLIC) → user podia conceder posse
--       arbitrária a si mesmo/terceiros e furar o paywall futuro. REVOGADO.
--   M1: equip_cosmetic não validava MÉRITO no SQL (só no server action TS) → chamada
--       direta de RPC deixava equipar ring de tier superior sem merecer. Agora o
--       mérito é enforced na fonte, lendo user_levels.current_level (materializado).
--   B1: unequip_slot passa a validar o slot.

-- === C1: revoga o EXECUTE público de grant_cosmetic (só service role concede posse) ===
revoke execute on function public.grant_cosmetic(uuid, uuid, text) from public;
revoke execute on function public.grant_cosmetic(uuid, uuid, text) from anon, authenticated;

-- === Helpers de tier (espelham src/lib/levels.ts getTierForLevel) ===================
create or replace function public.fd_tier_for_level(p_level int)
returns text language sql immutable as $$
  select case
    when p_level >= 30 then 'mistico'
    when p_level >= 25 then 'lendario'
    when p_level >= 18 then 'as'
    when p_level >= 12 then 'piloto'
    when p_level >= 6  then 'aprendiz'
    else 'novato' end;
$$;

create or replace function public.fd_tier_rank(p_tier text)
returns int language sql immutable as $$
  select case p_tier
    when 'novato' then 0
    when 'aprendiz' then 1
    when 'piloto' then 2
    when 'as' then 3
    when 'lendario' then 4
    when 'mistico' then 5
    else 0 end;
$$;

-- === M1: equip_cosmetic com validação de MÉRITO no SQL =============================
create or replace function public.equip_cosmetic(p_cosmetic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me        uuid := auth.uid();
  v_slot      text;
  v_req       jsonb;
  v_kind      text;
  v_owns      boolean;
  v_level     int;
  v_min_level int;
  v_need_tier text;
begin
  if v_me is null then raise exception 'não autenticado'; end if;

  select slot, requirement into v_slot, v_req
  from public.cosmetics where id = p_cosmetic_id and active;
  if v_slot is null then raise exception 'cosmético inexistente'; end if;

  v_kind := v_req->>'kind';

  if v_kind = 'locked' then
    -- Pago/concedido: exige posse materializada (grant confiável — webhook/admin).
    select exists(select 1 from public.user_cosmetics
                  where user_id = v_me and cosmetic_id = p_cosmetic_id) into v_owns;
    if not v_owns then raise exception 'cosmético não possuído'; end if;

  elsif v_kind = 'merito' then
    -- Mérito enforced na fonte: nível materializado em user_levels.current_level.
    select coalesce(current_level, 1) into v_level
    from public.user_levels where user_id = v_me;
    if v_level is null then v_level := 1; end if;

    v_min_level := nullif(v_req->>'minLevel', '')::int;
    if v_min_level is not null and v_level < v_min_level then
      raise exception 'nível insuficiente pro cosmético';
    end if;

    v_need_tier := v_req->>'tier';
    if v_need_tier is not null
       and fd_tier_rank(fd_tier_for_level(v_level)) < fd_tier_rank(v_need_tier) then
      raise exception 'tier insuficiente pro cosmético';
    end if;
  end if;
  -- 'free' (e slots do próprio user já possuídos) liberam direto.

  insert into public.user_equipped (user_id, slot, cosmetic_id)
  values (v_me, v_slot, p_cosmetic_id)
  on conflict (user_id, slot) do update
    set cosmetic_id = excluded.cosmetic_id, equipped_at = now();
end;
$$;

grant execute on function public.equip_cosmetic(uuid) to authenticated;

-- === B1: unequip_slot valida o slot ================================================
create or replace function public.unequip_slot(p_slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_slot not in ('ring','frame','smoke','badge','profile_theme','name_effect','notification_sound','chat_reaction') then
    raise exception 'slot inválido';
  end if;
  delete from public.user_equipped where user_id = auth.uid() and slot = p_slot;
end;
$$;

grant execute on function public.unequip_slot(text) to authenticated;
