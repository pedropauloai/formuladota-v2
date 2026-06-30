"use client";

// ReadyCheckOverlay — popup central "PARTIDA ENCONTRADA" (ready check estilo Dota).
// Quando os 10 fecham, o try_form_match cria uma PROPOSTA (60s). Cada jogador
// aceita; só quando os 10 aceitam o lobby é criado e todos vão pra /partida.
//
// Global (montado na bottom-bar): assina match_proposals (RLS de membership só
// entrega a proposta do próprio user) + fetch inicial. Barra superior decresce em
// 60s; mostra quem já aceitou; toca som ao aparecer. Migration 067.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Swords, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSound } from "@/lib/sound/hooks";
import {
  getMyProposal,
  acceptMatchProposal,
  declineMatchProposal,
  getMatchRouteId,
  type MatchProposal,
  type ProposalMember,
} from "@/app/queue/ready-check-actions";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { MedalPair } from "@/components/ui/medal-pair";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { rankTierToDotaRank } from "@/components/profile/career-stats";
import { getGatedTierForLevel } from "@/lib/levels";

// Sem nº de MMR Valve público — proxy do rank pro gate de honra.
function mmrFromRankTier(rankTier: number | null): number | null {
  if (rankTier == null) return null;
  const medal = Math.floor(rankTier / 10);
  if (medal >= 8) return 6000;
  if (medal === 7) return 5000;
  return 0;
}

const DURATION_MS = 60_000;

// Mapeia a linha crua do realtime (assignments jsonb) → MatchProposal do client.
function mapRow(row: {
  id: string;
  status: string;
  expires_at: string;
  lobby_id: string | null;
  assignments: unknown;
}): MatchProposal {
  const arr = Array.isArray(row.assignments) ? row.assignments : [];
  const members: ProposalMember[] = arr.map((m) => {
    const o = m as Record<string, unknown>;
    return {
      userId: String(o.user_id),
      name: typeof o.name === "string" ? o.name : "Jogador",
      avatar: typeof o.avatar === "string" ? o.avatar : null,
      team: o.team === "dire" ? "dire" : "radiant",
      role: typeof o.role === "string" ? o.role : "",
      accepted: o.accepted === true,
      isTest: o.is_test === true,
      rankTier: typeof o.rank_tier === "number" ? o.rank_tier : null,
      leaderboardRank: typeof o.leaderboard_rank === "number" ? o.leaderboard_rank : null,
      level: typeof o.level === "number" ? o.level : 1,
    };
  });
  return {
    id: row.id,
    status: row.status as MatchProposal["status"],
    expiresAt: row.expires_at,
    lobbyId: row.lobby_id,
    members,
  };
}

