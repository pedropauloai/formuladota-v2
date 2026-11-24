-- 195: sala de voz com tela (fase 1 da comunicação, spec em docs/comunicacao/spec.md).
-- O navegador só lê, e a RLS decide o quê: quem grava é o servidor (service role), e a data de
-- nascimento entra só por declare_birth_date. A mídia nunca passa pelo banco nem é gravada.

-- Configuração única (linha 1): teto de tráfego e limites, editável pelo admin no banco.
create table if not exists public.voice_settings (
  id smallint primary key default 1 check (id = 1),
  cap_gb_30d integer not null default 800 check (cap_gb_30d between 1 and 1000),
  video_max_kbps integer not null default 4000 check (video_max_kbps between 300 and 8000),
  mentoria_max_members smallint not null default 2 check (mentoria_max_members between 2 and 4),
  party_max_members smallint not null default 6 check (party_max_members between 2 and 10),
  party_screen_enabled boolean not null default false,
  alert_level smallint not null default 0 check (alert_level in (0, 50, 80, 100)),
  alert_at timestamptz,
  peak_alert_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.voice_settings (id) values (1) on conflict (id) do nothing;

-- A sala: de mentoria (um horário pago da agenda) ou da party (a live no ar).
create table if not exists public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mentoria', 'party')),
  title text not null check (char_length(title) between 2 and 80),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.store_bookings (id) on delete cascade,
  live_session_id uuid references public.store_live_sessions (id) on delete cascade,
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  max_members smallint not null check (max_members between 2 and 10),
  screen_policy text not null default 'dono' check (screen_policy in ('dono', 'um_por_vez')),
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

-- Quem pode entrar. Na party, o servidor confere a cada chamada se a pessoa continua na party.
create table if not exists public.voice_room_members (
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'membro' check (role in ('dono', 'membro')),
  status text not null default 'ativo' check (status in ('ativo', 'expulso')),
  joined_via text not null check (joined_via in ('dono', 'pedido', 'convite', 'party')),
  muted boolean not null default false,
  last_seen_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists voice_room_members_user_idx on public.voice_room_members (user_id);
create index if not exists voice_room_members_removed_by_idx on public.voice_room_members (removed_by) where removed_by is not null;

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

-- Faixa publicada: o tipo vem do SDP da oferta; o rótulo, do cliente, e tem de bater com o tipo.
create table if not exists public.voice_room_tracks (
  session_id text not null references public.voice_room_sessions (id) on delete cascade,
  track_name text not null check (char_length(track_name) between 1 and 128),
  mid text not null check (char_length(mid) between 1 and 32),
  kind text not null check (kind in ('audio', 'video')),
  tipo text check (tipo is null or tipo in ('voz', 'tela', 'tela_audio')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  primary key (session_id, track_name),
  check (tipo is null or ((tipo = 'tela') = (kind = 'video')))
);

-- Faixa recebida: é o que a Cloudflare cobra (saída), base da estimativa de custo.
create table if not exists public.voice_room_subscriptions (
  id bigint generated always as identity primary key,
  session_id text not null references public.voice_room_sessions (id) on delete cascade,
  mid text not null check (char_length(mid) between 1 and 32),
  publisher_session_id text not null,
  track_name text not null,
  kind text not null check (kind in ('audio', 'video')),
  rate_kbps integer not null check (rate_kbps between 1 and 20000),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_test boolean not null default false
);
create index if not exists voice_room_subscriptions_started_idx on public.voice_room_subscriptions (started_at);
create index if not exists voice_room_subscriptions_open_idx on public.voice_room_subscriptions (session_id) where ended_at is null;

-- Qualidade a cada 10 s por pessoa, para o aceite e o diagnóstico (90 dias).
create table if not exists public.voice_room_stats (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.voice_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id text,
  at timestamptz not null default now(),
  rtt_ms real check (rtt_ms is null or rtt_ms between 0 and 60000),
  jitter_ms real check (jitter_ms is null or jitter_ms between 0 and 60000),
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

-- Denúncia identificada (ECA Digital, art. 29, § 2º). Sobrevive à sala e às contas, para apuração.
create table if not exists public.voice_room_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.voice_rooms (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_id uuid references public.profiles (id) on delete set null,
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
create index if not exists voice_room_reports_reviewer_idx on public.voice_room_reports (reviewed_by) where reviewed_by is not null;
create index if not exists voice_room_reports_open_idx on public.voice_room_reports (created_at) where status in ('aberta', 'em_analise');

-- Data de nascimento, separada do perfil e usada só para a regra de idade (ECA Digital, art. 13).
create table if not exists public.user_birthdates (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null check (birth_date >= date '1900-01-01'),
  declared_at timestamptz not null default now()
);

-- RLS em todas; o navegador só tem SELECT, e a política decide as linhas.
alter table public.voice_settings enable row level security;
alter table public.voice_rooms enable row level security;
alter table public.voice_room_members enable row level security;
alter table public.voice_room_sessions enable row level security;
alter table public.voice_room_tracks enable row level security;
alter table public.voice_room_subscriptions enable row level security;
alter table public.voice_room_stats enable row level security;
alter table public.voice_room_reports enable row level security;
alter table public.user_birthdates enable row level security;

revoke all on public.voice_settings, public.voice_rooms, public.voice_room_members, public.voice_room_sessions,
  public.voice_room_tracks, public.voice_room_subscriptions, public.voice_room_stats, public.voice_room_reports,
  public.user_birthdates from anon, authenticated;
grant select on public.voice_settings, public.voice_rooms, public.voice_room_members, public.voice_room_sessions,
  public.voice_room_tracks, public.voice_room_subscriptions, public.voice_room_stats, public.voice_room_reports,
  public.user_birthdates to authenticated;
revoke all on sequence public.voice_room_subscriptions_id_seq, public.voice_room_stats_id_seq from anon, authenticated;

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
create policy voice_settings_admin on public.voice_settings
  for select to authenticated using ((select public.is_admin()));

drop policy if exists voice_rooms_read on public.voice_rooms;
create policy voice_rooms_read on public.voice_rooms
  for select to authenticated using (public.is_voice_room_member(id) or (select public.is_admin()));

drop policy if exists voice_room_members_read on public.voice_room_members;
create policy voice_room_members_read on public.voice_room_members
  for select to authenticated using (public.is_voice_room_member(room_id) or (select public.is_admin()));

drop policy if exists voice_room_sessions_admin on public.voice_room_sessions;
create policy voice_room_sessions_admin on public.voice_room_sessions
  for select to authenticated using ((select public.is_admin()));

drop policy if exists voice_room_tracks_admin on public.voice_room_tracks;
create policy voice_room_tracks_admin on public.voice_room_tracks
  for select to authenticated using ((select public.is_admin()));

drop policy if exists voice_room_subscriptions_admin on public.voice_room_subscriptions;
create policy voice_room_subscriptions_admin on public.voice_room_subscriptions
  for select to authenticated using ((select public.is_admin()));

drop policy if exists voice_room_stats_admin on public.voice_room_stats;
create policy voice_room_stats_admin on public.voice_room_stats
  for select to authenticated using ((select public.is_admin()));

drop policy if exists voice_room_reports_read on public.voice_room_reports;
create policy voice_room_reports_read on public.voice_room_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists user_birthdates_read on public.user_birthdates;
create policy user_birthdates_read on public.user_birthdates
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- A pessoa informa a própria data uma vez; a mesma data de novo passa, outra é recusada (só o admin
-- corrige, pelo banco). Aceita de 1900 até quem tem 5 anos, no calendário de São Paulo.
create or replace function public.declare_birth_date(p_birth_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_atual date;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_me is null then
    raise exception 'Entre na sua conta para informar a data de nascimento.' using errcode = '42501';
  end if;
  if p_birth_date is null or p_birth_date < date '1900-01-01' or p_birth_date > (v_hoje - interval '5 years')::date then
    raise exception 'Data de nascimento inválida.' using errcode = '22023';
  end if;
  select b.birth_date into v_atual from public.user_birthdates b where b.user_id = v_me;
  if found then
    if v_atual = p_birth_date then
      return;
    end if;
    raise exception 'A data de nascimento já foi informada e não muda.' using errcode = '42501';
  end if;
  insert into public.user_birthdates (user_id, birth_date) values (v_me, p_birth_date);
end;
$$;
revoke all on function public.declare_birth_date(date) from public, anon;
grant execute on function public.declare_birth_date(date) to authenticated;

-- Flag autoritativa: desligada, a sala some para todos, inclusive o admin.
insert into public.feature_flags (key, enabled, label)
values ('sala_voz', false, 'Sala de voz com tela (fase 1 da comunicação)')
on conflict (key) do nothing;
