-- 196: salas de voz com tela (fase 1 da comunicação, spec em docs/comunicacao/spec.md): a sala
-- pública da live (palco, plateia e chat), a mentoria e a party. O navegador só lê, e a RLS decide o
-- quê: quem grava é o servidor (service role), e a marcação de 18 anos entra só por confirm_adult.
-- A mídia nunca passa pelo banco nem é gravada.

-- Configuração única (linha 1): teto de tráfego, lugares e prazos, editável pelo admin no banco.
create table if not exists public.voice_settings (
  id smallint primary key default 1 check (id = 1),
  cap_gb_30d integer not null default 800 check (cap_gb_30d between 1 and 100000),
  video_max_kbps integer not null default 6000 check (video_max_kbps between 300 and 8000),
  palco_max_members smallint not null default 30 check (palco_max_members between 2 and 200),
  palco_max_speakers smallint not null default 4 check (palco_max_speakers between 0 and 10),
  mentoria_max_members smallint not null default 2 check (mentoria_max_members between 2 and 4),
  party_max_members smallint not null default 6 check (party_max_members between 2 and 10),
  party_screen_enabled boolean not null default false,
  chat_retention_days smallint not null default 30 check (chat_retention_days between 1 and 365),
  alert_level smallint not null default 0 check (alert_level in (0, 50, 80, 100)),
  alert_at timestamptz,
  peak_alert_at timestamptz,
  -- Último consumo estimado dos 30 dias, recalculado pelo cron a cada minuto (o batimento só lê).
  usage_bytes_30d bigint not null default 0 check (usage_bytes_30d >= 0),
  usage_computed_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.voice_settings (id) values (1) on conflict (id) do nothing;

-- A sala: pública da live (palco), de mentoria (um horário pago) ou da party (a live no ar).
create table if not exists public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('palco', 'mentoria', 'party')),
  title text not null check (char_length(title) between 2 and 80),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.store_bookings (id) on delete cascade,
  live_session_id uuid references public.store_live_sessions (id) on delete cascade,
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  max_members smallint not null check (max_members between 2 and 200),
  screen_policy text not null default 'dono' check (screen_policy in ('dono', 'um_por_vez')),
  -- Sala pública: aberta a todos ou só a quem tem o benefício (Battlepass, vaga na party do dia).
  audience text not null default 'todos' check (audience in ('todos', 'beneficio')),
  chat_open boolean not null default true,
  closes_at timestamptz not null,
  -- Convite de uso único para quem comprou a mentoria sem login: só o hash (sha-256) fica aqui.
  invite_token_hash text check (invite_token_hash is null or invite_token_hash ~ '^[0-9a-f]{64}$'),
  invite_used_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (kind <> 'mentoria' or booking_id is not null),
  check (kind <> 'party' or live_session_id is not null)
);
create index if not exists voice_rooms_owner_idx on public.voice_rooms (owner_id);
create index if not exists voice_rooms_booking_idx on public.voice_rooms (booking_id) where booking_id is not null;
create index if not exists voice_rooms_live_idx on public.voice_rooms (live_session_id) where live_session_id is not null;
create index if not exists voice_rooms_open_idx on public.voice_rooms (closes_at) where status = 'aberta';

