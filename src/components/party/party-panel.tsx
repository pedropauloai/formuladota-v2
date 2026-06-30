"use client";
// PartyPanel — frame do grupo estilo Dota (overlay top-left), montado no shell.
// Pacote social 2026-06-30. Mostra membros (até 5), funções do membro logado,
// chat do grupo e o controle de BUSCA EM GRUPO (mesmo time). Só o líder inicia a
// busca; todos veem o estado. Enquanto busca, cada cliente manda heartbeat (a
// formação/ready-check/redirect reusa o fluxo global existente).

import { useEffect, useState, useTransition } from "react";
import {
  Crown,
  LogOut,
  Loader2,
  Search,
  MessageSquare,
  UserMinus,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { usePartyRealtime } from "@/lib/realtime/use-party-realtime";
import { heartbeatQueue, type QueueGameMode, type QueueRole } from "@/app/queue/actions";
import {
  fetchMyParty,
  leaveParty,
  kickPartyMember,
  transferPartyLeader,
  updateMyPartyRoles,
  enterPartyQueue,
  leavePartyQueue,
} from "@/actions/party";
import { PartyChat } from "./party-chat";
import type { PartyView } from "@/lib/queries/party";

const ROLE_ORDER: QueueRole[] = [
  "safelane",
  "midlane",
  "offlane",
  "support",
  "support_dedicated",
];
const ROLE_LABEL: Record<QueueRole, string> = {
  safelane: "Hard",
  midlane: "Mid",
  offlane: "Off",
  support: "Sup 4",
  support_dedicated: "Sup 5",
};
const MODE_LABEL: Record<QueueGameMode, string> = {
  all_pick: "All Pick",
  captains_mode: "Captains",
  random_draft: "Random",
  single_draft: "Single",
};
const MODE_ORDER: QueueGameMode[] = ["all_pick", "captains_mode", "random_draft", "single_draft"];

interface Props {
  currentUserId: string;
  initialParty: PartyView | null;
}

export function PartyPanel({ currentUserId, initialParty }: Props) {
  const [party, setParty] = useState<PartyView | null>(initialParty);
  const [chatOpen, setChatOpen] = useState(false);
  const [modes, setModes] = useState<QueueGameMode[]>(["all_pick"]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sincroniza com o server fetch (padrão "adjusting state during render").
  const [prevInit, setPrevInit] = useState(initialParty);
  if (prevInit !== initialParty) {
    setPrevInit(initialParty);
    setParty(initialParty);
  }

  usePartyRealtime(party?.partyId ?? null, () => {
    void fetchMyParty().then(setParty);
  });

  // Heartbeat de liveness enquanto o grupo busca (cada membro pinga a própria entry).
  const inQueue = party?.inQueue ?? false;
  useEffect(() => {
    if (!inQueue) return;
    void heartbeatQueue();
    const id = setInterval(() => void heartbeatQueue(), 15000);
    return () => clearInterval(id);
  }, [inQueue]);

  if (!party) return null;

  const me = party.members.find((m) => m.userId === currentUserId);
  const isLeader = party.isLeader;
  const nameById: Record<string, string> = Object.fromEntries(
    party.members.map((m) => [m.userId, m.name])
  );

  function toggleMode(mode: QueueGameMode) {
    setModes((prev) =>
      prev.includes(mode) ? prev.filter((x) => x !== mode) : [...prev, mode]
    );
  }

  function toggleMyRole(role: QueueRole) {
    if (!me) return;
    const next = me.roles.includes(role)
      ? me.roles.filter((r) => r !== role)
      : [...me.roles, role];
    // Atualiza local na hora; persiste async.
    setParty((p) =>
      p
        ? {
            ...p,
            members: p.members.map((m) =>
              m.userId === currentUserId ? { ...m, roles: next } : m
            ),
          }
        : p
    );
    startTransition(() => {
      void updateMyPartyRoles(next);
    });
  }

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      const res = await enterPartyQueue(modes.length ? modes : ["all_pick"]);
      if (!res.success) setError(res.error);
    });
  }

  function handleCancel() {
    startTransition(() => {
      void leavePartyQueue();
    });
  }

  return (
    <div className="pointer-events-auto fixed left-4 top-[72px] xl:top-[80px] z-[var(--z-overlay)] hidden w-[280px] flex-col gap-2 rounded-md border border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/70 lg:flex">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-display text-[13px] font-bold uppercase tracking-wide text-text-display">
          Grupo <span className="text-text-muted">({party.members.length}/5)</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-label={chatOpen ? "Fechar chat do grupo" : "Abrir chat do grupo"}
            className={`p-1 transition-colors ${chatOpen ? "text-brand-primary" : "text-text-faded hover:text-text-display"}`}
          >
            <MessageSquare size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => { void leaveParty(); })}
            aria-label="Sair do grupo"
            title="Sair do grupo"
            className="p-1 text-text-faded hover:text-error transition-colors"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Membros */}
      <div className="flex flex-col gap-1">
        {party.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-2 rounded px-1 py-0.5">
            <UserAvatar
              src={m.avatarUrl ?? undefined}
              alt={`Avatar de ${m.name}`}
              fallback={m.name.slice(0, 2).toUpperCase()}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 truncate font-display text-[13px] font-semibold text-text-body">
                {m.name}
                {m.userId === party.leaderId && (
                  <Crown size={11} className="text-gold shrink-0" aria-label="Líder" />
                )}
              </p>
            </div>
            {/* Líder pode passar liderança / expulsar os outros. */}
            {isLeader && m.userId !== currentUserId && (
              <>
                <button
                  type="button"
                  onClick={() => startTransition(() => { void transferPartyLeader(m.userId); })}
                  aria-label={`Passar liderança pra ${m.name}`}
                  title="Passar liderança"
                  className="p-0.5 text-text-faded hover:text-gold transition-colors"
                >
                  <Crown size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => { void kickPartyMember(m.userId); })}
                  aria-label={`Expulsar ${m.name}`}
                  title="Expulsar"
                  className="p-0.5 text-text-faded hover:text-error transition-colors"
                >
                  <UserMinus size={13} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Minhas funções */}
      <div>
        <p className="mb-1 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
          Suas funções
        </p>
        <div className="flex flex-wrap gap-1">
          {ROLE_ORDER.map((role) => {
            const active = me?.roles.includes(role) ?? false;
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleMyRole(role)}
                disabled={inQueue}
                aria-pressed={active}
                className={`rounded border px-1.5 py-0.5 font-display text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  active
                    ? "border-brand-primary bg-brand-primary/20 text-text-display"
                    : "border-border-subtle text-text-muted hover:border-border-strong"
                }`}
              >
                {ROLE_LABEL[role]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modos (só o líder escolhe) */}
      {isLeader && (
        <div>
          <p className="mb-1 font-display text-[11px] font-semibold uppercase tracking-wide text-text-faded">
            Modos
          </p>
          <div className="flex flex-wrap gap-1">
            {MODE_ORDER.map((mode) => {
              const active = modes.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleMode(mode)}
                  disabled={inQueue}
                  aria-pressed={active}
                  className={`rounded border px-1.5 py-0.5 font-display text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? "border-play-primary bg-play-primary/20 text-text-display"
                      : "border-border-subtle text-text-muted hover:border-border-strong"
                  }`}
                >
                  {MODE_LABEL[mode]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="font-display text-[12px] font-semibold text-error">{error}</p>
      )}

      {/* Busca em grupo */}
      {inQueue ? (
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center justify-center gap-2 rounded border border-error/50 bg-error/10 px-3 py-2 font-display text-[13px] font-bold uppercase tracking-wide text-error hover:bg-error/20 transition-colors"
        >
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Buscando — cancelar
        </button>
      ) : isLeader ? (
        <button
          type="button"
          onClick={handleSearch}
          disabled={!modes.length}
          className="flex items-center justify-center gap-2 rounded border border-play-primary bg-play-primary/15 px-3 py-2 font-display text-[13px] font-bold uppercase tracking-wide text-play-primary hover:bg-play-primary/25 transition-colors disabled:opacity-50"
        >
          <Search size={14} aria-hidden="true" />
          Buscar em grupo
        </button>
      ) : (
        <p className="rounded border border-border-subtle bg-bg-elevated/60 px-3 py-2 text-center font-display text-[12px] font-semibold text-text-muted">
          Aguardando o líder iniciar a busca
        </p>
      )}

      {/* Chat do grupo (colapsável) */}
      {chatOpen && (
        <div className="border-t border-border-subtle pt-2">
          <PartyChat
            partyId={party.partyId}
            currentUserId={currentUserId}
            nameById={nameById}
          />
        </div>
      )}
    </div>
  );
}
