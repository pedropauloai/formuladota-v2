-- 064 — RPC get_public_mini_profile: dados PÚBLICOS de perfil pro hover card.
--
-- Doutrina anti-anonimato: perfis são públicos pra membros. Mas a RLS de profiles
-- é restritiva (self/admin/coaches) — um membro comum não lê username/avatar/mmr de
-- terceiros direto. Este RPC SECURITY DEFINER retorna SÓ o subconjunto PÚBLICO
-- (identidade Steam, nível, MMR, heróis favoritos) + o status de amizade com o
-- viewer. NUNCA expõe dado privado (email etc. — nem estão em profiles).
--
-- Só pra logados (auth.uid() not null). steam_links e user_levels já são públicos;
-- este RPC unifica e adiciona os campos de profiles sob a barreira de colunas.

create or replace function public.get_public_mini_profile(p_user_id uuid)
returns table (
  user_id         uuid,
  name            text,
  avatar          text,
  steam_id_64     text,
  level           int,
  mmr             int,
  favorite_heroes jsonb,
  friend_status   text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
begin
  if v_viewer is null then
    return; -- só pra logados
  end if;

  return query
  select
    p.id,
    coalesce(sl.persona, p.username, 'Jogador')      as name,
    coalesce(sl.avatar_url, p.avatar_url)            as avatar,
    sl.steam_id_64,
    coalesce(ul.current_level, 1)                    as level,
    p.mmr_atual                                      as mmr,
    coalesce(p.favorite_heroes, '[]'::jsonb)         as favorite_heroes,
    case
      when v_viewer = p.id then 'self'
      else coalesce((
        select case f.status
                 when 'accepted' then 'friends'
                 when 'pending'  then 'pending'
                 when 'blocked'  then 'blocked'
                 else 'none'
               end
        from friendships f
        where (f.requester_id = v_viewer and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = v_viewer)
        limit 1
      ), 'none')
    end                                              as friend_status
  from profiles p
  left join steam_links sl on sl.user_id = p.id
  left join user_levels ul on ul.user_id = p.id
  where p.id = p_user_id;
end;
$$;

grant execute on function public.get_public_mini_profile(uuid) to authenticated;
