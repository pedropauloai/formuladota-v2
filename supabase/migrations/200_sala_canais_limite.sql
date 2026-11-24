-- 200: a lista de canais traz o limite de pessoas de cada canal (max_members), para a árvore mostrar
-- "Party 1 · 3/5" (pedido do PPA em 24/11/2026: canais de voz para formar grupo e jogar junto, com
-- limite opcional; 5 é uma party do Dota). Só troca a função.

-- A lista de canais do servidor, igual para todos (o servidor guarda por 5 s): cada canal aberto com
-- quem está nele agora, no máximo 12 por canal de voz (dono, quem fala, depois a plateia), com
-- microfone, tela e nome. Canal de texto não mostra quem está lendo.
create or replace function public.voice_channel_list(p_is_test boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with canais as (
    select r.id, r.kind, r.title, r.channel_position, r.voice_mode, r.audience, r.owner_id, r.chat_open, r.max_members, r.created_at
      from public.voice_rooms r
     where r.channel_position is not null and r.status = 'aberta' and r.is_test = p_is_test and r.closes_at > now()
  ),
  online as (
    select m.room_id, m.user_id, m.role, m.muted,
           exists (select 1 from public.voice_room_sessions s
                     join public.voice_room_tracks t on t.session_id = s.id
                    where s.room_id = m.room_id and s.user_id = m.user_id and s.closed_at is null
                      and t.closed_at is null and t.tipo = 'tela') as tela,
           row_number() over (partition by m.room_id
                              order by case m.role when 'dono' then 0 when 'falante' then 1 else 2 end, m.created_at) as rn,
           count(*) over (partition by m.room_id) as n
      from public.voice_room_members m
      join canais c on c.id = m.room_id and c.kind <> 'texto'
     where m.status = 'ativo' and m.last_seen_at > now() - interval '30 seconds'
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', c.id, 'k', c.kind, 't', c.title, 'p', c.channel_position, 'v', c.voice_mode, 'a', c.audience,
      'o', c.owner_id, 'c', c.chat_open, 'x', c.max_members,
      'n', coalesce((select max(o.n) from online o where o.room_id = c.id), 0),
      'm', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'u', o.user_id, 'r', o.role, 'mu', o.muted, 's', nullif(o.tela, false),
               'nm', i.username, 'av', i.avatar_url, 'sp', sl.persona, 'sa', sl.avatar_url)) order by o.rn)
              from online o
              left join public.public_player_identities i on i.id = o.user_id
              left join public.steam_links sl on sl.user_id = o.user_id
             where o.room_id = c.id and o.rn <= 12)
    )) order by c.channel_position, c.created_at), '[]'::jsonb)
    from canais c;
$$;
revoke all on function public.voice_channel_list(boolean) from public, anon, authenticated;
grant execute on function public.voice_channel_list(boolean) to service_role;
