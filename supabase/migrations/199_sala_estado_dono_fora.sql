-- 199: no estado comum da sala, "online" vem sempre, verdadeiro ou falso. O dono entra na lista mesmo
-- fora da sala, e com a linha dele sem batimento (nunca entrou, ou saiu e o batimento foi limpo) a
-- comparação dava nulo, a chave sumia e o servidor recusava o estado: erro 500 para todos na sala
-- enquanto o dono estivesse fora. Visto nas capturas dos canais em 24/11/2026. Só troca a função.

create or replace function public.voice_room_snapshot(p_room uuid, p_chat_after bigint)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'room', (select jsonb_build_object('status', r.status, 'chat_open', r.chat_open, 'closes_at', r.closes_at)
               from public.voice_rooms r where r.id = p_room),
    'members', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'u', m.user_id, 'r', m.role, 'm', m.muted, 'f', nullif(m.force_muted, false), 'h', m.hand_raised_at,
        'on', coalesce(m.last_seen_at > now() - interval '30 seconds', false))) order by m.created_at)
      from public.voice_room_members m
     where m.room_id = p_room and m.status = 'ativo'
       and (m.last_seen_at > now() - interval '30 seconds' or m.role = 'dono')), '[]'::jsonb),
    'tracks', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        's', t.session_id, 'u', s.user_id, 'n', t.track_name, 'k', t.kind, 't', t.tipo, 'q', t.quality)))
      from public.voice_room_tracks t
      join public.voice_room_sessions s on s.id = t.session_id
     where s.room_id = p_room and s.closed_at is null and t.closed_at is null and t.tipo is not null), '[]'::jsonb),
    -- Sem p_chat_after (0), as 30 últimas; com ele, só as novas (no máximo 30).
    'chat', coalesce((select jsonb_agg(c.x order by c.id) from (
        select msg.id, jsonb_build_object('i', msg.id, 'u', msg.user_id, 'b', msg.body, 'a', msg.created_at) as x
          from public.voice_room_messages msg
         where msg.room_id = p_room and msg.deleted_at is null and msg.id > coalesce(p_chat_after, 0)
         order by msg.id desc
         limit 30) c), '[]'::jsonb),
    'deleted', coalesce((select jsonb_agg(msg.id)
      from public.voice_room_messages msg
     where msg.room_id = p_room and msg.deleted_at > now() - interval '10 minutes'), '[]'::jsonb),
    'removed', coalesce((select jsonb_agg(m.user_id)
      from public.voice_room_members m
     where m.room_id = p_room and m.status = 'expulso' and m.removed_at > now() - interval '10 minutes'), '[]'::jsonb)
  );
$$;
revoke all on function public.voice_room_snapshot(uuid, bigint) from public, anon, authenticated;
grant execute on function public.voice_room_snapshot(uuid, bigint) to service_role;
