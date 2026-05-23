"use client";

// Card único de PRO no feed vertical do dashboard. Todos os PROs são cards
// iguais — sem hierarquia arbitrária. Cliente lê de cima a baixo e escolhe.
//
// Composição:
//   - Header: avatar + nome + MMR + headline + status fila
//   - Slots em miniatura (4 mini-slots da próxima PT) + waiting count
//   - CTA contextual (Entrar / Sair / Sem ficha / Em outra fila)

import { useState, useTransition } from "react";
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

  // 4 slots em miniatura (próxima PT) + waitingCount
  const slotsCount = coach.filaMaxVagas;
  const activeSlots = entries.slice(0, slotsCount);
  const waitingList = entries.slice(slotsCount);
  const waitingExtra = waitingList.length;

  // Default: expandido se viewer está na fila deste PRO (vê própria posição).
  // Caso contrário colapsado. User pode togglar manual.
  const [expanded, setExpanded] = useState<boolean>(!!myEntryIdHere);

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const res = await joinCoachQueue(coach.coachId);
      if (!res.success) setError(res.error);
    });
  }

  function handleLeave() {
    if (!myEntryIdHere) return;
    if (!window.confirm("Sair da fila deste PRO?")) return;
    setError(null);
    startTransition(async () => {
      await leaveCoachQueue(myEntryIdHere);
    });
  }

  return (
    <article
      className={`relative rounded-md border-2 backdrop-blur-md transition-colors ${
        myEntryIdHere
          ? "border-amber-500/60 bg-amber-500/5"
          : coach.filaAberta
            ? "border-emerald-500/40 bg-emerald-500/[0.03]"
            : "border-[var(--color-border)] bg-[var(--color-card)]/40"
      }`}
    >
      {/* Ring pulsante quando fila aberta */}
      {coach.filaAberta && (
        <span
          className="absolute -top-1.5 -right-1.5 flex size-3.5"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500" />
        </span>
      )}

      <div className="p-5 xl:p-6">
        {/* Header — info do PRO */}
        <header className="flex items-center gap-4">
          {coach.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.avatarUrl}
              alt=""
              className="size-14 shrink-0 rounded-full border-2 border-emerald-500/50 ring-2 ring-emerald-500/20 xl:size-16"
            />
          ) : (
            <div className="size-14 shrink-0 rounded-full border-2 border-emerald-500/50 bg-black/40 xl:size-16" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-[var(--color-brand-red)]" aria-hidden="true" />
              <h3 className="font-display text-lg uppercase tracking-wide text-white truncate xl:text-2xl">
                {coach.username ?? "PRO"}
              </h3>
            </div>
            {coach.mmrAtual && (
              <p className="mt-0.5 font-mono text-xs text-white/70 xl:text-sm">
                {coach.mmrAtual.toLocaleString("pt-BR")} MMR
              </p>
            )}
            {coach.headline && (
              <p className="mt-1 font-serif text-sm italic text-white/60 line-clamp-1 xl:text-base">
                {coach.headline}
              </p>
            )}
          </div>
        </header>

        {/* Mini-slots da próxima PT */}
        <div className="mt-5 flex items-center gap-2">
          <div className="grid flex-1 grid-cols-4 gap-2">
            {Array.from({ length: slotsCount }).map((_, idx) => {
              const slot = activeSlots[idx] ?? null;
              if (!slot) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="flex h-12 items-center justify-center rounded border border-dashed border-white/15 bg-black/20 xl:h-14"
                    title={`Slot ${idx + 1} livre`}
                  >
                    <span className="font-mono text-[10px] uppercase text-white/30 xl:text-xs">
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
                      ? "bg-amber-400/15 ring-1 ring-amber-400/50"
                      : "bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  }`}
                  title={isViewer ? "VOCÊ" : slot.username ?? ""}
                >
                  {slot.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.avatarUrl}
                      alt=""
                      className={`size-7 shrink-0 rounded-full xl:size-8 ${
                        isViewer ? "ring-2 ring-amber-400" : ""
                      }`}
                    />
                  ) : (
                    <div className="size-7 shrink-0 rounded-full bg-white/10 xl:size-8" />
                  )}
                  <span
                    className={`min-w-0 flex-1 truncate font-sans text-[11px] xl:text-xs ${
                      isViewer ? "font-bold text-amber-200" : "text-white/90"
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
            <div className="flex h-12 shrink-0 flex-col items-center justify-center rounded bg-amber-500/15 px-3 xl:h-14">
              <span className="font-display text-base font-bold text-amber-200 xl:text-lg">
                +{waitingExtra}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-amber-300/80">
                espera
              </span>
            </div>
          )}
        </div>

        {/* Footer com stats + status + CTA */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-white/55">
            <span className="inline-flex items-center gap-1">
              <Users size={12} aria-hidden="true" />
              {entries.length} {entries.length === 1 ? "na fila" : "na fila"}
            </span>
            {coach.filaAberta && (
              <span className="inline-flex items-center gap-1 text-emerald-300">
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
          <p className="mt-3 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-300">
            {error}
          </p>
        )}

        {/* Toggle expand — só se houver overflow */}
        {waitingExtra > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-white/10 bg-black/20 py-2 font-mono text-xs uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-colors"
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
          </button>
        )}

        {/* Waiting list expandida */}
        {expanded && waitingExtra > 0 && (
          <ExpandedWaitingList
            entries={waitingList}
            startPosition={slotsCount + 1}
            viewerUserId={viewerUserId}
          />
        )}
      </div>
    </article>
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
  return (
    <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-3">
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">
        Aguardando próxima rodada
      </p>
      <ul className="space-y-1.5">
        {entries.map((e, idx) => {
          const position = startPosition + idx;
          const isViewer = e.userId === viewerUserId;
          const waitingMinutes = Math.floor(
            (Date.now() - new Date(e.joinedAt).getTime()) / 60000
          );
          return (
            <li
              key={e.entryId}
              className={`flex items-center gap-3 rounded px-3 py-2 ${
                isViewer
                  ? "bg-amber-400/15 ring-1 ring-amber-400/40"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`w-7 font-mono text-sm font-semibold tabular-nums ${
                  isViewer ? "text-amber-300" : "text-white/60"
                }`}
              >
                {position}º
              </span>
              {e.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.avatarUrl}
                  alt=""
                  className={`size-7 rounded-full ${
                    isViewer ? "ring-2 ring-amber-400" : "ring-1 ring-white/20"
                  }`}
                />
              ) : (
                <div className="size-7 rounded-full bg-white/10" />
              )}
              <span
                className={`flex-1 truncate font-sans text-sm ${
                  isViewer ? "font-bold text-white" : "text-white/90"
                }`}
              >
                {isViewer ? "VOCÊ" : e.username ?? "—"}
              </span>
              {e.ptsToday !== undefined && e.ptsToday > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-200">
                  {e.ptsToday}× hoje
                </span>
              )}
              <span className="w-10 text-right font-mono text-xs text-white/55 tabular-nums">
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
  myEntryIdHere,
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
  const baseCls =
    "inline-flex items-center justify-center gap-2 rounded-md border-2 px-5 py-2.5 font-display text-sm font-bold uppercase tracking-[0.15em] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 xl:px-6 xl:py-3 xl:text-base";

  if (isAdmin) {
    return (
      <Link
        href="/admin/pros"
        className={`${baseCls} border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] text-white shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50`}
      >
        <Crown size={16} aria-hidden="true" />
        Painel PROs
      </Link>
    );
  }

  if (myEntryIdHere) {
    return (
      <button
        type="button"
        onClick={onLeave}
        disabled={pending}
        className={`${baseCls} border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftFromLine size={14} />}
        Sair da fila
      </button>
    );
  }

  if (myEntryIdElsewhere) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          disabled
          className={`${baseCls} border-white/15 bg-white/5 text-white/40`}
        >
          Você está em outra fila
        </button>
        <p className="font-mono text-[10px] text-white/40">
          Saia da fila de {otherCoachUsername ?? "outro PRO"} pra entrar aqui
        </p>
      </div>
    );
  }

  if (!filaAberta) {
    return (
      <button
        type="button"
        disabled
        className={`${baseCls} border-white/15 bg-white/5 text-white/40`}
      >
        Fila fechada
      </button>
    );
  }

  if (fichaBalance === 0) {
    return (
      <Link
        href={fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta"}
        className={`${baseCls} border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-md shadow-amber-500/40 hover:shadow-amber-400/60`}
      >
        <Coins size={16} aria-hidden="true" />
        Comprar ficha pra entrar
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onJoin}
      disabled={pending}
      className={`${baseCls} border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] text-white shadow-md shadow-emerald-500/40 hover:shadow-emerald-500/60`}
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
      Entrar na fila
    </button>
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
      <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-brand-red)]/40 bg-[var(--color-brand-red)]/5 px-4 py-3">
        <div className="flex items-center gap-3 font-mono text-sm text-white/80">
          <Crown size={16} className="text-[var(--color-brand-red)]" aria-hidden="true" />
          Admin · saldo ∞ ·{" "}
          <span className="text-emerald-300">{prosOnlineCount}</span>{" "}
          {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
        </div>
        <Link
          href="/admin/pros"
          className="font-sans text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white transition-colors"
        >
          Painel PROs →
        </Link>
      </div>
    );
  }

  if (myQueueCount > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 font-mono text-sm text-emerald-200">
        <Radio size={16} aria-hidden="true" />
        Você está em {myQueueCount}{" "}
        {myQueueCount === 1 ? "fila ativa" : "filas ativas"} ·{" "}
        <span className="text-white">{fichaBalance}</span>{" "}
        {fichaBalance === 1 ? "ficha disponível" : "fichas disponíveis"}
      </div>
    );
  }

  if (fichaBalance > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 font-mono text-sm text-white/80">
        <Coins size={16} className="text-emerald-400" aria-hidden="true" />
        Você tem <span className="text-white font-bold">{fichaBalance}</span>{" "}
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
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 font-mono text-sm text-white/80">
        <AlertCircle size={16} className="text-amber-400" aria-hidden="true" />
        Sem fichas · compre 1 por {precoTxt} pra entrar em qualquer fila
      </div>
      {fichaPackageId && (
        <Link
          href={`/checkout/${fichaPackageId}`}
          className="inline-flex items-center gap-2 rounded-md border-2 border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-widest text-black hover:brightness-110 transition-all"
        >
          <Coins size={12} aria-hidden="true" />
          Comprar
        </Link>
      )}
    </div>
  );
}