-- Quem está ou esteve na sala. Na sala pública, ouvinte ouve e assiste; falante foi chamado ao palco.
create table if not exists public.voice_room_members (
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'membro' check (role in ('dono', 'membro', 'falante', 'ouvinte')),
  status text not null default 'ativo' check (status in ('ativo', 'expulso')),
  joined_via text not null check (joined_via in ('dono', 'pedido', 'convite', 'party', 'palco')),
  muted boolean not null default false,
  -- Mutado pelo dono: a pessoa não reabre o microfone até o dono liberar.
  force_muted boolean not null default false,
  hand_raised_at timestamptz,
  last_seen_at timestamptz,
  -- Nome de usuário da credencial de TURN da última entrada: revogada ao expulsar e ao encerrar.
  turn_username text check (turn_username is null or char_length(turn_username) <= 256),
  removed_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists voice_room_members_user_idx on public.voice_room_members (user_id);
create index if not exists voice_room_members_removed_by_idx on public.voice_room_members (removed_by) where removed_by is not null;

-- Banido pelo dono: não entra em nenhuma sala dele até ser desbanido no painel.
create table if not exists public.voice_bans (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (owner_id, user_id)
);
create index if not exists voice_bans_user_idx on public.voice_bans (user_id);
create index if not exists voice_bans_created_by_idx on public.voice_bans (created_by) where created_by is not null;

-- Sessão do SFU de cada pessoa. IP e navegador são o registro de acesso (Marco Civil, art. 15),
-- apagado pelo cron em 6 meses.
create table if not exists public.voice_room_sessions (
  id text primary key check (char_length(id) between 8 and 128 and id ~ '^[A-Za-z0-9_-]+$'),
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ip inet,
  user_agent text check (user_agent is null or char_length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in
    ('saiu', 'nova_sessao', 'expulso', 'sem_batimento', 'sala_encerrada', 'acesso_perdido'))
);
create index if not exists voice_room_sessions_open_idx on public.voice_room_sessions (room_id) where closed_at is null;
create index if not exists voice_room_sessions_room_idx on public.voice_room_sessions (room_id, created_at);
create index if not exists voice_room_sessions_user_idx on public.voice_room_sessions (user_id, created_at desc);

-- Faixa publicada: o tipo vem do SDP da oferta; o rótulo e a qualidade da tela, do cliente.
create table if not exists public.voice_room_tracks (
  session_id text not null references public.voice_room_sessions (id) on delete cascade,
  track_name text not null check (char_length(track_name) between 1 and 128),
  mid text not null check (char_length(mid) between 1 and 32),
  kind text not null check (kind in ('audio', 'video')),
  tipo text check (tipo is null or tipo in ('voz', 'tela', 'tela_audio')),
  quality text check (quality is null or quality in ('leve', 'padrao', 'alta', 'fluida')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  primary key (session_id, track_name),
  check (tipo is null or ((tipo = 'tela') = (kind = 'video')))
);

-- Faixa recebida, com a camada (rid) da tela: é o que a Cloudflare cobra, base da estimativa.
create table if not exists public.voice_room_subscriptions (
  id bigint generated always as identity primary key,
  session_id text not null references public.voice_room_sessions (id) on delete cascade,
  mid text not null check (char_length(mid) between 1 and 32),
  publisher_session_id text not null,
  track_name text not null,
  kind text not null check (kind in ('audio', 'video')),
  rid text check (rid is null or rid in ('f', 'h')),
  rate_kbps integer not null check (rate_kbps between 1 and 20000),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_test boolean not null default false
);
create index if not exists voice_room_subscriptions_started_idx on public.voice_room_subscriptions (started_at);
create index if not exists voice_room_subscriptions_open_idx on public.voice_room_subscriptions (session_id) where ended_at is null;

-- Chat da sala pública, entregue pelo batimento; guardado 30 dias para moderação.
create table if not exists public.voice_room_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);
create index if not exists voice_room_messages_room_idx on public.voice_room_messages (room_id, id desc) where deleted_at is null;
create index if not exists voice_room_messages_user_idx on public.voice_room_messages (user_id, created_at desc);
create index if not exists voice_room_messages_deleted_by_idx on public.voice_room_messages (deleted_by) where deleted_by is not null;
create index if not exists voice_room_messages_created_idx on public.voice_room_messages (created_at);

-- Qualidade e atraso a cada 10 s por pessoa, para o aceite e o diagnóstico (90 dias).
create table if not exists public.voice_room_stats (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id text,
  at timestamptz not null default now(),
  rtt_ms real check (rtt_ms is null or rtt_ms between 0 and 60000),
  jitter_ms real check (jitter_ms is null or jitter_ms between 0 and 60000),
  jitter_buffer_ms real check (jitter_buffer_ms is null or jitter_buffer_ms between 0 and 60000),
  latency_ms real check (latency_ms is null or latency_ms between 0 and 60000),
  packet_loss_pct real check (packet_loss_pct is null or packet_loss_pct between 0 and 100),
  audio_concealed_pct real check (audio_concealed_pct is null or audio_concealed_pct between 0 and 100),
  video_width integer check (video_width is null or video_width between 0 and 8192),
  video_height integer check (video_height is null or video_height between 0 and 8192),
  video_fps real check (video_fps is null or video_fps between 0 and 240),
  video_freeze_ms integer check (video_freeze_ms is null or video_freeze_ms >= 0),
  bytes_received bigint check (bytes_received is null or bytes_received >= 0),
  bytes_sent bigint check (bytes_sent is null or bytes_sent >= 0),
  relay boolean,
  quality_limitation text check (quality_limitation is null or quality_limitation in ('none', 'cpu', 'bandwidth', 'other'))
);
create index if not exists voice_room_stats_room_idx on public.voice_room_stats (room_id, at);
create index if not exists voice_room_stats_user_idx on public.voice_room_stats (user_id);
create index if not exists voice_room_stats_at_idx on public.voice_room_stats (at);

-- Denúncia identificada (ECA Digital, art. 29, § 2º), de pessoa ou de mensagem (com a cópia do texto).
create table if not exists public.voice_room_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.voice_rooms (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid references public.profiles (id) on delete set null,
  message_id bigint references public.voice_room_messages (id) on delete set null,
  message_body text not null default '' check (char_length(message_body) <= 300),
  reason text not null check (reason in
    ('assedio', 'conteudo_sexual', 'menor_em_risco', 'ameaca', 'discriminacao', 'spam', 'outro')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'descartada')),
  resolution text not null default '' check (char_length(resolution) <= 500),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  check (reporter_id is distinct from reported_id)
);
create index if not exists voice_room_reports_room_idx on public.voice_room_reports (room_id);
create index if not exists voice_room_reports_reporter_idx on public.voice_room_reports (reporter_id);
create index if not exists voice_room_reports_reported_idx on public.voice_room_reports (reported_id);
create index if not exists voice_room_reports_message_idx on public.voice_room_reports (message_id) where message_id is not null;
create index if not exists voice_room_reports_reviewer_idx on public.voice_room_reports (reviewed_by) where reviewed_by is not null;
create index if not exists voice_room_reports_open_idx on public.voice_room_reports (created_at) where status in ('aberta', 'em_analise');

