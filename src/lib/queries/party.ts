// Read-models do sistema de PARTY/grupo (pacote social 2026-06-30).
//   - getMyParty: snapshot da minha party (membros + identidade + roles + se está
//     na fila) via RPC my_party (SECURITY DEFINER, migration 075).
//   - getMyPartyInvites: convites de grupo recebidos, com identidade de quem
//     convidou (espelha getMyLobbyInvites).
//
// RLS: party_members/parties só pra membros; party_invites só participantes;
// steam_links SELECT público resolve identidade.

import type { createClient } from "@/lib/supabase/server";
import { getSteamIdentityMap, resolveIdentity } from "@/lib/queries/identities";
import type { QueueGameMode, QueueRole } from "@/app/queue/actions";
import type { Database } from "@/types/database";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type MyPartyRow = Database["public"]["Functions"]["my_party"]["Returns"][number];

export interface PartyMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  level: number;
  roles: QueueRole[];
  isLeader: boolean;
  /** Está com entry waiting na fila desta party? */
  inQueue: boolean;
}

export interface PartyView {
  partyId: string;
  leaderId: string;
  gameModes: QueueGameMode[];
  members: PartyMember[];
  /** O viewer é o líder? */
  isLeader: boolean;
  /** A party está buscando partida agora? */
  inQueue: boolean;
}

export interface PartyInviteView {
  id: string;
  partyId: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
}

export interface PartyInviteMemberPreview {
  userId: string;
  name: string;
  avatar: string | null;
}

/** Convite + preview do grupo (quem chamou + quem já está) pro popup central. */
export interface PartyInviteDetailed {
  id: string;
  partyId: string;
  inviterName: string;
  inviterAvatar: string | null;
  members: PartyInviteMemberPreview[];
}

type PartyInviteDetailedRow =
  Database["public"]["Functions"]["party_invites_detailed"]["Returns"][number];

/** Convites recebidos com preview dos membros (RPC SECURITY DEFINER, migration 078). */
export async function getPartyInvitesDetailed(
  supabase: ServerClient
): Promise<PartyInviteDetailed[]> {
  const { data } = await supabase.rpc("party_invites_detailed");
  const rows = (data ?? []) as PartyInviteDetailedRow[];
  return rows.map((r) => ({
    id: r.invite_id,
    partyId: r.party_id,
    inviterName: r.inviter_name,
    inviterAvatar: r.inviter_avatar,
    members: (Array.isArray(r.members) ? r.members : []) as unknown as PartyInviteMemberPreview[],
  }));
}

/** Snapshot da party do user logado (null se não está em nenhuma). */
export async function getMyParty(
  supabase: ServerClient,
  userId: string
): Promise<PartyView | null> {
  const { data } = await supabase.rpc("my_party");
  const rows = (data ?? []) as MyPartyRow[];
  const first = rows[0];
  if (!first) return null;
  const members: PartyMember[] = rows.map((r) => ({
    userId: r.member_id,
    name: r.name,
    avatarUrl: r.avatar,
    level: r.level,
    roles: (Array.isArray(r.roles) ? r.roles : []) as QueueRole[],
    isLeader: r.member_id === r.leader_id,
    inQueue: r.in_queue,
  }));

  return {
    partyId: first.party_id,
    leaderId: first.leader_id,
    gameModes: (Array.isArray(first.game_modes) ? first.game_modes : []) as QueueGameMode[],
    members,
    isLeader: first.leader_id === userId,
    inQueue: members.some((m) => m.inQueue),
  };
}

/** Convites de grupo recebidos pelo user, prontos pra exibir (quem convidou). */
export async function getMyPartyInvites(
  supabase: ServerClient,
  userId: string
): Promise<PartyInviteView[]> {
  const { data: invites } = await supabase
    .from("party_invites")
    .select("id, party_id, inviter_id, created_at")
    .eq("invitee_id", userId)
    .order("created_at", { ascending: false });

  if (!invites || invites.length === 0) return [];

  const inviterIds = [...new Set(invites.map((i) => i.inviter_id))];
  const [{ data: profiles }, steamMap] = await Promise.all([
    supabase.from("profiles").select("id, username, avatar_url").in("id", inviterIds),
    getSteamIdentityMap(supabase, inviterIds),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return invites.map((inv) => {
    const p = profileById.get(inv.inviter_id);
    const ident = resolveIdentity(steamMap, inv.inviter_id, p?.username, p?.avatar_url);
    return {
      id: inv.id,
      partyId: inv.party_id,
      inviterName: ident.name,
      inviterAvatarUrl: ident.avatarUrl,
    };
  });
}
