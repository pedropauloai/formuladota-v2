-- 079 — Corrige RECURSÃO INFINITA nas policies de party_members/parties.
-- As policies da 015 se referenciavam mutuamente (parties→party_members→parties),
-- estourando "infinite recursion detected in policy for relation party_members" em
-- TODA operação RLS (convite de grupo, chat de grupo, realtime do grupo). Mesmo
-- padrão do fix da migration 037 (profiles): checagem de participação via função
-- SECURITY DEFINER, que bypassa a RLS e QUEBRA o ciclo de recursão.

create or replace function public.is_party_member(p_party uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.party_members
    where party_id = p_party and user_id = auth.uid()
  );
$$;
grant execute on function public.is_party_member(uuid) to authenticated;

create or replace function public.is_party_leader(p_party uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.parties where id = p_party and leader_id = auth.uid()
  );
$$;
grant execute on function public.is_party_leader(uuid) to authenticated;

-- party_members: membro enxerga o roster do próprio grupo (via função definer).
drop policy if exists party_members_select_member on public.party_members;
create policy party_members_select_member on public.party_members
  for select using (user_id = auth.uid() or public.is_party_member(party_id));

drop policy if exists party_members_insert_leader on public.party_members;
create policy party_members_insert_leader on public.party_members
  for insert with check (public.is_party_leader(party_id));

drop policy if exists party_members_delete_self_or_leader on public.party_members;
create policy party_members_delete_self_or_leader on public.party_members
  for delete using (user_id = auth.uid() or public.is_party_leader(party_id));

-- parties: participante enxerga a party (via função definer, sem recursão).
drop policy if exists parties_select_member on public.parties;
create policy parties_select_member on public.parties
  for select using (leader_id = auth.uid() or public.is_party_member(id));

-- party_messages: membro lê/escreve (via função definer).
drop policy if exists "party msg members read" on public.party_messages;
create policy "party msg members read" on public.party_messages
  for select using (public.is_party_member(party_id));

drop policy if exists "party msg members insert" on public.party_messages;
create policy "party msg members insert" on public.party_messages
  for insert with check (sender_id = auth.uid() and public.is_party_member(party_id));

-- party_invites: convidar exige ser membro (via função definer) + amizade aceita.
drop policy if exists "friends send party invites" on public.party_invites;
create policy "friends send party invites" on public.party_invites
  for insert with check (
    auth.uid() = inviter_id
    and public.is_party_member(party_id)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = invitee_id)
          or (f.addressee_id = auth.uid() and f.requester_id = invitee_id))
    )
  );
