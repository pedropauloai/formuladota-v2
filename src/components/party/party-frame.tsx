"use client";
// PartyFrame — frame do grupo estilo cliente Dota 2 (2026-06-30). Fica NA LINHA
// do card do mini-perfil (canto inferior esquerdo), à direita da sua foto: 4 slots
// SEMPRE visíveis. Vazio = skeleton com "+" (abre lista de amigos pra convidar);
// preenchido = avatar do membro (líder pode expulsar/passar liderança). Quando em
// grupo, aparece um controle de sair. A BUSCA em grupo é pelo fluxo normal (JOGAR
// DOTA) — qualquer membro que buscar coloca todos na fila.

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Crown, UserMinus, LogOut, Check, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { usePartyRealtime } from "@/lib/realtime/use-party-realtime";
import { heartbeatQueue } from "@/app/queue/actions";
import {
  fetchMyParty,
  leaveParty,
  kickPartyMember,
  transferPartyLeader,
  inviteToParty,
} from "@/actions/party";
import type { PartyView } from "@/lib/queries/party";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  currentUserId: string;
  initialParty: PartyView | null;
  /** Amigos aceitos — pra lista de convite no slot vazio. */
  friends: FriendListEntry[];
}

const MAX_OTHERS = 4; // você + 4 = grupo de 5