export function ReadyCheckOverlay() {
  const router = useRouter();
  const play = useSound();
  const [userId, setUserId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<MatchProposal | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  // Lobby confirmado: aguardando o bot Steam gravar o steam_lobby_id pra montar a URL.
  const [confirmedLobby, setConfirmedLobby] = useState<string | null>(null);
  const soundedFor = useRef<string | null>(null);

  // userId do viewer (pra saber se EU já aceitei).
  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Partida confirmada → entra no estado "criando lobby" (aguarda o steam_lobby_id).
  const goToMatch = useCallback((lobbyId: string) => {
    setProposal(null);
    setConfirmedLobby(lobbyId);
  }, []);

  // Aguarda o bot gravar o dota_match_id (o ID real da Valve, gravado junto com o
  // steam_lobby_id ao criar o lobby) e redireciona pra URL canônica
  // /partida/[dota_match_id]. Janela de ~30s (tempo de carga do Dota); no timeout
  // cai pro id interno (a página resolve dota_match_id, steam_lobby_id e UUID).
  useEffect(() => {
    if (!confirmedLobby) return;
    let alive = true;
    let tries = 0;
    const poll = async () => {
      tries += 1;
      const { routeId } = await getMatchRouteId(confirmedLobby);
      if (!alive) return;
      if (routeId) {
        router.push(`/partida/${routeId}`);
      } else if (tries >= 27) {
        router.push(`/partida/${confirmedLobby}`); // fallback: id interno
      } else {
        timer = setTimeout(poll, 1100);
      }
    };
    let timer = setTimeout(poll, 800);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [confirmedLobby, router]);

  // Fetch inicial + realtime das propostas (RLS entrega só a do próprio user).
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void getMyProposal().then((p) => {
      if (alive && p) setProposal(p);
    });

    const supabase = createClient();
    const channel = supabase
      .channel(`ready-check-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_proposals" },
        (payload) => {
          const row = payload.new as Parameters<typeof mapRow>[0] | undefined;
          if (!row || !row.id) return;
          if (row.status === "confirmed" && row.lobby_id) {
            goToMatch(row.lobby_id);
          } else if (row.status === "pending") {
            setProposal(mapRow(row));
          } else if (row.status === "cancelled") {
            setProposal((cur) => (cur && cur.id === row.id ? null : cur));
          }
        }
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, goToMatch]);

  // Contador (tick 250ms) enquanto há proposta pendente.
  useEffect(() => {
    if (!proposal) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [proposal]);

  // Som "partida encontrada" ao aparecer uma proposta nova.
  useEffect(() => {
    if (proposal && soundedFor.current !== proposal.id) {
      soundedFor.current = proposal.id;
      play("reward");
    }
  }, [proposal, play]);

  // Partida aceita pelos 10 → aguardando o bot criar o lobby Steam.
  if (confirmedLobby) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-[var(--z-takeover)] flex items-center justify-center bg-bg-deep/90 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-md border-2 border-play-primary bg-bg-base px-10 py-8 shadow-[var(--shadow-cinematic)]">
          <Loader2 size={36} className="animate-spin text-play-primary" aria-hidden="true" />
          <p className="font-display text-lg font-bold uppercase tracking-wide text-text-display">
            Partida aceita!
          </p>
          <p className="font-body text-sm text-text-muted">Criando o lobby no Dota 2…</p>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  const remainingMs = Math.max(0, new Date(proposal.expiresAt).getTime() - now);
  const pct = Math.max(0, Math.min(100, (remainingMs / DURATION_MS) * 100));
  const secondsLeft = Math.ceil(remainingMs / 1000);
  if (remainingMs <= 0) return null; // expirou — o cron cancela no servidor

  const me = proposal.members.find((m) => m.userId === userId);
  const iAccepted = me?.accepted ?? false;
  const acceptedCount = proposal.members.filter((m) => m.accepted).length;
  const total = proposal.members.length;
  const radiant = proposal.members.filter((m) => m.team === "radiant");
  const dire = proposal.members.filter((m) => m.team === "dire");

  function accept() {
    if (!proposal) return;
    const id = proposal.id;
    startTransition(async () => {
      const { lobbyId } = await acceptMatchProposal(id);
      if (lobbyId) goToMatch(lobbyId);
      else
        setProposal((cur) =>
          cur
            ? {
                ...cur,
                members: cur.members.map((m) =>
                  m.userId === userId ? { ...m, accepted: true } : m
                ),
              }
            : cur
        );
    });
  }

  function decline() {
    if (!proposal) return;
    const id = proposal.id;
    setProposal(null);
    startTransition(async () => {
      await declineMatchProposal(id);
    });
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-takeover)] flex items-center justify-center bg-bg-deep/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-md border-2 border-play-primary bg-bg-base shadow-[var(--shadow-cinematic)] animate-in zoom-in-95 duration-150">
        {/* Barra superior decrescente (60s). */}
        <div className="h-1.5 w-full bg-bg-elevated">
          <div
            className="h-full bg-play-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide text-text-display">
              <Swords size={20} className="text-play-primary" aria-hidden="true" />
              Partida encontrada
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-play-primary">
              {secondsLeft}s
            </span>
          </div>

          <p className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-gold">
            {acceptedCount}/{total} aceitaram
          </p>

          {/* Os 10, por time. */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <TeamList title="Iluminados" accent="text-[#00C466]" members={radiant} meId={userId} />
            <TeamList title="Temidos" accent="text-brand-primary" members={dire} meId={userId} />
          </div>

          {/* Ações. */}
          {iAccepted ? (
            <div className="flex items-center justify-center gap-2 rounded-md border border-play-primary/40 bg-play-primary/10 px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-play-primary">
              <Check size={16} aria-hidden="true" />
              Você aceitou — aguardando os outros…
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={accept}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-4 py-3 font-display text-base font-bold uppercase tracking-[0.15em] text-text-display transition-all hover:brightness-110 disabled:opacity-60"
              >
                {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} aria-hidden="true" />}
                Aceitar
              </button>
              <button
                type="button"
                onClick={decline}
                disabled={pending}
                aria-label="Recusar"
                className="flex items-center justify-center rounded-md border border-border-strong px-4 text-text-muted transition-colors hover:border-error/60 hover:text-error disabled:opacity-60"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          )}
          {!iAccepted && (
            <p className="mt-2 text-center font-body text-xs text-text-faded">
              Recusar (ou ignorar) gera um cooldown curto de fila.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamList({
  title,
  accent,
  members,
  meId,
}: {
  title: string;
  accent: string;
  members: ProposalMember[];
  meId: string | null;
}) {
  return (
    <div>
      <p className={`mb-2 font-display text-xs font-bold uppercase tracking-wide ${accent}`}>
        {title}
      </p>
      <ul className="space-y-1.5">
        {members.map((m) => {
          const dotaRank = rankTierToDotaRank(m.rankTier, m.leaderboardRank) ?? "herald";
          const honorRank = getGatedTierForLevel(m.level, mmrFromRankTier(m.rankTier));
          return (
            <li
              key={m.userId}
              className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 ${
                m.accepted
                  ? "border-play-primary/40 bg-play-primary/5"
                  : "border-border-subtle bg-bg-elevated/40"
              }`}
            >
              <UserHoverCard
                userId={m.userId}
                className={`flex min-w-0 flex-1 items-center gap-2 ${m.accepted ? "" : "opacity-60"}`}
              >
                {/* Avatar com anel de XP + badge de nível. */}
                <XpAvatarRing
                  src={m.avatar}
                  alt={m.name}
                  fallback={m.name.slice(0, 2).toUpperCase()}
                  level={m.level}
                  pct={0}
                  size={30}
                />
                <span className="min-w-0 flex-1 truncate font-body text-xs text-text-body">
                  {m.userId === meId ? "Você" : m.name}
                </span>
              </UserHoverCard>
              {/* Par de medalhas SKILL + HONRA. */}
              <MedalPair dotaRank={dotaRank} honorRank={honorRank} size="sm" />
              {m.accepted ? (
                <Check size={14} className="shrink-0 text-play-primary" aria-hidden="true" />
              ) : (
                <Loader2 size={13} className="shrink-0 animate-spin text-text-faded" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