-- A marcação "tenho 18 anos ou mais" (decisão do PPA de 23/11/2026), com a data e a versão do texto.
create table if not exists public.user_age_confirmations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  terms_version text not null check (terms_version ~ '^[a-z0-9-]{1,40}$')
);

-- RLS em todas; o navegador só tem SELECT, e a política decide as linhas.
alter table public.voice_settings enable row level security;
alter table public.voice_rooms enable row level security;
alter table public.voice_room_members enable row level security;
alter table public.voice_bans enable row level security;
alter table public.voice_room_sessions enable row level security;
alter table public.voice_room_tracks enable row level security;
alter table public.voice_room_subscriptions enable row level security;
alter table public.voice_room_messages enable row level security;
alter table public.voice_room_stats enable row level security;
alter table public.voice_room_reports enable row level security;
alter table public.user_age_confirmations enable row level security;

revoke all on public.voice_settings, public.voice_rooms, public.voice_room_members, public.voice_bans,
  public.voice_room_sessions, public.voice_room_tracks, public.voice_room_subscriptions, public.voice_room_messages,
  public.voice_room_stats, public.voice_room_reports, public.user_age_confirmations from anon, authenticated;
grant select on public.voice_settings, public.voice_rooms, public.voice_room_members, public.voice_bans,
  public.voice_room_sessions, public.voice_room_tracks, public.voice_room_subscriptions, public.voice_room_messages,
  public.voice_room_stats, public.voice_room_reports, public.user_age_confirmations to authenticated;
