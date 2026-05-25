"use client";

// Card único de PRO no feed vertical do dashboard. Todos os PROs são cards
// iguais — sem hierarquia arbitrária. Cliente lê de cima a baixo e escolhe.
//
// Composição:
//   - Header: <UserAvatar> + nome + medalhas SKILL+HONOR + headline + status fila
//   - Slots em miniatura (4 mini-slots da próxima PT) + waiting count
//   - CTA contextual (Entrar / Sair / Sem ficha / Em outra fila)
//
// Refatorado para Design System V2.5 (task #70 — 2026-05-25):
//   - Wrapper <article> ad-hoc → <Card variant="elevated">
//   - <img> cru → <UserAvatar size="md" ringColor="play"|null>
//   - Adicionado par canônico <DotaRankMedal> + <HonorRankMedal> (pattern /me, /coaches)
//   - <button> cru → <Button variant="primary|secondary|ghost|cinematic">
//   - Tokens semânticos (success/warning/text-text-display/etc) — zero hex

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Clock,
  Users,
  Play,
  ArrowLeftFromLine,
  Coins,
  Loader2,
  Crown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { BoardCoach, BoardEntry } from "./queue-board";
import { joinCoachQueue, leaveCoachQueue } from "@/components/landing/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";

// ---------------------------------------------------------------------------
// Helpers de tier (mesmo padrão de /me/page.tsx e /coaches/[slug]/page.tsx)
// ---------------------------------------------------------------------------

// Mapeia MMR Valve → DotaRank V2.5 (escala oficial Valve, mesma de /me)
function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
  if (mmr == null) return "herald";
  if (mmr >= 9000) return "immortal-top-100";
  if (mmr >= 6000) return "immortal";
  if (mmr >= 5000) return "divine";
  if (mmr >= 4000) return "ancient";
  if (mmr >= 3000) return "legend";
  if (mmr >= 2000) return "archon";
  if (mmr >= 1500) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// TODO(schema): integrar tier real do coach quando ProLiveStatus expor
// honor_tier (hoje schema BoardCoach não traz). Todos PROs são Mestre+ por
// modelo de admissão — fallback seguro pra "mestre".
function coachHonorRank(_coach: BoardCoach): HonorRank {
  return "mestre";
}

interface Props {
  coach: BoardCoach;
  entries: BoardEntry[];
  viewerUserId: string;
  fichaBalance: number;
  fichaPackageId: string | null;
  /** entryId do viewer NESTE PRO se estiver na fila dele. */
  myEntryIdHere: string | null;
  /** entryId em OUTRO PRO se viewer estiver na fila de outro. */
  myEntryIdElsewhere: string | null;
  /** coach username onde viewer está (pra contexto na mensagem). */
  otherCoachUsername: string | null;
  isAdmin: boolean;
  /** Stats opcionais (PTs hoje, etc) — apenas se já carregadas. */
  ptsHoje?: number;
  alunosHoje?: number;
}

