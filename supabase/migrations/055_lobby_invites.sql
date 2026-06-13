-- 055 — Convites de sala entre amigos (pacote social aprovado Pedro 2026-06-12)
--
-- A ação matadora da lista de amigos: amigo online + você numa sala =
-- convite 1-click. O convidado recebe via Realtime (tabela na publication)
-- e entra com 1 click. Expira naturalmente: convite só vale enquanto a
-- sala existe (FK cascade) e é deletado ao ser respondido.

create table if not exists public.lobby_invites (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 1 convite ativo por (sala, convidado) — reenviar substitui via upsert
  unique (lobby_id, invitee_id)
);

create index if not exists lobby_invites_invitee_idx
  on public.lobby_invites (invitee_id);

alter table public.lobby_invites enable row level security;

-- Convidado e convidante veem o convite
drop policy if exists "participants read lobby invites" on public.lobby_invites;
create policy "participants read lobby invites" on public.lobby_invites
  for select using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Só AMIGOS aceitos podem convidar (anti-spam), e só pra sala em que o
-- convidante está de fato
drop policy if exists "friends send lobby invites" on public.lobby_invites;
create policy "friends send lobby invites" on public.lobby_invites
  for insert with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.lobby_players lp
      where lp.lobby_id = lobby_invites.lobby_id and lp.user_id = auth.uid()
    )
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = invitee_id)
          or (f.addressee_id = auth.uid() and f.requester_id = invitee_id))
    )
  );

-- Convidado (responder) e convidante (cancelar) podem deletar
drop policy if exists "participants delete lobby invites" on public.lobby_invites;
create policy "participants delete lobby invites" on public.lobby_invites
  for delete using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Realtime: convidado recebe push do convite
alter publication supabase_realtime add table public.lobby_invites;