revoke all on sequence public.voice_room_subscriptions_id_seq, public.voice_room_stats_id_seq,
  public.voice_room_messages_id_seq from anon, authenticated;

-- Membro ativo da sala. SECURITY DEFINER para a política de uma tabela não consultar a outra pela
-- RLS (a recursão que derrubou as tabelas de party, migration 079).
create or replace function public.is_voice_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.voice_room_members m
     where m.room_id = p_room_id
       and m.user_id = (select auth.uid())
       and m.status = 'ativo'
  );
$$;
revoke all on function public.is_voice_room_member(uuid) from public, anon;
grant execute on function public.is_voice_room_member(uuid) to authenticated, service_role;

drop policy if exists voice_settings_admin on public.voice_settings;
create policy voice_settings_admin on public.voice_settings for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_rooms_read on public.voice_rooms;
create policy voice_rooms_read on public.voice_rooms
  for select to authenticated using (public.is_voice_room_member(id) or (select public.is_admin()));
drop policy if exists voice_room_members_read on public.voice_room_members;
create policy voice_room_members_read on public.voice_room_members
  for select to authenticated using (public.is_voice_room_member(room_id) or (select public.is_admin()));
drop policy if exists voice_bans_admin on public.voice_bans;
create policy voice_bans_admin on public.voice_bans for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_sessions_admin on public.voice_room_sessions;
create policy voice_room_sessions_admin on public.voice_room_sessions for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_tracks_admin on public.voice_room_tracks;
create policy voice_room_tracks_admin on public.voice_room_tracks for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_subscriptions_admin on public.voice_room_subscriptions;
create policy voice_room_subscriptions_admin on public.voice_room_subscriptions for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_messages_admin on public.voice_room_messages;
create policy voice_room_messages_admin on public.voice_room_messages for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_stats_admin on public.voice_room_stats;
create policy voice_room_stats_admin on public.voice_room_stats for select to authenticated using ((select public.is_admin()));
drop policy if exists voice_room_reports_read on public.voice_room_reports;
create policy voice_room_reports_read on public.voice_room_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists user_age_confirmations_read on public.user_age_confirmations;
create policy user_age_confirmations_read on public.user_age_confirmations
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- A pessoa marca, uma vez, que tem 18 anos ou mais; repetir não dá erro nem muda a data.
create or replace function public.confirm_adult(p_terms_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'Entre na sua conta para confirmar a idade.' using errcode = '42501';
  end if;
  if p_terms_version is null or p_terms_version !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'Versão do texto inválida.' using errcode = '22023';
  end if;
  insert into public.user_age_confirmations (user_id, terms_version) values (v_me, p_terms_version)
  on conflict (user_id) do nothing;
end;
$$;
revoke all on function public.confirm_adult(text) from public, anon;
grant execute on function public.confirm_adult(text) to authenticated;

-- Contexto de uma chamada à sala, numa consulta só (spec, ADR-004): a regra em TypeScript decide.
-- Só a service role chama (o servidor passa o usuário já autenticado).
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
    'room', to_jsonb(v_room) - 'invite_token_hash',
    'settings', (select to_jsonb(s) from public.voice_settings s where s.id = 1),
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
    'online', coalesce((select jsonb_agg(m.user_id) from public.voice_room_members m
                         where m.room_id = p_room and m.status = 'ativo' and m.last_seen_at > now() - interval '15 seconds'), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.voice_room_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.voice_room_access(uuid, uuid) to service_role;

-- Batimento (a cada 2 ou 3 s): grava presença, microfone e mão levantada de quem segue ativo e
-- devolve, na mesma ida, membros online com nome e avatar, faixas, bloqueios, faixas recebidas e chat.
create or replace function public.voice_room_tick(p_room uuid, p_user uuid, p_muted boolean, p_hand boolean)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_access jsonb := public.voice_room_access(p_room, p_user);
  v_chat jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(v_access->'room') is distinct from 'object' then
    return v_access;
  end if;
  update public.voice_room_members m
     set last_seen_at = now(),
         muted = p_muted or m.force_muted,
         hand_raised_at = case when p_hand and m.role = 'ouvinte' then coalesce(m.hand_raised_at, now()) else null end
   where m.room_id = p_room and m.user_id = p_user and m.status = 'ativo';
  if v_access->'room'->>'kind' = 'palco' then
    select coalesce(jsonb_agg(x order by (x->>'id')::bigint), '[]'::jsonb) into v_chat from (
      select jsonb_build_object('id', msg.id, 'userId', msg.user_id, 'body', msg.body, 'createdAt', msg.created_at,
               'username', i.username, 'steamPersona', sl.persona) as x
        from public.voice_room_messages msg
        left join public.public_player_identities i on i.id = msg.user_id
        left join public.steam_links sl on sl.user_id = msg.user_id
       where msg.room_id = p_room and msg.deleted_at is null
       order by msg.id desc
       limit 50
    ) t;
  end if;
  return v_access || jsonb_build_object(
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'userId', m.user_id, 'role', m.role, 'muted', m.muted, 'forceMuted', m.force_muted,
        'handRaisedAt', m.hand_raised_at, 'lastSeenAt', m.last_seen_at,
        'username', i.username, 'avatarUrl', i.avatar_url, 'steamPersona', sl.persona, 'steamAvatar', sl.avatar_url)), '[]'::jsonb)
      from public.voice_room_members m
      left join public.public_player_identities i on i.id = m.user_id
      left join public.steam_links sl on sl.user_id = m.user_id
     where m.room_id = p_room and m.status = 'ativo'
       and (m.last_seen_at > now() - interval '15 seconds' or m.role = 'dono')),
    'tracks', (select coalesce(jsonb_agg(jsonb_build_object('sessionId', t.session_id, 'userId', s.user_id, 'trackName', t.track_name,
        'mid', t.mid, 'kind', t.kind, 'tipo', t.tipo, 'quality', t.quality)), '[]'::jsonb)
      from public.voice_room_tracks t
      join public.voice_room_sessions s on s.id = t.session_id
     where s.room_id = p_room and s.closed_at is null and t.closed_at is null),
    'blocked', (select coalesce(jsonb_agg(case when f.requester_id = p_user then f.addressee_id else f.requester_id end), '[]'::jsonb)
      from public.friendships f
     where f.status = 'blocked' and (f.requester_id = p_user or f.addressee_id = p_user)),
    'my_subscriptions', (select coalesce(jsonb_agg(jsonb_build_object('id', sub.id, 'sessionId', sub.session_id, 'mid', sub.mid,
        'publisherSessionId', sub.publisher_session_id, 'trackName', sub.track_name, 'rid', sub.rid)), '[]'::jsonb)
      from public.voice_room_subscriptions sub
      join public.voice_room_sessions s on s.id = sub.session_id
     where s.room_id = p_room and s.user_id = p_user and s.closed_at is null and sub.ended_at is null),
    'chat', v_chat
  );
end;
$$;
revoke all on function public.voice_room_tick(uuid, uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.voice_room_tick(uuid, uuid, boolean, boolean) to service_role;

-- Flag autoritativa: desligada, a sala some para todos, inclusive o admin.
insert into public.feature_flags (key, enabled, label)
values ('sala_voz', false, 'Salas de voz com tela (fase 1 da comunicação)')
on conflict (key) do nothing;