export function ProQueueCard({
  coach,
  entries,
  viewerUserId,
  fichaBalance,
  fichaPackageId,
  myEntryIdHere,
  myEntryIdElsewhere,
  otherCoachUsername,
  isAdmin,
  ptsHoje = 0,
  alunosHoje = 0,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Optimistic state — espelha props mas user pode flip imediato pra UI
  // responder em 0ms. Sincroniza com server via realtime (push) ou rollback.
  const [optimisticInQueue, setOptimisticInQueue] = useState<boolean | null>(
    null
  );

  const effectiveInQueue =
    optimisticInQueue !== null ? optimisticInQueue : !!myEntryIdHere;

  // 4 slots em miniatura (próxima PT) + waitingCount
  const slotsCount = coach.filaMaxVagas;
  const activeSlots = entries.slice(0, slotsCount);
  const waitingList = entries.slice(slotsCount);
  const waitingExtra = waitingList.length;

  // Default: expandido se viewer está na fila deste PRO (vê própria posição).
  const [expanded, setExpanded] = useState<boolean>(!!myEntryIdHere);

  // Medalhas — par canônico SKILL + HONOR (pattern V2.5 de /me e /coaches)
  const dotaRank = mmrToDotaRank(coach.mmrAtual);
  const honorRank = coachHonorRank(coach);

  function handleJoin() {
    setError(null);
    // Optimistic: UI vira "Na fila" instantaneamente (0ms percebido)
    setOptimisticInQueue(true);
    if (!expanded) setExpanded(true);
    startTransition(async () => {
      const res = await joinCoachQueue(coach.coachId);
      if (!res.success) {
        // Rollback: server rejeitou
        setOptimisticInQueue(false);
        setError(res.error);
        return;
      }
      // Sucesso: força refresh dos Server Components pra sincronizar
      // props reais (myEntryIdHere, fichaBalance, etc). Antes do realtime.
      router.refresh();
    });
  }

  function handleLeave() {
    if (!myEntryIdHere) return;
    if (!window.confirm("Sair da fila deste PRO?")) return;
    setError(null);
    // Optimistic: UI vira "Entrar" instantaneamente
    setOptimisticInQueue(false);
    startTransition(async () => {
      const res = await leaveCoachQueue(myEntryIdHere);
      if (!res.success) {
        // Rollback: action falhou
        setOptimisticInQueue(true);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  // Border destacada por estado: âmbar (viewer na fila), success (aberta), neutra (fechada)
  const stateBorderCls = effectiveInQueue
    ? "border-warning/60 bg-warning/5"
    : coach.filaAberta
      ? "border-success/40 bg-success/[0.03]"
      : "border-border-subtle";

  return (
    <Card
      variant="elevated"
      className={`relative ${stateBorderCls}`}
      aria-label={`PRO ${coach.username ?? "anônimo"}, ${coach.filaAberta ? "fila aberta" : "fila fechada"}`}
    >
      {/* Ring pulsante quando fila aberta — marcador "ao vivo" */}
      {coach.filaAberta && (
        <span
          className="absolute -top-1.5 -right-1.5 flex size-3.5"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-3.5 rounded-full bg-success" />
        </span>
      )}

      {/* Header — identidade do PRO com avatar + medalhas SKILL+HONOR */}
      <header className="flex items-start gap-4">
        <UserAvatar
          src={coach.avatarUrl ?? undefined}
          alt={coach.username ?? "PRO"}
          fallback={(coach.username ?? "PR").slice(0, 2)}
          size="lg"
          ringColor={coach.filaAberta ? "play" : null}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-brand-primary" aria-hidden="true" />
            <h3 className="font-display text-lg uppercase tracking-wide text-text-display truncate xl:text-2xl">
              {coach.username ?? "PRO"}
            </h3>
          </div>
          {coach.mmrAtual && (
            <p className="mt-0.5 font-display text-sm font-semibold text-text-body xl:text-sm">
              {coach.mmrAtual.toLocaleString("pt-BR")} MMR
            </p>
          )}
          {coach.headline && (
            <p className="mt-1 font-display text-sm italic text-text-muted line-clamp-1 border-l-2 border-brand-primary/30 pl-2 xl:text-base">
              {coach.headline}
            </p>
          )}

          {/* Par canônico SKILL + HONOR — pattern V2.5 (igual /me e /coaches/[slug]) */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DotaRankMedal
              rank={dotaRank}
              size="sm"
              glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
              calibrationStatus={coach.mmrAtual ? "ranqueado" : "visitante"}
            />
            <HonorRankMedal
              rank={honorRank}
              size="sm"
              calibrationStatus="ranqueado"
            />
          </div>
        </div>
      </header>

      {/* Mini-slots da próxima PT — visual customizado mantido (4 círculos) */}
      <div className="mt-5 flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-2">
          {Array.from({ length: slotsCount }).map((_, idx) => {
            const slot = activeSlots[idx] ?? null;
            if (!slot) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="flex h-12 items-center justify-center rounded border border-dashed border-border-subtle bg-bg-deep/30 xl:h-14"
                  title={`Slot ${idx + 1} livre`}
                >
                  <span className="font-mono text-sm uppercase text-text-faded xl:text-sm">
                    livre
                  </span>
                </div>
              );
            }
            const isViewer = slot.userId === viewerUserId;
            return (
              <div
                key={slot.entryId}
                className={`flex h-12 items-center gap-1.5 rounded px-2 xl:h-14 ${
                  isViewer
                    ? "bg-warning/15 ring-1 ring-warning/50"
                    : "bg-success/10 ring-1 ring-success/30"
                }`}
                title={isViewer ? "VOCÊ" : slot.username ?? ""}
              >
                <UserAvatar
                  src={slot.avatarUrl ?? undefined}
                  alt={slot.username ?? ""}
                  fallback={(slot.username ?? "??").slice(0, 2)}
                  size="sm"
                  ringColor={isViewer ? "tier-immortal" : null}
                />
                <span
                  className={`min-w-0 flex-1 truncate font-sans text-sm xl:text-sm ${
                    isViewer ? "font-bold text-warning" : "text-text-body"
                  }`}
                >
                  {isViewer ? "VOCÊ" : slot.username ?? "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Badge "+N aguardando" */}
        {waitingExtra > 0 && (
          <div className="flex h-12 shrink-0 flex-col items-center justify-center rounded bg-warning/15 px-3 xl:h-14">
            <span className="font-display text-base font-bold text-warning xl:text-lg">
              +{waitingExtra}
            </span>
            <span className="font-mono text-sm uppercase tracking-widest text-warning/80">
              espera
            </span>
          </div>
        )}
      </div>

      {/* Footer com stats + status + CTA */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 font-display text-sm font-semibold text-text-body">
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden="true" />
            {entries.length} na fila
          </span>
          {coach.filaAberta && (
            <span className="inline-flex items-center gap-1 text-success">
              <Radio size={12} aria-hidden="true" />
              Fila aberta
            </span>
          )}
          {ptsHoje > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              {ptsHoje} PT{ptsHoje > 1 ? "s" : ""} hoje
              {alunosHoje > 0 && ` · ${alunosHoje} alunos`}
            </span>
          )}
        </div>

        <CtaButton
          myEntryIdHere={myEntryIdHere}
          effectiveInQueue={effectiveInQueue}
          myEntryIdElsewhere={myEntryIdElsewhere}
          otherCoachUsername={otherCoachUsername}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          filaAberta={coach.filaAberta}
          isAdmin={isAdmin}
          pending={pending}
          onJoin={handleJoin}
          onLeave={handleLeave}
        />
      </div>

      {error && (
        <p className="mt-3 rounded border border-error/30 bg-error/5 px-3 py-2 font-mono text-sm text-error">
          {error}
        </p>
      )}

      {/* Toggle expand — só se houver overflow */}
      {waitingExtra > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} aria-hidden="true" />
              Recolher fila
            </>
          ) : (
            <>
              <ChevronDown size={14} aria-hidden="true" />
              Ver fila completa ({waitingExtra} aguardando)
            </>
          )}
        </Button>
      )}

      {/* Waiting list expandida */}
      {expanded && waitingExtra > 0 && (
        <ExpandedWaitingList
          entries={waitingList}
          startPosition={slotsCount + 1}
          viewerUserId={viewerUserId}
        />
      )}
    </Card>
  );
}

// ============== Expanded waiting list ==============

interface WaitingListProps {
  entries: BoardEntry[];
  startPosition: number;
  viewerUserId: string;
}

function ExpandedWaitingList({
  entries,
  startPosition,
  viewerUserId,
}: WaitingListProps) {
  // Snapshot do horário atual — evita Date.now() impure em render
  const [now] = useState(() => Date.now());
  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-bg-deep/30 p-3">
      <p className="mb-3 font-mono text-sm font-semibold uppercase tracking-widest text-warning/80">
        Aguardando próxima rodada
      </p>
      <ul className="space-y-1.5">
        {entries.map((e, idx) => {
          const position = startPosition + idx;
          const isViewer = e.userId === viewerUserId;
          const waitingMinutes = Math.floor(
            (now - new Date(e.joinedAt).getTime()) / 60000
          );
          return (
            <li
              key={e.entryId}
              className={`flex items-center gap-3 rounded px-3 py-2 ${
                isViewer
                  ? "bg-warning/15 ring-1 ring-warning/40"
                  : "hover:bg-bg-elevated"
              }`}
            >
              <span
                className={`w-7 font-mono text-sm font-semibold tabular-nums ${
                  isViewer ? "text-warning" : "text-text-muted"
                }`}
              >
                {position}º
              </span>
              <UserAvatar
                src={e.avatarUrl ?? undefined}
                alt={e.username ?? ""}
                fallback={(e.username ?? "??").slice(0, 2)}
                size="sm"
                ringColor={isViewer ? "tier-immortal" : null}
              />
              <span
                className={`flex-1 truncate font-sans text-sm ${
                  isViewer ? "font-bold text-text-display" : "text-text-body"
                }`}
              >
                {isViewer ? "VOCÊ" : e.username ?? "—"}
              </span>
              {e.ptsToday !== undefined && e.ptsToday > 0 && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 font-mono text-sm font-semibold text-warning">
                  {e.ptsToday}× hoje
                </span>
              )}
              <span className="w-10 text-right font-display text-sm font-semibold text-text-body tabular-nums">
                {waitingMinutes}m
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============== CTA contextual ==============

interface CtaProps {
  myEntryIdHere: string | null;
  /** Estado optimistic (true=na fila, false=fora) que sobrescreve myEntryIdHere visualmente */
  effectiveInQueue: boolean;
  myEntryIdElsewhere: string | null;
  otherCoachUsername: string | null;
  fichaBalance: number;
  fichaPackageId: string | null;
  filaAberta: boolean;
  isAdmin: boolean;
  pending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

function CtaButton({
  effectiveInQueue,
  myEntryIdElsewhere,
  otherCoachUsername,
  fichaBalance,
  fichaPackageId,
  filaAberta,
  isAdmin,
  pending,
  onJoin,
  onLeave,
}: CtaProps) {
  if (isAdmin) {
    return (
      <Link href="/admin/pros">
        <Button variant="cinematic" size="md">
          <Crown size={16} aria-hidden="true" />
          Painel PROs
        </Button>
      </Link>
    );
  }

  if (effectiveInQueue) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onLeave}
        disabled={pending}
        className="border-warning/60 bg-warning/10 text-warning hover:bg-warning/20"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ArrowLeftFromLine size={14} />
        )}
        Sair da fila
      </Button>
    );
  }

  if (myEntryIdElsewhere) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <Button type="button" variant="secondary" size="md" disabled>
          Você está em outra fila
        </Button>
        <p className="font-mono text-sm text-text-faded">
          Saia da fila de {otherCoachUsername ?? "outro PRO"} pra entrar aqui
        </p>
      </div>
    );
  }

  if (!filaAberta) {
    return (
      <Button type="button" variant="secondary" size="md" disabled>
        Fila fechada
      </Button>
    );
  }

  if (fichaBalance === 0) {
    return (
      <Link
        href={fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta"}
      >
        <Button variant="primary" size="md">
          <Coins size={16} aria-hidden="true" />
          Comprar ficha pra entrar
        </Button>
      </Link>
    );
  }

  return (
    <Button
      type="button"
      variant="cinematic"
      size="md"
      onClick={onJoin}
      disabled={pending}
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
      Entrar na fila
    </Button>
  );
}

// ============== Status bar do user (topo do center) ==============

interface StatusBarProps {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  myQueueCount: number;
  prosOnlineCount: number;
}

export function UserStatusBar({
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  myQueueCount,
  prosOnlineCount,
}: StatusBarProps) {
  if (isAdmin) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-brand-primary/40 bg-brand-primary/5 px-4 py-3">
        <div className="flex items-center gap-3 font-mono text-sm text-text-body">
          <Crown size={16} className="text-brand-primary" aria-hidden="true" />
          Admin · saldo ∞ ·{" "}
          <span className="text-success">{prosOnlineCount}</span>{" "}
          {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
        </div>
        <Link
          href="/admin/pros"
          className="font-sans text-sm font-semibold uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          Painel PROs →
        </Link>
      </div>
    );
  }

  if (myQueueCount > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3 font-mono text-sm text-success">
        <Radio size={16} aria-hidden="true" />
        Você está em {myQueueCount}{" "}
        {myQueueCount === 1 ? "fila ativa" : "filas ativas"} ·{" "}
        <span className="text-text-display">{fichaBalance}</span>{" "}
        {fichaBalance === 1 ? "ficha disponível" : "fichas disponíveis"}
      </div>
    );
  }

  if (fichaBalance > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-3 font-mono text-sm text-text-body">
        <Coins size={16} className="text-success" aria-hidden="true" />
        Você tem <span className="text-text-display font-bold">{fichaBalance}</span>{" "}
        {fichaBalance === 1 ? "ficha" : "fichas"} ·{" "}
        {prosOnlineCount > 0
          ? `escolha um PRO abaixo pra entrar`
          : "aguarde algum PRO abrir fila"}
      </div>
    );
  }

  const precoTxt =
    fichaPreco !== null ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}` : "PIX";
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 font-mono text-sm text-text-body">
        <AlertCircle size={16} className="text-warning" aria-hidden="true" />
        Sem fichas · compre 1 por {precoTxt} pra entrar em qualquer fila
      </div>
      {fichaPackageId && (
        <Link href={`/checkout/${fichaPackageId}`}>
          <Button variant="primary" size="sm">
            <Coins size={12} aria-hidden="true" />
            Comprar
          </Button>
        </Link>
      )}
    </div>
  );
}
