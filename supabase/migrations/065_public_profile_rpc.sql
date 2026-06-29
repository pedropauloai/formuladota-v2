-- 065 — RPC get_public_profile: dados públicos pra renderizar o /me de QUALQUER user.
--
-- O perfil completo (/me) usa ProfilePage + getProfileForMe (só do próprio user, RLS
-- self em profiles). Pra ver o perfil de OUTRO membro com a MESMA estrutura, este RPC
-- SECURITY DEFINER devolve os campos PÚBLICOS de profiles + identidade Steam + stats
-- da temporada ativa. Mesma forma do getProfileForMe, mas pra qualquer user.
--
-- NÃO retorna nada privado de coaching/edição/fichas. Só pra logados.

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  username             text,
  avatar_url           text,
  avatar_custom_url    text,
  status_message       text,
  hero_portrait_slug   text,
  favorite_heroes      jsonb,
  behavior_status      text,
  doctrine_accepted_at timestamptz,
  last_seen_at         timestamptz,
  steam_persona        text,
  steam_avatar         text,
  steam_id_64          text,
  mmr                  int,
  vitorias             int,
  derrotas             int,
  partidas_total       int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_season int;  -- seasons.id é integer (NÃO uuid)
begin
  if auth.uid() is null then
    return; -- só pra logados
  end if;

  select id into v_season from seasons where active = true limit 1;

  return query
  select
    p.username,
    p.avatar_url,
    p.avatar_custom_url,
    p.status_message,
    p.hero_portrait_slug,
    coalesce(p.favorite_heroes, '[]'::jsonb),
    p.behavior_status::text,
    p.doctrine_accepted_at,
    p.last_seen_at,
    sl.persona,
    sl.avatar_url,
    sl.steam_id_64,
    psm.mmr,
    psm.vitorias,
    psm.derrotas,
    psm.partidas_total
  from profiles p
  left join steam_links sl on sl.user_id = p.id
  left join player_season_mmr psm
         on psm.user_id = p.id and psm.season_id = v_season
  where p.id = p_user_id;
end;
$$;

grant execute on function public.get_public_profile(uuid) to authenticated;