export function PartyFrame({ currentUserId, initialParty, friends }: Props) {
  const t = useTranslations("party");
  const [party, setParty] = useState<PartyView | null>(initialParty);
  const [openMenu, setOpenMenu] = useState<string | null>(null); // slot index / "leave"
  const [, startTransition] = useTransition();

  const [prevInit, setPrevInit] = useState(initialParty);
  if (prevInit !== initialParty) {
    setPrevInit(initialParty);
    setParty(initialParty);
  }

  usePartyRealtime(party?.partyId ?? null, () => {
    void fetchMyParty().then(setParty);
  });

  // Heartbeat enquanto o grupo busca (cada cliente prova atividade).
  const inQueue = party?.inQueue ?? false;
  useEffect(() => {
    if (!inQueue) return;
    void heartbeatQueue();
    const id = setInterval(() => void heartbeatQueue(), 15000);
    return () => clearInterval(id);
  }, [inQueue]);

  // Outros membros (exclui você) — preenchem os 4 slots na ordem.
  const others = (party?.members ?? []).filter((m) => m.userId !== currentUserId);
  const isLeader = party?.isLeader ?? false;
  const memberIds = new Set((party?.members ?? []).map((m) => m.userId));

  return (
    <div className="flex items-center gap-1.5">
      {inQueue && (
        <span
          className="flex size-2.5 shrink-0 rounded-full bg-play-primary animate-pulse"
          title={t("searchingInGroup")}
          aria-label={t("searchingInGroup")}
        />
      )}
      {Array.from({ length: MAX_OTHERS }).map((_, i) => {
        const member = others[i];
        if (member) {
          return (
            <MemberSlot
              key={member.userId}
              name={member.name}
              avatar={member.avatarUrl}
              isLeaderMember={member.userId === party?.leaderId}
              canManage={isLeader}
              open={openMenu === `m${i}`}
              onToggle={() => setOpenMenu((o) => (o === `m${i}` ? null : `m${i}`))}
              onKick={() =>
                startTransition(() => {
                  setOpenMenu(null);
                  void kickPartyMember(member.userId);
                })
              }
              onTransfer={() =>
                startTransition(() => {
                  setOpenMenu(null);
                  void transferPartyLeader(member.userId);
                })
              }
            />
          );
        }
        return (
          <EmptySlot
            key={`empty-${i}`}
            open={openMenu === `e${i}`}
            onToggle={() => setOpenMenu((o) => (o === `e${i}` ? null : `e${i}`))}
            friends={friends.filter((f) => !memberIds.has(f.friendUserId))}
            onClose={() => setOpenMenu(null)}
          />
        );
      })}

      {/* Sair do grupo — só quando há grupo (você + ≥1). */}
      {party && others.length >= 0 && party.members.length > 1 && (
        <button
          type="button"
          onClick={() => startTransition(() => void leaveParty())}
          title={t("leaveGroup")}
          aria-label={t("leaveGroup")}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm text-text-faded transition-colors hover:text-error"
        >
          <LogOut size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Slot preenchido — avatar do membro + popover de gestão (só líder).
function MemberSlot({
  name,
  avatar,
  isLeaderMember,
  canManage,
  open,
  onToggle,
  onKick,
  onTransfer,
}: {
  name: string;
  avatar: string | null;
  isLeaderMember: boolean;
  canManage: boolean;
  open: boolean;
  onToggle: () => void;
  onKick: () => void;
  onTransfer: () => void;
}) {
  const t = useTranslations("party");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, onToggle);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={canManage ? onToggle : undefined}
        title={name}
        aria-label={name}
        className={`relative block rounded-sm ${canManage ? "cursor-pointer" : "cursor-default"}`}
      >
        <UserAvatar
          src={avatar ?? undefined}
          alt={name}
          fallback={name.slice(0, 2).toUpperCase()}
          size="md"
          ringColor={isLeaderMember ? "brand" : null}
        />
        {isLeaderMember && (
          <Crown
            size={10}
            className="absolute -right-1 -top-1 text-gold drop-shadow"
            aria-label={t("leader")}
          />
        )}
      </button>
      {open && canManage && (
        <div className="absolute bottom-full left-1/2 z-[var(--z-system)] mb-2 -translate-x-1/2 w-40 overflow-hidden rounded-md border border-border-strong bg-bg-deep shadow-2xl shadow-black/70">
          <p className="truncate border-b border-border-subtle px-3 py-2 font-display text-[13px] font-semibold text-text-display">
            {name}
          </p>
          <button
            type="button"
            onClick={onTransfer}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-display text-[13px] text-text-body hover:bg-bg-elevated transition-colors"
          >
            <Crown size={14} className="text-gold" aria-hidden="true" /> {t("transferLeader")}
          </button>
          <button
            type="button"
            onClick={onKick}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-display text-[13px] text-error hover:bg-error/10 transition-colors"
          >
            <UserMinus size={14} aria-hidden="true" /> {t("kick")}
          </button>
        </div>
      )}
    </div>
  );
}

// Slot vazio — skeleton com "+"; abre lista de amigos pra convidar.
function EmptySlot({
  open,
  onToggle,
  friends,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  friends: FriendListEntry[];
  onClose: () => void;
}) {
  const t = useTranslations("party");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, onClose);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function invite(userId: string) {
    setInvited((s) => new Set(s).add(userId));
    startTransition(async () => {
      const res = await inviteToParty(userId);
      if (!res.success) {
        setInvited((s) => {
          const n = new Set(s);
          n.delete(userId);
          return n;
        });
      }
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={t("inviteToGroup")}
        title={t("inviteToGroup")}
        className={`flex size-10 items-center justify-center rounded-sm border border-dashed transition-colors ${
          open
            ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
            : "border-border-strong text-text-faded hover:border-brand-primary/60 hover:text-brand-primary"
        }`}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-[var(--z-system)] mb-2 -translate-x-1/2 w-56 overflow-hidden rounded-md border border-border-strong bg-bg-deep shadow-2xl shadow-black/70">
          <p className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2 font-display text-[12px] font-bold uppercase tracking-wide text-text-muted">
            <Users size={13} aria-hidden="true" /> {t("inviteFriend")}
          </p>
          <div className="max-h-56 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="px-3 py-4 text-center font-display text-[12px] text-text-faded">
                {t("noFriendsAvailable")}
              </p>
            ) : (
              friends.map((f) => {
                const done = invited.has(f.friendUserId);
                return (
                  <button
                    key={f.friendUserId}
                    type="button"
                    disabled={done}
                    onClick={() => invite(f.friendUserId)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-elevated transition-colors disabled:opacity-70"
                  >
                    <UserAvatar
                      src={f.friendAvatarUrl ?? undefined}
                      alt={f.friendUsername ?? t("friend")}
                      fallback={(f.friendUsername ?? "??").slice(0, 2).toUpperCase()}
                      size="sm"
                    />
                    <span className="flex-1 truncate font-display text-[13px] text-text-body">
                      {f.friendUsername ?? t("friend")}
                    </span>
                    {done ? (
                      <Check size={14} className="text-brand-primary" aria-hidden="true" />
                    ) : (
                      <Plus size={14} className="text-text-faded" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Fecha o popover ao clicar fora.
function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!active) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [active, ref, onOutside]);
}
