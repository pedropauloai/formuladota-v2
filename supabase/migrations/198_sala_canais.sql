-- 198: servidor único do FORMULADOTA (pedido do PPA em 24/11/2026): canais de texto e de voz numa
-- coluna à esquerda, como no Discord. Cada canal é uma sala (voice_rooms) com lugar na lista
-- (channel_position): o canal de voz usa toda a mídia da sala; o canal de texto ('texto') é só o chat,
-- guardado enquanto o canal existir, e herda a moderação, o ritmo, a denúncia, o banimento e a porta
-- dos 18 anos que a sala já tem. Canal fica aberto até o PPA apagar. Modo de voz: 'palco' (a plateia
-- ouve e o dono chama para falar) ou 'livre' (quem entra já fala, como no Discord). Mentoria e party
-- seguem privadas, fora da lista pública.

alter table public.voice_rooms drop constraint if exists voice_rooms_kind_check;
alter table public.voice_rooms add constraint voice_rooms_kind_check check (kind in ('palco', 'mentoria', 'party', 'texto'));

alter table public.voice_rooms add column if not exists channel_position integer;
alter table public.voice_rooms add column if not exists voice_mode text not null default 'palco';
alter table public.voice_rooms drop constraint if exists voice_rooms_channel_position_check;
alter table public.voice_rooms add constraint voice_rooms_channel_position_check check (channel_position is null or channel_position between 0 and 100000);
alter table public.voice_rooms drop constraint if exists voice_rooms_voice_mode_check;
alter table public.voice_rooms add constraint voice_rooms_voice_mode_check check (voice_mode in ('palco', 'livre'));
-- Só canal público entra na lista do servidor, e todo canal de texto está nela.
alter table public.voice_rooms drop constraint if exists voice_rooms_canal_publico_check;
alter table public.voice_rooms add constraint voice_rooms_canal_publico_check check (channel_position is null or kind in ('palco', 'texto'));
alter table public.voice_rooms drop constraint if exists voice_rooms_texto_listado_check;
alter table public.voice_rooms add constraint voice_rooms_texto_listado_check check (kind <> 'texto' or channel_position is not null);

create index if not exists voice_rooms_canais_idx on public.voice_rooms (is_test, channel_position)
  where channel_position is not null and status = 'aberta';

alter table public.voice_room_members drop constraint if exists voice_room_members_joined_via_check;
alter table public.voice_room_members add constraint voice_room_members_joined_via_check
  check (joined_via in ('dono', 'pedido', 'convite', 'party', 'palco', 'texto'));

-- Contexto de uma pessoa numa sala (a 196 com o modo de voz e o lugar na lista).
create or replace function public.voice_room_access(p_room uuid, p_user uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_room public.voice_rooms;
begin
  select * into v_room from public.voice_rooms where id = p_room;
  if not found then
    return jsonb_build_object('room', null);
  end if;
  return jsonb_build_object(
    'room', jsonb_build_object('id', v_room.id, 'kind', v_room.kind, 'title', v_room.title, 'owner_id', v_room.owner_id,
              'status', v_room.status, 'closes_at', v_room.closes_at, 'max_members', v_room.max_members,
              'screen_policy', v_room.screen_policy, 'audience', v_room.audience, 'chat_open', v_room.chat_open,
              'is_test', v_room.is_test, 'voice_mode', v_room.voice_mode, 'channel_position', v_room.channel_position),
    'settings', (select jsonb_build_object('cap_gb_30d', s.cap_gb_30d, 'video_max_kbps', s.video_max_kbps,
                   'palco_max_speakers', s.palco_max_speakers, 'party_screen_enabled', s.party_screen_enabled,
                   'usage_bytes_30d', s.usage_bytes_30d)
                   from public.voice_settings s where s.id = 1),
    'member', (select jsonb_build_object('role', m.role, 'status', m.status, 'muted', m.muted, 'force_muted', m.force_muted,
                 'hand_raised_at', m.hand_raised_at, 'last_seen_at', m.last_seen_at)
                 from public.voice_room_members m where m.room_id = p_room and m.user_id = p_user),
    'age_confirmed', exists (select 1 from public.user_age_confirmations c where c.user_id = p_user),
    'steam_linked', exists (select 1 from public.steam_links l where l.user_id = p_user),
    -- Mesma regra do middleware: banido, ou suspenso dentro do prazo; sem perfil, fecha.
    'account_blocked', coalesce((select p.behavior_status = 'banned'
                                   or (p.behavior_status = 'suspended' and coalesce(p.suspended_until > now(), false))
                                   from public.profiles p where p.id = p_user), true),
    'banned_by_owner', exists (select 1 from public.voice_bans b where b.owner_id = v_room.owner_id and b.user_id = p_user),
    'party_now', exists (select 1 from public.store_bookings bk
                          where bk.user_id = p_user and bk.is_test = v_room.is_test and bk.queue_state = 'na_party'),
    'battlepass', coalesce(public.battlepass_ativo(p_user, v_room.is_test), false),
    -- Lugares: quem está online agora (batimento nos últimos 30 s), sem contar a própria pessoa.
    'online_others', (select count(*) from public.voice_room_members m
                       where m.room_id = p_room and m.status = 'ativo' and m.user_id <> p_user
                         and m.last_seen_at > now() - interval '30 seconds'),
    'speakers', (select count(*) from public.voice_room_members m
                  where m.room_id = p_room and m.status = 'ativo' and m.role = 'falante')
  );
end;
$$;
revoke all on function public.voice_room_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.voice_room_access(uuid, uuid) to service_role;

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
    select r.id, r.kind, r.title, r.channel_position, r.voice_mode, r.audience, r.owner_id, r.chat_open, r.created_at
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
      'o', c.owner_id, 'c', c.chat_open,
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

-- As salas privadas que a pessoa vê na lista (mentoria em que é membro ativo, a party da live em que
-- ela está agora, e todas as do dono), com quantos estão nelas. Banido ou tirado da sala não vê.
create or replace function public.voice_private_rooms(p_user uuid, p_is_test boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'k', r.kind, 't', r.title, 'o', r.owner_id,
      'n', (select count(*) from public.voice_room_members m
             where m.room_id = r.id and m.status = 'ativo' and m.last_seen_at > now() - interval '30 seconds'))
      order by r.created_at desc), '[]'::jsonb)
    from public.voice_rooms r
   where r.kind in ('mentoria', 'party') and r.status = 'aberta' and r.is_test = p_is_test and r.closes_at > now()
     and (
       r.owner_id = p_user
       or (
         not exists (select 1 from public.voice_bans b where b.owner_id = r.owner_id and b.user_id = p_user)
         and not exists (select 1 from public.voice_room_members x
                          where x.room_id = r.id and x.user_id = p_user and x.status = 'expulso')
         and (
           (r.kind = 'mentoria' and exists (select 1 from public.voice_room_members x
                                             where x.room_id = r.id and x.user_id = p_user and x.status = 'ativo'))
           or (r.kind = 'party' and exists (select 1 from public.store_bookings bk
                                             where bk.user_id = p_user and bk.is_test = r.is_test and bk.queue_state = 'na_party'))
         )
       )
     );
$$;
revoke all on function public.voice_private_rooms(uuid, boolean) from public, anon, authenticated;
grant execute on function public.voice_private_rooms(uuid, boolean) to service_role;
