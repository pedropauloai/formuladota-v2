// Contexto de toda chamada à sala: quem é, a flag, a sala, o vínculo e a decisão de acesso.
// Uma regra só (decideRoomAccess) para entrar, para o batimento e para cada chamada ao SFU.

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { decideRoomAccess } from "./acesso";
import {
  getBirthDate,
  getMember,
  getRoom,
  getSettings,
  hasSteamLink,
  isAccountBlocked,
  isInPartyNow,
  onlineMemberIds,
  type Db,
  type RoomRecord,
  type VoiceSettings,
} from "./dados-sala";
import type { AccessDecision, MemberInfo } from "./tipos";

/** Quem deu batimento nos últimos 15 s está na sala. */
export const ONLINE_MS = 15_000;

export interface CallContext {
  db: Db;
  now: Date;
  userId: string | null;
  room: RoomRecord | null;
  member: MemberInfo | null;
  settings: VoiceSettings | null;
  onlineIds: string[];
  decision: AccessDecision;
}

type AuthUser = { id: string; identities?: Array<{ provider: string }> | null; app_metadata?: { provider?: string } } | null;

function hasDiscord(user: AuthUser): boolean {
  if (!user) return false;
  return (user.identities ?? []).some((i) => i.provider === "discord") || user.app_metadata?.provider === "discord";
}

export async function loadCallContext(roomId: string): Promise<CallContext> {
  const now = new Date();
  const db = createServiceClient();
  const supabase = await createClient();
  const [{ data }, flags] = await Promise.all([supabase.auth.getUser(), getFeatureFlags()]);
  const user = data.user as AuthUser;
  const userId = user?.id ?? null;
  const empty = { db, now, userId, room: null, member: null, settings: null, onlineIds: [] };
  const early = decideRoomAccess({
    flagOn: flags.sala_voz, now, room: null, userId, identityOk: false, blocked: false,
    birthDate: null, member: null, inPartyNow: false, onlineOthers: 0, alreadyOnline: false,
  });
  if (!early.ok && early.code !== "sala_inexistente") return { ...empty, decision: early };

  const room = await getRoom(db, roomId);
  if (!room || !userId) return { ...empty, decision: { ok: false, code: "sala_inexistente" } };
  const since = new Date(now.getTime() - ONLINE_MS);
  const [member, birthDate, steam, blocked, inParty, onlineIds, settings] = await Promise.all([
    getMember(db, room.id, userId),
    getBirthDate(db, userId),
    hasSteamLink(db, userId),
    isAccountBlocked(db, userId, now),
    room.kind === "party" ? isInPartyNow(db, userId, room.isTest) : Promise.resolve(false),
    onlineMemberIds(db, room.id, since),
    getSettings(db),
  ]);
  const decision = decideRoomAccess({
    flagOn: flags.sala_voz,
    now,
    room,
    userId,
    identityOk: hasDiscord(user) || steam,
    blocked,
    birthDate,
    member,
    inPartyNow: inParty,
    onlineOthers: onlineIds.filter((id) => id !== userId).length,
    alreadyOnline: onlineIds.includes(userId),
  });
  return { db, now, userId, room, member, settings, onlineIds, decision };
}
